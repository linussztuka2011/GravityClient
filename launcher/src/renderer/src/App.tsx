import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';
import { TasksView } from './pages/TasksView.js';
import { Settings } from './pages/Settings.js';
import { SkinMenu } from './pages/SkinMenu.js';
import { ModMenu } from './pages/ModMenu.js';
import { FPSSettings } from './pages/FPSSettings.js';
import { AccountLogin } from './pages/AccountLogin.js';
import { Singleplayer } from './pages/Singleplayer.js';
import { Multiplayer } from './pages/Multiplayer.js';
import { Instances } from './pages/Instances.js';
import { InstanceConfig, PackManifest, TaskStatus, LogEntry, GlobalSettings } from './types/index.js';

const DEFAULT_SETTINGS: GlobalSettings = {
  ram: '4G',
  customJava: '',
  debugMode: false,
  activeProfileId: '',
  activeSkin: 'Steve',
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
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [instances, setInstances] = useState<InstanceConfig[]>([]);
  const [activeInstance, setActiveInstance] = useState<InstanceConfig | null>(null);
  const [packManifest, setPackManifest] = useState<PackManifest | null>(null);
  
  // Settings state loaded from backend
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);

  // Terminal tracking
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    active: false,
    progress: 0,
    currentStep: 'Standby',
    logs: [],
  });

  // Load settings, instances & manifest on startup
  useEffect(() => {
    const initData = async () => {
      try {
        // Load settings from IPC
        const loadedSettings = await window.gravityAPI.getSettings();
        if (loadedSettings) {
          setSettings(loadedSettings);
        }

        const loadedInstances = await window.gravityAPI.getInstances();
        setInstances(loadedInstances);
        if (loadedInstances.length > 0) {
          setActiveInstance(loadedInstances[0]);
        }

        const manifest = await window.gravityAPI.getPackManifest();
        setPackManifest(manifest);
      } catch (err) {
        console.error('Failed to initialize launcher API:', err);
      }
    };
    initData();
  }, []);

  // Save settings callback
  const handleSaveSettings = async (updatedSettings: GlobalSettings) => {
    try {
      setSettings(updatedSettings);
      await window.gravityAPI.saveSettings(updatedSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  // Creation callback
  const handleCreateInstance = async (name: string, mcVersion: string) => {
    try {
      const newInst = await window.gravityAPI.createInstance(name, mcVersion);
      setInstances((prev) => [...prev, newInst]);
      setActiveInstance(newInst);
    } catch (err) {
      console.error('Failed to create instance:', err);
    }
  };

  // Update callback
  const handleUpdateInstance = async (config: InstanceConfig) => {
    try {
      await window.gravityAPI.updateInstance(config);
      setInstances((prev) => prev.map((inst) => (inst.id === config.id ? config : inst)));
    } catch (err) {
      console.error('Failed to update instance:', err);
    }
  };

  // Delete callback
  const handleDeleteInstance = async (id: string) => {
    try {
      await window.gravityAPI.deleteInstance(id);
      setInstances((prev) => prev.filter((inst) => inst.id !== id));
      if (activeInstance?.id === id) {
        setActiveInstance(null);
      }
    } catch (err) {
      console.error('Failed to delete instance:', err);
    }
  };

  // Install Modpack Callback with IPC subscription
  const handleInstallPack = async (instance: InstanceConfig) => {
    // Reset and enable task status
    setTaskStatus({
      active: true,
      progress: 0,
      currentStep: 'Starting deployment queue...',
      logs: [
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Initializing local environment copy: ${instance.name}`,
        },
      ],
    });

    // Jump to terminal page
    setActiveTab('tasks');

    // Subscribe to IPC streams
    const unsubProgress = window.gravityAPI.onPackInstallProgress(
      instance.id,
      (data: { percent: number; currentStep: string }) => {
        setTaskStatus((prev) => ({
          ...prev,
          progress: data.percent,
          currentStep: data.currentStep,
        }));
      }
    );

    const unsubLogs = window.gravityAPI.onPackInstallLog(
      instance.id,
      (data: LogEntry) => {
        setTaskStatus((prev) => ({
          ...prev,
          logs: [...prev.logs, data],
        }));
      }
    );

    try {
      const success = await window.gravityAPI.installPack(instance);
      
      // Cleanup events
      unsubProgress();
      unsubLogs();

      if (success) {
        // Refresh local lists
        const refreshed = await window.gravityAPI.getInstances();
        setInstances(refreshed);
        const updated = refreshed.find((i) => i.id === instance.id) || null;
        if (updated) {
          setActiveInstance(updated);
        }
        
        setTaskStatus((prev) => ({
          ...prev,
          progress: 100,
          currentStep: 'Completed',
          active: false, // Turn off active loading ring
        }));
      } else {
        setTaskStatus((prev) => ({
          ...prev,
          active: false,
          currentStep: 'Installation failed',
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: 'error',
              message: 'Install failed. Review console logs above.',
            },
          ],
        }));
      }
    } catch (err: any) {
      unsubProgress();
      unsubLogs();
      setTaskStatus((prev) => ({
        ...prev,
        active: false,
        currentStep: 'Crash error',
        logs: [
          ...prev.logs,
          {
            timestamp: new Date().toLocaleTimeString(),
            level: 'error',
            message: `Installer encountered error: ${err.message}`,
          },
        ],
      }));
    }
  };

  // Launch Simulation Callback
  const handleLaunchGame = async (id: string) => {
    try {
      const res = await window.gravityAPI.launchGame(id);
      alert(res.message);
    } catch (err) {
      console.error('Launch failed:', err);
    }
  };

  return (
    <Layout>
      {activeTab === 'dashboard' && (
        <Dashboard
          instances={instances}
          settings={settings}
          setActiveTab={setActiveTab}
          onLaunch={handleLaunchGame}
          onCreateInstance={handleCreateInstance}
          onUpdateInstance={handleUpdateInstance}
          onDeleteInstance={handleDeleteInstance}
          onInstall={handleInstallPack}
          packManifest={packManifest}
        />
      )}

      {activeTab === 'settings' && (
        <Settings
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onNavigateToTab={setActiveTab}
        />
      )}

      {activeTab === 'instances' && (
        <Instances
          instances={instances}
          packManifest={packManifest}
          activeInstance={activeInstance}
          setActiveInstance={setActiveInstance}
          onCreateInstance={handleCreateInstance}
          onUpdateInstance={handleUpdateInstance}
          onDeleteInstance={handleDeleteInstance}
          onInstall={handleInstallPack}
          onLaunch={handleLaunchGame}
          onBack={() => setActiveTab('dashboard')}
        />
      )}

      {activeTab === 'skin_menu' && (
        <SkinMenu
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onBack={() => setActiveTab('dashboard')}
          onNavigateToSettingsProfiles={() => setActiveTab('instances')}
        />
      )}

      {activeTab === 'mod_menu' && (
        <ModMenu
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onBack={() => setActiveTab('settings')}
          onNavigateToFPSSettings={() => setActiveTab('fps_settings')}
          onNavigateToSettingsProfiles={() => setActiveTab('instances')}
        />
      )}

      {activeTab === 'fps_settings' && (
        <FPSSettings
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onBack={() => setActiveTab('mod_menu')}
          onNavigateToSettingsProfiles={() => setActiveTab('instances')}
        />
      )}

      {activeTab === 'account_login' && (
        <AccountLogin
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onBack={() => setActiveTab('settings')}
        />
      )}

      {activeTab === 'singleplayer' && (
        <Singleplayer
          onBack={() => setActiveTab('dashboard')}
          onLaunch={handleLaunchGame}
        />
      )}

      {activeTab === 'multiplayer' && (
        <Multiplayer
          onBack={() => setActiveTab('dashboard')}
          onLaunch={handleLaunchGame}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksView
          taskStatus={taskStatus}
          instanceName={instances.find((i) => i.id === activeInstance?.id)?.name}
        />
      )}
    </Layout>
  );
};

export default App;
