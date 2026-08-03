import * as zlib from 'zlib';

/**
 * Minimal NBT (Named Binary Tag) codec covering everything the launcher needs to
 * read and write Minecraft's own data files: `level.dat` (gzipped) for world
 * metadata and `servers.dat` (uncompressed) for the multiplayer list.
 *
 * Tags keep their concrete type so a file can be parsed, edited and written back
 * without corrupting fields the launcher does not understand.
 */

export type NbtTagType =
  | 'end'
  | 'byte'
  | 'short'
  | 'int'
  | 'long'
  | 'float'
  | 'double'
  | 'byteArray'
  | 'string'
  | 'list'
  | 'compound'
  | 'intArray'
  | 'longArray';

export type NbtCompound = Map<string, NbtTag>;

export type NbtTag =
  | { type: 'byte'; value: number }
  | { type: 'short'; value: number }
  | { type: 'int'; value: number }
  | { type: 'long'; value: bigint }
  | { type: 'float'; value: number }
  | { type: 'double'; value: number }
  | { type: 'byteArray'; value: Buffer }
  | { type: 'string'; value: string }
  | { type: 'list'; elementType: NbtTagType; value: NbtTag[] }
  | { type: 'compound'; value: NbtCompound }
  | { type: 'intArray'; value: number[] }
  | { type: 'longArray'; value: bigint[] };

const TYPE_BY_ID: NbtTagType[] = [
  'end', 'byte', 'short', 'int', 'long', 'float', 'double',
  'byteArray', 'string', 'list', 'compound', 'intArray', 'longArray'
];

function idOf(type: NbtTagType): number {
  const id = TYPE_BY_ID.indexOf(type);
  if (id < 0) {
    throw new Error(`Unknown NBT tag type: ${type}`);
  }
  return id;
}

/**
 * Minecraft stores strings as "modified UTF-8": U+0000 is written as two bytes
 * and supplementary characters are written as two 3-byte surrogates rather than
 * one 4-byte sequence. Decoding per UTF-16 code unit keeps emoji in server names
 * and MOTDs intact.
 */
function decodeModifiedUtf8(buf: Buffer): string {
  const units: number[] = [];
  let i = 0;
  while (i < buf.length) {
    const a = buf[i];
    if ((a & 0x80) === 0) {
      units.push(a);
      i += 1;
    } else if ((a & 0xe0) === 0xc0) {
      if (i + 1 >= buf.length) throw new Error('Truncated 2-byte NBT string sequence');
      units.push(((a & 0x1f) << 6) | (buf[i + 1] & 0x3f));
      i += 2;
    } else if ((a & 0xf0) === 0xe0) {
      if (i + 2 >= buf.length) throw new Error('Truncated 3-byte NBT string sequence');
      units.push(((a & 0x0f) << 12) | ((buf[i + 1] & 0x3f) << 6) | (buf[i + 2] & 0x3f));
      i += 3;
    } else {
      throw new Error(`Invalid modified UTF-8 lead byte 0x${a.toString(16)} in NBT string`);
    }
  }
  // Built in chunks: String.fromCharCode has an argument-count limit on long strings.
  let out = '';
  for (let start = 0; start < units.length; start += 4096) {
    out += String.fromCharCode(...units.slice(start, start + 4096));
  }
  return out;
}

function encodeModifiedUtf8(str: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 0) {
      bytes.push(0xc0, 0x80);
    } else if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return Buffer.from(bytes);
}

class NbtReader {
  private offset = 0;

  constructor(private readonly buf: Buffer) {}

  private need(bytes: number): void {
    if (this.offset + bytes > this.buf.length) {
      throw new Error(`Unexpected end of NBT data (wanted ${bytes} bytes at offset ${this.offset})`);
    }
  }

  readByte(): number {
    this.need(1);
    const v = this.buf.readInt8(this.offset);
    this.offset += 1;
    return v;
  }

  readUByte(): number {
    this.need(1);
    const v = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }

  readShort(): number {
    this.need(2);
    const v = this.buf.readInt16BE(this.offset);
    this.offset += 2;
    return v;
  }

  readUShort(): number {
    this.need(2);
    const v = this.buf.readUInt16BE(this.offset);
    this.offset += 2;
    return v;
  }

  readInt(): number {
    this.need(4);
    const v = this.buf.readInt32BE(this.offset);
    this.offset += 4;
    return v;
  }

  readLong(): bigint {
    this.need(8);
    const v = this.buf.readBigInt64BE(this.offset);
    this.offset += 8;
    return v;
  }

  readFloat(): number {
    this.need(4);
    const v = this.buf.readFloatBE(this.offset);
    this.offset += 4;
    return v;
  }

