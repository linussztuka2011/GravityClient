import React, { useState } from 'react';

export const Settings: React.FC = () => {
  const [ram, setRam] = useState('4G');
  const [debugMode, setDebugMode] = useState(false);
  const [customJava, setCustomJava] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="cyan-gradient-text">Global Launcher Settings</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>Configure Java virtual machine targets and platform execution policies.</p>
      </header>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Java Runtime Environment</h3>
        
        {/* Memory Allocation */}
        <div className="form-group">
          <label>Memory Allocation (Maximum RAM)</label>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>Higher allocation prevents stuttering but uses more host memory.</p>
          <select className="form-control form-select" style={{ maxWidth: '300px' }} value={ram} onChange={(e) => setRam(e.target.value)}>
            <option value="2G">2 GB (Minimum)</option>
            <option value="4G">4 GB (Recommended)</option>
            <option value="6G">6 GB (Heavy Shaders)</option>
            <option value="8G">8 GB (Enthusiast)</option>
          </select>
        </div>

        {/* Custom Executable */}
        <div className="form-group">
          <label>Custom Java Path (JDK 21 required)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Default system JVM (auto-resolved)"
            value={customJava}
            onChange={(e) => setCustomJava(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Advanced Developer Options</h3>
        
        {/* Debug Console Toggles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Enable Verbose Logs</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Streams detailed Modrinth request loops and local file delta listings.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: debugMode ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
              {debugMode ? 'ACTIVE' : 'OFF'}
            </span>
            <div
              onClick={() => setDebugMode(!debugMode)}
              style={{
                width: '40px',
                height: '20px',
                borderRadius: '10px',
                background: debugMode ? 'var(--color-accent-dim)' : 'var(--color-bg-tertiary)',
                position: 'relative',
                transition: 'background 0.2s',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: debugMode ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  position: 'absolute',
                  top: '2px',
                  left: debugMode ? '22px' : '2px',
                  transition: 'left 0.2s',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
