# GravityClient Architecture

This document outlines the technical architecture of the **GravityClient** ecosystem, including the desktop launcher, standard modpack format, config presets, and the Fabric client-core mod.

---

## 1. High-Level Architecture Overview

The system is designed to provide a cohesive, premium modpack loading and game launch experience. It separates launcher operations from modpack data declarations and in-game client logic.

```mermaid
graph TD
    user[User Interface] <--> renderer[React Renderer Process]
    renderer <-->|IPC Bridge| preload[Preload Context Bridge]
    preload <-->|Secure IPC| main[Electron Main Process]
    
    main -->|Resolves paths| paths[MinecraftPaths Service]
    main -->|Installs| installer[PackInstaller Service]
    main -->|Downloads| modrinth[Modrinth API Client]
    main -->|Overlays| presetService[ConfigPreset Service]
    
    installer -->|Writes mods| mcInstance[Minecraft Instance Folder]
    presetService -->|Writes configs| mcInstance
    
    mcInstance -->|Loads runtime| clientCore[Fabric Client-Core Mod]
```

---

## 2. Core Components

### A. The Desktop Launcher (`/launcher`)
Built on **Electron, React, TypeScript, and Vite**, the launcher avoids thick, direct backend bindings from the web view. Instead, it exposes robust service abstractions via a secure IPC preload interface.

- **Main Process Services:**
  - `MinecraftPaths`: Safely determines where Minecraft profiles, configurations, and mod directories live relative to user directories, supporting separate multi-instances.
  - `InstanceService`: Creates and manages profile metadata records (`instance.json`).
  - `ModrinthService`: Communicates with Modrinth APIs to verify project IDs, resolve optimal files matching version requirements, download assets, and verify SHA-1 and SHA-256 hashes to guarantee file integrity.
  - `PackInstaller`: An installation queue runner that downloads required core dependencies and user-selected optional mod groups.
  - `ConfigPresetService`: Replaces or overlays config presets, taking care of managed config files and automatic backup creations.
  - `FabricInstaller`: Places proper client configs and ensures loader setups are configured within launcher profiles.

- **Preload Context Bridge:**
  - Standardizes direct service calls. Refuses to expose powerful, arbitrary Node.js APIs (`fs`, `child_process`, `net`) to the UI, protecting the client.

- **React Renderer:**
  - Built with pure CSS variable designs (sleek, cyberpunk slate-dark design with cyan/teal accents). It displays modular progress, lets users toggles groups, and enables fast presets loading.

### B. Pack Manifest and Config Presets (`/packs`)
A declarative directory structure explaining standard modpacks.
- `/packs/standard/pack.json` is the manifest defining structural mod groupings (Performance, HUD-QoL, Utility, Minimap, Visual).
- Presets are stored as static overlay templates (e.g. `/packs/standard/presets/balanced/config/...`) containing ready-to-use in-game config structures (such as keybinds, graphic adjustments, custom client core configs).

### C. Client-Core Fabric Mod (`/client-core`)
A lightweight, modded client companion running inside the Fabric loader.
- Restricts itself to local, client-side enhancements: custom main menu hooks, an settings screen ("Client Settings"), keybind registers, and a custom config format.
- Avoids server-side interference or bypasses.

---

## 3. Data Flow: Pack Installation & Overlay

When a user clicks "Install / Update" in the launcher:
1. **Validation & Resolution**: Launcher reads `pack.json` and resolved user toggles. It builds a flat array of all required mods and selected optional mods.
2. **Metadata Check**: For each mod, it queries Modrinth (or uses fallback cached URLs in `pack.json`) to find compatible file targets.
3. **Hash Verification & Download**: The downloader pipes files to `<instance_dir>/mods/`. It checks SHA-1 hashes against Modrinth metadata.
4. **Preset Application**: The selected preset files (e.g. `balanced`) are written directly to `<instance_dir>/config/`. If managed config files exist, they are archived in `config/backups/<timestamp>/` beforehand.
5. **JSON Instance Update**: A state file is written confirming successful pack sync, enabling the Launch button.