  readDouble(): number {
    this.need(8);
    const v = this.buf.readDoubleBE(this.offset);
    this.offset += 8;
    return v;
  }

  readString(): string {
    const length = this.readUShort();
    this.need(length);
    const slice = this.buf.subarray(this.offset, this.offset + length);
    this.offset += length;
    return decodeModifiedUtf8(slice);
  }

  readPayload(type: NbtTagType): NbtTag {
    switch (type) {
      case 'byte':
        return { type, value: this.readByte() };
      case 'short':
        return { type, value: this.readShort() };
      case 'int':
        return { type, value: this.readInt() };
      case 'long':
        return { type, value: this.readLong() };
      case 'float':
        return { type, value: this.readFloat() };
      case 'double':
        return { type, value: this.readDouble() };
      case 'byteArray': {
        const length = this.readInt();
        if (length < 0) throw new Error('Negative NBT byte array length');
        this.need(length);
        const slice = Buffer.from(this.buf.subarray(this.offset, this.offset + length));
        this.offset += length;
        return { type, value: slice };
      }
      case 'string':
        return { type, value: this.readString() };
      case 'list': {
        const elementId = this.readUByte();
        const elementType = TYPE_BY_ID[elementId];
        if (!elementType) throw new Error(`Unknown NBT list element type id ${elementId}`);
        const length = this.readInt();
        const value: NbtTag[] = [];
        if (length > 0) {
          if (elementType === 'end') {
            throw new Error('NBT list declares TAG_End elements but has a non-zero length');
          }
          for (let i = 0; i < length; i++) {
            value.push(this.readPayload(elementType));
          }
        }
        return { type, elementType, value };
      }
      case 'compound': {
        const value: NbtCompound = new Map();
        for (;;) {
          const entryId = this.readUByte();
          const entryType = TYPE_BY_ID[entryId];
          if (!entryType) throw new Error(`Unknown NBT tag type id ${entryId}`);
          if (entryType === 'end') break;
          const name = this.readString();
          value.set(name, this.readPayload(entryType));
        }
        return { type, value };
      }
      case 'intArray': {
        const length = this.readInt();
        if (length < 0) throw new Error('Negative NBT int array length');
        const value: number[] = [];
        for (let i = 0; i < length; i++) value.push(this.readInt());
        return { type, value };
      }
      case 'longArray': {
        const length = this.readInt();
        if (length < 0) throw new Error('Negative NBT long array length');
        const value: bigint[] = [];
        for (let i = 0; i < length; i++) value.push(this.readLong());
        return { type, value };
      }
      case 'end':
        throw new Error('Cannot read a payload for TAG_End');
    }
  }
}

class NbtWriter {
  private readonly chunks: Buffer[] = [];

  push(buf: Buffer): void {
    this.chunks.push(buf);
  }

  writeByte(v: number): void {
    const b = Buffer.allocUnsafe(1);
    b.writeInt8(v, 0);
    this.push(b);
  }

  writeUByte(v: number): void {
    const b = Buffer.allocUnsafe(1);
    b.writeUInt8(v, 0);
    this.push(b);
  }

  writeShort(v: number): void {
    const b = Buffer.allocUnsafe(2);
    b.writeInt16BE(v, 0);
    this.push(b);
  }

  writeUShort(v: number): void {
    const b = Buffer.allocUnsafe(2);
    b.writeUInt16BE(v, 0);
    this.push(b);
  }

  writeInt(v: number): void {
    const b = Buffer.allocUnsafe(4);
    b.writeInt32BE(v, 0);
    this.push(b);
  }

  writeLong(v: bigint): void {
    const b = Buffer.allocUnsafe(8);
    b.writeBigInt64BE(v, 0);
    this.push(b);
  }

  writeFloat(v: number): void {
    const b = Buffer.allocUnsafe(4);
    b.writeFloatBE(v, 0);
    this.push(b);
  }

  writeDouble(v: number): void {
    const b = Buffer.allocUnsafe(8);
    b.writeDoubleBE(v, 0);
    this.push(b);
  }

  writeString(v: string): void {
    const encoded = encodeModifiedUtf8(v);
    if (encoded.length > 0xffff) {
      throw new Error('NBT string exceeds the 65535 byte limit');
    }
    this.writeUShort(encoded.length);
    this.push(encoded);
  }

