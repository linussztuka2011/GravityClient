import React from 'react';
import { GlobalSettings } from '../types/index.js';

interface ModMenuProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToFPSSettings: () => void;
  onNavigateToSettingsProfiles: () => void;
  onNavigateToModrinth: () => void;
}

interface ModDef {
  id: string;
  name: string;
  /** Has a dedicated settings screen in the launcher. */
  hasSettings?: boolean;
  /** Implemented by the client-core mod today, i.e. visibly active in-game. */
  liveInGame?: boolean;
}

export const AVAILABLE_MODS: ModDef[] = [
  { id: 'fps_counter', name: 'FPS Counter', hasSettings: true, liveInGame: true },
  { id: 'ping_display', name: 'Ping Display' },
  { id: 'togglesprint', name: 'ToggleSprint/Sneak' },
  { id: 'direction_hud', name: 'Direction HUD' },
  { id: 'potion_effects', name: 'Potion Effects' },
  { id: 'armor_status', name: 'Armor Status' },
  { id: 'hitbox_display', name: 'Hitbox Display' },
  { id: 'item_physics', name: 'Item Physics' },
  { id: 'chat_filters', name: 'Chat Filters' },
  { id: 'skyblock_addons', name: 'Skyblock Addons' },
  { id: 'hypixel_mods', name: 'Hypixel Mods' },
  { id: 'keystrokes', name: 'Keystrokes' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'item_filters', name: 'Item Filters' },
];

const DEFAULT_ENABLED = ['FPS Counter', 'Ping Display', 'ToggleSprint/Sneak', 'Direction HUD', 'Armor Status'];

export const ModMenu: React.FC<ModMenuProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToFPSSettings,
  onNavigateToSettingsProfiles,
  onNavigateToModrinth,
}) => {
  // Settings are the single source of truth; saving syncs them to every profile's
  // gravity-client-core.json so the companion mod reads them on the next launch.
  const enabledMods = Array.isArray(settings.enabledMods) ? settings.enabledMods : DEFAULT_ENABLED;

  const persist = (updated: string[]) => {
    onSaveSettings({ ...settings, enabledMods: updated });
  };

  const handleToggleMod = (modName: string) => {
    persist(
      enabledMods.includes(modName)
        ? enabledMods.filter((m) => m !== modName)
        : [...enabledMods, modName]
    );
  };

  const handleResetToDefault = () => persist([...DEFAULT_ENABLED]);

  const activeMods = AVAILABLE_MODS.filter((m) => enabledMods.includes(m.name));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Mod-Menu</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', flex: 1, minHeight: '340px' }}>
        {/* Client Mods */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', textAlign: 'center' }}>
            Client Mods
          </h3>
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {AVAILABLE_MODS.map((mod) => {
              const isEnabled = enabledMods.includes(mod.name);
              return (
                <div
                  key={mod.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {mod.name}
                    {mod.liveInGame && (
                      <span
                        title="Rendered in-game by the client-core mod"
                        style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60FFAE', border: '1px solid rgba(96,255,174,0.4)', borderRadius: '100px', padding: '1px 6px' }}
                      >
                        LIVE
                      </span>
                    )}
                  </span>
                  <div onClick={() => handleToggleMod(mod.name)} className={`toggle-switch ${isEnabled ? 'active' : ''}`}>
                    <div className="toggle-switch-handle" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Mods */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', textAlign: 'center' }}>
            Active Mods
          </h3>
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            {activeMods.map((mod) => (
              <div
                key={mod.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px', borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 500, color: '#FFFFFF' }}>{mod.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {mod.hasSettings && (
                    <div
                      onClick={() => mod.id === 'fps_counter' && onNavigateToFPSSettings()}
                      style={{ display: 'flex', cursor: mod.id === 'fps_counter' ? 'pointer' : 'default', opacity: mod.id === 'fps_counter' ? 0.75 : 0.3 }}
                      title={mod.id === 'fps_counter' ? 'Configure FPS Counter' : 'No extra settings yet'}
                      className={mod.id === 'fps_counter' ? 'hover-bright' : undefined}
                    >
                      <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                  <div
                    onClick={() => handleToggleMod(mod.name)}
                    title={`Disable ${mod.name}`}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 'bold',
                    }}
                    className="hover-bright"
                  >
                    ✕
                  </div>
                </div>
              </div>
            ))}

            {activeMods.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Nothing enabled. Toggle modules on the left.
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
            Saved to every profile's <code style={{ fontFamily: 'var(--font-mono)' }}>config/gravity-client-core.json</code>.
            Modules marked <strong style={{ color: '#60FFAE' }}>LIVE</strong> are rendered by the client-core mod today;
            the rest are stored for upcoming module support.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Settings Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToModrinth}>Download More Mods</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Back</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={handleResetToDefault}>Reset to Default</button>
      </div>
    </div>
  );
};
export default ModMenu;
