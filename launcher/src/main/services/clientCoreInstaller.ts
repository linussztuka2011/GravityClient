import * as fs from 'fs';
import * as path from 'path';

/**
 * Installs the companion Fabric mod (client-core) into an instance's mods
 * folder. Without this the launcher writes the mod's config but the jar itself
 * is never present, so the in-game keybind and HUD modules never load.
 *
 * The jar is looked up rather than downloaded: electron-builder ships it as an
 * extraResource, and in a dev checkout it is read straight out of the Gradle
 * build output so `./gradlew build` is enough to pick up local changes.
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

export interface ClientCoreInstallResult {
  installed: boolean;
  fileName?: string;
  reason?: string;
}

/**
 * Copies the companion mod into `modsDir`, replacing any older copy.
 *
 * A missing jar is reported rather than thrown: the rest of the pack is still
 * perfectly usable without the companion mod.
 */
export function installClientCore(modsDir: string, searchDirs: string[]): ClientCoreInstallResult {
  const source = findClientCoreJar(searchDirs);
  if (!source) {
    return {
      installed: false,
      reason:
        'Companion mod jar not found. Build it with "cd client-core && ./gradlew build" ' +
        'to enable the in-game settings screen and HUD modules.',
    };
  }

  fs.mkdirSync(modsDir, { recursive: true });

  // Drop stale copies first so version bumps do not stack up in mods/.
  for (const existing of fs.readdirSync(modsDir)) {
    if (existing.startsWith(CLIENT_CORE_PREFIX) && existing.endsWith('.jar')) {
      try {
        fs.unlinkSync(path.join(modsDir, existing));
      } catch {
        // Leave it; the copy below will overwrite a same-named file anyway.
      }
    }
  }

  const fileName = path.basename(source);
  fs.copyFileSync(source, path.join(modsDir, fileName));
  return { installed: true, fileName };
}
