import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';

interface ModMenuProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToFPSSettings: () => void;
  onNavigateToSettingsProfiles: () => void;
}

interface ModDef {
  id: string;
  name: string;
  hasSettings?: boolean;
  canRemove?: boolean;
}

export const AVAILABLE_MODS: ModDef[] = [
  { id: 'fps_counter', name: 'FPS Counter', hasSettings: true },
  { id: 'ping_display', name: 'Ping Display' },
  { id: 'togglesprint', name: 'ToggleSprint/Sneak' },
  { id: 'direction_hud', name: 'Direction HUD' },
  { id: 'potion_effects', name: 'Potion Effects' },
  { id: 'armor_status', name: 'Armor Status', hasSettings: true },
  { id: 'hitbox_display', name: 'Hitbox Display' },
  { id: 'item_physics', name: 'Item Physics' },
  { id: 'chat_filters', name: 'Chat Filters' },
  { id: 'skyblock_addons', name: 'Skyblock Addons', canRemove: true },
  { id: 'hypixel_mods', name: 'Hypixel Mods' },
  { id: 'keystrokes', name: 'Keystrokes' },
  { id: 'zoom', name: 'Zoom', canRemove: true },
  { id: 'item_filters', name: 'Item Filters', canRemove: true },
];

export const ModMenu: React.FC<ModMenuProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToFPSSettings,
  onNavigateToSettingsProfiles,
}) => {
  // Local state for toggled/enabled mods (by ID / Name as displayed)
  const [enabledMods, setEnabledMods] = useState<string[]>(
    settings.enabledMods || ['FPS Counter', 'Ping Display', 'ToggleSprint/Sneak', 'Direction HUD', 'Armor Status']
  );

  const handleToggleMod = (modName: string) => {
    let updated: string[];
    if (enabledMods.includes(modName)) {
      updated = enabledMods.filter((m) => m !== modName);
    } else {
      updated = [...enabledMods, modName];
    }
    setEnabledMods(updated);
    
    // Save state back to IPC settings
    onSaveSettings({
      ...settings,
      enabledMods: updated,
    });
  };

  const handleRemoveMod = (modName: string) => {
    const updated = enabledMods.filter((m) => m !== modName);
    setEnabledMods(updated);
    onSaveSettings({
      ...settings,
      enabledMods: updated,
    });
  };

  const handleResetToDefault = () => {
    const defaultMods = ['FPS Counter', 'Ping Display', 'ToggleSprint/Sneak', 'Direction HUD', 'Armor Status'];
    setEnabledMods(defaultMods);
    onSaveSettings({
      ...settings,
      enabledMods: defaultMods,
    });
    alert('Mods configuration reset to factory defaults!');
  };

  // Split available mods list to represent left side and right side lists of the screenshot
  const leftSideMods = AVAILABLE_MODS.slice(0, 11); // Standard client lists
  const rightSideMods = AVAILABLE_MODS.filter((m) => enabledMods.includes(m.name) || m.id === 'keystrokes' || m.id === 'zoom' || m.id === 'item_filters');

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Mod-Menu</p>
      </header>

      {/* Columns: Left (Client Mods), Right (Active Mods) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', flex: 1, minHeight: '340px' }}>
        
        {/* Left Column: Client Mods */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', textAlign: 'center' }}>Client Mods</h3>
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {leftSideMods.map((mod) => {
              const isEnabled = enabledMods.includes(mod.name);
              return (
                <div
                  key={mod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>{mod.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onClick={() => handleToggleMod(mod.name)}
                      className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                    >
                      <div className="toggle-switch-handle" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Mods */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', textAlign: 'center' }}>Active Mods</h3>
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {rightSideMods.map((mod) => {
              const isEnabled = enabledMods.includes(mod.name) || mod.id === 'keystrokes' || mod.id === 'zoom';
              return (
                <div
                  key={mod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: isEnabled ? '#FFFFFF' : 'var(--color-text-muted)' }}>{mod.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Settings Cog Icon */}
                    {mod.hasSettings && isEnabled && (
                      <div
                        onClick={() => {
                          if (mod.id === 'fps_counter') {
                            onNavigateToFPSSettings();
                          } else {
                            alert(`Opening settings for "${mod.name}" (Mocked)`);
                          }
                        }}
                        style={{ display: 'flex', cursor: 'pointer', opacity: 0.75, transition: 'opacity 0.2s' }}
                        title={`Configure ${mod.name}`}
                        className="hover-bright"
                      >
                        <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    {/* Toggle Switch */}
                    {!mod.canRemove ? (
                      <div
                        onClick={() => handleToggleMod(mod.name)}
                        className={`toggle-switch ${isEnabled ? 'active' : ''}`}
                      >
                        <div className="toggle-switch-handle" />
                      </div>
                    ) : (
                      /* Close button */
                      <div
                        onClick={() => handleRemoveMod(mod.name)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#007ACC',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✕
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Settings Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={() => alert('Download More Mods: Opens Modrinth integration... (Mocked)')}>Download More Mods</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Back</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={handleResetToDefault}>Reset to Default</button>
        <button
          className="pill-btn primary"
          style={{
            minWidth: '200px',
            background: settings.meteorEnabled
              ? 'linear-gradient(135deg, #FF4B5C 0%, #FA895E 100%)'
              : 'linear-gradient(135deg, var(--color-accent) 0%, #FA895E 100%)',
            borderColor: settings.meteorEnabled ? '#FF4B5C' : 'var(--color-accent)'
          }}
          onClick={() => {
            onSaveSettings({
              ...settings,
              meteorEnabled: !settings.meteorEnabled
            });
          }}
        >
          {settings.meteorEnabled ? 'Gravity' : 'Antigravity'}
        </button>
      </div>
    </div>
  );
};
export default ModMenu;
