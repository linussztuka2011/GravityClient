import React, { useState } from 'react';
import { InstanceConfig, PackManifest } from '../types/index.js';

interface InstancesProps {
  instances: InstanceConfig[];
  packManifest: PackManifest | null;
  activeInstance: InstanceConfig | null;
  setActiveInstance: (instance: InstanceConfig | null) => void;
  onCreateInstance: (name: string, mcVersion: string) => void;
  onUpdateInstance: (config: InstanceConfig) => void;
  onDeleteInstance: (id: string) => void;
  onInstall: (instance: InstanceConfig) => void;
  onLaunch: (id: string) => void;
}

export const Instances: React.FC<InstancesProps> = ({
  instances,
  packManifest,
  activeInstance,
  setActiveInstance,
  onCreateInstance,
  onUpdateInstance,
  onDeleteInstance,
  onInstall,
  onLaunch,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileVersion, setNewProfileVersion] = useState('1.21');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    onCreateInstance(newProfileName.trim(), newProfileVersion);
    setNewProfileName('');
    setShowCreateModal(false);
  };

  const toggleGroup = (groupId: string) => {
    if (!activeInstance) return;
    const currentGroups = [...activeInstance.enabledModGroups];
    const index = currentGroups.indexOf(groupId);
    if (index > -1) {
      currentGroups.splice(index, 1);
    } else {
      currentGroups.push(groupId);
    }
    const updated = { ...activeInstance, enabledModGroups: currentGroups };
    setActiveInstance(updated);
    onUpdateInstance(updated);
  };

  const changePreset = (presetId: string) => {
    if (!activeInstance) return;
    const updated = { ...activeInstance, selectedPreset: presetId };
    setActiveInstance(updated);
    onUpdateInstance(updated);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', height: '100%' }}>
      {/* Sidebar: Profiles List */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>My Profiles</h3>
          <button className="glow-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setShowCreateModal(true)}>
            + NEW
          </button>
        </div>

        <div className="custom-scroller" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px' }}>
          {instances.map((inst) => (
            <div
              key={inst.id}
              onClick={() => setActiveInstance(inst)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: activeInstance?.id === inst.id ? 'rgba(69, 162, 158, 0.2)' : 'var(--color-bg-secondary)',
                border: activeInstance?.id === inst.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: activeInstance?.id === inst.id ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                {inst.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Minecraft {inst.minecraftVersion}</span>
                <span>Preset: {inst.selectedPreset}</span>
              </div>
            </div>
          ))}

          {instances.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '32px 0' }}>
              No profiles found. Create one to begin.
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Profile Configuration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {activeInstance ? (
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 700 }} className="cyan-gradient-text">{activeInstance.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Container Folder: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{activeInstance.path}</code>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="glow-btn" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={() => onDeleteInstance(activeInstance.id)}>
                  Delete
                </button>
                <button className="glow-btn" onClick={() => onInstall(activeInstance)}>
                  Sync & Install
                </button>
                <button
                  className="glow-btn filled"
                  disabled={!activeInstance.installedPackVersion}
                  style={{ opacity: activeInstance.installedPackVersion ? 1 : 0.5, cursor: activeInstance.installedPackVersion ? 'pointer' : 'not-allowed' }}
                  onClick={() => onLaunch(activeInstance.id)}
                >
                  {activeInstance.installedPackVersion ? 'Launch Client' : 'Install Required First'}
                </button>
              </div>
            </div>

            {/* Config Preset Selection inline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>1. Configuration Preset</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Preset overlays manage key performance parameters. Old config properties are archived automatically.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
                {packManifest?.presets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => changePreset(preset.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      background: activeInstance.selectedPreset === preset.id ? 'rgba(69, 162, 158, 0.15)' : 'var(--color-bg-secondary)',
                      border: activeInstance.selectedPreset === preset.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: activeInstance.selectedPreset === preset.id ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                      {preset.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                      {preset.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Groups Toggle inline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>2. Optional Mod Groups</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                De-select optional folders to strip heavy assets or HUD widgets. Core dependencies (Fabric API, ModMenu) are always bundled.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {packManifest?.optionalGroups.map((group) => {
                  const isEnabled = activeInstance.enabledModGroups.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleGroup(group.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{group.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{group.description}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isEnabled ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                          {isEnabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                        <div
                          style={{
                            width: '40px',
                            height: '20px',
                            borderRadius: '10px',
                            background: isEnabled ? 'var(--color-accent-dim)' : 'var(--color-bg-tertiary)',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: isEnabled ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                              position: 'absolute',
                              top: '2px',
                              left: isEnabled ? '22px' : '2px',
                              transition: 'left 0.2s',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--color-text-muted)' }}>
            Select a profile from the left sidebar or create a new profile.
          </div>
        )}
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
                placeholder="e.g. Gravity Optimization"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Minecraft Version</label>
              <select className="form-control form-select" value={newProfileVersion} onChange={(e) => setNewProfileVersion(e.target.value)}>
                <option value="1.21">1.21 (Fabric)</option>
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
export default Instances;
