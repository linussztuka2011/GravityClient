import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import * as dns from 'dns';
import { parseNbt, writeNbt, compound, getList, getString, NbtFile, NbtTag } from './nbt.js';

/**
 * Manages the real multiplayer server list (`servers.dat`, the same file the
 * vanilla client reads) and queries live server status using Minecraft's
 * Server List Ping protocol.
 */

export interface ServerEntry {
  /** Position in servers.dat — this is the identity Minecraft itself uses. */
  index: number;
  name: string;
  ip: string;
  /** Base64 PNG stored by the game, without a data: prefix. */
  icon?: string;
}

export interface ServerStatus {
  online: boolean;
  motd?: string;
  playersOnline?: number;
  playersMax?: number;
  version?: string;
  /** Round-trip latency in milliseconds. */
  latencyMs?: number;
  /** data: URI ready for an <img> tag. */
  favicon?: string;
  error?: string;
}

const DEFAULT_PORT = 25565;
const PING_TIMEOUT_MS = 5000;

function serversDatPath(instanceDir: string): string {
  return path.join(instanceDir, 'servers.dat');
}

async function readServersFile(instanceDir: string): Promise<NbtFile> {
  try {
    const raw = await fs.promises.readFile(serversDatPath(instanceDir));
    return parseNbt(raw);
  } catch {
    // No list yet (or unreadable) — start from an empty one.
    return {
      name: '',
      root: compound({ servers: { type: 'list', elementType: 'compound', value: [] } }),
      compression: 'none',
    };
  }
}

async function writeServersFile(instanceDir: string, file: NbtFile): Promise<void> {
  const target = serversDatPath(instanceDir);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  const tempPath = `${target}.gravity-tmp`;
  await fs.promises.writeFile(tempPath, writeNbt(file));
  await fs.promises.rename(tempPath, target);
}

function serverList(file: NbtFile): NbtTag[] {
  const list = getList(file.root, 'servers');
  if (list) return list.value;
  const created: NbtTag = { type: 'list', elementType: 'compound', value: [] };
  file.root.value.set('servers', created);
  return (created as NbtTag & { type: 'list' }).value;
}

export async function listServers(instanceDir: string): Promise<ServerEntry[]> {
  const file = await readServersFile(instanceDir);
  return serverList(file).map((tag, index) => ({
    index,
    name: getString(tag, 'name') ?? `Server ${index + 1}`,
    ip: getString(tag, 'ip') ?? '',
    icon: getString(tag, 'icon'),
  }));
}

export async function addServer(instanceDir: string, name: string, ip: string): Promise<ServerEntry[]> {
  if (!name.trim() || !ip.trim()) {
    throw new Error('Both a server name and address are required.');
  }
  const file = await readServersFile(instanceDir);
  serverList(file).push(
    compound({
      name: { type: 'string', value: name.trim() },
      ip: { type: 'string', value: ip.trim() },
    })
  );
  await writeServersFile(instanceDir, file);
  return listServers(instanceDir);
}

/** Edits an entry in place so fields the launcher does not model are preserved. */
export async function updateServer(instanceDir: string, index: number, name: string, ip: string): Promise<ServerEntry[]> {
  if (!name.trim() || !ip.trim()) {
    throw new Error('Both a server name and address are required.');
  }
  const file = await readServersFile(instanceDir);
  const servers = serverList(file);
  const entry = servers[index];
  if (!entry || entry.type !== 'compound') {
    throw new Error(`No server at position ${index}.`);
  }
  entry.value.set('name', { type: 'string', value: name.trim() });
  entry.value.set('ip', { type: 'string', value: ip.trim() });
  await writeServersFile(instanceDir, file);
  return listServers(instanceDir);
}

export async function deleteServer(instanceDir: string, index: number): Promise<ServerEntry[]> {
  const file = await readServersFile(instanceDir);
  const servers = serverList(file);
  if (index < 0 || index >= servers.length) {
    throw new Error(`No server at position ${index}.`);
  }
  servers.splice(index, 1);
  await writeServersFile(instanceDir, file);
  return listServers(instanceDir);
}

