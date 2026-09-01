import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * The minimal zip reader used to pull fabric.mod.json out of a mod jar.
 * Archives are built with the system `zip`/`jar` so the tests exercise real
 * files rather than bytes this code wrote itself.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const { readZipEntry, readZipEntryJson } = await import(`${OUT}zip.js`);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Builds a zip with the first available system archiver. */
function makeZip(dir, files, { store = false } = {}) {
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  const archive = path.join(dir, 'out.jar');
  const names = Object.keys(files);
  try {
    execFileSync('zip', [store ? '-0' : '-9', '-q', '-X', archive, ...names], { cwd: dir });
  } catch {
    // `jar` always deflates, so a store-only archive cannot be faked with it.
    if (store) return null;
    execFileSync('jar', ['--create', `--file=${archive}`, ...names], { cwd: dir });
  }
  return archive;
}

const MANIFEST = {
  schemaVersion: 1,
  id: 'gravity-client-core',
  version: '1.0.0',
  depends: { fabricloader: '>=0.19.3', minecraft: '>=1.21.11 <1.22' },
};

test('reads a deflated entry back verbatim', () => {
  const dir = tempDir('zip-deflate');
  // Long and repetitive so the archiver actually compresses it.
  const filler = 'gravity '.repeat(500);
  const jar = makeZip(dir, {
    'fabric.mod.json': JSON.stringify(MANIFEST),
    'filler.txt': filler,
  });

  assert.deepEqual(readZipEntryJson(jar, 'fabric.mod.json'), MANIFEST);
  assert.equal(readZipEntry(jar, 'filler.txt').toString('utf8'), filler);
});

test('reads a stored (uncompressed) entry', (t) => {
  const dir = tempDir('zip-store');
  const jar = makeZip(dir, { 'fabric.mod.json': JSON.stringify(MANIFEST) }, { store: true });
  if (!jar) return t.skip('system zip unavailable');
  assert.deepEqual(readZipEntryJson(jar, 'fabric.mod.json'), MANIFEST);
});

test('finds an entry inside nested directories', () => {
  const dir = tempDir('zip-nested');
  const jar = makeZip(dir, {
    'fabric.mod.json': JSON.stringify(MANIFEST),
    'assets/gravity-client-core/lang/en_us.json': '{"key":"value"}',
  });
  assert.deepEqual(readZipEntryJson(jar, 'assets/gravity-client-core/lang/en_us.json'), {
    key: 'value',
  });
});

test('returns null for an entry that is not there', () => {
  const dir = tempDir('zip-missing');
  const jar = makeZip(dir, { 'fabric.mod.json': JSON.stringify(MANIFEST) });
  assert.equal(readZipEntry(jar, 'quilt.mod.json'), null);
  assert.equal(readZipEntryJson(jar, 'quilt.mod.json'), null);
});

test('rejects a file that is not a zip', () => {
  const dir = tempDir('zip-garbage');
  const notAJar = path.join(dir, 'broken.jar');
  fs.writeFileSync(notAJar, Buffer.alloc(4096, 0x41));
  assert.throws(() => readZipEntry(notAJar, 'fabric.mod.json'), /not a valid zip/);
});

test('rejects a truncated archive rather than returning junk', () => {
  const dir = tempDir('zip-truncated');
  const jar = makeZip(dir, { 'fabric.mod.json': JSON.stringify(MANIFEST) });
  const full = fs.readFileSync(jar);
  const cut = path.join(dir, 'cut.jar');
  // Losing the tail loses the end-of-central-directory record — the same
  // damage that makes Fabric report "zip END header not found".
  fs.writeFileSync(cut, full.subarray(0, Math.floor(full.length / 2)));
  assert.throws(() => readZipEntry(cut, 'fabric.mod.json'), /not a valid zip/);
});
