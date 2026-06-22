import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';
import { AVAILABLE_MODS } from './ModMenu.js';

interface FPSSettingsProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToSettingsProfiles: () => void;
}

export const FPSSettings: React.FC<FPSSettingsProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToSettingsProfiles,
}) => {
  // Load initial settings
  const defaultFpsSettings = {
    position: 'Top Left',
    color: '#FFFFFF',
    textColorToggle: true,
    background: '#000000',
    backgroundToggle: true,
    opacity: 50,
    fontSize: 14,
    showAverage: true,
  };

  const currentFpsSettings = settings.fpsSettings || defaultFpsSettings;

  // Local state for FPS settings
  const [position, setPosition] = useState<string>(currentFpsSettings.position || 'Top Left');
  const [color, setColor] = useState<string>(currentFpsSettings.color || '#FFFFFF');
  const [textColorToggle, setTextColorToggle] = useState<boolean>(
    currentFpsSettings.textColorToggle !== undefined ? currentFpsSettings.textColorToggle : true
  );
  const [background, setBackground] = useState<string>(currentFpsSettings.background || '#000000');
  const [backgroundToggle, setBackgroundToggle] = useState<boolean>(
    currentFpsSettings.backgroundToggle !== undefined ? currentFpsSettings.backgroundToggle : true
  );
  const [opacity, setOpacity] = useState<number>(currentFpsSettings.opacity !== undefined ? currentFpsSettings.opacity : 50);
  const [fontSize, setFontSize] = useState<number>(currentFpsSettings.fontSize || 14);
  const [showAverage, setShowAverage] = useState<boolean>(
    currentFpsSettings.showAverage !== undefined ? currentFpsSettings.showAverage : true
  );
  const [decimalPlaces, setDecimalPlaces] = useState<string>('Off');

  const handleSave = () => {
    const updated = {
      ...settings,
      fpsSettings: {
        position,
        color,
        textColorToggle,
        background,
        backgroundToggle,
        opacity,
        fontSize,
        showAverage,
      },
    };
    onSaveSettings(updated);
    alert('FPS Counter settings saved successfully!');
    onBack();
  };

  const handleResetToDefault = () => {
    setPosition('Top Left');
    setColor('#FFFFFF');
    setTextColorToggle(true);
    setBackground('#000000');
    setBackgroundToggle(true);
    setOpacity(50);
    setFontSize(14);
    setShowAverage(true);
    setDecimalPlaces('Off');
  };

  // Convert hex to rgba to support opacity slider in preview
  const getRgba = (hex: string, alphaPercent: number) => {
    // Basic hex parsing
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alphaPercent / 100})`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Mod-Settings: FPS Counter</p>
      </header>

      {/* Grid: Left config form, Right Mods listing & Canvas live preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', flex: 1, minHeight: '340px' }}>
        
        {/* Left config form panel */}
        <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>FPS Settings</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Position */}
            <div className="form-group">
              <label>Position</label>
              <select className="form-control form-select" value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="Top Left">Top Left</option>
                <option value="Top Right">Top Right</option>
                <option value="Bottom Left">Bottom Left</option>
                <option value="Bottom Right">Bottom Right</option>
              </select>
            </div>

            {/* Toggle switch row for position */}
            <div className="form-group" style={{ justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>POSITION LOCK</span>
                <div className="toggle-switch active">
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'center' }}>
            {/* Text Color input and indicator */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Text Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={color.startsWith('#') ? color : '#FFFFFF'}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '40px', height: '40px', border: '1px solid var(--color-border)', borderRadius: '50%', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ flex: 1, borderRadius: '100px', fontSize: '0.9rem' }}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>

            {/* Text color toggle switch */}
            <div className="form-group" style={{ justifyContent: 'center', alignItems: 'flex-end', height: '100%', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>CHROMA</span>
                <div
                  onClick={() => setTextColorToggle(!textColorToggle)}
                  className={`toggle-switch ${textColorToggle ? 'active' : ''}`}
                >
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'center' }}>
            {/* Background color input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Background</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={background.startsWith('#') ? background : '#000000'}
                  onChange={(e) => setBackground(e.target.value)}
                  style={{ width: '40px', height: '40px', border: '1px solid var(--color-border)', borderRadius: '50%', background: 'transparent', cursor: 'pointer', padding: 0 }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ flex: 1, borderRadius: '100px', fontSize: '0.9rem' }}
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                />
              </div>
            </div>

            {/* Background toggle */}
            <div className="form-group" style={{ justifyContent: 'center', alignItems: 'flex-end', height: '100%', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>BACKGROUND</span>
                <div
                  onClick={() => setBackgroundToggle(!backgroundToggle)}
                  className={`toggle-switch ${backgroundToggle ? 'active' : ''}`}
                >
                  <div className="toggle-switch-handle" />
                </div>
              </div>
            </div>
          </div>

          {/* Opacity slider */}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Opacity</label>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{opacity}%</span>
          </div>

          {/* Font Size slider */}
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Font Size</label>
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)' }}
              />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', width: '50px', textAlign: 'right', marginTop: '18px' }}>{fontSize}px</span>
          </div>

          {/* Average FPS toggle & decimal places */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label>Show Average FPS</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <div
                  onClick={() => setShowAverage(!showAverage)}
                  className={`toggle-switch ${showAverage ? 'active' : ''}`}
                >
                  <div className="toggle-switch-handle" />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{showAverage ? 'On' : 'Off'}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Decimal Places</label>
              <select className="form-control form-select" value={decimalPlaces} onChange={(e) => setDecimalPlaces(e.target.value)}>
                <option value="Off">Off</option>
                <option value="1">.0</option>
                <option value="2">.00</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right side: Active mods and LIVE PREVIEW canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active mods preview panel */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '240px', overflow: 'hidden' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Mods</span>
            <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {AVAILABLE_MODS.slice(0, 8).map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{mod.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {mod.hasSettings && (
                      <svg style={{ width: '14px', height: '14px', opacity: 0.6 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                    )}
                    <div className="toggle-switch active" style={{ width: '32px', height: '18px' }}>
                      <div className="toggle-switch-handle" style={{ width: '14px', height: '14px' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live Preview Box matching IMG_2752.png */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: '160px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Canvas Live Preview</span>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px dashed var(--color-border)', padding: '20px', position: 'relative' }}>
              
              {/* Floating Simulated in-game FPS Box */}
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  background: backgroundToggle ? getRgba(background, opacity) : 'transparent',
                  color: textColorToggle ? color : '#FFFFFF',
                  fontSize: `${fontSize}px`,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  border: backgroundToggle ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  boxShadow: backgroundToggle ? '0 4px 10px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                FPS: 120 {showAverage && '(AVG: 118)'} {decimalPlaces !== 'Off' ? '.00' : ''}
              </div>

              {/* Position indicator overlay badge */}
              <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                Overlay Position: {position}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={handleResetToDefault}>Reset to Default</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Cancel</button>
        <button className="pill-btn primary" style={{ minWidth: '200px' }} onClick={handleSave}>Save</button>
      </div>
    </div>
  );
};
export default FPSSettings;
