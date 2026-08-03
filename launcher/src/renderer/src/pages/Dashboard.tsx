import React, { useEffect, useState } from 'react';
import { InstanceConfig, GlobalSettings, PackManifest, McVersion, SkinEntry } from '../types/index.js';
import { SkinHead } from './SkinMenu.js';

interface DashboardProps {
  instances: InstanceConfig[];
  settings: GlobalSettings;
  setActiveTab: (tab: string) => void;
  onLaunch: (id: string) => void;
  onCreateInstance: (name: string, mcVersion: string) => void;
  onUpdateInstance: (config: InstanceConfig) => void;
  onDeleteInstance: (id: string) => void;
  onInstall: (instance: InstanceConfig) => void;
  packManifest: PackManifest | null;
  mcVersions: McVersion[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  instances,
  settings,
  setActiveTab,
  onLaunch,
  onCreateInstance,
  onUpdateInstance,
  onDeleteInstance,
  onInstall,
  packManifest,
  mcVersions,
}) => {
  // Modal states for creating profile
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileVersion, setNewProfileVersion] = useState('1.21');

  React.useEffect(() => {
    if (mcVersions && mcVersions.length > 0) {
      setNewProfileVersion(mcVersions[0].id);
    }
  }, [mcVersions]);

  // Currently selected profile in the bottom list
  const [selectedInstance, setSelectedInstance] = useState<InstanceConfig | null>(instances[0] || null);

  const activeAccount = settings.activeAccount || 'Player_Name';

  // Show the real skin PNG the player has equipped, straight from the library.
  const [activeSkin, setActiveSkin] = useState<SkinEntry | null>(null);
  useEffect(() => {
    let cancelled = false;
    window.gravityAPI
      .listSkins()
      .then((library) => {
        if (cancelled) return;
        setActiveSkin(library.find((s) => s.id === settings.activeSkin) ?? null);
      })
      .catch(() => {
        if (!cancelled) setActiveSkin(null);
      });
    return () => {
      cancelled = true;
    };
  }, [settings.activeSkin]);

  // Derived from the real profile record rather than a fixed value.
  const readiness = (() => {
    if (instances.length === 0) return { percent: 0, label: 'No profiles yet', ready: false };
    if (!selectedInstance) return { percent: 25, label: 'Select a profile', ready: false };
    if (!selectedInstance.installedPackVersion) return { percent: 50, label: 'Needs Sync & Install', ready: false };
    return { percent: 100, label: `Pack v${selectedInstance.installedPackVersion} ready`, ready: true };
  })();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateInstance(newProfileName.trim(), newProfileVersion);
    setNewProfileName('');
    setShowCreateModal(false);
  };

  const handleLaunchClick = () => {
    if (selectedInstance) {
      onLaunch(selectedInstance.id);
    } else if (instances.length > 0) {
      onLaunch(instances[0].id);
    } else {
      alert('Please create a profile first at the bottom row!');
    }
  };

  const changePreset = (presetId: string) => {
    if (!selectedInstance) return;
    const updated = { ...selectedInstance, selectedPreset: presetId };
    setSelectedInstance(updated);
    onUpdateInstance(updated);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      {/* Three Column View Matching IMG_2750.png */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left column: User card */}
        <div
          className="glass-panel"
          onClick={() => setActiveTab('skin_menu')}
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, border-color 0.2s',
          }}
          title="Click to open Skin Menu"
        >
          <div style={{ borderRadius: '12px', border: '2px solid rgba(255,255,255,0.15)', padding: '5px', background: 'rgba(0,0,0,0.25)', display: 'flex' }}>
            {activeSkin ? (
              <SkinHead dataUri={activeSkin.dataUri} size={80} title={activeSkin.name} />
            ) : (
              <svg viewBox="0 0 8 8" width={80} height={80} shapeRendering="crispEdges">
                <rect x="0" y="0" width="8" height="3" fill="#4B2513" />
                <rect x="0" y="3" width="8" height="5" fill="#E2A68C" />
                <rect x="1" y="2" width="6" height="1" fill="#E2A68C" />
                <rect x="1" y="4" width="2" height="1" fill="#FFFFFF" />
                <rect x="1" y="4" width="1" height="1" fill="#3D50B5" />
                <rect x="5" y="4" width="2" height="1" fill="#FFFFFF" />
                <rect x="6" y="4" width="1" height="1" fill="#3D50B5" />
                <rect x="3" y="5" width="2" height="1" fill="#B37E66" />
                <rect x="2" y="6" width="4" height="1" fill="#402010" />
              </svg>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Operative</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', marginTop: '2px' }}>
              {activeAccount}
            </h3>
          </div>
        </div>

        {/* Middle column: Selection options */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Select Presets</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="pill-btn" style={{ justifyContent: 'flex-start', padding: '12px 20px' }} onClick={() => setActiveTab('singleplayer')}>
              <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Singleplayer Worlds
            </button>
            <button className="pill-btn" style={{ justifyContent: 'flex-start', padding: '12px 20px' }} onClick={() => setActiveTab('multiplayer')}>
              <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Multiplayer Connection Deck
            </button>
            <button
              className="pill-btn"
              style={{ justifyContent: 'flex-start', padding: '12px 20px' }}
              onClick={async () => {
                const result = await window.gravityAPI.openGameDirectory(selectedInstance?.id ?? instances[0]?.id);
                if (!result.success) alert(`Could not open the game directory: ${result.error}`);
              }}
            >
              <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Browse Game Directory
            </button>
          </div>
        </div>

        {/* Right column: Main Play block */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(30,32,45,0.7)' }}>
          <button
            className="pill-btn primary"
            style={{ width: '100%', padding: '16px', fontSize: '1.4rem', fontWeight: 'bold' }}
            onClick={handleLaunchClick}
          >
            PLAY
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="pill-btn" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={() => setActiveTab('settings')}>Settings</button>
            <button className="pill-btn" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={() => alert('GravityClient v1.0.0-Sunset. Optimizations fully deployed!')}>Changelog</button>
          </div>
          {/* Readiness reflects the selected profile's real install state. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              <span>Profile Status</span>
              <span style={{ color: readiness.ready ? '#60FFAE' : 'var(--color-text-muted)' }}>{readiness.label}</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${readiness.percent}%`,
                  height: '100%',
                  background: readiness.ready
                    ? 'linear-gradient(to right, var(--color-accent), #FFDD73)'
                    : 'rgba(255,255,255,0.25)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom row: Profile management board */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '260px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active Profile Configuration</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Configure performance presets and install mod modules in containers.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="pill-btn" style={{ padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => setActiveTab('instances')}>
              Detailed Config
            </button>
            <button className="pill-btn primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => setShowCreateModal(true)}>
              + Create Profile
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
          {/* Profiles selector */}
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
            {instances.map((inst) => {
              const isSelected = selectedInstance?.id === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedInstance(inst)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255, 174, 115, 0.15)' : 'rgba(0,0,0,0.15)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? '#FFF' : 'var(--color-text-secondary)' }}>{inst.name}</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Minecraft {inst.minecraftVersion}</div>
                </div>
              );
            })}
            {instances.length === 0 && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No profiles. Create one!</span>
            )}
          </div>

          {/* Config preset selection for selected profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedInstance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-accent)' }}>{selectedInstance.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="pill-btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => onInstall(selectedInstance)}>
                      Sync & Install
                    </button>
                    <button className="pill-btn" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'rgba(255,74,90,0.4)', color: 'var(--color-error)' }} onClick={() => { onDeleteInstance(selectedInstance.id); setSelectedInstance(instances.find(i => i.id !== selectedInstance.id) || null); }}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Preset cards selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {packManifest?.presets.map((preset) => {
                    const isSelected = selectedInstance.selectedPreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => changePreset(preset.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(255, 174, 115, 0.1)' : 'rgba(0,0,0,0.15)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: isSelected ? 'var(--color-accent)' : '#FFF' }}>
                          {preset.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', lineHeight: '1.3' }}>
                          {preset.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                Select a profile from the left list to edit configuration presets.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Profile */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleCreateSubmit} style={{ padding: '32px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">Create Profile</h3>
            
            <div className="form-group">
              <label>Profile Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Sunset Optimization"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label>Minecraft Version</label>
              <select className="form-control form-select" value={newProfileVersion} onChange={(e) => setNewProfileVersion(e.target.value)}>
                {mcVersions && mcVersions.length > 0 ? (
                  <>
                    <optgroup label="Releases" style={{ background: '#1e112a', color: '#fff' }}>
                      {mcVersions.filter(v => v.type === 'release').map(v => (
                        <option key={v.id} value={v.id} style={{ background: '#1e112a' }}>{v.id} (Fabric)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Snapshots & Pre-releases" style={{ background: '#1e112a', color: '#ffb5a7' }}>
                      {mcVersions.filter(v => v.type === 'snapshot').map(v => (
                        <option key={v.id} value={v.id} style={{ background: '#1e112a' }}>{v.id} (Fabric)</option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <option value="1.21">1.21 (Fabric)</option>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="glow-btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button type="submit" className="glow-btn filled">
                Create
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
