import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Manages a real local skin library and talks to Minecraft Services for
 * premium accounts. Skins are stored as the actual PNG files Mojang accepts,
 * so applying one uploads the exact bytes on disk.
 */

export type SkinModel = 'classic' | 'slim';

export interface SkinEntry {
  id: string;
  name: string;
  model: SkinModel;
  /** Full PNG as a data URI; the renderer crops the head out with CSS. */
  dataUri: string;
  width: number;
  height: number;
  source: string;
  addedAt: number;
}

interface SkinMetadata {
  name: string;
  model: SkinModel;
  source: string;
  addedAt: number;
}

const MAX_SKIN_BYTES = 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Validates a Minecraft skin PNG by reading the IHDR header directly — no image
 * library needed, and it rejects non-PNG data before it ever reaches Mojang.
 */
export function inspectSkinPng(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('That file is not a PNG image.');
  }
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('PNG is missing its IHDR header chunk.');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  // 64x64 is the modern layout; 64x32 is the legacy one the game still loads.
  const valid = width === 64 && (height === 64 || height === 32);
  if (!valid) {
    throw new Error(`Skins must be 64x64 (or legacy 64x32) pixels — this image is ${width}x${height}.`);
  }
  return { width, height };
}

function metadataPath(skinsDir: string, id: string): string {
  return path.join(skinsDir, `${id}.json`);
}

function skinPath(skinsDir: string, id: string): string {
  return path.join(skinsDir, `${id}.png`);
}

