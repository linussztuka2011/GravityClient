import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/index.css';

// Browser testing fallback API mock
if (!window.gravityAPI) {
  console.log('%c[Gravity Mock]%c Running outside of Electron container. Injecting high-fidelity browser API mocks...', 'color: #FFAE73; font-weight: bold;', 'color: inherit;');

  const DEFAULT_SETTINGS = {
    ram: '4G',
    customJava: '',
    debugMode: false,
    activeProfileId: 'gravity-standard',
    activeSkin: 'Steve',
    enabledMods: ['FPS Counter', 'Ping Display', 'ToggleSprint/Sneak', 'Direction HUD', 'Armor Status'],
    meteorEnabled: false,
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
  };

  const DEFAULT_INSTANCES = [
    {
      id: 'gravity-standard',
      name: 'Gravity Sunset Standard',
      minecraftVersion: '1.21',
      modLoader: 'fabric',
      modLoaderVersion: '0.15.11',
      enabledModGroups: ['performance', 'hud-qol', 'utility'],
      selectedPreset: 'performance',
      installedPackVersion: null,
      path: '/mock-path/instances/standard',
    }
  ];

  const MOCK_MANIFEST = {
    id: "gravity-standard-pack",
    name: "Gravity Standard Optimizations",
    version: "1.0.0",
    minecraftVersion: "1.21",
    modLoader: "fabric",
    modLoaderVersion: ">=0.15.11",
    requiredMods: [
      { id: "fabric-api", name: "Fabric API", description: "Core API library for the Fabric toolchain, required by most mods.", modrinth: { projectId: "P7C9S38A", slug: "fabric-api", versionConstraint: "^0.100.0" }, hashes: { sha1: "713ba245df9e4a3f124581c7fde92d83ab945a2c" }, license: { name: "Apache-2.0", url: "https://github.com/FabricMC/fabric/blob/1.21/LICENSE" }, attribution: "FabricMC Team" },
      { id: "cloth-config", name: "Cloth Config API", description: "Configuration API library required by many client UI mods.", modrinth: { projectId: "9s6t2o1L", slug: "cloth-config", versionConstraint: "^15.0.127" }, hashes: { sha1: "6c4578bdf1298cde3e5b38779ca2e4c029cd781a" }, license: { name: "LGPL-3.0-only", url: "" }, attribution: "shedaniel" },
      { id: "modmenu", name: "Mod Menu", description: "Adds a screen to view and configure installed mods.", modrinth: { projectId: "mOgS1gSp", slug: "modmenu", versionConstraint: "^11.0.0" }, hashes: { sha1: "da66e01be7a13c9e99a778848d7be639bc8a36ef" }, license: { name: "MIT", url: "" }, attribution: "TerraformersMC" }
    ],
    optionalGroups: [
      {
        id: "performance",
        name: "Performance Enhancements",
        description: "Essential optimizations for high FPS, reduced memory usage, and stutter-free gameplay.",
        defaultEnabled: true,
        mods: []
      },
      {
        id: "minimap",
        name: "Minimap & Navigation",
        description: "In-game maps and coordinate pointers for efficient exploration.",
        defaultEnabled: false,
        mods: []
      },
      {
        id: "visual",
        name: "Visual Upgrades",
        description: "Adds custom shaders support and dynamic zoom.",
        defaultEnabled: false,
        mods: []
      },
      {
        id: "hud-qol",
        name: "HUD & Quality of Life",
        description: "Visual feedback indicators for food, coordinates, and system stats.",
        defaultEnabled: true,
        mods: []
      },
      {
        id: "utility",
        name: "Utility Extras",
        description: "Minor client tool improvements and item previews.",
        defaultEnabled: true,
        mods: []
      }
    ],
    presets: [
      { id: "balanced", name: "Balanced Experience", description: "A stable mix of high performance, smooth visual upgrades, and QoL HUD enhancements." },
      { id: "performance", name: "Maximum Performance", description: "Aggressively optimizes frame rates by shutting off heavy graphic modules and particle layers." },
      { id: "visual", name: "Cinematic Visuals", description: "Focuses on graphic beauty. Enables shaders support, smooth zoom curves, and high rendering render-distances." }
    ]
  };

  const progressCallbacks: Record<string, ((data: any) => void)[]> = {};
  const logCallbacks: Record<string, ((data: any) => void)[]> = {};

  window.gravityAPI = {
    getSettings: async () => {
      const s = localStorage.getItem('gravity_settings');
      return s ? JSON.parse(s) : DEFAULT_SETTINGS;
    },
    saveSettings: async (settings: any) => {
      localStorage.setItem('gravity_settings', JSON.stringify(settings));
      return true;
    },
    getInstances: async () => {
      const i = localStorage.getItem('gravity_instances_v2');
      if (!i) {
        localStorage.setItem('gravity_instances_v2', JSON.stringify(DEFAULT_INSTANCES));
        return DEFAULT_INSTANCES;
      }
      return JSON.parse(i);
    },
    createInstance: async (name: string, mcVersion: string) => {
      const i = localStorage.getItem('gravity_instances_v2');
      const list = i ? JSON.parse(i) : DEFAULT_INSTANCES;
      const newInst = {
        id: 'inst-' + Math.random().toString(36).substring(2, 11),
        name,
        minecraftVersion: mcVersion,
        modLoader: 'fabric',
        modLoaderVersion: '0.15.11',
        enabledModGroups: ['performance', 'hud-qol', 'utility'],
        selectedPreset: 'performance',
        installedPackVersion: null,
        path: '/mock-path/instances/' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      };
      list.push(newInst);
      localStorage.setItem('gravity_instances_v2', JSON.stringify(list));
      return newInst;
    },
    updateInstance: async (config: any) => {
      const i = localStorage.getItem('gravity_instances_v2');
      const list = i ? JSON.parse(i) : DEFAULT_INSTANCES;
      const index = list.findIndex((inst: any) => inst.id === config.id);
      if (index > -1) {
        list[index] = config;
        localStorage.setItem('gravity_instances_v2', JSON.stringify(list));
        return true;
      }
      return false;
    },
    deleteInstance: async (id: string) => {
      const i = localStorage.getItem('gravity_instances_v2');
      const list = i ? JSON.parse(i) : DEFAULT_INSTANCES;
      const filtered = list.filter((inst: any) => inst.id !== id);
      localStorage.setItem('gravity_instances_v2', JSON.stringify(filtered));
      return true;
    },
    getPackManifest: async () => {
      return MOCK_MANIFEST;
    },
    installPack: async (config: any) => {
      const instanceId = config.id;
      const steps = [
        { percent: 10, step: "Initializing local sandbox environment...", logs: ["Creating directory structure...", "Configuring launch arguments..."] },
        { percent: 30, step: "Connecting to Modrinth API...", logs: ["Verifying client credentials...", "Fetching standard-pack mod list..."] },
        { percent: 50, step: "Downloading required mods...", logs: ["Downloading fabric-api (1/3)...", "Downloading cloth-config (2/3)...", "Downloading modmenu (3/3)...", "All core dependencies verified."] },
        { percent: 75, step: "Applying optional group optimizations...", logs: ["Processing active group presets...", "Downloading performance and HUD assets...", "Unpacking 8 optimization assets."] },
        { percent: 90, step: "Writing configuration profiles...", logs: ["Configuring game options...", "Applying selected preset: " + config.selectedPreset + "..."] },
        { percent: 100, step: "Complete!", logs: ["Verification complete.", "All dependencies verified successfully.", "Instance configured and ready to play!"] }
      ];

      for (const step of steps) {
        await new Promise(r => setTimeout(r, 450));
        
        const pCbs = progressCallbacks[instanceId] || [];
        pCbs.forEach(cb => cb({ percent: step.percent, currentStep: step.step }));
        
        const lCbs = logCallbacks[instanceId] || [];
        for (const logLine of step.logs) {
          lCbs.forEach(cb => cb({
            timestamp: new Date().toLocaleTimeString(),
            level: 'info',
            message: logLine
          }));
          await new Promise(r => setTimeout(r, 120));
        }
      }

      const instancesStr = localStorage.getItem('gravity_instances_v2');
      if (instancesStr) {
        const list = JSON.parse(instancesStr);
        const idx = list.findIndex((i: any) => i.id === config.id);
        if (idx > -1) {
          list[idx].installedPackVersion = '1.0.0';
          localStorage.setItem('gravity_instances_v2', JSON.stringify(list));
        }
      }

      return true;
    },
    launchGame: async (instanceId: string) => {
      return new Promise(r => setTimeout(() => {
        r({ success: true, message: "Client simulation launched successfully under process ID " + Math.floor(1000 + Math.random() * 9000) });
      }, 1000));
    },
    onPackInstallProgress: (instanceId: string, callback: (data: any) => void) => {
      if (!progressCallbacks[instanceId]) progressCallbacks[instanceId] = [];
      progressCallbacks[instanceId].push(callback);
      return () => {
        progressCallbacks[instanceId] = progressCallbacks[instanceId].filter(cb => cb !== callback);
      };
    },
    onPackInstallLog: (instanceId: string, callback: (data: any) => void) => {
      if (!logCallbacks[instanceId]) logCallbacks[instanceId] = [];
      logCallbacks[instanceId].push(callback);
      return () => {
        logCallbacks[instanceId] = logCallbacks[instanceId].filter(cb => cb !== callback);
      };
    }
  } as any;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
