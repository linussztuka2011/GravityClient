import * as fs from 'fs';
import * as path from 'path';
import { ConfigPresetService } from './configPresetService.js';
import { ModrinthService } from './modrinthService.js';
import { FabricInstaller } from './fabricInstaller.js';
import { MinecraftPaths } from './minecraftPaths.js';
import { InstanceService } from './instanceService.js';
import { SettingsService } from './settingsService.js';
import { syncClientCoreConfig } from './clientConfigService.js';
import { installClientCore, clientCoreSearchDirs } from './clientCoreInstaller.js';
import { PackManifest, ModEntry, InstanceConfig } from '../../renderer/src/types/index.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PackInstaller {
  /**
   * Performs the full modpack installation and configuration process.
   */
  static async install(
    instance: InstanceConfig,
    onProgress: (percent: number, step: string) => void,
    onLog: (msg: string, level: 'info' | 'warn' | 'error') => void
  ): Promise<boolean> {
    const log = onLog;
    const progress = onProgress;

    log(`Starting installation for instance: "${instance.name}"`, 'info');
    progress(5, 'Parsing pack manifest');

    // 1. Read standard pack.json
    const packsDir = ConfigPresetService.getPacksDir();
    const manifestFile = path.join(packsDir, 'standard', 'pack.json');

    if (!fs.existsSync(manifestFile)) {
      log(`Standard pack.json manifest not found at: ${manifestFile}`, 'error');
      return false;
    }

    let manifest: PackManifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (err: any) {
      log(`Failed to parse pack.json: ${err.message}`, 'error');
      return false;
    }

    log(`Loaded modpack: "${manifest.name}" (v${manifest.version})`, 'info');

    // 2. Resolve mods queue
    // Add all required mods
    const downloadQueue: ModEntry[] = [...manifest.requiredMods];

    // Add selected optional mods
    for (const group of manifest.optionalGroups) {
      if (instance.enabledModGroups.includes(group.id)) {
        log(`Group [${group.name}] is enabled. Adding ${group.mods.length} mods to queue.`, 'info');
        downloadQueue.push(...group.mods);
      } else {
        log(`Group [${group.name}] is disabled. Skipping.`, 'info');
      }
    }

    const totalMods = downloadQueue.length;
    log(`Total mods scheduled for download: ${totalMods}`, 'info');

    const modsDir = MinecraftPaths.getInstanceModsDir(instance.id);
    
    // Clear old mods first (clean sync)
    log(`Cleaning existing mods directory...`, 'info');
    const existingFiles = fs.readdirSync(modsDir);
    for (const file of existingFiles) {
      if (file.endsWith('.jar')) {
        fs.unlinkSync(path.join(modsDir, file));
      }
    }

    // 3. Download mod files sequentially
    let modsDownloaded = 0;
    for (const mod of downloadQueue) {
      const basePercentage = 10 + (modsDownloaded / totalMods) * 60; // scale mod downloads from 10% to 70%
      log(`Downloading mod: ${mod.name} (${mod.id})`, 'info');
      
      try {
        // Resolve by Modrinth project ID, not our internal id — the two differ
        // for some mods (FerriteCore's slug is "ferrite-core") and IDs survive
        // project renames. downloadMod verifies the file against Modrinth's own
        // published SHA-1 and throws if it does not match.
        await ModrinthService.downloadMod(
          mod.modrinth.projectId,
          modsDir,
          mod.id,
          (modProgress: number) => {
            const currentPercentage = basePercentage + (modProgress / 100) * (60 / totalMods);
            progress(
              Math.min(95, Math.round(currentPercentage)),
              `Downloading ${mod.name} (${Math.round(modProgress)}%)`
            );
          },
          instance.minecraftVersion || manifest.minecraftVersion
        );

        log(`Installed ${mod.name} (verified against Modrinth's published hash).`, 'info');
        modsDownloaded++;
      } catch (err: any) {
        log(`Failed to download ${mod.name}: ${err.message}`, 'error');
        return false;
      }
    }

    // 3b. Install the companion mod. This runs after the mods folder has been
    // cleaned so the jar is not wiped by the next sync, and it is not part of
    // the Modrinth queue because it is built here rather than published.
    progress(72, 'Installing companion mod');
    const clientCore = installClientCore(
      modsDir,
      clientCoreSearchDirs(
        (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath,
        __dirname
      ),
      instance.minecraftVersion || manifest.minecraftVersion
    );
    if (clientCore.installed) {
      log(`Installed companion mod: ${clientCore.fileName}`, 'info');
    } else {
      log(clientCore.reason ?? 'Companion mod was not installed.', 'warn');
    }

    // 4. Install loader metadata
    progress(75, 'Installing Fabric Loader');
    const loaderOk = await FabricInstaller.installLoader(
      instance.id,
      manifest.modLoaderVersion.replace(/[^0-9.]/g, ''), // strip helper symbols
      instance.minecraftVersion || manifest.minecraftVersion,
      (msg: string, lvl?: 'info' | 'warn' | 'error') => log(msg, lvl || 'info')
    );
    if (!loaderOk) {
      return false;
    }

    // 5. Apply Config Preset
    progress(85, 'Applying Config Preset');
    const presetOk = ConfigPresetService.applyPreset(
      instance.id,
      instance.selectedPreset,
      (msg, lvl) => log(msg, lvl || 'info')
    );
    if (!presetOk) {
      return false;
    }

    // 5b. Overlay the user's live mod/HUD settings on top of the preset, so a
    // freshly applied preset does not silently discard them.
    try {
      await syncClientCoreConfig(MinecraftPaths.getInstanceDir(instance.id), SettingsService.getSettings());
      log('Applied launcher mod settings to the client-core config.', 'info');
    } catch (err: any) {
      log(`Could not sync client-core settings: ${err.message}`, 'warn');
    }

    // 6. Update instance configuration properties
    progress(95, 'Saving installation state');
    instance.installedPackVersion = manifest.version;
    InstanceService.updateInstance(instance);
    
    log(`Successfully updated profile instance.json!`, 'info');
    progress(100, 'Installation Complete');
    log(`*** Installation complete for Gravity Standard Optimizations! ***`, 'info');

    return true;
  }
}
