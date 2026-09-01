import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Version-range matching for Fabric dependency declarations. The case that
 * matters most: Minecraft's year-based versions (26.x) must not be treated as
 * satisfying a 1.x range.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const { satisfiesRange, compareVersions } = await import(`${OUT}versionRange.js`);

test('orders numeric segments numerically, not as text', () => {
  assert.ok(compareVersions('1.21.11', '1.21.9') > 0, '11 outranks 9');
  assert.ok(compareVersions('1.22', '1.21.11') > 0);
  assert.ok(compareVersions('26.1.1', '1.22') > 0, 'year-based versions are newer');
  assert.equal(compareVersions('1.21.11', '1.21.11'), 0);
  assert.equal(compareVersions('1.21', '1.21.0'), 0, 'missing segments read as zero');
});

test('orders a pre-release below its release', () => {
  assert.ok(compareVersions('1.21.11', '1.21.11-rc1') > 0);
  assert.ok(compareVersions('26.3-snapshot-10', '26.3') < 0);
});

test('the companion mod range accepts 1.21.11 and rejects 26.1.1', () => {
  const range = '>=1.21.11 <1.22';
  assert.equal(satisfiesRange('1.21.11', range), true);
  assert.equal(satisfiesRange('1.21.12', range), true);
  // The reported crash: an instance on 26.1.1 with a mod built for 1.21.11.
  assert.equal(satisfiesRange('26.1.1', range), false);
  assert.equal(satisfiesRange('26.2', range), false);
  assert.equal(satisfiesRange('1.21.10', range), false);
  assert.equal(satisfiesRange('1.22', range), false);
});

test('loader ranges follow the same rules', () => {
  assert.equal(satisfiesRange('0.19.3', '>=0.19.3'), true, 'the newest stable loader must pass');
  assert.equal(satisfiesRange('0.19.5', '>=0.19.3'), true);
  // The shipped bug: the mod demanded a loader newer than the stable build.
  assert.equal(satisfiesRange('0.19.3', '>=0.19.5'), false);
});

test('treats a missing or wildcard range as unconstrained', () => {
  for (const range of [undefined, null, '', '   ', '*']) {
    assert.equal(satisfiesRange('26.1.1', range), true);
  }
});

test('supports the remaining comparison forms', () => {
  assert.equal(satisfiesRange('1.21.11', '1.21.11'), true, 'bare version means equality');
  assert.equal(satisfiesRange('1.21.12', '1.21.11'), false);
  assert.equal(satisfiesRange('1.21.11', '<=1.21.11'), true);
  assert.equal(satisfiesRange('1.21.12', '>1.21.11'), true);
  assert.equal(satisfiesRange('1.21.11', '>1.21.11'), false);
  // ~ allows patch bumps only, ^ allows minor bumps.
  assert.equal(satisfiesRange('1.21.12', '~1.21.11'), true);
  assert.equal(satisfiesRange('1.22.0', '~1.21.11'), false);
  assert.equal(satisfiesRange('1.22.0', '^1.21.11'), true);
  assert.equal(satisfiesRange('2.0.0', '^1.21.11'), false);
});
