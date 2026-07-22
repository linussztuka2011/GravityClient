import React, { useState } from 'react';

interface SingleplayerProps {
  onBack: () => void;
  onLaunch: (instanceId: string) => void;
  instanceId?: string;
}

interface WorldDef {
  id: string;
  name: string;
  mode: string;
  version: string;
  lastPlayed: string;
  size: string;
}

export const Singleplayer: React.FC<SingleplayerProps> = ({ onBack, onLaunch, instanceId }) => {
  const [worlds, setWorlds] = useState<WorldDef[]>([
    { id: 'world1', name: 'Survival Realm', mode: 'Survival Mode', version: '1.21', lastPlayed: '2026-06-22 15:30', size: '142 MB' },
    { id: 'world2', name: 'Creative Testing Ground', mode: 'Creative Mode', version: '1.21', lastPlayed: '2026-06-21 11:15', size: '89 MB' },
    { id: 'world3', name: 'Hardcore Quest', mode: 'Hardcore Mode', version: '1.21', lastPlayed: '2026-06-18 22:45', size: '215 MB' },
    { id: 'world4', name: 'Redstone Mechanics', mode: 'Creative Mode', version: '1.20.4', lastPlayed: '2026-05-14 09:00', size: '45 MB' },
  ]);

  const handlePlayWorld = (worldName: string) => {
    if (!instanceId) {
      alert('Create and install a profile before starting Minecraft.');
      return;
    }
    alert(`Starting your real Minecraft profile. Select "${worldName}" from Minecraft's Singleplayer menu.`);
    onLaunch(instanceId);
  };

  const handleCreateWorld = () => {
    const name = prompt('Enter new world name:');
    if (!name || !name.trim()) return;
    const mode = prompt('Enter mode (Survival/Creative/Hardcore):', 'Survival');
    if (!mode) return;

    const newWorld: WorldDef = {
      id: `world_${Date.now()}`,
      name: name.trim(),
      mode: mode.trim() + ' Mode',
      version: '1.21',
      lastPlayed: new Date().toISOString().replace('T', ' ').substring(0, 16),
      size: '2 MB',
    };
    setWorlds([...worlds, newWorld]);
  };

  const handleRenameWorld = (id: string) => {
    const world = worlds.find((w) => w.id === id);
    if (!world) return;
    const newName = prompt(`Rename world "${world.name}" to:`, world.name);
    if (!newName || !newName.trim()) return;

    setWorlds(worlds.map((w) => (w.id === id ? { ...w, name: newName.trim() } : w)));
  };

  const handleDeleteWorld = (id: string) => {
    const world = worlds.find((w) => w.id === id);
    if (!world) return;
    if (confirm(`Are you absolutely sure you want to delete world "${world.name}"?\nThis action is permanent and cannot be undone.`)) {
      setWorlds(worlds.filter((w) => w.id !== id));
    }
  };

  const handleDuplicateWorld = (id: string) => {
    const world = worlds.find((w) => w.id === id);
    if (!world) return;

    const duplicated: WorldDef = {
      ...world,
      id: `world_dup_${Date.now()}`,
      name: `${world.name} (Copy)`,
      lastPlayed: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setWorlds([...worlds, duplicated]);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Singleplayer Worlds</p>
      </header>

      {/* Worlds Table Glass Container */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select World
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {worlds.length} world{worlds.length !== 1 ? 's' : ''} detected
          </span>
        </div>

        {/* Worlds table */}
        <div className="custom-scroller" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', paddingRight: '4px' }}>
          {worlds.map((world) => (
            <div
              key={world.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                alignItems: 'center',
                padding: '16px 24px',
                borderRadius: '16px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--color-border)',
                gap: '16px',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              className="hover-bright"
            >
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF' }}>{world.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Size: {world.size}</div>
              </div>

              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {world.mode}
              </div>

              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                MC {world.version}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                {world.lastPlayed}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                <button
                  className="pill-btn primary"
                  style={{ padding: '6px 16px', fontSize: '0.8rem', minWidth: '70px', borderRadius: '100px' }}
                  onClick={() => handlePlayWorld(world.name)}
                >
                  Play
                </button>
                <button
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }}
                  onClick={() => handleRenameWorld(world.id)}
                  title="Rename"
                >
                  Rename
                </button>
                <button
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }}
                  onClick={() => handleDuplicateWorld(world.id)}
                  title="Duplicate"
                >
                  Copy
                </button>
                <button
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px', borderColor: 'rgba(255, 74, 90, 0.4)', color: 'var(--color-error)' }}
                  onClick={() => handleDeleteWorld(world.id)}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {worlds.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              No singleplayer worlds found. Click "Create New World" to construct one.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons at the bottom */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack}>
          Back to Main
        </button>
        <button className="pill-btn primary" style={{ minWidth: '220px' }} onClick={handleCreateWorld}>
          Create New World
        </button>
      </div>
    </div>
  );
};
export default Singleplayer;
