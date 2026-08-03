import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';
import { AVAILABLE_MODS } from './ModMenu.js';

interface FPSSettingsProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToSettingsProfiles: () => void;
}

const DEFAULT_FPS_SETTINGS = {
  position: 'Top Left',
  color: '#FFFFFF',
  textColorToggle: true,
  background: '#000000',
  backgroundToggle: true,
  opacity: 50,
  fontSize: 14,
  showAverage: true,
};

const POSITIONS = ['Top Left', 'Top Right', 'Bottom Left', 'Bottom Right'];

export const FPSSettings: React.FC<FPSSettingsProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToSettingsProfiles,
}) => {
  const current = { ...DEFAULT_FPS_SETTINGS, ...(settings.fpsSettings || {}) };

  const [position, setPosition] = useState<string>(current.position);
  const [color, setColor] = useState<string>(current.color);
  const [textColorToggle, setTextColorToggle] = useState<boolean>(current.textColorToggle !== false);
  const [background, setBackground] = useState<string>(current.background);
  const [backgroundToggle, setBackgroundToggle] = useState<boolean>(current.backgroundToggle !== false);
  const [opacity, setOpacity] = useState<number>(current.opacity);
  const [fontSize, setFontSize] = useState<number>(current.fontSize);
  const [showAverage, setShowAverage] = useState<boolean>(current.showAverage !== false);
  const [saved, setSaved] = useState(false);

  const enabledMods = Array.isArray(settings.enabledMods) ? settings.enabledMods : [];
  const fpsCounterEnabled = enabledMods.includes('FPS Counter');

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      fpsSettings: { position, color, textColorToggle, background, backgroundToggle, opacity, fontSize, showAverage },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetToDefault = () => {
    setPosition(DEFAULT_FPS_SETTINGS.position);
    setColor(DEFAULT_FPS_SETTINGS.color);
    setTextColorToggle(DEFAULT_FPS_SETTINGS.textColorToggle);
    setBackground(DEFAULT_FPS_SETTINGS.background);
    setBackgroundToggle(DEFAULT_FPS_SETTINGS.backgroundToggle);
    setOpacity(DEFAULT_FPS_SETTINGS.opacity);
    setFontSize(DEFAULT_FPS_SETTINGS.fontSize);
    setShowAverage(DEFAULT_FPS_SETTINGS.showAverage);
  };

  const getRgba = (hex: string, alphaPercent: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alphaPercent / 100})`;
  };

  // Mirrors the in-game anchor so the preview lands in the same corner.
  const previewAlignment: React.CSSProperties = {
    justifyContent: position.startsWith('Top') ? 'flex-start' : 'flex-end',
    alignItems: position.endsWith('Left') ? 'flex-start' : 'flex-end',
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Mod-Settings: FPS Counter</p>
      </header>

      {!fpsCounterEnabled && (
        <div style={{ padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,221,115,0.08)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', fontSize: '0.85rem', textAlign: 'center' }}>
          The FPS Counter module is currently switched off in the Mod-Menu, so this overlay will not render in-game.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', flex: 1, minHeight: '340px' }}>
        {/* Configuration */}
        <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>FPS Settings</h3>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Screen Position</label>
            <select className="form-control form-select" value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Text Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#FFFFFF'}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  style={{ width: '40px', height: '40px', border: '1px solid var(--color-border)', borderRadius: '50%', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
                <input type="text" className="form-control" style={{ flex: 1, borderRadius: '100px', fontSize: '0.9rem' }} value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ justifyContent: 'center', alignItems: 'flex-end', height: '100%', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>USE COLOR</span>
                <div onClick={() => setTextColorToggle(!textColorToggle)} className={`toggle-switch ${textColorToggle ? 'active' : ''}`}>
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Background</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(background) ? background : '#000000'}
                  onChange={(e) => setBackground(e.target.value.toUpperCase())}
                  style={{ width: '40px', height: '40px', border: '1px solid var(--color-border)', borderRadius: '50%', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
                <input type="text" className="form-control" style={{ flex: 1, borderRadius: '100px', fontSize: '0.9rem' }} value={background} onChange={(e) => setBackground(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ justifyContent: 'center', alignItems: 'flex-end', height: '100%', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>BACKGROUND</span>
                <div onClick={() => setBackgroundToggle(!backgroundToggle)} className={`toggle-switch ${backgroundToggle ? 'active' : ''}`}>
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Background Opacity</label>
              <input type="range" min="0" max="100" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))} disabled={!backgroundToggle} style={{ width: '100%', accentColor: 'var(--color-accent)', opacity: backgroundToggle ? 1 : 0.4 }} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{opacity}%</span>
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Font Size</label>
              <input type="range" min="6" max="32" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{fontSize}px</span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Show Rolling Average</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <div onClick={() => setShowAverage(!showAverage)} className={`toggle-switch ${showAverage ? 'active' : ''}`}>
                <div className="toggle-switch-handle" />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{showAverage ? 'On' : 'Off'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>· averaged over the last 60 seconds</span>
            </div>
          </div>
        </div>

        {/* Active mods + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '240px', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Mods</span>
            <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {AVAILABLE_MODS.filter((mod) => enabledMods.includes(mod.name)).map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 16px', borderRadius: '50px',
                    background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{mod.name}</span>
                  {mod.liveInGame && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#60FFAE', border: '1px solid rgba(96,255,174,0.4)', borderRadius: '100px', padding: '1px 6px' }}>LIVE</span>
                  )}
                </div>
              ))}
              {enabledMods.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No modules enabled.</span>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: '180px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>In-Game Preview</span>

            <div
              style={{
                display: 'flex', flex: 1, background: 'linear-gradient(160deg, #4a6f9c 0%, #7fa8c9 60%, #6d8f52 60%, #4e6b3a 100%)',
                borderRadius: '12px', border: '1px solid var(--color-border)', padding: '10px', position: 'relative', overflow: 'hidden',
                ...previewAlignment,
              }}
            >
              <div
                style={{
                  padding: '3px 5px',
                  borderRadius: '2px',
                  background: backgroundToggle ? getRgba(background, opacity) : 'transparent',
                  color: textColorToggle ? color : '#FFFFFF',
                  fontSize: `${fontSize}px`,
                  fontFamily: 'var(--font-mono), monospace',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                  lineHeight: 1.1,
                  transition: 'all 0.15s ease',
                  alignSelf: 'flex-start',
                }}
              >
                FPS: 120{showAverage ? ' (avg 118)' : ''}
              </div>
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              Anchored {position.toLowerCase()} · written to config/gravity-client-core.json on save
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
        {saved && <span style={{ color: '#60FFAE', fontSize: '0.85rem', fontWeight: 600 }}>✓ Saved &amp; synced to profiles</span>}
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={handleResetToDefault}>Reset to Default</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Back</button>
        <button className="pill-btn primary" style={{ minWidth: '200px' }} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
};
export default FPSSettings;
