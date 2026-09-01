import * as fs from 'fs';
import * as path from 'path';
import { readZipEntryJson } from './zip.js';
import { satisfiesRange } from './versionRange.js';

/**
 * Installs the companion Fabric mod (client-core) into an instance's mods
 * folder. Without this the launcher writes the mod's config but the jar itself
 * is never present, so the in-game keybind and HUD modules never load.
 *
 * The jar is looked up rather than downloaded: electron-builder ships it as an
 * extraResource, and in a dev checkout it is read straight out of the Gradle
 * build output so `./gradlew build` is enough to pick up local changes.
 *
 * Before copying, the mod's own `fabric.mod.json` is checked against the
 * instance's Minecraft version. Installing regardless is worse than skipping:
 * Fabric aborts the whole launch over one incompatible mod, so an instance on
 * an unsupported version would not start at all.
 */

/** Jars written by this installer are named so they can be found and replaced. */
export const CLIENT_CORE_PREFIX = 'gravity-client-core';

/**
 * Candidate locations for the built jar, most specific first.
 *
 * @param resourcesPath process.resourcesPath in a packaged app, undefined in dev
 * @param moduleDir     directory of the compiled main-process bundle
 */
export function clientCoreSearchDirs(resourcesPath: string | undefined, moduleDir: string): string[] {
  return [
    // Packaged: shipped next to packs/ as an extraResource.
    ...(resourcesPath ? [path.join(resourcesPath, 'client-core')] : []),
    // Dev checkout: launcher/out/main/services -> repo root -> gradle output.
    path.join(moduleDir, '..', '..', '..', '..', 'client-core', 'build', 'libs'),
    path.join(process.cwd(), '..', 'client-core', 'build', 'libs'),
  ];
}

/** Picks the newest non-sources jar in the first directory that has one. */
export function findClientCoreJar(searchDirs: string[]): string | null {
  for (const dir of searchDirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }

    const jars = entries
      .filter((f) => f.startsWith(CLIENT_CORE_PREFIX) && f.endsWith('.jar') && !f.includes('-sources'))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (jars.length > 0) {
      return jars[0];
    }
  }
  return null;
}

export interface ClientCoreMetadata {
  version?: string;
  /** Minecraft range the mod declares, e.g. ">=1.21.11 <1.22". */
  minecraft?: string;
  /** Fabric Loader range the mod declares. */
  fabricloader?: string;
}

/**
 * Reads the mod's declared dependencies from the jar. Returns null when the jar
 * cannot be read as one — the caller treats that as "cannot verify" rather than
 * as a hard failure.
 */
export function readClientCoreMetadata(jarPath: string): ClientCoreMetadata | null {
  try {
    const manifest = readZipEntryJson<any>(jarPath, 'fabric.mod.json');
    if (!manifest) return null;
    return {
      version: manifest.version,
      minecraft: manifest.depends?.minecraft,
      fabricloader: manifest.depends?.fabricloader,
    };
  } catch (err: any) {
    console.warn(`[clientCoreInstaller] Could not read ${jarPath}: ${err.message}`);
    return null;
  }
}

export interface ClientCoreInstallResult {
  installed: boolean;
  fileName?: string;
  reason?: string;
  /** Set when the jar was skipped because it does not support the instance. */
  incompatible?: boolean;
}

/** Deletes every companion-mod jar in `modsDir`. Returns how many went. */
function removeInstalledCopies(modsDir: string): number {
  let removed = 0;
  let entries: string[];
  try {
    entries = fs.readdirSync(modsDir);
  } catch {
    return 0;
  }
  for (const existing of entries) {
    if (existing.startsWith(CLIENT_CORE_PREFIX) && existing.endsWith('.jar')) {
      try {
        fs.unlinkSync(path.join(modsDir, existing));
        removed++;
      } catch {
        // Leave it; a same-named copy would be overwritten anyway.
      }
    }
  }
  return removed;
}

/**
 * Copies the companion mod into `modsDir`, replacing any older copy.
 *
 * When `mcVersion` is given and the mod does not declare support for it, no jar
 * is installed and any previously installed copy is removed, so the instance
 * still launches — without the companion mod — instead of being bricked by
 * Fabric's incompatible-mods screen.
 *
 * A missing jar is reported rather than thrown: the rest of the pack is still
 * perfectly usable without the companion mod.
 */
export function installClientCore(
  modsDir: string,
  searchDirs: string[],
  mcVersion?: string
): ClientCoreInstallResult {
  const source = findClientCoreJar(searchDirs);
  if (!source) {
    return {
      installed: false,
      reason:
        'Companion mod jar not found. Build it with "cd client-core && ./gradlew build" ' +
        'to enable the in-game settings screen and HUD modules.',
    };
  }

  if (mcVersion) {
    const metadata = readClientCoreMetadata(source);
    if (metadata && !satisfiesRange(mcVersion, metadata.minecraft)) {
      const removed = removeInstalledCopies(modsDir);
      return {
        installed: false,
        incompatible: true,
        reason:
          `The companion mod supports Minecraft ${metadata.minecraft}, but this instance is ` +
          `${mcVersion}, so the in-game settings screen and HUD modules are unavailable here. ` +
          (removed > 0 ? 'An incompatible copy was removed so the game still starts. ' : '') +
          `Create an instance on a supported version to use them.`,
      };
    }
  }

  fs.mkdirSync(modsDir, { recursive: true });

  // Drop stale copies first so version bumps do not stack up in mods/.
  removeInstalledCopies(modsDir);

  const fileName = path.basename(source);
  fs.copyFileSync(source, path.join(modsDir, fileName));
  return { installed: true, fileName };
}