// ---------------------------------------------------------------------------
// Server List Ping
// ---------------------------------------------------------------------------

function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  for (;;) {
    if ((v & ~0x7f) === 0) {
      bytes.push(v);
      break;
    }
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): { value: number; size: number } | null {
  let value = 0;
  let size = 0;
  for (;;) {
    if (offset + size >= buf.length) return null; // Need more bytes.
    const byte = buf[offset + size];
    value |= (byte & 0x7f) << (7 * size);
    size += 1;
    if ((byte & 0x80) === 0) break;
    if (size > 5) throw new Error('VarInt is too long');
  }
  return { value: value >>> 0, size };
}

function packet(id: number, payload: Buffer): Buffer {
  const body = Buffer.concat([writeVarInt(id), payload]);
  return Buffer.concat([writeVarInt(body.length), body]);
}

function writeProtocolString(str: string): Buffer {
  const encoded = Buffer.from(str, 'utf8');
  return Buffer.concat([writeVarInt(encoded.length), encoded]);
}

/** Splits "host:port" while tolerating IPv6 literals such as "[::1]:25565". */
function parseAddress(address: string): { host: string; port: number | null } {
  const trimmed = address.trim();
  const ipv6 = trimmed.match(/^\[(.+)\](?::(\d+))?$/);
  if (ipv6) {
    return { host: ipv6[1], port: ipv6[2] ? Number(ipv6[2]) : null };
  }
  const lastColon = trimmed.lastIndexOf(':');
  if (lastColon > -1 && !trimmed.slice(lastColon + 1).includes(':')) {
    const maybePort = Number(trimmed.slice(lastColon + 1));
    if (Number.isInteger(maybePort) && maybePort > 0 && maybePort <= 65535) {
      return { host: trimmed.slice(0, lastColon), port: maybePort };
    }
  }
  return { host: trimmed, port: null };
}

/**
 * Minecraft servers advertise their real host/port through a SRV record, which
 * is how addresses like "mc.example.net" reach a non-default port.
 */
async function resolveTarget(host: string, explicitPort: number | null): Promise<{ host: string; port: number }> {
  if (explicitPort !== null) {
    return { host, port: explicitPort };
  }
  if (net.isIP(host)) {
    return { host, port: DEFAULT_PORT };
  }
  try {
    const records = await dns.promises.resolveSrv(`_minecraft._tcp.${host}`);
    if (records.length > 0) {
      const best = records.sort((a, b) => a.priority - b.priority)[0];
      return { host: best.name, port: best.port };
    }
  } catch {
    // No SRV record is entirely normal.
  }
  return { host, port: DEFAULT_PORT };
}

/** Flattens a chat component (or legacy string) into displayable plain text. */
function flattenMotd(description: any): string {
  if (description === null || description === undefined) return '';
  if (typeof description === 'string') return description;
  if (Array.isArray(description)) return description.map(flattenMotd).join('');

  let text = typeof description.text === 'string' ? description.text : '';
  if (typeof description.translate === 'string' && !text) {
    text = description.translate;
  }
  if (Array.isArray(description.extra)) {
    text += description.extra.map(flattenMotd).join('');
  }
  return text;
}

/** Removes legacy section-sign formatting codes so the MOTD renders cleanly. */
function stripFormatting(text: string): string {
  return text.replace(/§[0-9a-fk-orA-FK-OR]/g, '').replace(/\s+/g, ' ').trim();
}

