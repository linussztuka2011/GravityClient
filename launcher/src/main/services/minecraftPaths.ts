import { app } from 'electron';
import { join } from 'path';
import * as fs from 'fs';

export class MinecraftPaths {
  static getLauncherDataDir(): string {
    // In production, app.getPath('userData') returns the system-specific local AppData/Application Support
    // E.g., ~/.config/gravity-launcher on Linux or ~/Library/Application Support/gravity-launcher on macOS.
    // In dev, we can use a local 'run' directory inside launcher or standard app path.
    let baseDir: string;
    try {
      baseDir = app.getPath('userData');
    } catch {
      // Fallback for environment running outside full Electron bootstrap (like during tsc/tests)
      baseDir = join(process.cwd(), 'run');
    }
    const dataDir = join(baseDir, 'gravity-launcher');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
  }

  static getInstancesDir(): string {
    const instancesDir = join(this.getLauncherDataDir(), 'instances');
    if (!fs.existsSync(instancesDir)) {
      fs.mkdirSync(instancesDir, { recursive: true });
    }
    return instancesDir;
  }

  static getInstanceDir(instanceId: string): string {
    const instDir = join(this.getInstancesDir(), instanceId);
    if (!fs.existsSync(instDir)) {
      fs.mkdirSync(instDir, { recursive: true });
    }
    return instDir;
  }

  static getInstanceModsDir(instanceId: string): string {
    const modsDir = join(this.getInstanceDir(instanceId), 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }
    return modsDir;
  }

  static getInstanceConfigDir(instanceId: string): string {
    const confDir = join(this.getInstanceDir(instanceId), 'config');
    if (!fs.existsSync(confDir)) {
      fs.mkdirSync(confDir, { recursive: true });
    }
    return confDir;
  }
}
