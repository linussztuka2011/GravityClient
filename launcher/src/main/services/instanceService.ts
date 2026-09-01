import * as fs from 'fs';
import { join } from 'path';
import { MinecraftPaths } from './minecraftPaths.js';
import { SettingsService } from './settingsService.js';
import { applyOptionsTemplate } from './optionsTemplateService.js';
import { InstanceConfig } from '../../renderer/src/types/index.js';

export class InstanceService {
  private static getProfilesFile(): string {
    return join(MinecraftPaths.getLauncherDataDir(), 'instances.json');
  }

  static getInstances(): InstanceConfig[] {
    const file = this.getProfilesFile();
    if (!fs.existsSync(file)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const ids: string[] = JSON.parse(raw);
      
      const configs: InstanceConfig[] = [];
      for (const id of ids) {
        const instDir = MinecraftPaths.getInstanceDir(id);
        const configFile = join(instDir, 'instance.json');
        if (fs.existsSync(configFile)) {
          const configRaw = fs.readFileSync(configFile, 'utf8');
          configs.push(JSON.parse(configRaw));
        }
      }
      return configs;
    } catch {
      return [];
    }
  }

  static saveInstancesList(ids: string[]): void {
    fs.writeFileSync(this.getProfilesFile(), JSON.stringify(ids, null, 2), 'utf8');
  }

  static createInstance(name: string, mcVersion: string): InstanceConfig {
    const id = 'instance_' + Date.now();
    const instDir = MinecraftPaths.getInstanceDir(id);
    
    // Create folders
    MinecraftPaths.getInstanceModsDir(id);
    MinecraftPaths.getInstanceConfigDir(id);

    const config: InstanceConfig = {
      id,
      name,
      minecraftVersion: mcVersion,
      modLoader: 'fabric',
      // Resolved against Fabric's metadata at launch; this is only the seed value.
      modLoaderVersion: '0.19.3',
      enabledModGroups: ['performance', 'hud-qol', 'utility'], // enabled by default
      selectedPreset: 'balanced',
      installedPackVersion: null,
      path: instDir
    };

    fs.writeFileSync(join(instDir, 'instance.json'), JSON.stringify(config, null, 2), 'utf8');

    // Seed the profile with the player's own options.txt (keybinds, FOV,
    // accessibility, video/audio) so a new instance does not start from vanilla
    // defaults. Purely best-effort — the profile is fine without it.
    const template = SettingsService.getSettings().optionsTemplatePath;
    const seeded = applyOptionsTemplate(instDir, template);
    if (seeded.copied) {
      console.log(`[InstanceService] Seeded ${config.name} with ${seeded.settingCount} settings from the options template.`);
    } else if (template) {
      console.warn(`[InstanceService] Did not seed options.txt: ${seeded.reason}`);
    }

    const list = this.getInstances().map(c => c.id);
    list.push(id);
    this.saveInstancesList(list);

    return config;
  }

  static updateInstance(config: InstanceConfig): void {
    const instDir = MinecraftPaths.getInstanceDir(config.id);
    fs.writeFileSync(join(instDir, 'instance.json'), JSON.stringify(config, null, 2), 'utf8');
  }

  static deleteInstance(id: string): void {
    const instDir = MinecraftPaths.getInstanceDir(id);
    if (fs.existsSync(instDir)) {
      fs.rmSync(instDir, { recursive: true, force: true });
    }
    const list = this.getInstances().map(c => c.id).filter(i => i !== id);
    this.saveInstancesList(list);
  }
}
