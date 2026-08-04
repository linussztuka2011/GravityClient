import * as fs from 'fs';
import { join } from 'path';
import { MinecraftPaths } from './minecraftPaths.js';

export interface RichAccount {
  name: string; // Minecraft Username
  uuid: string; // Minecraft UUID
  type: 'offline' | 'microsoft';
  accessToken?: string; // Minecraft Access Token
  refreshToken?: string; // Microsoft Refresh Token
  expiresAt?: number; // Expiration timestamp for Minecraft Access Token
}

export interface GlobalSettings {
  ram: string;
  customJava: string;
  debugMode: boolean;
  activeProfileId: string;
  activeSkin: string;
  enabledMods: string[];
  fpsSettings: {
    position: string;
    color: string;
    textColorToggle: boolean;
    background: string;
    backgroundToggle: boolean;
    opacity: number;
    fontSize: number;
    showAverage: boolean;
  };
  accounts: string[];
  activeAccount: string;
  richAccounts?: RichAccount[];
}

const DEFAULT_SETTINGS: GlobalSettings = {
  ram: '4G',
  customJava: '',
  debugMode: false,
  activeProfileId: '',
  // Holds a skin library id once the user picks one; empty means "default skin".
  activeSkin: '',
  enabledMods: ['FPS Counter', 'Ping Display', 'ToggleSprint/Sneak', 'Direction HUD', 'Armor Status'],
  fpsSettings: {
    position: 'Top Left',
    color: '#FFFFFF',
    textColorToggle: true,
    background: '#000000',
    backgroundToggle: true,
    opacity: 50,
    fontSize: 14,
    showAverage: true,
  },
  accounts: ['Player_Name'],
  activeAccount: 'Player_Name',
  richAccounts: [
    {
      name: 'Player_Name',
      uuid: 'offline-uuid-playername',
      type: 'offline'
    }
  ]
};

export class SettingsService {
  private static getSettingsFile(): string {
    return join(MinecraftPaths.getLauncherDataDir(), 'settings.json');
  }

  static getSettings(): GlobalSettings {
    const file = this.getSettingsFile();
    if (!fs.existsSync(file)) {
      this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      // Merge with defaults to guarantee all keys exist
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: GlobalSettings): void {
    const file = this.getSettingsFile();
    fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf8');
  }
}
