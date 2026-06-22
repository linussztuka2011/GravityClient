import React from 'react';
import { InstanceConfig } from '../types/index.js';

interface DashboardProps {
  instances: InstanceConfig[];
  setActiveTab: (tab: string) => void;
  onLaunch: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ instances, setActiveTab, onLaunch }) => {
  const lastActive = instances[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }} className="cyan-gradient-text">Welcome back, operative.</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>Deploy modifications and launch into standard performance presets.</p>
      </header>

      {/* Hero Welcome Card */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(18, 20, 28, 0.9) 0%, rgba(69, 162, 158, 0.1) 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '60%' }}>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-accent)', fontWeight: 600 }}>SYSTEM READY</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 600 }}>Standard Optimizations Package</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Gravity Launcher coordinates Modrinth API file pulls and config preset overrides automatically. All dependencies are isolated in private, clean client-side profile containers.
          </p>
          <div style={{ marginTop: '12px' }}>
            <button className="glow-btn filled" onClick={() => setActiveTab('instances')}>Configure Profiles</button>
          </div>
        </div>
        <div style={{ width: '120px', height: '120px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--color-accent-dim) 0%, var(--color-accent) 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 30px rgba(102, 252, 241, 0.2)' }}>
          <svg style={{ width: '60px', height: '60px', color: '#0B0C10' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Grid status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Quick Launch Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Quick Launch</h4>
          {lastActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{lastActive.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Minecraft {lastActive.minecraftVersion} • {lastActive.selectedPreset.toUpperCase()} Preset
                </div>
              </div>
              <button
                className="glow-btn filled"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => onLaunch(lastActive.id)}
              >
                Launch Client
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '32px 0' }}>
              No profiles found. Go to Profiles & Packs to create your first client instance!
            </div>
          )}
        </div>

        {/* System Specs Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Ecosystem Status</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Launcher Core</span>
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>ONLINE</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Modrinth API Mock</span>
            <span style={{ color: 'var(--color-accent)' }}>OPERATIONAL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Standard Modpack</span>
            <span>V1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Java Target</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Java 21</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
