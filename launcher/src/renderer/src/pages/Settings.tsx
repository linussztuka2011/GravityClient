import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';

interface SettingsProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onNavigateToTab: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onSaveSettings,
  onNavigateToTab,
}) => {
  // Modal toggles
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // States for sub-menus
  const [ram, setRam] = useState<string>(settings.ram || '4G');
  const [customJava, setCustomJava] = useState<string>(settings.customJava || '');
  const [debugMode, setDebugMode] = useState<boolean>(settings.debugMode || false);

  // Simulated Video state
  const [renderDistance, setRenderDistance] = useState<number>(12);
  const [vsync, setVsync] = useState<boolean>(true);

  // Simulated Audio state
  const [masterVolume, setMasterVolume] = useState<number>(80);
  const [musicVolume, setMusicVolume] = useState<number>(50);

  // Settings import/export feedback
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  // Save specific states back to parent settings
  const handleSaveSubState = (updates: Partial<GlobalSettings>) => {
    const updated = {
      ...settings,
      ...updates,
    };
    onSaveSettings(updated);
  };

  const handleRamChange = (newRam: string) => {
    setRam(newRam);
    handleSaveSubState({ ram: newRam });
  };

  const handleJavaChange = (newJava: string) => {
    setCustomJava(newJava);
    handleSaveSubState({ customJava: newJava });
  };

  const handleDebugToggle = () => {
    const nextVal = !debugMode;
    setDebugMode(nextVal);
    handleSaveSubState({ debugMode: nextVal });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Settings Dashboard</p>
      </header>

      {/* 3x3 Grid Matching IMG_2758.png */}
      <div className="settings-grid">
        <button className="settings-grid-btn" onClick={() => setActiveModal('accessibility')}>
          Accessibility
        </button>
        <button className="settings-grid-btn" onClick={() => onNavigateToTab('mod_menu')}>
          Mod-Menu
        </button>
        <button className="settings-grid-btn" onClick={() => setActiveModal('advanced')}>
          Advanced
        </button>
        <button className="settings-grid-btn" onClick={() => setActiveModal('video_settings')}>
          Video-Settings
        </button>
        <button className="settings-grid-btn" onClick={() => onNavigateToTab('account_login')}>
          Account
        </button>
        <button className="settings-grid-btn" onClick={() => setActiveModal('audio_settings')}>
          Audio-Settings
        </button>
        <button className="settings-grid-btn" onClick={() => setActiveModal('credits')}>
          Credits
        </button>
        <button className="settings-grid-btn" onClick={() => onNavigateToTab('dashboard')}>
          Back
        </button>
        <button className="settings-grid-btn" onClick={() => setActiveModal('import_settings')}>
          Import
        </button>
      </div>

      {/* MODALS FOR EACH SELECTION */}
      
      {/* Accessibility Modal */}
      {activeModal === 'accessibility' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Accessibility Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Text-To-Speech Narrator</span>
                <div className="toggle-switch"><div className="toggle-switch-handle" /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>High Contrast Interface</span>
                <div className="toggle-switch"><div className="toggle-switch-handle" /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Subtitles Display</span>
                <div className="toggle-switch active"><div className="toggle-switch-handle" /></div>
              </div>
            </div>
            <button className="pill-btn primary" style={{ marginTop: '12px' }} onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Advanced Modal (Developer Settings) */}
      {activeModal === 'advanced' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }} className="cyan-gradient-text">Advanced</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Verbose Debug Logs</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Streams API pull operations to terminal logs.</p>
                </div>
                <div className={`toggle-switch ${debugMode ? 'active' : ''}`} onClick={handleDebugToggle}>
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
            <button className="pill-btn primary" style={{ marginTop: '12px' }} onClick={() => setActiveModal(null)}>Back to Settings</button>
          </div>
        </div>
      )}

      {/* Video-Settings & JRE ALLOCATION Modal */}
      {activeModal === 'video_settings' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Video & JRE Settings</h3>
            
            {/* RAM Allocation */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Memory Allocation (Maximum RAM)</label>
              <select className="form-control form-select" value={ram} onChange={(e) => handleRamChange(e.target.value)}>
                <option value="2G">2 GB (Minimum)</option>
                <option value="4G">4 GB (Recommended)</option>
                <option value="6G">6 GB (Heavy Shaders)</option>
                <option value="8G">8 GB (Enthusiast)</option>
                <option value="12G">12 GB (Uncapped)</option>
              </select>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                Assign dedicated host RAM directly into JVM launch parameters.
              </p>
            </div>

            {/* Custom Java executable */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Custom Java Path (JDK 21 required)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Default system JVM (auto-resolved)"
                value={customJava}
                onChange={(e) => handleJavaChange(e.target.value)}
              />
            </div>

            {/* Render Distance Slider */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label>Render Distance</label>
                <input
                  type="range"
                  min="2"
                  max="32"
                  value={renderDistance}
                  onChange={(e) => setRenderDistance(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{renderDistance} Chunks</span>
            </div>

            {/* VSync toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>VSync (Frame Sync Lock)</span>
              <div className={`toggle-switch ${vsync ? 'active' : ''}`} onClick={() => setVsync(!vsync)}>
                <div className="toggle-switch-handle" />
              </div>
            </div>

            <button className="pill-btn primary" style={{ marginTop: '12px' }} onClick={() => setActiveModal(null)}>Save & Exit</button>
          </div>
        </div>
      )}

      {/* Audio-Settings Modal */}
      {activeModal === 'audio_settings' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Audio Settings</h3>
            
            {/* Master Volume */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label>Master Volume</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{masterVolume}%</span>
            </div>

            {/* Music Volume */}
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label>Music Volume</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{musicVolume}%</span>
            </div>

            <button className="pill-btn primary" style={{ marginTop: '12px' }} onClick={() => setActiveModal(null)}>Save & Close</button>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      {activeModal === 'credits' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '450px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }} className="cyan-gradient-text">Ecosystem Credits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', color: 'var(--color-text-secondary)', textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
              <div><strong>Launcher:</strong> Electron, React, TypeScript, Vite</div>
              <div><strong>Companion mod:</strong> Fabric Loader, Java 21</div>
              <div><strong>Mod distribution:</strong> Modrinth API</div>
              <div><strong>Version:</strong> v1.0.0</div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
              Third-party mods are downloaded from Modrinth under their own licences, which are listed in
              the pack manifest.
            </p>
            <button className="pill-btn primary" onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Import / Export Settings Modal */}
      {activeModal === 'import_settings' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '32px', width: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Import / Export Configuration</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Settings are read from and written to a real JSON file. Imported keys are merged over your
              current configuration, so a partial export cannot blank anything out.
            </p>

            {transferMessage && (
              <div style={{
                padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', wordBreak: 'break-word',
                background: transferMessage.kind === 'error' ? 'rgba(255,74,90,0.1)' : 'rgba(96,255,174,0.08)',
                border: `1px solid ${transferMessage.kind === 'error' ? 'var(--color-error)' : 'rgba(96,255,174,0.35)'}`,
                color: transferMessage.kind === 'error' ? 'var(--color-error)' : '#60FFAE',
              }}>
                {transferMessage.text}
              </div>
            )}

            <button
              className="pill-btn"
              style={{ padding: '12px' }}
              disabled={transferBusy}
              onClick={async () => {
                setTransferBusy(true);
                setTransferMessage(null);
                try {
                  const result = await window.gravityAPI.importSettingsFile();
                  if (result.canceled) return;
                  if (result.success && result.settings) {
                    onSaveSettings(result.settings);
                    setRam(result.settings.ram || '4G');
                    setCustomJava(result.settings.customJava || '');
                    setDebugMode(Boolean(result.settings.debugMode));
                    setTransferMessage({ kind: 'info', text: `Imported settings from ${result.path}` });
                  } else {
                    setTransferMessage({ kind: 'error', text: result.error || 'Import failed.' });
                  }
                } catch (err: any) {
                  setTransferMessage({ kind: 'error', text: err?.message || 'Import failed.' });
                } finally {
                  setTransferBusy(false);
                }
              }}
            >
              Import settings from a JSON file…
            </button>

            <button
              className="pill-btn"
              style={{ padding: '12px' }}
              disabled={transferBusy}
              onClick={async () => {
                setTransferBusy(true);
                setTransferMessage(null);
                try {
                  const result = await window.gravityAPI.exportSettingsFile();
                  if (result.canceled) return;
                  setTransferMessage(
                    result.success
                      ? { kind: 'info', text: `Exported current settings to ${result.path}` }
                      : { kind: 'error', text: result.error || 'Export failed.' }
                  );
                } catch (err: any) {
                  setTransferMessage({ kind: 'error', text: err?.message || 'Export failed.' });
                } finally {
                  setTransferBusy(false);
                }
              }}
            >
              Export current settings…
            </button>

            <button className="pill-btn primary" onClick={() => { setActiveModal(null); setTransferMessage(null); }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default Settings;
