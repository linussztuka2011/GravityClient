import * as fs from 'fs';
import * as path from 'path';
import { downloadFile, verifyHash, DEFAULT_USER_AGENT } from './download.js';

/**
 * Modrinth asks API consumers to identify themselves. Points at the project
 * rather than a personal address.
 */
const MODRINTH_USER_AGENT = DEFAULT_USER_AGENT;

export interface ModrinthSearchResult {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  author: string;
  categories: string[];
}

export class ModrinthService {
  /**
   * Performs a live search on Modrinth for compatible Fabric mods.
   */
  static async searchMods(query: string, mcVersion: string = '1.21'): Promise<ModrinthSearchResult[]> {
    console.log(`[ModrinthService] Searching mods with query: "${query}" for Minecraft version: "${mcVersion}"`);
    
    // Create the search facets. We want projects of type 'mod' compatible with 'fabric' and the specified MC version.
    const facets = [
      ['categories:fabric'],
      ['project_type:mod'],
      [`versions:${mcVersion}`]
    ];
    
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(JSON.stringify(facets))}&limit=24`;
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': MODRINTH_USER_AGENT
        }
      });
      
      if (!res.ok) {
        throw new Error(`Modrinth API search returned status ${res.status}: ${await res.text()}`);
      }
      
      const json = await res.json() as any;
      const hits = json.hits || [];
      
      return hits.map((hit: any) => ({
        project_id: hit.project_id,
        slug: hit.slug,
        title: hit.title,
        description: hit.description,
        icon_url: hit.icon_url,
        downloads: hit.downloads || 0,
        author: hit.author || 'Unknown',
        categories: hit.categories || []
      }));
    } catch (err: any) {
      console.error('[ModrinthService] Search error:', err.message);
      throw err;
    }
  }

  /**
   * Installs a specific Modrinth mod into a mods folder.
   *
   * Takes the directory rather than an instance id so this module needs no
   * Electron import and stays runnable — and testable — outside the app.
   */
  static async installModToInstance(
    modsDir: string,
    projectId: string,
    mcVersion: string = '1.21',
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; filename: string; version: string }> {
    console.log(`[ModrinthService] Attempting to install project "${projectId}" into: "${modsDir}"`);

    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    // 1. Resolve project versions
    const versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version`;
    const res = await fetch(versionsUrl, {
      headers: {
        'User-Agent': MODRINTH_USER_AGENT
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve versions for Modrinth project ${projectId}: ${res.statusText}`);
    }

    const versions = await res.json() as any[];
    
    // 2. Scan for a version compatible with 'fabric' loader and 'mcVersion'
    const compatibleVersion = versions.find((ver: any) => {
      const loaders = ver.loaders || [];
      const gameVersions = ver.game_versions || [];
      return loaders.includes('fabric') && gameVersions.includes(mcVersion);
    });

    if (!compatibleVersion) {
      throw new Error(`No compatible Fabric mod version found on Modrinth for Minecraft ${mcVersion}`);
    }

    // 3. Extract the primary download file
    const files = compatibleVersion.files || [];
    const targetFile = files.find((f: any) => f.primary) || files[0];

    if (!targetFile) {
      throw new Error(`Compatible version ${compatibleVersion.version_number} has no downloadable files.`);
    }

    const downloadUrl = targetFile.url;
    const filename = targetFile.filename;
    const destPath = path.join(modsDir, filename);

    console.log(`[ModrinthService] Resolved download: ${filename} from URL: ${downloadUrl}`);

    // 4. Download file with progress tracking
    if (onProgress) onProgress(5);
    await downloadFile(downloadUrl, destPath, {
      sha1: targetFile.hashes?.sha1,
      onProgress: (pct) => {
        // Scale progress to 10-100%
        if (onProgress) onProgress(10 + Math.round(pct * 0.9));
      },
    });

    return {
      success: true,
      filename,
      version: compatibleVersion.version_number
    };
  }

  /**
   * Downloads the newest Fabric build of a Modrinth project for the given
   * Minecraft version and saves it as `<fileName>.jar`.
   *
   * `project` should be a Modrinth project ID. The API also accepts slugs, but
   * IDs are stable while slugs get renamed — resolving by slug is what made
   * FerriteCore fail, since its slug is "ferrite-core" rather than the internal
   * id "ferritecore".
   *
   * Integrity is checked against the SHA-1 Modrinth publishes for the exact
   * file that was downloaded, so a truncated or corrupted transfer is caught
   * without pinning a hash in the manifest that goes stale on every update.
   */
  static async downloadMod(
    project: string,
    destDir: string,
    fileName: string,
    onProgress?: (progress: number) => void,
    mcVersion: string = '1.21'
  ): Promise<string> {
    console.log(`[ModrinthService] Resolving "${project}" for Minecraft ${mcVersion}`);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, `${fileName}.jar`);

    // Ask Modrinth to filter server-side so we only get candidate builds.
    const query = new URLSearchParams({
      game_versions: JSON.stringify([mcVersion]),
      loaders: JSON.stringify(['fabric']),
    });
    const versionsUrl = `https://api.modrinth.com/v2/project/${project}/version?${query}`;

    const res = await fetch(versionsUrl, {
      headers: { 'User-Agent': MODRINTH_USER_AGENT },
    });

    if (res.status === 404) {
      throw new Error(
        `Modrinth has no project "${project}". The pack manifest may reference a renamed or removed mod.`
      );
    }
    if (!res.ok) {
      throw new Error(`Failed to retrieve versions for project ${project}: HTTP ${res.status} ${res.statusText}`);
    }

    const versions = (await res.json()) as any[];
    if (!Array.isArray(versions) || versions.length === 0) {
      throw new Error(`No Fabric build of "${project}" supports Minecraft ${mcVersion}.`);
    }

    // Modrinth returns newest first; prefer a release over a beta/alpha.
    const chosen =
      versions.find((v: any) => v.version_type === 'release') ?? versions[0];

    const files = chosen.files || [];
    const targetFile = files.find((f: any) => f.primary) || files[0];
    if (!targetFile?.url) {
      throw new Error(`Version ${chosen.version_number} of "${project}" has no downloadable file.`);
    }

    console.log(`[ModrinthService] ${project} -> ${targetFile.filename} (${chosen.version_number})`);

    if (onProgress) onProgress(5);

    // Integrity is checked against the SHA-1 Modrinth publishes for this exact
    // file, so a truncated transfer is caught and the partial file discarded.
    try {
      await downloadFile(targetFile.url, destPath, {
        sha1: targetFile.hashes?.sha1,
        onProgress,
      });
    } catch (err: any) {
      throw new Error(`Downloading ${targetFile.filename} failed: ${err.message}`);
    }

    return destPath;
  }

  /** Verifies a local file against an expected hash. */
  static verifyHash(filePath: string, expectedHash: string, type: 'sha1' | 'sha256' = 'sha1'): boolean {
    return verifyHash(filePath, expectedHash, type);
  }
}
