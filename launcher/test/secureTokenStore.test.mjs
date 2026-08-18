import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Tests for the encrypted token store. Runs against compiled output
 * (npm run build:main first). The encryptor is stubbed — in the app it is
 * Electron's safeStorage, injected in main.ts.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;
const {
  SecureTokenStore,
  sanitizeAccount,
  sanitizeSettings,
  extractTokensFromSettings,
  hydrateAccount,
  hasTokens,
} = await import(`${OUT}secureTokenStore.js`);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** Reversible, obviously-not-real "encryption" that still changes the bytes. */
function stubEncryptor(available = true) {
  const calls = { encrypt: 0, decrypt: 0 };
  return {
    calls,
    isAvailable: () => available,
    encrypt(plain) {
      calls.encrypt += 1;
      return Buffer.from(Buffer.from(plain, 'utf8').map((b) => b ^ 0x5a));
    },
    decrypt(cipher) {
      calls.decrypt += 1;
      return Buffer.from(cipher.map((b) => b ^ 0x5a)).toString('utf8');
    },
  };
}

const SAMPLE = { accessToken: 'mc-token-123', refreshToken: 'ms-refresh-456', expiresAt: 1234567890 };

test('store: round-trips tokens through the encryptor', () => {
  const dir = tempDir('store');
  const enc = stubEncryptor();
  const store = new SecureTokenStore(path.join(dir, 'secure-tokens.bin'), enc);

  store.setTokens('Alice', SAMPLE);
  assert.deepEqual(store.getTokens('Alice'), SAMPLE);
  assert.equal(store.getTokens('Nobody'), undefined);
  assert.ok(enc.calls.encrypt >= 1, 'encryptor must actually be used');
});

test('store: file on disk never contains plaintext tokens when encryption is available', () => {
  const dir = tempDir('store-opaque');
  const file = path.join(dir, 'secure-tokens.bin');
  new SecureTokenStore(file, stubEncryptor()).setTokens('Alice', SAMPLE);

  const raw = fs.readFileSync(file, 'utf8');
  assert.ok(!raw.includes('mc-token-123'), 'access token must not be readable in the file');
  assert.ok(!raw.includes('ms-refresh-456'), 'refresh token must not be readable in the file');
  const envelope = JSON.parse(raw);
  assert.equal(envelope.version, 1);
  assert.equal(envelope.encrypted, true);
});

test('store: file permissions are owner-only on POSIX', () => {
  const dir = tempDir('store-mode');
  const file = path.join(dir, 'secure-tokens.bin');
  new SecureTokenStore(file, stubEncryptor()).setTokens('Alice', SAMPLE);
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  }
});

test('store: falls back to unencrypted storage when the OS keyring is unavailable', () => {
  const dir = tempDir('store-fallback');
  const file = path.join(dir, 'secure-tokens.bin');
  const store = new SecureTokenStore(file, stubEncryptor(false));
  store.setTokens('Alice', SAMPLE);

  const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(envelope.encrypted, false, 'must record that the payload is not encrypted');
  // Login still works after a restart.
  assert.deepEqual(new SecureTokenStore(file, stubEncryptor(false)).getTokens('Alice'), SAMPLE);
});

test('store: delete and pruneTo remove entries', () => {
  const dir = tempDir('store-prune');
  const store = new SecureTokenStore(path.join(dir, 'secure-tokens.bin'), stubEncryptor());
  store.setTokens('Alice', SAMPLE);
  store.setTokens('Bob', { refreshToken: 'r' });
  store.setTokens('Carol', { accessToken: 'a' });

  store.deleteTokens('Bob');
  assert.equal(store.getTokens('Bob'), undefined);

  store.pruneTo(['Carol']);
  assert.equal(store.getTokens('Alice'), undefined, 'pruned accounts lose their tokens');
  // undefined fields are dropped by the JSON round-trip; only real values persist.
  assert.deepEqual(store.getTokens('Carol'), { accessToken: 'a' });
});

test('store: a corrupt file yields an empty store instead of crashing', () => {
  const dir = tempDir('store-corrupt');
  const file = path.join(dir, 'secure-tokens.bin');
  fs.writeFileSync(file, 'not json at all');
  const store = new SecureTokenStore(file, stubEncryptor());
  assert.equal(store.getTokens('Alice'), undefined);
  // And it recovers on the next write.
  store.setTokens('Alice', SAMPLE);
  assert.deepEqual(store.getTokens('Alice'), SAMPLE);
});

// ---------------------------------------------------------------------------

test('helpers: sanitizeAccount strips exactly the secret fields', () => {
  const account = { name: 'Alice', uuid: 'u-1', type: 'microsoft', ...SAMPLE };
  assert.deepEqual(sanitizeAccount(account), { name: 'Alice', uuid: 'u-1', type: 'microsoft' });
});

test('helpers: sanitizeSettings cleans every account and leaves the rest alone', () => {
  const settings = {
    ram: '4G',
    activeAccount: 'Alice',
    richAccounts: [
      { name: 'Alice', uuid: 'u-1', type: 'microsoft', ...SAMPLE },
      { name: 'Offline', uuid: 'u-2', type: 'offline' },
    ],
  };
  const clean = sanitizeSettings(settings);
  assert.equal(clean.ram, '4G');
  assert.equal(JSON.stringify(clean).includes('mc-token-123'), false);
  assert.deepEqual(clean.richAccounts[1], { name: 'Offline', uuid: 'u-2', type: 'offline' });
  // Input is not mutated.
  assert.equal(settings.richAccounts[0].accessToken, 'mc-token-123');
});

test('helpers: extractTokensFromSettings finds only accounts that carry secrets', () => {
  const extracted = extractTokensFromSettings({
    richAccounts: [
      { name: 'Alice', uuid: 'u-1', type: 'microsoft', ...SAMPLE },
      { name: 'Offline', uuid: 'u-2', type: 'offline' },
    ],
  });
  assert.deepEqual(Object.keys(extracted), ['Alice']);
  assert.deepEqual(extracted.Alice, SAMPLE);
});

test('helpers: hydrateAccount merges stored tokens without touching profile fields', () => {
  const sanitized = { name: 'Alice', uuid: 'u-1', type: 'microsoft' };
  const hydrated = hydrateAccount(sanitized, SAMPLE);
  assert.deepEqual(hydrated, { ...sanitized, ...SAMPLE });
  assert.deepEqual(hydrateAccount(sanitized, undefined), sanitized);
});

test('helpers: hasTokens', () => {
  assert.equal(hasTokens({ name: 'A', uuid: 'u', type: 'offline' }), false);
  assert.equal(hasTokens({ name: 'A', uuid: 'u', type: 'microsoft', refreshToken: 'r' }), true);
  assert.equal(hasTokens(undefined), false);
});

// Note: SettingsService.saveSettings() sanitization is not tested here because
// importing it pulls in Electron (via minecraftPaths), which cannot load in
// plain Node. The stripping itself is a one-line call to sanitizeSettings(),
// which is covered above.
