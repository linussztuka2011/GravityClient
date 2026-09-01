import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Tests for installing the companion Fabric mod into an instance.
 *
 * Nothing used to copy this jar into mods/, which is why the in-game keybind
 * and HUD modules never loaded no matter what the launcher wrote to the config.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const { installClientCore, findClientCoreJar, clientCoreSearchDirs, CLIENT_CORE_PREFIX } =
  await import(`${OUT}clientCoreInstaller.js`);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeJar(dir, name, contents = 'jar') {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, contents);
  return p;
}

test('finds the built jar and ignores the sources jar', () => {
  const libs = tempDir('libs');
  writeJar(libs, 'gravity-client-core-1.0.0-sources.jar');
  writeJar(libs, 'gravity-client-core-1.0.0.jar');

  const found = findClientCoreJar([libs]);
  assert.ok(found?.endsWith('gravity-client-core-1.0.0.jar'), `unexpected: ${found}`);
});

test('prefers the newest jar when several versions are present', () => {
  const libs = tempDir('libs-multi');
  const older = writeJar(libs, 'gravity-client-core-1.0.0.jar');
  const newer = writeJar(libs, 'gravity-client-core-1.1.0.jar');
  // Make the version ordering unambiguous by mtime.
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(older, past, past);

  assert.equal(findClientCoreJar([libs]), newer);
});

test('search order prefers packaged resources over the dev build output', () => {
  const dirs = clientCoreSearchDirs('/Applications/GravityClient.app/Contents/Resources', '/repo/launcher/out/main/services');
  assert.equal(dirs[0], path.join('/Applications/GravityClient.app/Contents/Resources', 'client-core'));
  assert.ok(dirs.some((d) => d.includes(path.join('client-core', 'build', 'libs'))), 'dev fallback must be present');

  // In dev there is no resourcesPath, so only the checkout paths are searched.
  const devDirs = clientCoreSearchDirs(undefined, '/repo/launcher/out/main/services');
  assert.ok(devDirs.every((d) => !d.includes('Resources')));
});

test('installs the jar into the mods folder', () => {
  const libs = tempDir('libs-install');
  const mods = tempDir('mods-install');
  writeJar(libs, 'gravity-client-core-1.0.0.jar', 'payload');

  const result = installClientCore(mods, [libs]);
  assert.equal(result.installed, true);
  assert.equal(result.fileName, 'gravity-client-core-1.0.0.jar');
  assert.equal(fs.readFileSync(path.join(mods, 'gravity-client-core-1.0.0.jar'), 'utf8'), 'payload');
});

test('replaces an older companion jar instead of stacking versions', () => {
  const libs = tempDir('libs-replace');
  const mods = tempDir('mods-replace');
  // A previous install left an old version behind.
  writeJar(mods, 'gravity-client-core-0.9.0.jar', 'old');
  // Unrelated mods must survive.
  writeJar(mods, 'sodium.jar', 'sodium');
  writeJar(libs, 'gravity-client-core-1.0.0.jar', 'new');

  installClientCore(mods, [libs]);

  const present = fs.readdirSync(mods).sort();
  assert.deepEqual(present, ['gravity-client-core-1.0.0.jar', 'sodium.jar']);
  assert.equal(
    present.filter((f) => f.startsWith(CLIENT_CORE_PREFIX)).length,
    1,
    'exactly one companion jar should remain'
  );
});

test('creates the mods folder if it does not exist yet', () => {
  const libs = tempDir('libs-mk');
  const mods = path.join(tempDir('mods-mk'), 'nested', 'mods');
  writeJar(libs, 'gravity-client-core-1.0.0.jar');

  assert.equal(installClientCore(mods, [libs]).installed, true);
  assert.ok(fs.existsSync(path.join(mods, 'gravity-client-core-1.0.0.jar')));
});

test('reports a missing jar with guidance instead of throwing', () => {
  const mods = tempDir('mods-missing');
  const result = installClientCore(mods, [path.join(tempDir('empty'), 'nope')]);

  assert.equal(result.installed, false);
  assert.match(result.reason, /gradlew build/, 'should tell the user how to produce the jar');
  assert.deepEqual(fs.readdirSync(mods), [], 'nothing should be written when the jar is absent');
});
