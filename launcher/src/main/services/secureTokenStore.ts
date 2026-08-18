import * as fs from 'fs';
import * as path from 'path';
import type { GlobalSettings, RichAccount } from './settingsService.js';

/**
 * Holds Microsoft/Minecraft session tokens outside settings.json, encrypted at
 * rest with an OS-backed key. The encryptor is injected (Electron's safeStorage
 * in the real app, a stub in tests) so all of the file-format, migration and
 * sanitization logic stays runnable in plain Node.
 *
 * File format: JSON envelope { version, encrypted, payload } where payload is
 * the base64 of the (possibly encrypted) token map. Keeping the envelope as
 * plain JSON lets a future version detect and upgrade old files.
 */

export interface AccountTokens {
  accessToken?: string;
  refreshToken?: string;
  /** Epoch millis when the Minecraft access token expires. */
  expiresAt?: number;
}

export interface TokenEncryptor {
  /** False when the OS keyring is unavailable (e.g. bare Linux servers). */
  isAvailable(): boolean;
  encrypt(plainText: string): Buffer;
  decrypt(cipher: Buffer): string;
}

type TokenMap = Record<string, AccountTokens>;

interface StoreEnvelope {
  version: 1;
  encrypted: boolean;
  payload: string;
}

export class SecureTokenStore {
  constructor(
    private readonly filePath: string,
    private readonly encryptor: TokenEncryptor
  ) {}

  private readMap(): TokenMap {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch {
      return {};
    }

    try {
      const envelope = JSON.parse(raw) as StoreEnvelope;
      if (!envelope || typeof envelope.payload !== 'string') return {};
      const payloadBuf = Buffer.from(envelope.payload, 'base64');
      const json = envelope.encrypted ? this.encryptor.decrypt(payloadBuf) : payloadBuf.toString('utf8');
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err: any) {
      // A corrupt or undecryptable store must not break startup; the player
      // simply signs in again.
      console.error(`[SecureTokenStore] Could not read token store: ${err.message}`);
      return {};
    }
  }

  private writeMap(map: TokenMap): void {
    const json = JSON.stringify(map);
    const canEncrypt = this.encryptor.isAvailable();
    if (!canEncrypt) {
      console.warn(
        '[SecureTokenStore] OS-backed encryption is unavailable on this system; ' +
        'tokens are stored without encryption but with owner-only file permissions.'
      );
    }
    const envelope: StoreEnvelope = {
      version: 1,
      encrypted: canEncrypt,
      payload: (canEncrypt ? this.encryptor.encrypt(json) : Buffer.from(json, 'utf8')).toString('base64'),
    };

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(envelope), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tempPath, this.filePath);
    // rename preserves the temp file's 0600 mode, but be explicit for clarity.
    try {
      fs.chmodSync(this.filePath, 0o600);
    } catch {
      // chmod is best-effort on platforms without POSIX modes (Windows).
    }
  }

  getTokens(accountName: string): AccountTokens | undefined {
    return this.readMap()[accountName];
  }

  setTokens(accountName: string, tokens: AccountTokens): void {
    const map = this.readMap();
    map[accountName] = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    };
    this.writeMap(map);
  }

  deleteTokens(accountName: string): void {
    const map = this.readMap();
    if (accountName in map) {
      delete map[accountName];
      this.writeMap(map);
    }
  }

  /** Removes tokens for accounts that no longer exist in settings. */
  pruneTo(accountNames: string[]): void {
    const keep = new Set(accountNames);
    const map = this.readMap();
    let changed = false;
    for (const name of Object.keys(map)) {
      if (!keep.has(name)) {
        delete map[name];
        changed = true;
      }
    }
    if (changed) this.writeMap(map);
  }
}

// ---------------------------------------------------------------------------
// App-wide singleton. main.ts initializes it once Electron's safeStorage is
// ready; services fetch it lazily so they stay constructible in tests.
// ---------------------------------------------------------------------------

let activeStore: SecureTokenStore | null = null;

export function initSecureTokenStore(filePath: string, encryptor: TokenEncryptor): SecureTokenStore {
  activeStore = new SecureTokenStore(filePath, encryptor);
  return activeStore;
}

export function getSecureTokenStore(): SecureTokenStore | null {
  return activeStore;
}

// ---------------------------------------------------------------------------
// Pure helpers shared by the store, settings sanitization and migration.
// ---------------------------------------------------------------------------

/** True if the account object carries any secret material. */
export function hasTokens(account: RichAccount | undefined | null): boolean {
  return Boolean(account && (account.accessToken || account.refreshToken));
}

/** Returns a copy of the account with all secret fields removed. */
export function sanitizeAccount(account: RichAccount): RichAccount {
  const { accessToken: _a, refreshToken: _r, expiresAt: _e, ...safe } = account;
  return safe;
}

/** Returns settings with every richAccount stripped of secret fields. */
export function sanitizeSettings(settings: GlobalSettings): GlobalSettings {
  if (!Array.isArray(settings.richAccounts)) return settings;
  return {
    ...settings,
    richAccounts: settings.richAccounts.map((a) => (a && typeof a === 'object' ? sanitizeAccount(a) : a)),
  };
}

/**
 * Pulls token material out of a settings object (as read from a pre-migration
 * settings.json). Returns the extracted map; an empty map means nothing to do.
 */
export function extractTokensFromSettings(settings: GlobalSettings): Record<string, AccountTokens> {
  const extracted: Record<string, AccountTokens> = {};
  for (const account of settings.richAccounts ?? []) {
    if (hasTokens(account)) {
      extracted[account.name] = {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
      };
    }
  }
  return extracted;
}

/** Merges stored tokens back onto a sanitized account for in-process use only. */
export function hydrateAccount(account: RichAccount, tokens: AccountTokens | undefined): RichAccount {
  if (!tokens) return account;
  return { ...account, ...tokens };
}
