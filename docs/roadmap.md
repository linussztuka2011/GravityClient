# GravityClient Project Roadmap

This document outlines the evolutionary roadmap for the private Minecraft client launcher and Fabric mod ecosystem, divided into structured phases.

---

## Phase 1: Foundations & Core Launcher MVP (Current Scope)
Establish repository layout, data formats, basic UI dashboards, and functional installer mocks.

- [x] **Repository Scaffolding**: Setup `.gitignore`, directories for `/launcher`, `/packs`, `/client-core`, and `/docs`.
- [x] **Pack Configuration Schemas**: Create standard `pack.json` structure with granular mod groups and config preset mappings.
- [x] **Config Presets**: Set up standard balanced, performance, and visual presets with backup and recovery logic.
- [x] **Launcher Desktop Core**: Develop an Electron-React-TS app capable of creating profiles, letting users toggle mod sets, selection of presets, and triggering simulation downloads.
- [x] **Client-Core Mod Skeleton**: Create a clean Fabric 1.21 Java 21 mod project that handles custom client settings screens, keybinds, and configurations.

---

## Phase 2: Active Minecraft Execution & Authentication (Complete)
Implement actual Microsoft OAuth login flows, Java/fabric installation, and launching capabilities.

- [x] **Microsoft OAuth & Session Management**:
  - Device Code flow through Xbox Live → XSTS → Minecraft Services, with silent refresh before launch. Passwords are never handled.
  - Session tokens are encrypted at rest via Electron `safeStorage` (OS-backed key) in a dedicated store; they never appear in `settings.json` and never cross into the renderer process.
- [x] **Real Minecraft Runtime Downloading**:
  - Fabric profiles are resolved by merging Mojang's version manifest with Fabric's loader profile, and compatible loader versions are checked at launch.
- [x] **Process Spawn & Arguments Execution**:
  - JVM parameters (memory, custom JRE path) are generated and Minecraft is spawned via `minecraft-launcher-core`, with output forwarded to the Task console.

---

## Phase 2b: Real Game Data in the Launcher (Complete)
Replace placeholder UI listings with the game's own files.

- [x] **NBT Codec**: gzip/zlib framing and modified UTF-8, preserving tag types so files round-trip without data loss.
- [x] **Singleplayer Worlds**: parsed from `level.dat`; rename, duplicate and delete operate on the real `saves/` directory.
- [x] **Multiplayer Servers**: `servers.dat` read/write plus live Server List Ping for MOTD, players, latency, favicon and SRV resolution.
- [x] **Skins**: a real local PNG library with header validation, file/URL import, and Mojang upload for premium accounts.
- [x] **Settings Handoff**: Mod-Menu and FPS settings are written to each profile's `config/gravity-client-core.json` and rendered in-game by the companion mod.

---

## Phase 3: In-Game Integration & Advanced Customizations
Strengthen connection between the desktop launcher and the in-game Client-Core mod.

- [x] **Secure Token Storage**:
  - Tokens moved out of `settings.json` into `secure-tokens.bin`, encrypted with Electron `safeStorage` (Windows DPAPI, macOS Keychain, Linux Secret Service) and written with owner-only permissions. Existing plaintext tokens are migrated automatically on first start.
- [ ] **Remaining HUD Modules**:
  - Only the FPS Counter is rendered in-game today. Keystrokes, Direction HUD, Armor Status and the rest are persisted to the mod config but not yet implemented in `client-core`.
- [ ] **Cross-Process Local API Sync**:
  - Establish a secure local WebSocket server or IPC socket within the launcher.
  - Let the client-core Fabric mod connect in-game to read real-time launcher states, active profiles, and preset metadata.
- [ ] **Launcher GUI Custom Overlay**:
  - Enable launcher settings menus directly from the Fabric mod Client Settings GUI.
- [ ] **Automated Delta Updates**:
  - Implement incremental file syncing for mods and configs to minimize bandwidth.
  - Auto-check for mod updates against Modrinth version targets on launcher startup.
