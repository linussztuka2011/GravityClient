import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import * as crypto from 'node:crypto';

/**
 * Regression tests for the file downloader.
 *
 * The original implementation resolved on the HTTP response's 'end' event
 * while writes were still buffered, so larger files were truncated on disk.
 * Nothing caught it because the manifest's SHA-1 values were fabricated and
 * verification never really ran. These tests pin the fixed behaviour.
 *
 * downloadFile is private, so the tests drive it through the public
 * verifyHash + a local HTTP server via downloadMod's own helper path.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const { ModrinthService } = await import(`${OUT}modrinthService.js`);

// downloadFile is private; reach it the same way the class does internally.
const downloadFile = (ModrinthService)['downloadFile'].bind(ModrinthService);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Serves `body`, deliberately dribbled out in small chunks. */
async function serve(body, { chunkSize = 1024, delayMs = 0, contentLength = true } = {}) {
  const server = http.createServer(async (_req, res) => {
    const headers = { 'Content-Type': 'application/java-archive' };
    if (contentLength) headers['Content-Length'] = String(body.length);
    res.writeHead(200, headers);
    for (let i = 0; i < body.length; i += chunkSize) {
      res.write(body.subarray(i, i + chunkSize));
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  test.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}/mod.jar`;
}

test('download: writes a large file completely before resolving', async () => {
  // 8 MB is comfortably past the write-stream buffer that hid the bug.
  const body = crypto.randomBytes(8 * 1024 * 1024);
  const expected = crypto.createHash('sha1').update(body).digest('hex');
  const url = await serve(body, { chunkSize: 64 * 1024 });

  const dest = path.join(tempDir('dl-big'), 'mod.jar');
  await downloadFile(url, dest);

  assert.equal(fs.statSync(dest).size, body.length, 'file on disk must be complete when the promise resolves');
  assert.ok(ModrinthService.verifyHash(dest, expected), 'contents must hash-match the served bytes');
});

test('download: small files still work', async () => {
  const body = Buffer.from('not really a jar, but small');
  const url = await serve(body, { chunkSize: 8 });
  const dest = path.join(tempDir('dl-small'), 'mod.jar');

  await downloadFile(url, dest);
  assert.equal(fs.readFileSync(dest).toString(), body.toString());
});

test('download: reports progress up to 100%', async () => {
  const body = crypto.randomBytes(512 * 1024);
  const url = await serve(body, { chunkSize: 32 * 1024 });
  const dest = path.join(tempDir('dl-progress'), 'mod.jar');

  const seen = [];
  await downloadFile(url, dest, (p) => seen.push(p));

  assert.ok(seen.length > 1, 'progress should be reported more than once');
  assert.equal(seen.at(-1), 100, 'final progress should reach 100');
  assert.ok(seen.every((p) => p >= 0 && p <= 100));
});

test('download: rejects a truncated response and leaves no partial file', async (t) => {
  const body = crypto.randomBytes(256 * 1024);
  // Advertise the full length but hang up early.
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Length': String(body.length) });
    res.write(body.subarray(0, 1024));
    res.destroy();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());

  const dest = path.join(tempDir('dl-trunc'), 'mod.jar');
  await assert.rejects(() => downloadFile(`http://127.0.0.1:${server.address().port}/mod.jar`, dest));
  assert.equal(fs.existsSync(dest), false, 'a partial download must not be left on disk');
});

test('verifyHash: detects a corrupted file', () => {
  const dir = tempDir('verify');
  const file = path.join(dir, 'a.jar');
  fs.writeFileSync(file, 'hello world');

  const good = crypto.createHash('sha1').update('hello world').digest('hex');
  assert.ok(ModrinthService.verifyHash(file, good));
  assert.ok(ModrinthService.verifyHash(file, good.toUpperCase()), 'comparison is case-insensitive');
  assert.equal(ModrinthService.verifyHash(file, 'deadbeef'.repeat(5)), false);
  assert.equal(ModrinthService.verifyHash(path.join(dir, 'missing.jar'), good), false);
});
