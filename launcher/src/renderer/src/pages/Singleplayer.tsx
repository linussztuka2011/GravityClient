import React, { useCallback, useEffect, useState } from 'react';
import { WorldSummary } from '../types/index.js';

interface SingleplayerProps {
  onBack: () => void;
  onLaunch: (instanceId: string) => void;
  instanceId?: string;
  instanceName?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatLastPlayed(epochMillis: number): string {
  if (!epochMillis) return 'Never played';
  const date = new Date(epochMillis);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export const Singleplayer: React.FC<SingleplayerProps> = ({ onBack, onLaunch, instanceId, instanceName }) => {
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<WorldSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const refresh = useCallback(async () => {
    if (!instanceId) {
      setWorlds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setWorlds(await window.gravityAPI.listWorlds(instanceId));
    } catch (err: any) {
      setError(err?.message || 'Could not read the saves folder for this profile.');
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'That action failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !instanceId || !renameValue.trim()) return;
    const target = renameTarget;
    const value = renameValue.trim();
    setRenameTarget(null);
    await runAction(`rename-${target.folderName}`, () =>
      window.gravityAPI.renameWorld(instanceId, target.folderName, value)
    );
  };

  const handleDelete = async (world: WorldSummary) => {
    if (!instanceId) return;
    const confirmed = confirm(
      `Permanently delete "${world.name}"?\n\nFolder: saves/${world.folderName}\nSize: ${formatBytes(world.sizeBytes)}\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    await runAction(`delete-${world.folderName}`, () => window.gravityAPI.deleteWorld(instanceId, world.folderName));
  };

  const handleDuplicate = (world: WorldSummary) => {
    if (!instanceId) return;
    return runAction(`copy-${world.folderName}`, () => window.gravityAPI.duplicateWorld(instanceId, world.folderName));
  };

  const handlePlay = () => {
    if (!instanceId) return;
    // The client has no join-world-directly entry point; start the profile and
    // let the player pick the world from Minecraft's own menu.
    onLaunch(instanceId);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>
          Singleplayer Worlds{instanceName ? ` — ${instanceName}` : ''}
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select World
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {loading ? 'Reading saves folder…' : `${worlds.length} world${worlds.length !== 1 ? 's' : ''} on disk`}
            </span>
            <button className="pill-btn" style={{ padding: '4px 14px', fontSize: '0.75rem', borderRadius: '100px' }} onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,74,90,0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {!instanceId && !loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
            Create a profile first — worlds live inside a profile's game directory.
          </div>
        )}

        <div className="custom-scroller" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', paddingRight: '4px' }}>
          {worlds.map((world) => {
            const isBusy = busy?.endsWith(world.folderName);
            return (
              <div
                key={world.folderName}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderRadius: '16px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--color-border)',
                  gap: '16px',
                  opacity: isBusy ? 0.55 : 1,
                  transition: 'border-color 0.2s, background 0.2s, opacity 0.2s',
                }}
                className="hover-bright"
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{world.name}</span>
                    {world.hardcore && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF4A5A', border: '1px solid rgba(255,74,90,0.5)', borderRadius: '100px', padding: '1px 7px' }}>HARDCORE</span>
                    )}
                    {world.cheats && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-accent)', border: '1px solid var(--color-accent)', borderRadius: '100px', padding: '1px 7px' }}>CHEATS</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                    saves/{world.folderName} · {formatBytes(world.sizeBytes)}
                  </div>
                  {world.problem && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '3px' }}>⚠ {world.problem}</div>
                  )}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{world.gameMode}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>MC {world.version}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>{formatLastPlayed(world.lastPlayed)}</div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                  <button className="pill-btn primary" style={{ padding: '6px 16px', fontSize: '0.8rem', minWidth: '70px', borderRadius: '100px' }} disabled={!!busy} onClick={handlePlay}>
                    Play
                  </button>
                  <button
                    className="pill-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }}
                    disabled={!!busy || !!world.problem}
                    title={world.problem ? 'This world has no readable level.dat' : 'Rename'}
                    onClick={() => { setRenameTarget(world); setRenameValue(world.name); }}
                  >
                    Rename
                  </button>
                  <button className="pill-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }} disabled={!!busy} onClick={() => handleDuplicate(world)}>
                    Copy
                  </button>
                  <button
                    className="pill-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px', borderColor: 'rgba(255, 74, 90, 0.4)', color: 'var(--color-error)' }}
                    disabled={!!busy}
                    onClick={() => handleDelete(world)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && instanceId && worlds.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              No worlds in this profile's saves folder yet.
              <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                Launch the client and create one in-game — it will appear here.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack}>
          Back to Main
        </button>
        <button
          className="pill-btn"
          style={{ minWidth: '200px' }}
          disabled={!instanceId}
          onClick={() => instanceId && window.gravityAPI.openGameDirectory(instanceId)}
        >
          Open Saves Folder
        </button>
        <button className="pill-btn primary" style={{ minWidth: '220px' }} disabled={!instanceId} onClick={() => instanceId && onLaunch(instanceId)}>
          Launch to Create a World
        </button>
      </div>

      {renameTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleRenameSubmit} style={{ padding: '32px', width: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">Rename World</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              This updates <code style={{ fontFamily: 'var(--font-mono)' }}>LevelName</code> in level.dat. The folder
              name stays <code style={{ fontFamily: 'var(--font-mono)' }}>{renameTarget.folderName}</code>, exactly as the game does it.
            </p>
            <div className="form-group">
              <label>World Name</label>
              <input type="text" className="form-control" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="pill-btn" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => setRenameTarget(null)}>
                Cancel
              </button>
              <button type="submit" className="pill-btn primary" style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '100px' }}>
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Singleplayer;
