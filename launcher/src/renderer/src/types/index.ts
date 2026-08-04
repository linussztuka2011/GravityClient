export interface ModrinthMetadata {
  projectId: string;
  slug: string;
  versionConstraint: string;
}

export interface ModHashes {
  sha1?: string;
  sha256?: string;
}

export interface ModLicense {
  name: string;
  url: string;
}

export interface ModEntry {
  id: string;
  name: string;
  description: string;
  modrinth: ModrinthMetadata;
  hashes: ModHashes;
  license: ModLicense;
  attribution: string;
}

export interface OptionalModGroup {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  mods: ModEntry[];
}

export interface PackPreset {
  id: string;
  name: string;
  description: string;
}

export interface PackManifest {
  id: string;
  name: string;
  version: string;
  minecraftVersion: string;
  modLoader: string;
  modLoaderVersion: string;
  requiredMods: ModEntry[];
  optionalGroups: OptionalModGroup[];
  presets: PackPreset[];
}

export interface InstanceConfig {
  id: string;
  name: string;
  minecraftVersion: string;
  modLoader: string;
  modLoaderVersion: string;
  enabledModGroups: string[]; // array of group IDs
  selectedPreset: string; // preset ID
  installedPackVersion: string | null; // e.g. "1.0.0"
  path: string; // safe path inside local user data
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface TaskStatus {
  active: boolean;
  progress: number; // 0 to 100
  currentStep: string;
  logs: LogEntry[];
}

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

export interface WorldSummary {
  folderName: string;
  name: string;
  gameMode: string;
  hardcore: boolean;
  version: string;
  lastPlayed: number;
  sizeBytes: number;
  cheats: boolean;
  problem?: string;
}

export interface ServerEntry {
  index: number;
  name: string;
  ip: string;
  icon?: string;
}

export interface ServerStatus {
  online: boolean;
  motd?: string;
  playersOnline?: number;
  playersMax?: number;
  version?: string;
  latencyMs?: number;
  favicon?: string;
  error?: string;
}

export type SkinModel = 'classic' | 'slim';

export interface SkinEntry {
  id: string;
  name: string;
  model: SkinModel;
  dataUri: string;
  width: number;
  height: number;
  source: string;
  addedAt: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  canceled?: boolean;
  error?: string;
  skin?: SkinEntry;
  settings?: T;
  path?: string;
}

declare global {
  interface Window {
    gravityAPI: {
      getSettings(): Promise<GlobalSettings>;
      saveSettings(settings: GlobalSettings): Promise<boolean>;
      getInstances(): Promise<InstanceConfig[]>;
      createInstance(name: string, mcVersion: string): Promise<InstanceConfig>;
      updateInstance(config: InstanceConfig): Promise<boolean>;
      deleteInstance(id: string): Promise<boolean>;
      getPackManifest(): Promise<PackManifest | null>;
      installPack(config: InstanceConfig): Promise<boolean>;
      launchGame(instanceId: string): Promise<{ success: boolean; message: string }>;
      
      // Microsoft Login Flow
      startMicrosoftLogin(): Promise<{ success: boolean; flow?: { userCode: string; deviceCode: string; verificationUri: string; interval: number; expiresIn: number }; error?: string }>;
      pollMicrosoftLogin(deviceCode: string, interval: number): Promise<boolean>;
      stopMicrosoftLogin(): Promise<boolean>;
      onMicrosoftLoginStatus(callback: (data: { status: 'WAITING' | 'SUCCESS' | 'EXPIRED' | 'ERROR'; details?: any }) => void): () => void;

      onPackInstallProgress(instanceId: string, callback: (data: { percent: number; currentStep: string }) => void): () => void;
      onPackInstallLog(instanceId: string, callback: (data: { timestamp: string; level: 'info' | 'warn' | 'error'; message: string }) => void): () => void;

      // Modrinth Search and Install
      modrinthSearch(query: string, mcVersion?: string): Promise<any[]>;
      modrinthInstall(instanceId: string, projectId: string, mcVersion?: string): Promise<{ success: boolean; filename?: string; version?: string; error?: string }>;
      onModrinthInstallProgress(instanceId: string, projectId: string, callback: (percent: number) => void): () => void;

      // Singleplayer worlds
      listWorlds(instanceId: string): Promise<WorldSummary[]>;
      renameWorld(instanceId: string, folderName: string, newName: string): Promise<void>;
      deleteWorld(instanceId: string, folderName: string): Promise<void>;
      duplicateWorld(instanceId: string, folderName: string): Promise<WorldSummary | null>;

      // Multiplayer servers
      listServers(instanceId: string): Promise<ServerEntry[]>;
      addServer(instanceId: string, name: string, ip: string): Promise<ServerEntry[]>;
      updateServer(instanceId: string, index: number, name: string, ip: string): Promise<ServerEntry[]>;
      deleteServer(instanceId: string, index: number): Promise<ServerEntry[]>;
      pingServer(address: string): Promise<ServerStatus>;

      // Skins
      listSkins(): Promise<SkinEntry[]>;
      importSkinFromFile(): Promise<ActionResult>;
      importSkinFromUrl(url: string): Promise<ActionResult>;
      deleteSkin(id: string): Promise<void>;
      applySkin(skinId: string, model: SkinModel): Promise<ActionResult>;
      importActiveAccountSkin(): Promise<ActionResult>;

      // OS integration
      openGameDirectory(instanceId?: string): Promise<ActionResult>;
      openExternal(url: string): Promise<ActionResult>;
      importSettingsFile(): Promise<ActionResult<GlobalSettings>>;
      exportSettingsFile(): Promise<ActionResult>;
    };
  }
}
export interface McVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
}