/** Skin ids are generated internally, but they still index into the filesystem. */
function assertSafeId(id: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid skin id: "${id}"`);
  }
}

export async function listSkins(skinsDir: string): Promise<SkinEntry[]> {
  await fs.promises.mkdir(skinsDir, { recursive: true });
  const entries = await fs.promises.readdir(skinsDir);
  const ids = entries.filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));

  const skins: SkinEntry[] = [];
  for (const id of ids) {
    try {
      assertSafeId(id);
      const buffer = await fs.promises.readFile(skinPath(skinsDir, id));
      const { width, height } = inspectSkinPng(buffer);

      let meta: SkinMetadata = { name: id, model: 'classic', source: 'local', addedAt: 0 };
      try {
        meta = { ...meta, ...JSON.parse(await fs.promises.readFile(metadataPath(skinsDir, id), 'utf8')) };
      } catch {
        // A skin without sidecar metadata still works with sensible defaults.
      }

      skins.push({
        id,
        name: meta.name,
        model: meta.model === 'slim' ? 'slim' : 'classic',
        dataUri: `data:image/png;base64,${buffer.toString('base64')}`,
        width,
        height,
        source: meta.source,
        addedAt: meta.addedAt,
      });
    } catch {
      // Skip unreadable or invalid files rather than failing the whole list.
    }
  }

  return skins.sort((a, b) => b.addedAt - a.addedAt || a.name.localeCompare(b.name));
}

async function storeSkin(
  skinsDir: string,
  buffer: Buffer,
  meta: Omit<SkinMetadata, 'addedAt'>
): Promise<SkinEntry> {
  inspectSkinPng(buffer);
  await fs.promises.mkdir(skinsDir, { recursive: true });

  // Content hash doubles as de-duplication: re-importing a skin updates it in place.
  const id = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const full: SkinMetadata = { ...meta, addedAt: Date.now() };

  await fs.promises.writeFile(skinPath(skinsDir, id), buffer);
  await fs.promises.writeFile(metadataPath(skinsDir, id), JSON.stringify(full, null, 2), 'utf8');

  const skins = await listSkins(skinsDir);
  const created = skins.find((s) => s.id === id);
  if (!created) {
    throw new Error('Skin was written but could not be read back.');
  }
  return created;
}

export async function importSkinFromFile(
  skinsDir: string,
  sourcePath: string,
  name?: string,
  model: SkinModel = 'classic'
): Promise<SkinEntry> {
  const stat = await fs.promises.stat(sourcePath);
  if (stat.size > MAX_SKIN_BYTES) {
    throw new Error('That file is too large to be a Minecraft skin.');
  }
  const buffer = await fs.promises.readFile(sourcePath);
  return storeSkin(skinsDir, buffer, {
    name: name?.trim() || path.basename(sourcePath, path.extname(sourcePath)),
    model,
    source: sourcePath,
  });
}

export async function importSkinFromUrl(
  skinsDir: string,
  url: string,
  name?: string,
  model: SkinModel = 'classic'
): Promise<SkinEntry> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${url}" is not a valid URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https skin URLs are supported.');
  }

  const response = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'GravityClient/1.0.0' },
  });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SKIN_BYTES) {
    throw new Error('That download is too large to be a Minecraft skin.');
  }

  const fallbackName = decodeURIComponent(path.basename(parsed.pathname)) || 'Downloaded Skin';
  return storeSkin(skinsDir, buffer, {
    name: name?.trim() || fallbackName.replace(/\.png$/i, ''),
    model,
    source: parsed.toString(),
  });
}

export async function deleteSkin(skinsDir: string, id: string): Promise<void> {
  assertSafeId(id);
  await fs.promises.rm(skinPath(skinsDir, id), { force: true });
  await fs.promises.rm(metadataPath(skinsDir, id), { force: true });
}

export async function setSkinModel(skinsDir: string, id: string, model: SkinModel): Promise<void> {
  assertSafeId(id);
  let meta: SkinMetadata = { name: id, model, source: 'local', addedAt: Date.now() };
  try {
    meta = { ...meta, ...JSON.parse(await fs.promises.readFile(metadataPath(skinsDir, id), 'utf8')) };
  } catch {
    // Fall through to writing fresh metadata.
  }
  meta.model = model;
  await fs.promises.writeFile(metadataPath(skinsDir, id), JSON.stringify(meta, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Minecraft Services (premium accounts only)
// ---------------------------------------------------------------------------

const PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile';
const SKIN_UPLOAD_URL = 'https://api.minecraftservices.com/minecraft/profile/skins';

/**
 * Uploads a skin to Mojang so it applies to the account everywhere, exactly as
 * the official launcher does.
 */
export async function applySkinToAccount(
  accessToken: string,
  skinsDir: string,
  skinId: string,
  model: SkinModel
): Promise<{ appliedAt: number }> {
  assertSafeId(skinId);
  const buffer = await fs.promises.readFile(skinPath(skinsDir, skinId));
  inspectSkinPng(buffer);

  const form = new FormData();
  form.append('variant', model);
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'skin.png');

  const response = await fetch(SKIN_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Minecraft rejected the session token. Sign in to the account again and retry.');
    }
    throw new Error(`Mojang refused the skin upload (HTTP ${response.status}): ${detail || response.statusText}`);
  }

  await setSkinModel(skinsDir, skinId, model);
  return { appliedAt: Date.now() };
}

/**
 * Reads the account's currently active skin from Mojang and files it into the
 * local library so the launcher shows what the player is actually wearing.
 */
export async function importActiveAccountSkin(accessToken: string, skinsDir: string): Promise<SkinEntry | null> {
  const response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Could not read the Minecraft profile (HTTP ${response.status}): ${detail || response.statusText}`);
  }

  const profile = (await response.json()) as any;
  const active = Array.isArray(profile?.skins)
    ? profile.skins.find((s: any) => s?.state === 'ACTIVE') ?? profile.skins[0]
    : null;

  if (!active?.url) {
    return null; // Account is using the default skin.
  }

  const model: SkinModel = String(active.variant).toUpperCase() === 'SLIM' ? 'slim' : 'classic';
  return importSkinFromUrl(skinsDir, active.url, `${profile.name ?? 'Account'} (current)`, model);
}
