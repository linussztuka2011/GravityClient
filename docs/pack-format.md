# Pack Manifest & Preset Format Spec

This document details the configuration formats and JSON schemas used to define GravityClient standard modpacks and system presets.

---

## 1. Pack Manifest: `/packs/standard/pack.json`

The pack manifest is a central schema file defining the entire standard modpack ecosystem, including its name, compatible Minecraft/Fabric versions, core required mods, and modular optional mod groupings.

### Properties Spec:
- **`id`**: Unique string identifier for the modpack.
- **`name`**: Friendly title displayed in the launcher.
- **`version`**: Pack manifest version (e.g. `1.0.0`).
- **`minecraftVersion`**: Target Minecraft version (e.g. `1.21`).
- **`modLoader`**: Target modloader, specifically `fabric`.
- **`modLoaderVersion`**: Fabric Loader version constraint (e.g. `>=0.15.11`).
- **`requiredMods`**: Mods that *must* be installed for the client to launch safely.
- **`optionalGroups`**: Toggled category groupings (e.g. performance, minimap, visual, hud-qol, utility) containing toggleable mods.
- **`presets`**: Array of config presets supported by this pack.

### Mod JSON Structure:
Each mod entry in either `requiredMods` or `optionalGroups.mods` has:
```json
{
  "id": "sodium",
  "name": "Sodium",
  "description": "Modern rendering engine for Minecraft that greatly improves performance.",
  "modrinth": {
    "projectId": "AANobbMI",
    "slug": "sodium",
    "versionConstraint": "^0.5.11"
  },
  "hashes": {
    "sha1": "optional_hex_sha1_hash",
    "sha256": "optional_hex_sha256_hash"
  },
  "license": {
    "name": "LGPL-3.0",
    "url": "https://github.com/CaffeineMC/sodium-fabric/blob/main/LICENSE.md"
  },
  "attribution": "CaffeineMC team"
}
```

---

## 2. Config Presets: `/packs/standard/presets/<name>/preset.json`

A preset contains a list of managed config files and specific properties defining its target behavior.

### Schema of `preset.json`:
- **`id`**: Unique identifier (e.g. `performance`, `visual`, `balanced`).
- **`name`**: Friendly name (e.g. "Sleek Performance").
- **`description`**: What settings this preset configures.
- **`managedFiles`**: List of relative files inside the preset's directory to copy into the target Minecraft instance folder under `.minecraft/`.
  - **`source`**: Path relative to the preset's folder (e.g. `config/sodium-options.json`).
  - **`destination`**: Path relative to the instance's `.minecraft/` folder (e.g. `config/sodium-options.json`).
  - **`overwrite`**: Boolean. If true, overwrites any existing file. If false, only copies if the file is absent.

### Backup Strategy:
When the launcher applies a preset with `overwrite: true`:
1. It checks if the target `destination` file already exists.
2. If it does, it copies the current file to `config/backups/<timestamp>/<destination_relative_path>` before copying the preset file.
3. If the user wishes to revert to defaults or restore configs, they can select "Restore Config Backup" from the instance settings page.
