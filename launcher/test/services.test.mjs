import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as net from 'node:net';
import * as zlib from 'node:zlib';

/**
 * Integration tests for the services that read and write real Minecraft data.
 *
 * These run against the compiled output, so build first:
 *   npm run build:main && npm test
 *
 * Nothing here needs Electron — the services take explicit directories, which
 * is what makes them testable at all.
 */

const OUT = new URL('../out/main/services/', import.meta.url).href;

const { parseNbt, writeNbt, compound, getString, getNumber, getCompound, getList } = await import(`${OUT}nbt.js`);
const WorldService = await import(`${OUT}worldService.js`);
const ServerService = await import(`${OUT}serverService.js`);
const SkinService = await import(`${OUT}skinService.js`);
const ClientConfig = await import(`${OUT}clientConfigService.js`);

function tempDir(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gravity-${label}-`));
  test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function makeLevelDat({ name, gameType = 0, hardcore = false, version = '1.21', lastPlayed = Date.now() }) {
  return writeNbt({
    name: '',
    compression: 'gzip',
    root: compound({
      Data: compound({
        LevelName: { type: 'string', value: name },
        GameType: { type: 'int', value: gameType },
        hardcore: { type: 'byte', value: hardcore ? 1 : 0 },
        allowCommands: { type: 'byte', value: 1 },
        LastPlayed: { type: 'long', value: BigInt(lastPlayed) },
        Version: compound({ Name: { type: 'string', value: version }, Id: { type: 'int', value: 3953 } }),
        RandomSeed: { type: 'long', value: 1234567890123n },
      }),
    }),
  });
}

/** Builds a structurally valid PNG header (what the skin validator inspects). */
function makePng(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const chunk = (type, data) => {
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.allocUnsafe(4);
    crc.writeUInt32BE(zlib.crc32(typeAndData), 0);
    return Buffer.concat([length, typeAndData, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const pixels = zlib.deflateSync(Buffer.alloc(height * (1 + width * 4)));

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------

test('NBT: round-trips every tag type byte-identically', () => {
  const root = compound({
    Data: compound({
      LevelName: { type: 'string', value: 'Süßwasser 🌊 Realm' },
      GameType: { type: 'int', value: 1 },
      hardcore: { type: 'byte', value: 1 },
      LastPlayed: { type: 'long', value: 1750000000000n },
      Ratio: { type: 'double', value: 0.5 },
      Tiny: { type: 'float', value: 0.25 },
      Small: { type: 'short', value: -300 },
      Brands: { type: 'list', elementType: 'string', value: [{ type: 'string', value: 'fabric' }] },
      Empty: { type: 'list', elementType: 'end', value: [] },
      Coords: { type: 'intArray', value: [1, -2, 3] },
      Seeds: { type: 'longArray', value: [-9007199254740993n] },
      Blob: { type: 'byteArray', value: Buffer.from([1, 2, 255]) },
    }),
  });

  const raw = writeNbt({ name: '', root, compression: 'none' });
  const again = writeNbt({ name: '', root: parseNbt(raw).root, compression: 'none' });
  assert.ok(raw.equals(again), 'NBT re-encode must be byte-identical');

  const data = getCompound(parseNbt(raw).root, 'Data');
  assert.equal(getString(data, 'LevelName'), 'Süßwasser 🌊 Realm', 'modified UTF-8 must survive');
  assert.equal(data.value.get('Seeds').value[0], -9007199254740993n, 'longs must not lose precision');
  assert.equal(getList(data, 'Empty').value.length, 0);
});

test('NBT: detects gzip framing and preserves it', () => {
  const gz = writeNbt({ name: '', root: compound({ A: { type: 'int', value: 1 } }), compression: 'gzip' });
  assert.equal(gz[0], 0x1f);
  assert.equal(gz[1], 0x8b);
  assert.equal(parseNbt(gz).compression, 'gzip');
});

test('NBT: rejects corrupt data instead of returning garbage', () => {
  assert.throws(() => parseNbt(Buffer.from('definitely not nbt')));
});

// ---------------------------------------------------------------------------

test('worlds: lists real saves with metadata parsed from level.dat', async () => {
  const instance = tempDir('worlds');
  fs.mkdirSync(path.join(instance, 'saves', 'Alpha'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Alpha', 'level.dat'), makeLevelDat({ name: 'Alpha World', lastPlayed: 2000 }));
  fs.writeFileSync(path.join(instance, 'saves', 'Alpha', 'chunk.bin'), Buffer.alloc(4096));

  fs.mkdirSync(path.join(instance, 'saves', 'Beta'), { recursive: true });
  fs.writeFileSync(
    path.join(instance, 'saves', 'Beta', 'level.dat'),
    makeLevelDat({ name: 'Beta Hardcore', gameType: 3, hardcore: true, version: '1.20.4', lastPlayed: 9000 })
  );

  const worlds = await WorldService.listWorlds(instance);
  assert.equal(worlds.length, 2);
  // Most recently played first.
  assert.equal(worlds[0].folderName, 'Beta');
  assert.equal(worlds[0].name, 'Beta Hardcore');
  assert.equal(worlds[0].gameMode, 'Spectator');
  assert.equal(worlds[0].hardcore, true);
  assert.equal(worlds[0].version, '1.20.4');

  const alpha = worlds.find((w) => w.folderName === 'Alpha');
  assert.equal(alpha.name, 'Alpha World');
  assert.ok(alpha.sizeBytes >= 4096, 'directory size must include world data');
});

test('worlds: returns an empty list when the profile has never been played', async () => {
  assert.deepEqual(await WorldService.listWorlds(tempDir('empty')), []);
});

test('worlds: flags an unreadable level.dat instead of hiding the world', async () => {
  const instance = tempDir('corrupt');
  fs.mkdirSync(path.join(instance, 'saves', 'Broken'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Broken', 'level.dat'), Buffer.from('garbage'));

  const [world] = await WorldService.listWorlds(instance);
  assert.equal(world.folderName, 'Broken');
  assert.ok(world.problem, 'a corrupt world must be surfaced, not dropped');
});

test('worlds: falls back to level.dat_old when level.dat is missing', async () => {
  const instance = tempDir('oldbackup');
  fs.mkdirSync(path.join(instance, 'saves', 'Recovered'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Recovered', 'level.dat_old'), makeLevelDat({ name: 'From Backup' }));

  const [world] = await WorldService.listWorlds(instance);
  assert.equal(world.name, 'From Backup');
  assert.equal(world.problem, undefined);
});

test('worlds: rename edits LevelName and keeps the folder and other fields', async () => {
  const instance = tempDir('rename');
  fs.mkdirSync(path.join(instance, 'saves', 'Folder1'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Folder1', 'level.dat'), makeLevelDat({ name: 'Before', version: '1.21' }));

  await WorldService.renameWorld(instance, 'Folder1', '  After  ');

  const [world] = await WorldService.listWorlds(instance);
  assert.equal(world.name, 'After', 'name is trimmed');
  assert.equal(world.folderName, 'Folder1', 'folder must not be renamed, matching vanilla');
  assert.equal(world.version, '1.21', 'unrelated level.dat fields must survive');

  // The seed is data the launcher does not model; it must still be intact.
  const file = parseNbt(fs.readFileSync(path.join(instance, 'saves', 'Folder1', 'level.dat')));
  assert.equal(getCompound(file.root, 'Data').value.get('RandomSeed').value, 1234567890123n);
});

test('worlds: rename rejects an empty name', async () => {
  const instance = tempDir('rename-empty');
  fs.mkdirSync(path.join(instance, 'saves', 'F'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'F', 'level.dat'), makeLevelDat({ name: 'X' }));
  await assert.rejects(() => WorldService.renameWorld(instance, 'F', '   '));
});

test('worlds: duplicate copies data and gives the copy a distinct name', async () => {
  const instance = tempDir('dup');
  fs.mkdirSync(path.join(instance, 'saves', 'Src'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Src', 'level.dat'), makeLevelDat({ name: 'Original' }));
  fs.writeFileSync(path.join(instance, 'saves', 'Src', 'region.bin'), Buffer.alloc(1024));
  fs.writeFileSync(path.join(instance, 'saves', 'Src', 'session.lock'), 'locked');

  const copy = await WorldService.duplicateWorld(instance, 'Src');
  assert.equal(copy.name, 'Original (Copy)');
  assert.ok(fs.existsSync(path.join(instance, 'saves', copy.folderName, 'region.bin')), 'world data must be copied');
  assert.ok(!fs.existsSync(path.join(instance, 'saves', copy.folderName, 'session.lock')), 'session.lock must not be copied');
  assert.equal((await WorldService.listWorlds(instance)).length, 2);

  // A second copy must not collide with the first.
  const second = await WorldService.duplicateWorld(instance, 'Src');
  assert.notEqual(second.folderName, copy.folderName);
});

test('worlds: refuses folder names that escape the saves directory', async () => {
  const instance = tempDir('traversal');
  for (const bad of ['../evil', 'a/b', '..', '']) {
    await assert.rejects(() => WorldService.deleteWorld(instance, bad), `"${bad}" must be rejected`);
  }
});

test('worlds: delete removes the folder', async () => {
  const instance = tempDir('delete');
  fs.mkdirSync(path.join(instance, 'saves', 'Doomed'), { recursive: true });
  fs.writeFileSync(path.join(instance, 'saves', 'Doomed', 'level.dat'), makeLevelDat({ name: 'Doomed' }));

  await WorldService.deleteWorld(instance, 'Doomed');
  assert.equal(fs.existsSync(path.join(instance, 'saves', 'Doomed')), false);
});

// ---------------------------------------------------------------------------

test('servers: writes a servers.dat vanilla can read, and round-trips it', async () => {
  const instance = tempDir('servers');
  assert.deepEqual(await ServerService.listServers(instance), []);

  await ServerService.addServer(instance, 'Hypixel', 'mc.hypixel.net');
  const list = await ServerService.addServer(instance, 'Local ⚡', '127.0.0.1:25565');

  assert.equal(list.length, 2);
  assert.equal(list[1].name, 'Local ⚡');

  // Structure must match what the game expects: root compound -> "servers" list.
  const file = parseNbt(fs.readFileSync(path.join(instance, 'servers.dat')));
  assert.equal(file.compression, 'none', 'vanilla stores servers.dat uncompressed');
  const servers = getList(file.root, 'servers');
  assert.equal(servers.value.length, 2);
  assert.equal(getString(servers.value[0], 'ip'), 'mc.hypixel.net');
});

test('servers: editing an entry preserves fields the launcher does not model', async () => {
  const instance = tempDir('servers-preserve');
  await ServerService.addServer(instance, 'Original', 'a.example.net');

  // Vanilla writes extra keys such as acceptTextures and a base64 icon.
  const datPath = path.join(instance, 'servers.dat');
  const file = parseNbt(fs.readFileSync(datPath));
  const entry = getList(file.root, 'servers').value[0];
  entry.value.set('acceptTextures', { type: 'byte', value: 1 });
  entry.value.set('icon', { type: 'string', value: 'iVBORw0KGgo=' });
  fs.writeFileSync(datPath, writeNbt(file));

  await ServerService.updateServer(instance, 0, 'Renamed', 'b.example.net');

  const after = getList(parseNbt(fs.readFileSync(datPath)).root, 'servers').value[0];
  assert.equal(getString(after, 'name'), 'Renamed');
  assert.equal(getString(after, 'ip'), 'b.example.net');
  assert.equal(after.value.has('acceptTextures'), true, 'unknown NBT fields must survive an edit');
  assert.equal(getString(after, 'icon'), 'iVBORw0KGgo=');
});

test('servers: delete removes the right entry and rejects bad indexes', async () => {
  const instance = tempDir('servers-delete');
  await ServerService.addServer(instance, 'One', '1.example.net');
  await ServerService.addServer(instance, 'Two', '2.example.net');

  const remaining = await ServerService.deleteServer(instance, 0);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].name, 'Two');
  assert.equal(remaining[0].index, 0, 'indexes are re-based after a delete');

  await assert.rejects(() => ServerService.deleteServer(instance, 99));
});

test('servers: rejects entries missing a name or address', async () => {
  const instance = tempDir('servers-validate');
  await assert.rejects(() => ServerService.addServer(instance, '', 'a.example.net'));
  await assert.rejects(() => ServerService.addServer(instance, 'Name', '   '));
});

test('servers: pings a server over the real Server List Ping protocol', async (t) => {
  const varInt = (v) => {
    const bytes = [];
    let x = v >>> 0;
    for (;;) {
      if ((x & ~0x7f) === 0) { bytes.push(x); break; }
      bytes.push((x & 0x7f) | 0x80);
      x >>>= 7;
    }
    return Buffer.from(bytes);
  };
  const pkt = (id, payload) => {
    const body = Buffer.concat([varInt(id), payload]);
    return Buffer.concat([varInt(body.length), body]);
  };

  const statusJson = JSON.stringify({
    version: { name: '§a1.21', protocol: 767 },
    players: { online: 42, max: 100 },
    // A nested chat component with legacy colour codes, as real servers send.
    description: { text: '§6Mock ', extra: [{ text: 'Server §rMOTD' }] },
    favicon: 'data:image/png;base64,iVBORw0KGgo=',
  });

  const server = net.createServer((socket) => {
    let packets = 0;
    socket.on('data', (data) => {
      packets += 1;
      if (packets === 1) {
        const payload = Buffer.from(statusJson, 'utf8');
        socket.write(pkt(0x00, Buffer.concat([varInt(payload.length), payload])));
      } else {
        // Echo the ping payload back after a measurable delay.
        setTimeout(() => socket.write(pkt(0x01, data.subarray(data.length - 8))), 25);
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const status = await ServerService.pingServer(`127.0.0.1:${server.address().port}`);

  assert.equal(status.online, true);
  assert.equal(status.motd, 'Mock Server MOTD', 'chat components flattened and § codes stripped');
  assert.equal(status.version, '1.21');
  assert.equal(status.playersOnline, 42);
  assert.equal(status.playersMax, 100);
  assert.ok(status.latencyMs >= 20, `latency should reflect the round trip, got ${status.latencyMs}`);
  assert.ok(status.favicon.startsWith('data:image/png'));
});

test('servers: reports an unreachable server without hanging', async () => {
  const start = Date.now();
  const status = await ServerService.pingServer('127.0.0.1:1', 2000);
  assert.equal(status.online, false);
  assert.ok(status.error);
  assert.ok(Date.now() - start < 2000, 'a refused connection must fail fast');
});

test('servers: times out rather than waiting forever on a silent server', async (t) => {
  const silent = net.createServer(() => { /* accept, never reply */ });
  await new Promise((resolve) => silent.listen(0, '127.0.0.1', resolve));
  t.after(() => silent.close());

  const status = await ServerService.pingServer(`127.0.0.1:${silent.address().port}`, 300);
  assert.equal(status.online, false);
  assert.match(status.error, /within 300 ms/);
});

// ---------------------------------------------------------------------------

test('skins: accepts valid skin dimensions and rejects everything else', () => {
  assert.deepEqual(SkinService.inspectSkinPng(makePng(64, 64)), { width: 64, height: 64 });
  assert.deepEqual(SkinService.inspectSkinPng(makePng(64, 32)), { width: 64, height: 32 }, 'legacy skins are valid');

  assert.throws(() => SkinService.inspectSkinPng(makePng(128, 128)), /64x64/);
  assert.throws(() => SkinService.inspectSkinPng(Buffer.from('not a png at all, really')), /not a PNG/);
});

test('skins: imports a file into the library and de-duplicates by content', async () => {
  const skinsDir = tempDir('skins');
  const source = path.join(tempDir('skins-src'), 'source.png');
  fs.writeFileSync(source, makePng(64, 64));

  const first = await SkinService.importSkinFromFile(skinsDir, source, 'My Skin');
  assert.equal(first.name, 'My Skin');
  assert.equal(first.model, 'classic');
  assert.ok(first.dataUri.startsWith('data:image/png;base64,'), 'renderer needs a usable data URI');

  const library = await SkinService.listSkins(skinsDir);
  assert.equal(library.length, 1);

  // Re-importing identical bytes must update in place, not duplicate.
  const again = await SkinService.importSkinFromFile(skinsDir, source, 'Renamed');
  assert.equal(again.id, first.id);
  assert.equal((await SkinService.listSkins(skinsDir)).length, 1);
  assert.equal((await SkinService.listSkins(skinsDir))[0].name, 'Renamed');
});

test('skins: refuses to import an image that is not a valid skin', async () => {
  const skinsDir = tempDir('skins-invalid');
  const bad = path.join(tempDir('skins-invalid-src'), 'bad.png');
  fs.writeFileSync(bad, makePng(100, 100));
  await assert.rejects(() => SkinService.importSkinFromFile(skinsDir, bad), /64x64/);
  assert.deepEqual(await SkinService.listSkins(skinsDir), [], 'invalid skins must not land in the library');
});

test('skins: model selection persists and delete removes both files', async () => {
  const skinsDir = tempDir('skins-model');
  const source = path.join(tempDir('skins-model-src'), 's.png');
  fs.writeFileSync(source, makePng(64, 64));
  const skin = await SkinService.importSkinFromFile(skinsDir, source, 'S');

  await SkinService.setSkinModel(skinsDir, skin.id, 'slim');
  assert.equal((await SkinService.listSkins(skinsDir))[0].model, 'slim');

  await SkinService.deleteSkin(skinsDir, skin.id);
  assert.deepEqual(await SkinService.listSkins(skinsDir), []);
  assert.equal(fs.existsSync(path.join(skinsDir, `${skin.id}.json`)), false, 'metadata sidecar must go too');
});

test('skins: rejects non-http URLs', async () => {
  const skinsDir = tempDir('skins-url');
  await assert.rejects(() => SkinService.importSkinFromUrl(skinsDir, 'file:///etc/passwd'), /http/);
  await assert.rejects(() => SkinService.importSkinFromUrl(skinsDir, 'nonsense'), /valid URL/);
});

// ---------------------------------------------------------------------------

test('client config: maps launcher settings onto the mod schema', () => {
  const built = ClientConfig.buildClientCoreConfig({
    debugMode: true,
    enabledMods: ['FPS Counter', 'Zoom'],
    fpsSettings: {
      position: 'Bottom Right',
      color: 'ff0000',
      textColorToggle: true,
      background: '#abc',
      backgroundToggle: false,
      opacity: 250,
      fontSize: 999,
      showAverage: false,
    },
  });

  assert.equal(built.debugOverlay, true);
  assert.equal(built.renderFpsOnHUD, true, 'derived from the FPS Counter module being enabled');
  assert.equal(built.fps.position, 'BOTTOM_RIGHT');
  assert.equal(built.fps.textColor, '#FF0000', 'bare hex gains its #');
  assert.equal(built.fps.background, '#AABBCC', 'shorthand hex is expanded');
  assert.equal(built.fps.showBackground, false);
  assert.equal(built.fps.backgroundOpacity, 100, 'out-of-range opacity is clamped');
  assert.equal(built.fps.fontSize, 48, 'out-of-range font size is clamped');
  assert.equal(built.fps.showAverage, false);
});

test('client config: turns the overlay off when the module is disabled', () => {
  const built = ClientConfig.buildClientCoreConfig({ enabledMods: ['Zoom'], fpsSettings: {} });
  assert.equal(built.renderFpsOnHUD, false);
  assert.equal(built.fps.position, 'TOP_LEFT', 'falls back to a sane default');
});

test('client config: tolerates malformed settings', () => {
  const built = ClientConfig.buildClientCoreConfig({});
  assert.deepEqual(built.enabledMods, []);
  assert.equal(built.fps.textColor, '#FFFFFF');
  assert.equal(built.fps.fontSize, 14);
});

test('client config: writes the file and preserves preset-owned keys', async () => {
  const instance = tempDir('clientconfig');
  const configDir = path.join(instance, 'config');
  fs.mkdirSync(configDir, { recursive: true });

  // A preset wrote this first; theme and keybinds are not launcher-owned.
  fs.writeFileSync(
    path.join(configDir, 'gravity-client-core.json'),
    JSON.stringify({ theme: 'sunset', keybinds: { openSettings: 'key.keyboard.right.shift' }, renderFpsOnHUD: false })
  );

  const written = await ClientConfig.syncClientCoreConfig(instance, {
    debugMode: false,
    enabledMods: ['FPS Counter'],
    fpsSettings: { position: 'Top Right', fontSize: 20 },
  });

  const result = JSON.parse(fs.readFileSync(written, 'utf8'));
  assert.equal(result.theme, 'sunset', 'preset-owned key preserved');
  assert.deepEqual(result.keybinds, { openSettings: 'key.keyboard.right.shift' }, 'unknown key preserved');
  assert.equal(result.renderFpsOnHUD, true, 'launcher-owned key overwritten');
  assert.equal(result.fps.position, 'TOP_RIGHT');
  assert.equal(result.fps.fontSize, 20);
});

test('client config: creates the config directory when it does not exist', async () => {
  const instance = tempDir('clientconfig-new');
  const written = await ClientConfig.syncClientCoreConfig(instance, { enabledMods: [], fpsSettings: {} });
  assert.ok(fs.existsSync(written));
  assert.equal(JSON.parse(fs.readFileSync(written, 'utf8')).fps.position, 'TOP_LEFT');
});
