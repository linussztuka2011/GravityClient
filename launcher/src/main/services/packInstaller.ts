import * as fs from 'fs';
import * as path from 'path';
import { ConfigPresetService } from './configPresetService.js';
import { ModrinthService } from './modrinthService.js';
import { FabricInstaller } from './fabricInstaller.js';
import { MinecraftPaths } from './minecraftPaths.js';
import { InstanceService } from './instanceService.js';
import { PackManifest, ModEntry, OptionalModGroup, InstanceConfig } from '../../renderer/src/types/index.js';

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
        await ModrinthService.downloadMod(
          mod.id,
          modsDir,
          mod.hashes?.sha1,
          (modProgress) => {
            const currentPercentage = basePercentage + (modProgress / 100) * (60 / totalMods);
            progress(
              Math.min(95, Math.round(currentPercentage)),
              `Downloading ${mod.name} (${Math.round(modProgress)}%)`
            );
          }
        );

        // Verify SHA-1 if available
        const modFile = path.join(modsDir, `${mod.id}.jar`);
        if (mod.hashes?.sha1) {
          const verified = ModrinthService.verifyHash(modFile, mod.hashes.sha1);
          if (verified) {
            log(`Successfully verified integrity of ${mod.id}.jar (SHA1 matched)`, 'info');
          } else {
            log(`Hash verification failed for ${mod.id}.jar. Continuing anyway.`, 'warn');
          }
        }

        modsDownloaded++;
      } catch (err: any) {
        log(`Failed to download ${mod.name}: ${err.message}`, 'error');
        return false;
      }
    }

    // 4. Install loader metadata
    progress(75, 'Installing Fabric Loader');
    const loaderOk = await FabricInstaller.installLoader(
      instance.id,
      manifest.modLoaderVersion.replace(/[^0-9.]/g, ''), // strip helper symbols
      (msg, lvl) => log(msg, lvl || 'info')
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
