import * as fs from 'fs';
import * as path from 'path';
import { MinecraftPaths } from './minecraftPaths.js';

export interface PresetFileMapping {
  source: string;
  destination: string;
  overwrite: boolean;
}

export interface PresetManifest {
  id: string;
  name: string;
  description: string;
  managedFiles: PresetFileMapping[];
}

export class ConfigPresetService {
  /**
   * Resolves the packs directory in the workspace root.
   */
  static getPacksDir(): string {
    // In dev, compiled file is under launcher/out/main/main.js or similar
    // We search the tree, falling back to process cwd relative lookups.
    const pathsToTry = [
      path.join(__dirname, '..', '..', '..', 'packs'),
      path.join(process.cwd(), '..', 'packs'),
      path.join(process.cwd(), 'packs'),
    ];

    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    // Final fallback
    return path.join(process.cwd(), 'packs');
  }

  /**
   * Applies a preset configuration overlay to a local instance folder.
   */
  static applyPreset(instanceId: string, presetId: string, onLog?: (msg: string, level?: 'info' | 'warn' | 'error') => void): boolean {
    const log = onLog || (() => {});
    const packsDir = this.getPacksDir();
    const presetDir = path.join(packsDir, 'standard', 'presets', presetId);
    const presetManifestFile = path.join(presetDir, 'preset.json');

    log(`Applying config preset [${presetId}]...`, 'info');

    if (!fs.existsSync(presetManifestFile)) {
      log(`Preset manifest file not found: ${presetManifestFile}`, 'error');
      return false;
    }

    try {
      const manifestRaw = fs.readFileSync(presetManifestFile, 'utf8');
      const manifest: PresetManifest = JSON.parse(rawClean(manifestRaw));

      const instanceConfigDir = MinecraftPaths.getInstanceConfigDir(instanceId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(instanceConfigDir, 'backups', timestamp);

      let backupCreated = false;

      for (const file of manifest.managedFiles) {
        // E.g. source is "config/sodium-options.json"
        // Let's resolve the source file in the preset directory
        const presetSourcePath = path.join(presetDir, file.source);
        if (!fs.existsSync(presetSourcePath)) {
          log(`Preset source file does not exist: ${file.source}`, 'warn');
          continue;
        }

        // Target path inside the instance, e.g. <instance>/config/sodium-options.json
        // Wait, standard destination in preset.json is e.g. "config/sodium-options.json"
        // Since we are copying into the instance directory directly, we must resolve destination 
        // relative to the instance folder itself, not <instance>/config.
        // Let's look up relative destination. E.g. destination could be "config/sodium-options.json"
        const instanceDir = MinecraftPaths.getInstanceDir(instanceId);
        const targetPath = path.join(instanceDir, file.destination);

        if (fs.existsSync(targetPath)) {
          if (!file.overwrite) {
            log(`Skipping file (no-overwrite): ${file.destination}`, 'info');
            continue;
          }

          // Create backup
          if (!backupCreated) {
            fs.mkdirSync(backupDir, { recursive: true });
            backupCreated = true;
            log(`Backing up existing configurations to backups/${timestamp}/`, 'info');
          }

          const backupPath = path.join(backupDir, file.destination);
          fs.mkdirSync(path.dirname(backupPath), { recursive: true });
          fs.copyFileSync(targetPath, backupPath);
        }

        // Copy new config file
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(presetSourcePath, targetPath);
        log(`Overlaid config file: ${file.destination}`, 'info');
      }

      log(`Config preset [${presetId}] applied successfully.`, 'info');
      return true;
    } catch (err: any) {
      log(`Failed to apply config preset: ${err.message}`, 'error');
      return false;
    }
  }
}

// Helpers
function rawClean(raw: string): string {
  // Strip simple comment block or whitespace if any
  return raw.trim();
}
