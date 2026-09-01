import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Tests for installing the companion Fabric mod into an instance.
 *
 * Nothing used to copy this jar into mods/, which is why the in-game keybind
 * and HUD modules never loaded no matter what the launcher wrote to the config.
 * The jar must also only be installed where it actually runs: Fabric aborts the
 * entire launch over one incompatible mod.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const {
  installClientCore,
  findClientCoreJar,
  clientCoreSearchDirs,
  readClientCoreMetadata,
  CLIENT_CORE_PREFIX,
} = await import(`${OUT}clientCoreInstaller.js`);

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

/** Builds a real jar carrying the given fabric.mod.json. */
function writeModJar(dir, name, manifest) {
  fs.mkdirSync(dir, { recursive: true });
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'gravity-jar-'));
  test.after(() => fs.rmSync(staging, { recursive: true, force: true }));
  fs.writeFileSync(path.join(staging, 'fabric.mod.json'), JSON.stringify(manifest));
  const jar = path.join(dir, name);
  try {
    execFileSync('zip', ['-q', '-X', jar, 'fabric.mod.json'], { cwd: staging });
  } catch {
    execFileSync('jar', ['--create', `--file=${jar}`, 'fabric.mod.json'], { cwd: staging });
  }
  return jar;
}

const SHIPPED_MANIFEST = {
  id: 'gravity-client-core',
  version: '1.0.0',
  depends: { fabricloader: '>=0.19.3', minecraft: '>=1.21.11 <1.22' },
};

test('reads the range the mod itself declares', () => {
  const libs = tempDir('libs-meta');
  const jar = writeModJar(libs, 'gravity-client-core-1.0.0.jar', SHIPPED_MANIFEST);

  assert.deepEqual(readClientCoreMetadata(jar), {
    version: '1.0.0',
    minecraft: '>=1.21.11 <1.22',
    fabricloader: '>=0.19.3',
  });
});

test('installs when the instance version is supported', () => {
  const libs = tempDir('libs-ok');
  const mods = tempDir('mods-ok');
  writeModJar(libs, 'gravity-client-core-1.0.0.jar', SHIPPED_MANIFEST);

  const result = installClientCore(mods, [libs], '1.21.11');
  assert.equal(result.installed, true);
  assert.ok(fs.existsSync(path.join(mods, 'gravity-client-core-1.0.0.jar')));
});

test('skips an unsupported Minecraft version instead of bricking the launch', () => {
  const libs = tempDir('libs-bad');
  const mods = tempDir('mods-bad');
  writeModJar(libs, 'gravity-client-core-1.0.0.jar', SHIPPED_MANIFEST);

  // The reported crash: Fabric refused to start an instance on 26.1.1 because
  // the companion mod had been installed there regardless of its declared range.
  const result = installClientCore(mods, [libs], '26.1.1');
  assert.equal(result.installed, false);
  assert.equal(result.incompatible, true);
  assert.match(result.reason, /26\.1\.1/);
  assert.match(result.reason, />=1\.21\.11 <1\.22/);
  assert.deepEqual(fs.readdirSync(mods), [], 'no jar may be left in mods/');
});

test('removes an already-installed copy that the instance cannot run', () => {
  const libs = tempDir('libs-evict');
  const mods = tempDir('mods-evict');
  writeModJar(libs, 'gravity-client-core-1.0.0.jar', SHIPPED_MANIFEST);
  // Left behind by an earlier build that installed without checking.
  writeJar(mods, 'gravity-client-core-1.0.0.jar', 'stale');
  writeJar(mods, 'sodium.jar', 'sodium');

  const result = installClientCore(mods, [libs], '26.1.1');
  assert.equal(result.installed, false);
  assert.match(result.reason, /removed so the game still starts/);
  assert.deepEqual(fs.readdirSync(mods), ['sodium.jar'], 'other mods must survive');
});

test('installs anyway when the jar declares no Minecraft range', () => {
  const libs = tempDir('libs-norange');
  const mods = tempDir('mods-norange');
  writeModJar(libs, 'gravity-client-core-1.0.0.jar', { id: 'gravity-client-core', depends: {} });

  assert.equal(installClientCore(mods, [libs], '26.1.1').installed, true);
});
