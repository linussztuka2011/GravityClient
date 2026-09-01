import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Tests for seeding new instances with an existing options.txt, so a fresh
 * profile keeps the player's keybinds, FOV and accessibility settings.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const { applyOptionsTemplate, inspectOptionsTemplate, resolveOptionsFile, OPTIONS_FILE } =
  await import(`${OUT}optionsTemplateService.js`);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A representative slice of a real options.txt.
const SAMPLE = [
  'version:4082',
  'fov:0.75',
  'guiScale:2',
  'key_key.forward:key.keyboard.w',
  'key_key.jump:key.keyboard.space',
  'key_key.inventory:key.keyboard.e',
  'darknessEffectScale:0.0',
  'damageTiltStrength:0.0',
  'soundCategory_master:0.5',
].join('\n');

test('resolveOptionsFile accepts a profile folder or the file itself', () => {
  assert.equal(resolveOptionsFile('/profiles/1.21.11'), path.join('/profiles/1.21.11', OPTIONS_FILE));
  assert.equal(resolveOptionsFile(`/profiles/1.21.11/${OPTIONS_FILE}`), `/profiles/1.21.11/${OPTIONS_FILE}`);
  assert.equal(resolveOptionsFile('  /profiles/spaced  '), path.join('/profiles/spaced', OPTIONS_FILE));
});

test('copies options.txt into a new instance', () => {
  const source = tempDir('tpl-src');
  const instance = tempDir('tpl-inst');
  fs.writeFileSync(path.join(source, OPTIONS_FILE), SAMPLE);

  const result = applyOptionsTemplate(instance, source);
  assert.equal(result.copied, true);
  assert.equal(result.settingCount, 9);

  const written = fs.readFileSync(path.join(instance, OPTIONS_FILE), 'utf8');
  assert.equal(written, SAMPLE, 'contents must be copied verbatim');
  assert.ok(written.includes('key_key.jump:key.keyboard.space'), 'keybinds carried over');
  assert.ok(written.includes('fov:0.75'), 'FOV carried over');
});

test('never overwrites a profile that already has settings', () => {
  const source = tempDir('tpl-src2');
  const instance = tempDir('tpl-inst2');
  fs.writeFileSync(path.join(source, OPTIONS_FILE), SAMPLE);
  fs.writeFileSync(path.join(instance, OPTIONS_FILE), 'fov:1.0');

  const result = applyOptionsTemplate(instance, source);
  assert.equal(result.copied, false);
  assert.match(result.reason, /already exists/);
  assert.equal(fs.readFileSync(path.join(instance, OPTIONS_FILE), 'utf8'), 'fov:1.0', 'in-game changes must survive');
});

test('does nothing when no template is configured', () => {
  const instance = tempDir('tpl-none');
  for (const value of [undefined, '', '   ']) {
    const result = applyOptionsTemplate(instance, value);
    assert.equal(result.copied, false);
  }
  assert.deepEqual(fs.readdirSync(instance), []);
});

test('reports a missing template instead of throwing', () => {
  const instance = tempDir('tpl-missing');
  const result = applyOptionsTemplate(instance, path.join(tempDir('tpl-empty'), 'nope'));
  assert.equal(result.copied, false);
  assert.match(result.reason, new RegExp(OPTIONS_FILE));
  assert.deepEqual(fs.readdirSync(instance), [], 'nothing written on failure');
});

test('creates the instance directory if needed', () => {
  const source = tempDir('tpl-src3');
  fs.writeFileSync(path.join(source, OPTIONS_FILE), SAMPLE);
  const instance = path.join(tempDir('tpl-inst3'), 'nested', 'profile');

  assert.equal(applyOptionsTemplate(instance, source).copied, true);
  assert.ok(fs.existsSync(path.join(instance, OPTIONS_FILE)));
});

test('inspect reports availability for the UI', () => {
  const source = tempDir('tpl-inspect');
  fs.writeFileSync(path.join(source, OPTIONS_FILE), SAMPLE);

  const good = inspectOptionsTemplate(source);
  assert.equal(good.configured, true);
  assert.equal(good.available, true);
  assert.equal(good.settingCount, 9);

  const missing = inspectOptionsTemplate(path.join(source, 'not-a-profile'));
  assert.equal(missing.configured, true);
  assert.equal(missing.available, false);
  assert.match(missing.problem, new RegExp(OPTIONS_FILE));

  const off = inspectOptionsTemplate('');
  assert.equal(off.configured, false);
  assert.equal(off.available, false);
});

test('handles a path with spaces, like the ModrinthApp profile layout', () => {
  const base = tempDir('tpl-spaces');
  const source = path.join(base, 'profiles', '1.21.11 (1)');
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, OPTIONS_FILE), SAMPLE);

  const instance = tempDir('tpl-spaces-inst');
  assert.equal(applyOptionsTemplate(instance, source).copied, true);
  assert.equal(inspectOptionsTemplate(source).available, true);
});
