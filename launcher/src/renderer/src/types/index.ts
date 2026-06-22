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

declare global {
  interface Window {
    gravityAPI: {
      getInstances(): Promise<InstanceConfig[]>;
      createInstance(name: string, mcVersion: string): Promise<InstanceConfig>;
      updateInstance(config: InstanceConfig): Promise<boolean>;
      deleteInstance(id: string): Promise<boolean>;
      getPackManifest(): Promise<PackManifest | null>;
      installPack(config: InstanceConfig): Promise<boolean>;
      launchGame(instanceId: string): Promise<{ success: boolean; message: string }>;
      onPackInstallProgress(instanceId: string, callback: (data: { percent: number; currentStep: string }) => void): () => void;
      onPackInstallLog(instanceId: string, callback: (data: { timestamp: string; level: 'info' | 'warn' | 'error'; message: string }) => void): () => void;
    };
  }
}

