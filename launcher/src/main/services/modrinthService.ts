import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';
import { MinecraftPaths } from './minecraftPaths.js';

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
          'User-Agent': 'GravityClient/1.0.0 (linus@gravityclient.net)'
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
   * Installs a specific Modrinth mod directly into an instance's mods folder.
   */
  static async installModToInstance(
    instanceId: string,
    projectId: string,
    mcVersion: string = '1.21',
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; filename: string; version: string }> {
    console.log(`[ModrinthService] Attempting to install project "${projectId}" to instance: "${instanceId}"`);
    
    const modsDir = MinecraftPaths.getInstanceModsDir(instanceId);
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    // 1. Resolve project versions
    const versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version`;
    const res = await fetch(versionsUrl, {
      headers: {
        'User-Agent': 'GravityClient/1.0.0 (linus@gravityclient.net)'
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
    await this.downloadFile(downloadUrl, destPath, (pct) => {
      // Scale progress to 10-100%
      const scaled = 10 + Math.round(pct * 0.9);
      if (onProgress) onProgress(scaled);
    });

    return {
      success: true,
      filename,
      version: compatibleVersion.version_number
    };
  }

  /**
   * Chunked HTTPS download utility supporting redirects and real-time progress callbacks.
   */
  private static downloadFile(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
          'User-Agent': 'GravityClient/1.0.0 (linus@gravityclient.net)'
        }
      }, (response) => {
        // Follow common redirect statuses (301, 302, 303, 307, 308)
        const redirectStatuses = [301, 302, 303, 307, 308];
        if (redirectStatuses.includes(response.statusCode || 0)) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Server returned HTTP ${response.statusCode} - ${response.statusMessage}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);
          if (totalBytes > 0 && onProgress) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            onProgress(percent);
          }
        });

        response.on('end', () => {
          fileStream.end();
          resolve();
        });

        response.on('error', (err) => {
          fileStream.close();
          // Clean up partial file on failure
          if (fs.existsSync(destPath)) {
            try { fs.unlinkSync(destPath); } catch {}
          }
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Downloads a mod from Modrinth, with support for resolving by SHA-1 hash or falling back
   * to resolving the latest compatible version. Saves the file specifically as `<modId>.jar`.
   */
  static async downloadMod(
    modId: string,
    destDir: string,
    expectedHash?: string,
    onProgress?: (progress: number) => void,
    mcVersion: string = '1.21'
  ): Promise<string> {
    console.log(`[ModrinthService] downloadMod called for "${modId}", expectedHash: "${expectedHash || 'none'}", mcVersion: "${mcVersion}"`);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, `${modId}.jar`);
    let downloadUrl: string | null = null;

    // 1. Try to resolve via SHA-1 hash if provided
    if (expectedHash) {
      const hashUrl = `https://api.modrinth.com/v2/version_file/${expectedHash}?algorithm=sha1`;
      try {
        const res = await fetch(hashUrl, {
          headers: {
            'User-Agent': 'GravityClient/1.0.0 (linus@gravityclient.net)'
          }
        });
        
        if (res.ok) {
          const versionObj = await res.json() as any;
          const files = versionObj.files || [];
          const matchedFile = files.find((f: any) => f.hashes?.sha1 === expectedHash) || files.find((f: any) => f.primary) || files[0];
          
          if (matchedFile && matchedFile.url) {
            downloadUrl = matchedFile.url;
            console.log(`[ModrinthService] Resolved download URL from hash: ${downloadUrl}`);
          }
        } else {
          console.warn(`[ModrinthService] Hash resolution failed with status ${res.status}. Falling back to version search.`);
        }
      } catch (err: any) {
        console.warn(`[ModrinthService] Hash resolution error: ${err.message}. Falling back to version search.`);
      }
    }

    // 2. Fall back to searching for a compatible version if hash lookup wasn't successful/provided
    if (!downloadUrl) {
      const versionsUrl = `https://api.modrinth.com/v2/project/${modId}/version`;
      try {
        const res = await fetch(versionsUrl, {
          headers: {
            'User-Agent': 'GravityClient/1.0.0 (linus@gravityclient.net)'
          }
        });

        if (!res.ok) {
          throw new Error(`Failed to retrieve versions for project ${modId}: ${res.statusText}`);
        }

        const versions = await res.json() as any[];
        
        // Find latest version compatible with fabric loader and Minecraft mcVersion
        const compatibleVersion = versions.find((ver: any) => {
          const loaders = ver.loaders || [];
          const gameVersions = ver.game_versions || [];
          return loaders.includes('fabric') && gameVersions.includes(mcVersion);
        });

        if (!compatibleVersion) {
          throw new Error(`No compatible Fabric version found for project ${modId} on Minecraft ${mcVersion}`);
        }

        const files = compatibleVersion.files || [];
        const targetFile = files.find((f: any) => f.primary) || files[0];

        if (!targetFile || !targetFile.url) {
          throw new Error(`No files found for compatible version of project ${modId}`);
        }

        downloadUrl = targetFile.url;
        console.log(`[ModrinthService] Resolved download URL from version search: ${downloadUrl}`);
      } catch (err: any) {
        console.error(`[ModrinthService] Version search fallback failed:`, err.message);
        throw err;
      }
    }

    if (!downloadUrl) {
      throw new Error(`Failed to resolve download URL for Modrinth project ${modId}`);
    }

    // 3. Download the resolved file
    if (onProgress) onProgress(5);
    await this.downloadFile(downloadUrl, destPath, (pct) => {
      if (onProgress) onProgress(pct);
    });

    return destPath;
  }

  /**
   * Verifies the crypto hash of a local file against an expected hash value.
   */
  static verifyHash(filePath: string, expectedHash: string, type: 'sha1' | 'sha256' = 'sha1'): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash(type);
      hash.update(fileBuffer);
      const calculatedHash = hash.digest('hex');
      return calculatedHash.toLowerCase() === expectedHash.toLowerCase();
    } catch (err: any) {
      console.error(`[ModrinthService] Hash verification failed for ${filePath}:`, err.message);
      return false;
    }
  }
}
