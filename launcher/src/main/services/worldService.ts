import * as fs from 'fs';
import * as path from 'path';
import { parseNbt, writeNbt, getCompound, getString, getNumber, getBoolean, NbtFile } from './nbt.js';

/**
 * Reads and manipulates real singleplayer worlds inside an instance's `saves/`
 * directory. Every operation works on the same files Minecraft itself uses, so
 * changes made here show up in-game and vice versa.
 *
 * Functions take an explicit instance directory rather than resolving one from
 * Electron, which keeps this module testable outside a running app.
 */

export interface WorldSummary {
  /** Folder name under saves/, used as the stable identifier. */
  folderName: string;
  /** LevelName from level.dat — what the player sees and can rename. */
  name: string;
  gameMode: string;
  hardcore: boolean;
  /** Version.Name from level.dat, e.g. "1.21". */
  version: string;
  /** Epoch millis, 0 when unknown. */
  lastPlayed: number;
  sizeBytes: number;
  cheats: boolean;
  /** Set when level.dat could not be read, so the UI can flag the world. */
  problem?: string;
}

const GAME_MODES = ['Survival', 'Creative', 'Adventure', 'Spectator'];

/**
 * World folder names come back over IPC, so they must never be able to escape
 * the saves directory.
 */
function resolveWorldDir(instanceDir: string, folderName: string): string {
  if (!folderName || folderName !== path.basename(folderName) || folderName === '.' || folderName === '..') {
    throw new Error(`Invalid world folder name: "${folderName}"`);
  }
  const savesDir = path.join(instanceDir, 'saves');
  const worldDir = path.join(savesDir, folderName);
  const relative = path.relative(savesDir, worldDir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to operate outside the saves directory: "${folderName}"`);
  }
  return worldDir;
}

async function directorySize(dir: string): Promise<number> {
  let total = 0;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await directorySize(full);
      } else if (entry.isFile()) {
        total += (await fs.promises.stat(full)).size;
      }
    } catch {
      // A file vanishing mid-scan should not abort the whole listing.
    }
  }
  return total;
}

/**
 * Minecraft keeps a `level.dat_old` backup; fall back to it so a half-written
 * level.dat does not make a world disappear from the list.
 */
async function readLevelDat(worldDir: string): Promise<{ file: NbtFile; source: string } | null> {
  for (const candidate of ['level.dat', 'level.dat_old']) {
    const full = path.join(worldDir, candidate);
    try {
      const raw = await fs.promises.readFile(full);
      return { file: parseNbt(raw), source: full };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function listWorlds(instanceDir: string): Promise<WorldSummary[]> {
  const savesDir = path.join(instanceDir, 'saves');
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(savesDir, { withFileTypes: true });
  } catch {
    return []; // No saves folder yet — the instance has never been played.
  }

  const worlds = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<WorldSummary> => {
        const worldDir = path.join(savesDir, entry.name);
        const sizeBytes = await directorySize(worldDir);
        const base: WorldSummary = {
          folderName: entry.name,
          name: entry.name,
          gameMode: 'Unknown',
          hardcore: false,
          version: 'Unknown',
          lastPlayed: 0,
          sizeBytes,
          cheats: false,
        };

        let parsed: { file: NbtFile; source: string } | null = null;
        try {
          parsed = await readLevelDat(worldDir);
        } catch (err: any) {
          return { ...base, problem: `level.dat could not be parsed: ${err.message}` };
        }
        if (!parsed) {
          return { ...base, problem: 'No readable level.dat in this folder.' };
        }

        const data = getCompound(parsed.file.root, 'Data');
        const gameType = getNumber(data, 'GameType');
        const hardcore = getBoolean(data, 'hardcore') ?? false;

        return {
          ...base,
          name: getString(data, 'LevelName') || entry.name,
          gameMode: gameType !== undefined ? (GAME_MODES[gameType] ?? 'Unknown') : 'Unknown',
          hardcore,
          version: getString(getCompound(data, 'Version'), 'Name') || 'Unknown',
          lastPlayed: getNumber(data, 'LastPlayed') ?? 0,
          cheats: getBoolean(data, 'allowCommands') ?? false,
        };
      })
  );

  // Most recently played first, matching Minecraft's own ordering.
  return worlds.sort((a, b) => b.lastPlayed - a.lastPlayed);
}

/**
 * Renames a world the same way the game does: only the LevelName inside
 * level.dat changes, the folder keeps its name so chunk data stays valid.
 */
export async function renameWorld(instanceDir: string, folderName: string, newName: string): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('World name cannot be empty.');
  }
  const worldDir = resolveWorldDir(instanceDir, folderName);
  const levelDatPath = path.join(worldDir, 'level.dat');

  const raw = await fs.promises.readFile(levelDatPath);
  const file = parseNbt(raw);
  const data = getCompound(file.root, 'Data');
  if (!data) {
    throw new Error('level.dat is missing its Data compound and cannot be edited.');
  }
  data.value.set('LevelName', { type: 'string', value: trimmed });

  // Write to a sibling temp file first so a crash cannot truncate level.dat.
  const tempPath = `${levelDatPath}.gravity-tmp`;
  await fs.promises.writeFile(tempPath, writeNbt(file));
  await fs.promises.rename(tempPath, levelDatPath);
}

export async function deleteWorld(instanceDir: string, folderName: string): Promise<void> {
  const worldDir = resolveWorldDir(instanceDir, folderName);
  await fs.promises.rm(worldDir, { recursive: true, force: true });
}

async function uniqueFolderName(savesDir: string, base: string): Promise<string> {
  // Strip characters that are illegal in folder names on Windows.
  const safeBase = base.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || 'World';
  let candidate = safeBase;
  let counter = 1;
  for (;;) {
    try {
      await fs.promises.access(path.join(savesDir, candidate));
      counter += 1;
      candidate = `${safeBase} (${counter})`;
    } catch {
      return candidate;
    }
  }
}

/** Copies a world folder and gives the copy a distinct LevelName. */
export async function duplicateWorld(instanceDir: string, folderName: string): Promise<WorldSummary | null> {
  const sourceDir = resolveWorldDir(instanceDir, folderName);
  const savesDir = path.join(instanceDir, 'saves');

  const existing = await readLevelDat(sourceDir);
  const sourceName = getString(getCompound(existing?.file.root, 'Data'), 'LevelName') || folderName;
  const copyName = `${sourceName} (Copy)`;

  const targetFolder = await uniqueFolderName(savesDir, copyName);
  const targetDir = path.join(savesDir, targetFolder);

  await fs.promises.cp(sourceDir, targetDir, { recursive: true });

  // session.lock belongs to the original world's running session, never the copy.
  await fs.promises.rm(path.join(targetDir, 'session.lock'), { force: true });

  try {
    await renameWorld(instanceDir, targetFolder, copyName);
  } catch {
    // A copy that keeps the old display name is still a usable copy.
  }

  const worlds = await listWorlds(instanceDir);
  return worlds.find((w) => w.folderName === targetFolder) ?? null;
}
