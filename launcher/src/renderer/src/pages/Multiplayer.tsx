import React, { useCallback, useEffect, useState } from 'react';
import { ServerEntry, ServerStatus } from '../types/index.js';

interface MultiplayerProps {
  onBack: () => void;
  onLaunch: (instanceId: string) => void;
  instanceId?: string;
  instanceName?: string;
}

const getPingColor = (p: number) => {
  if (p < 80) return '#60FFAE';
  if (p < 200) return '#FFDD73';
  return '#FF4A5A';
};

export const Multiplayer: React.FC<MultiplayerProps> = ({ onBack, onLaunch, instanceId, instanceName }) => {
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ServerStatus | 'pending'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');

  /** Pings every listed address; results stream in per server. */
  const pingAll = useCallback(async (entries: ServerEntry[]) => {
    const addresses = Array.from(new Set(entries.map((e) => e.ip).filter(Boolean)));
    setStatuses((prev) => {
      const next = { ...prev };
      for (const address of addresses) next[address] = 'pending';
      return next;
    });

    await Promise.all(
      addresses.map(async (address) => {
        try {
          const status = await window.gravityAPI.pingServer(address);
          setStatuses((prev) => ({ ...prev, [address]: status }));
        } catch (err: any) {
          setStatuses((prev) => ({ ...prev, [address]: { online: false, error: err?.message || 'Ping failed' } }));
        }
      })
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!instanceId) {
      setServers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const entries = await window.gravityAPI.listServers(instanceId);
      setServers(entries);
      pingAll(entries);
    } catch (err: any) {
      setError(err?.message || 'Could not read servers.dat for this profile.');
    } finally {
      setLoading(false);
    }
  }, [instanceId, pingAll]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const closeModal = () => {
    setModal(null);
    setEditingIndex(null);
    setServerName('');
    setServerIp('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceId || !serverName.trim() || !serverIp.trim()) return;
    setError(null);
    try {
      const updated =
        modal === 'edit' && editingIndex !== null
          ? await window.gravityAPI.updateServer(instanceId, editingIndex, serverName.trim(), serverIp.trim())
          : await window.gravityAPI.addServer(instanceId, serverName.trim(), serverIp.trim());
      setServers(updated);
      closeModal();
      pingAll(updated);
    } catch (err: any) {
      setError(err?.message || 'Could not save the server.');
    }
  };

  const handleDelete = async (entry: ServerEntry) => {
    if (!instanceId) return;
    if (!confirm(`Remove "${entry.name}" from this profile's server list?`)) return;
    setError(null);
    try {
      setServers(await window.gravityAPI.deleteServer(instanceId, entry.index));
    } catch (err: any) {
      setError(err?.message || 'Could not remove the server.');
    }
  };

  const handleJoin = () => {
    if (!instanceId) return;
    // Minecraft has no supported "join this server on boot" hook, so the profile
    // is launched and the server is already in the in-game list.
    onLaunch(instanceId);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>
          Multiplayer Servers{instanceName ? ` — ${instanceName}` : ''}
        </p>
      </header>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Server Connection Deck
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {loading ? 'Reading servers.dat…' : `${servers.length} server${servers.length !== 1 ? 's' : ''} saved`}
            </span>
            <button className="pill-btn" style={{ padding: '4px 14px', fontSize: '0.75rem', borderRadius: '100px' }} onClick={refresh} disabled={loading}>
              Refresh &amp; Ping
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
            Create a profile first — the server list is stored in the profile's game directory.
          </div>
        )}

        <div className="custom-scroller" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', paddingRight: '4px' }}>
          {servers.map((server) => {
            const status = statuses[server.ip];
            const isPending = status === 'pending';
            const resolved = isPending ? undefined : (status as ServerStatus | undefined);
            const favicon = resolved?.favicon || (server.icon ? `data:image/png;base64,${server.icon}` : undefined);

            return (
              <div
                key={`${server.index}-${server.ip}`}
                style={{
                  display: 'flex', alignItems: 'center', padding: '16px 24px', borderRadius: '16px',
                  background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--color-border)', gap: '16px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                className="hover-bright"
              >
                {favicon ? (
                  <img
                    src={favicon}
                    alt=""
                    style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #45A29E 0%, #202230 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                    {server.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {server.name}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '10px', fontFamily: 'var(--font-mono)' }}>
                      {server.ip}
                    </span>
                    {resolved?.version && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', padding: '1px 7px', borderRadius: '100px' }}>
                        {resolved.version}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', color: resolved?.online === false ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                    {isPending && 'Pinging server…'}
                    {!isPending && resolved?.online && (resolved.motd || 'No MOTD advertised')}
                    {!isPending && resolved && !resolved.online && `Offline — ${resolved.error ?? 'no response'}`}
                    {!isPending && !resolved && 'Not pinged yet'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0, paddingLeft: '12px', minWidth: '96px' }}>
                  {resolved?.online && (
                    <>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                        {resolved.playersOnline ?? '?'}/{resolved.playersMax ?? '?'}
                      </span>
                      {resolved.latencyMs !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: getPingColor(resolved.latencyMs), fontWeight: 'bold' }}>
                            {resolved.latencyMs}ms
                          </span>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
                            <div style={{ width: '2px', height: '4px', background: getPingColor(resolved.latencyMs) }} />
                            <div style={{ width: '2px', height: '6px', background: resolved.latencyMs < 200 ? getPingColor(resolved.latencyMs) : 'rgba(255,255,255,0.2)' }} />
                            <div style={{ width: '2px', height: '8px', background: resolved.latencyMs < 80 ? getPingColor(resolved.latencyMs) : 'rgba(255,255,255,0.2)' }} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {isPending && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>…</span>}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                  <button className="pill-btn primary" style={{ padding: '6px 16px', fontSize: '0.8rem', minWidth: '70px', borderRadius: '100px' }} onClick={handleJoin}>
                    Join
                  </button>
                  <button
                    className="pill-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }}
                    onClick={() => { setModal('edit'); setEditingIndex(server.index); setServerName(server.name); setServerIp(server.ip); }}
                  >
                    Edit
                  </button>
                  <button
                    className="pill-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px', borderColor: 'rgba(255, 74, 90, 0.4)', color: 'var(--color-error)' }}
                    onClick={() => handleDelete(server)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && instanceId && servers.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              No servers saved for this profile yet.
              <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                Anything you add here is written to servers.dat and appears in-game.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack}>
          Back to Main
        </button>
        <button className="pill-btn primary" style={{ minWidth: '220px' }} disabled={!instanceId} onClick={() => setModal('add')}>
          Add Server
        </button>
      </div>

      {modal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleSubmit} style={{ padding: '32px', width: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">
              {modal === 'edit' ? 'Edit Server' : 'Add Server'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Saved straight into this profile's <code style={{ fontFamily: 'var(--font-mono)' }}>servers.dat</code>.
            </p>

            <div className="form-group">
              <label>Server Name</label>
              <input type="text" className="form-control" placeholder="e.g. Gravity Sandbox" value={serverName} onChange={(e) => setServerName(e.target.value)} autoFocus required />
            </div>

            <div className="form-group">
              <label>Server Address</label>
              <input type="text" className="form-control" placeholder="play.example.net or 127.0.0.1:25565" value={serverIp} onChange={(e) => setServerIp(e.target.value)} required />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                Port is optional — SRV records are resolved automatically.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button type="button" className="pill-btn" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="pill-btn primary" style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '100px' }}>
                {modal === 'edit' ? 'Save Changes' : 'Add Server'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Multiplayer;
