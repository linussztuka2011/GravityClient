import * as fs from 'fs';
import * as zlib from 'zlib';

/**
 * Reads a single named entry out of a zip archive.
 *
 * Just enough of the format to pull `fabric.mod.json` out of a mod jar, so the
 * launcher can check what the mod actually declares instead of assuming. That
 * assumption is what shipped a mod requiring Loader 0.19.5 while the launcher
 * installs the newest *stable* loader, 0.19.3.
 *
 * Deliberately dependency-free and synchronous: mod jars are small and this
 * runs once per install. Zip64 archives are not supported — a jar large enough
 * to need it is not a Fabric mod.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
/** The end-of-central-directory record is last, after a comment of up to 64 KiB. */
const MAX_COMMENT_SIZE = 0xffff;

/** Offset of the end-of-central-directory record, or -1 when there is none. */
function findEndOfCentralDirectory(buf: Buffer): number {
  const earliest = Math.max(0, buf.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  for (let i = buf.length - EOCD_MIN_SIZE; i >= earliest; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      return i;
    }
  }
  return -1;
}

/**
 * Returns the decompressed contents of `entryName`, or null when the archive
 * does not contain it. Throws only when the file is not a readable zip at all.
 */
export function readZipEntry(zipPath: string, entryName: string): Buffer | null {
  const buf = fs.readFileSync(zipPath);

  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) {
    throw new Error(`${zipPath} is not a valid zip archive (no end-of-central-directory record).`);
  }

  const entryCount = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_FILE_SIGNATURE) {
      throw new Error(`${zipPath} has a malformed central directory.`);
    }

    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name === entryName) {
      if (buf.readUInt32LE(localOffset) !== LOCAL_FILE_SIGNATURE) {
        throw new Error(`${zipPath} has a malformed local header for "${entryName}".`);
      }
      // The local header repeats the name and carries its own extra field,
      // whose length routinely differs from the central directory's.
      const localNameLength = buf.readUInt16LE(localOffset + 26);
      const localExtraLength = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = buf.subarray(dataStart, dataStart + compressedSize);

      if (method === 0) return Buffer.from(data);
      if (method === 8) return zlib.inflateRawSync(data);
      throw new Error(`"${entryName}" uses unsupported zip compression method ${method}.`);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return null;
}

/** Convenience wrapper for entries that hold JSON. */
export function readZipEntryJson<T = any>(zipPath: string, entryName: string): T | null {
  const raw = readZipEntry(zipPath, entryName);
  return raw === null ? null : (JSON.parse(raw.toString('utf8')) as T);
}
