import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';

/**
 * One HTTP download implementation for the whole launcher.
 *
 * It lives on its own — rather than inside ModrinthService — because the Fabric
 * installer needs the same guarantees for Minecraft's client jar: a transfer
 * that stops early must fail loudly instead of leaving a half-written file that
 * looks installed. A truncated client jar is exactly what produces Fabric's
 * "zip END header not found" crash, and minecraft-launcher-core only downloads
 * that jar when it is missing, so a corrupt one is never repaired on its own.
 */

/** Identifies the launcher to APIs that ask consumers to say who they are. */
export const DEFAULT_USER_AGENT =
  'GravityClient/1.0.0 (+https://github.com/linussztuka2011/GravityClient)';

export interface DownloadOptions {
  onProgress?: (percent: number) => void;
  userAgent?: string;
  /** Expected SHA-1. A mismatch deletes the file and rejects. */
  sha1?: string;
  /** Expected byte count, when the source publishes one. */
  expectedBytes?: number;
  redirectsLeft?: number;
}

/** Compares a local file against an expected hash. Missing file counts as a mismatch. */
export function verifyHash(
  filePath: string,
  expectedHash: string,
  type: 'sha1' | 'sha256' = 'sha1'
): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const digest = crypto.createHash(type).update(fs.readFileSync(filePath)).digest('hex');
    return digest.toLowerCase() === expectedHash.toLowerCase();
  } catch (err: any) {
    console.error(`[download] Hash check failed for ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Downloads `url` to `destPath`, following redirects and reporting progress.
 *
 * The transport is picked from the URL scheme so redirects and local test
 * servers both work. Any failure — bad status, short read, hash mismatch —
 * removes the partial file before rejecting.
 */
export function downloadFile(
  url: string,
  destPath: string,
  options: DownloadOptions = {}
): Promise<void> {
  const { onProgress, userAgent = DEFAULT_USER_AGENT, sha1, expectedBytes, redirectsLeft = 5 } = options;

  return new Promise((resolve, reject) => {
    let transport: typeof https | typeof http;
    try {
      const scheme = new URL(url).protocol;
      if (scheme === 'https:') transport = https;
      else if (scheme === 'http:') transport = http;
      else throw new Error(`Unsupported download protocol "${scheme}"`);
    } catch (err: any) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const request = transport.get(url, { headers: { 'User-Agent': userAgent } }, (response) => {
      const redirectStatuses = [301, 302, 303, 307, 308];
      if (redirectStatuses.includes(response.statusCode || 0)) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects while downloading.'));
            return;
          }
          response.resume(); // Drain so the socket can be reused.
          // Relative Location headers are legal; resolve against the current URL.
          downloadFile(new URL(redirectUrl, url).toString(), destPath, {
            ...options,
            redirectsLeft: redirectsLeft - 1,
          })
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Server returned HTTP ${response.statusCode} - ${response.statusMessage}`));
        return;
      }

      const headerBytes = parseInt(response.headers['content-length'] || '0', 10);
      const totalBytes = headerBytes > 0 ? headerBytes : expectedBytes || 0;
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(destPath);

      const failed = (err: Error) => {
        fileStream.destroy();
        response.destroy();
        // A partial file must never be left behind to masquerade as a real one.
        try { fs.unlinkSync(destPath); } catch { /* may not exist yet */ }
        reject(err);
      };

      // Count bytes for progress, but let pipe() do the writing so backpressure
      // is respected instead of buffering the whole file in memory.
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && onProgress) {
          onProgress(Math.round((downloadedBytes / totalBytes) * 100));
        }
      });

      response.pipe(fileStream);

      // Resolve on the file stream's 'finish', not the response's 'end': end
      // only means the last byte arrived, while writes may still be buffered.
      // Resolving early is what truncated larger jars on disk.
      fileStream.on('finish', () => {
        if (totalBytes > 0 && downloadedBytes !== totalBytes) {
          failed(new Error(`Incomplete download: got ${downloadedBytes} of ${totalBytes} bytes.`));
          return;
        }
        if (sha1 && !verifyHash(destPath, sha1)) {
          failed(new Error('Downloaded file did not match the expected SHA-1 — it was discarded.'));
          return;
        }
        resolve();
      });

      fileStream.on('error', failed);
      response.on('error', failed);
    });

    request.on('error', reject);
  });
}