export function pingServer(address: string, timeoutMs: number = PING_TIMEOUT_MS): Promise<ServerStatus> {
  return new Promise(async (resolve) => {
    if (!address || !address.trim()) {
      resolve({ online: false, error: 'No server address configured.' });
      return;
    }

    const { host: rawHost, port: rawPort } = parseAddress(address);
    let target: { host: string; port: number };
    try {
      target = await resolveTarget(rawHost, rawPort);
    } catch (err: any) {
      resolve({ online: false, error: `Could not resolve ${rawHost}: ${err.message}` });
      return;
    }

    let settled = false;
    const finish = (status: ServerStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(status);
    };

    const timer = setTimeout(() => {
      finish({ online: false, error: `No response within ${timeoutMs} ms.` });
    }, timeoutMs);

    const socket = net.createConnection({ host: target.host, port: target.port });
    socket.setNoDelay(true);

    let buffer = Buffer.alloc(0);
    let statusJson: any = null;
    let pingSentAt = 0;

    socket.on('connect', () => {
      // Handshake: protocol -1 means "just querying", accepted by all versions.
      const handshake = packet(
        0x00,
        Buffer.concat([
          writeVarInt(-1), // Unspecified protocol version.
          writeProtocolString(rawHost),
          (() => {
            const b = Buffer.allocUnsafe(2);
            b.writeUInt16BE(target.port, 0);
            return b;
          })(),
          writeVarInt(1), // Next state: status.
        ])
      );
      socket.write(Buffer.concat([handshake, packet(0x00, Buffer.alloc(0))]));
    });

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      for (;;) {
        let header: { value: number; size: number } | null;
        try {
          header = readVarInt(buffer, 0);
        } catch (err: any) {
          finish({ online: false, error: `Malformed response: ${err.message}` });
          return;
        }
        if (!header) return; // Wait for more bytes.

        const totalLength = header.size + header.value;
        if (buffer.length < totalLength) return; // Packet still incomplete.

        const body = buffer.subarray(header.size, totalLength);
        buffer = buffer.subarray(totalLength);

        let idInfo: { value: number; size: number } | null;
        try {
          idInfo = readVarInt(body, 0);
        } catch (err: any) {
          finish({ online: false, error: `Malformed packet id: ${err.message}` });
          return;
        }
        if (!idInfo) {
          finish({ online: false, error: 'Truncated packet id in server response.' });
          return;
        }

        const payload = body.subarray(idInfo.size);

        if (idInfo.value === 0x00 && statusJson === null) {
          const strInfo = readVarInt(payload, 0);
          if (!strInfo) {
            finish({ online: false, error: 'Truncated status payload.' });
            return;
          }
          const jsonBytes = payload.subarray(strInfo.size, strInfo.size + strInfo.value);
          try {
            statusJson = JSON.parse(jsonBytes.toString('utf8'));
          } catch (err: any) {
            finish({ online: false, error: `Server sent invalid status JSON: ${err.message}` });
            return;
          }

          // Follow up with a ping so latency reflects a real round trip.
          pingSentAt = Date.now();
          const payloadBuf = Buffer.allocUnsafe(8);
          payloadBuf.writeBigInt64BE(BigInt(pingSentAt), 0);
          socket.write(packet(0x01, payloadBuf));
          continue;
        }

        if (idInfo.value === 0x01 && statusJson !== null) {
          finish(buildStatus(statusJson, Date.now() - pingSentAt));
          return;
        }
      }
    });

    socket.on('error', (err: any) => {
      finish({ online: false, error: err.message });
    });

    socket.on('close', () => {
      // Some proxies close instead of answering the ping; the status we already
      // parsed is still valid, so report it rather than a false "offline".
      if (statusJson !== null) {
        finish(buildStatus(statusJson, pingSentAt ? Date.now() - pingSentAt : undefined));
      } else {
        finish({ online: false, error: 'Connection closed before the server replied.' });
      }
    });
  });
}

function buildStatus(json: any, latencyMs?: number): ServerStatus {
  const favicon = typeof json?.favicon === 'string' && json.favicon.startsWith('data:image')
    ? json.favicon
    : undefined;

  return {
    online: true,
    motd: stripFormatting(flattenMotd(json?.description)),
    playersOnline: typeof json?.players?.online === 'number' ? json.players.online : undefined,
    playersMax: typeof json?.players?.max === 'number' ? json.players.max : undefined,
    version: typeof json?.version?.name === 'string' ? stripFormatting(json.version.name) : undefined,
    latencyMs: latencyMs !== undefined && latencyMs >= 0 ? latencyMs : undefined,
    favicon,
  };
}