  writePayload(tag: NbtTag): void {
    switch (tag.type) {
      case 'byte': return this.writeByte(tag.value);
      case 'short': return this.writeShort(tag.value);
      case 'int': return this.writeInt(tag.value);
      case 'long': return this.writeLong(tag.value);
      case 'float': return this.writeFloat(tag.value);
      case 'double': return this.writeDouble(tag.value);
      case 'byteArray':
        this.writeInt(tag.value.length);
        return this.push(Buffer.from(tag.value));
      case 'string': return this.writeString(tag.value);
      case 'list': {
        const elementType = tag.value.length > 0 ? tag.value[0].type : tag.elementType;
        this.writeUByte(idOf(elementType));
        this.writeInt(tag.value.length);
        for (const entry of tag.value) {
          if (entry.type !== elementType) {
            throw new Error(`Mixed NBT list: expected ${elementType}, found ${entry.type}`);
          }
          this.writePayload(entry);
        }
        return;
      }
      case 'compound': {
        for (const [name, entry] of tag.value) {
          this.writeUByte(idOf(entry.type));
          this.writeString(name);
          this.writePayload(entry);
        }
        this.writeUByte(idOf('end'));
        return;
      }
      case 'intArray':
        this.writeInt(tag.value.length);
        for (const n of tag.value) this.writeInt(n);
        return;
      case 'longArray':
        this.writeInt(tag.value.length);
        for (const n of tag.value) this.writeLong(n);
        return;
    }
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export interface NbtFile {
  /** Root tag name, almost always the empty string. */
  name: string;
  root: NbtTag & { type: 'compound' };
  /** How the file was stored, so a rewrite keeps the original framing. */
  compression: 'gzip' | 'zlib' | 'none';
}

function decompress(buf: Buffer): { data: Buffer; compression: NbtFile['compression'] } {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return { data: zlib.gunzipSync(buf), compression: 'gzip' };
  }
  // zlib streams start with a 0x78 CMF byte followed by a valid check byte.
  if (buf.length >= 2 && buf[0] === 0x78 && (buf.readUInt16BE(0) % 31 === 0)) {
    return { data: zlib.inflateSync(buf), compression: 'zlib' };
  }
  return { data: buf, compression: 'none' };
}

/** Parses an NBT buffer, transparently handling gzip/zlib framing. */
export function parseNbt(buf: Buffer): NbtFile {
  const { data, compression } = decompress(buf);
  const reader = new NbtReader(data);
  const rootId = reader.readUByte();
  const rootType = TYPE_BY_ID[rootId];
  if (rootType !== 'compound') {
    throw new Error(`Expected an NBT root compound, found tag type "${rootType ?? rootId}"`);
  }
  const name = reader.readString();
  const root = reader.readPayload('compound') as NbtTag & { type: 'compound' };
  return { name, root, compression };
}

/** Serialises an NBT file back to a buffer using the requested framing. */
export function writeNbt(file: NbtFile): Buffer {
  const writer = new NbtWriter();
  writer.writeUByte(idOf('compound'));
  writer.writeString(file.name);
  writer.writePayload(file.root);
  const raw = writer.toBuffer();

  switch (file.compression) {
    case 'gzip': return zlib.gzipSync(raw);
    case 'zlib': return zlib.deflateSync(raw);
    case 'none': return raw;
  }
}

// ---------------------------------------------------------------------------
// Typed accessors — keep call sites free of repetitive tag-shape checks.
// ---------------------------------------------------------------------------

export function getCompound(parent: NbtTag | undefined, key: string): (NbtTag & { type: 'compound' }) | undefined {
  if (parent?.type !== 'compound') return undefined;
  const tag = parent.value.get(key);
  return tag?.type === 'compound' ? tag : undefined;
}

export function getList(parent: NbtTag | undefined, key: string): (NbtTag & { type: 'list' }) | undefined {
  if (parent?.type !== 'compound') return undefined;
  const tag = parent.value.get(key);
  return tag?.type === 'list' ? tag : undefined;
}

export function getString(parent: NbtTag | undefined, key: string): string | undefined {
  if (parent?.type !== 'compound') return undefined;
  const tag = parent.value.get(key);
  return tag?.type === 'string' ? tag.value : undefined;
}

/** Reads any numeric tag as a JS number; longs are clamped to safe-integer range. */
export function getNumber(parent: NbtTag | undefined, key: string): number | undefined {
  if (parent?.type !== 'compound') return undefined;
  const tag = parent.value.get(key);
  if (!tag) return undefined;
  switch (tag.type) {
    case 'byte':
    case 'short':
    case 'int':
    case 'float':
    case 'double':
      return tag.value;
    case 'long':
      return Number(tag.value);
    default:
      return undefined;
  }
}

export function getBoolean(parent: NbtTag | undefined, key: string): boolean | undefined {
  const n = getNumber(parent, key);
  return n === undefined ? undefined : n !== 0;
}

export function setString(parent: NbtTag & { type: 'compound' }, key: string, value: string): void {
  parent.value.set(key, { type: 'string', value });
}

export function compound(entries: Record<string, NbtTag> = {}): NbtTag & { type: 'compound' } {
  return { type: 'compound', value: new Map(Object.entries(entries)) };
}
