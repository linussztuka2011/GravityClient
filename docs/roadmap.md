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

## Phase 2: Active Minecraft Execution & Authentication (Next Steps)
Implement actual Microsoft OAuth login flows, Java/fabric installation, and launching capabilities.

- [ ] **Microsoft OAuth & Session Management**:
  - Implement standard OAuth/Device Code flows using a secure libraries (such as `msmc` or `node-minecraft-protocol` authentication layers).
  - Securely persist session tokens in local platform keychains (e.g. keytar or safe platform secure stores), never storing passwords.
- [ ] **Real Minecraft Runtime Downloading**:
  - Orchestrate downloading official assets, client JARs, and Libraries from Mojang's metadata manifest endpoints.
  - Implement full Fabric Loader bootloader resolution.
- [ ] **Process Spawn & Arguments Execution**:
  - Dynamically generate robust Java command-line startup parameters (memory allocations, classpath arguments, natives path resolution).
  - Spawn the Minecraft process safely from the Electron main process and forward game output logs to the launcher's Task console.

---

## Phase 3: In-Game Integration & Advanced Customizations
Strengthen connection between the desktop launcher and the in-game Client-Core mod.

- [ ] **Cross-Process Local API Sync**:
  - Establish a secure local WebSocket server or IPC socket within the launcher.
  - Let the client-core Fabric mod connect in-game to read real-time launcher states, active profiles, and preset metadata.
- [ ] **Launcher GUI Custom Overlay**:
  - Enable launcher settings menus directly from the Fabric mod Client Settings GUI.
- [ ] **Automated Delta Updates**:
  - Implement incremental file syncing for mods and configs to minimize bandwidth.
  - Auto-check for mod updates against Modrinth version targets on launcher startup.
