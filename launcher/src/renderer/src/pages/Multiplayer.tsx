import React, { useState } from 'react';

interface MultiplayerProps {
  onBack: () => void;
  onLaunch: (instanceId: string) => void;
  instanceId?: string;
}

interface ServerDef {
  id: string;
  name: string;
  ip: string;
  motd: string;
  players: string;
  ping: number;
  iconColor: string;
}

export const Multiplayer: React.FC<MultiplayerProps> = ({ onBack, onLaunch, instanceId }) => {
  const [servers, setServers] = useState<ServerDef[]>([
    { id: 'server1', name: 'Hypixel Network', ip: 'mc.hypixel.net', motd: '⚡ HYPIXEL SUMMER - 85+ Games! [1.8-1.21]', players: '48,210/100,000', ping: 32, iconColor: '#FFAE73' },
    { id: 'server2', name: 'Gravity Official Lounge', ip: 'play.gravityclient.net', motd: '✦ GravityClient Hub ✦ Smooth performance mods enabled!', players: '320/1,500', ping: 18, iconColor: '#FA895E' },
    { id: 'server3', name: 'Wynncraft', ip: 'play.wynncraft.com', motd: 'THE MINECRAFT MMORPG ✦ [NEW UPDATE OUT NOW]', players: '2,845/5,000', ping: 45, iconColor: '#B92F47' },
    { id: 'server4', name: 'Local Dev Sandbox', ip: '127.0.0.1:25565', motd: 'A private simulation playground', players: '0/20', ping: 4, iconColor: '#6A1A37' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleJoinServer = (serverName: string) => {
    if (!instanceId) {
      alert('Create and install a profile before starting Minecraft.');
      return;
    }
    alert(`Starting your real Minecraft profile. Join "${serverName}" from Minecraft's Multiplayer menu.`);
    onLaunch(instanceId);
  };

  const handleAddServerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !serverIp.trim()) return;

    const newServer: ServerDef = {
      id: `server_${Date.now()}`,
      name: serverName.trim(),
      ip: serverIp.trim(),
      motd: '✦ Newly added server ✦ Click to query status...',
      players: '0/100',
      ping: Math.floor(Math.random() * 50) + 15,
      iconColor: '#' + Math.floor(Math.random()*16777215).toString(16),
    };

    setServers([...servers, newServer]);
    setServerName('');
    setServerIp('');
    setShowAddModal(false);
  };

  const handleEditClick = (server: ServerDef) => {
    setEditingId(server.id);
    setServerName(server.name);
    setServerIp(server.ip);
    setShowEditModal(true);
  };

  const handleEditServerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !serverName.trim() || !serverIp.trim()) return;

    setServers(servers.map((s) => (s.id === editingId ? { ...s, name: serverName.trim(), ip: serverIp.trim() } : s)));
    setEditingId(null);
    setServerName('');
    setServerIp('');
    setShowEditModal(false);
  };

  const handleDeleteServer = (id: string) => {
    if (confirm('Delete this server from your quick access list?')) {
      setServers(servers.filter((s) => s.id !== id));
    }
  };

  const getPingColor = (p: number) => {
    if (p < 25) return '#60FFAE';
    if (p < 50) return '#FFDD73';
    return '#FF4A5A';
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Multiplayer Servers</p>
      </header>

      {/* Servers Table Glass Container */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Server Connection Deck
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {servers.length} server{servers.length !== 1 ? 's' : ''} listed
          </span>
        </div>

        {/* Server List */}
        <div className="custom-scroller" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', paddingRight: '4px' }}>
          {servers.map((server) => (
            <div
              key={server.id}
              style={{
                display: 'flex',
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
              {/* Server Custom Mock Avatar/Icon */}
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${server.iconColor} 0%, #202230 100%)`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#FFF', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                {server.name.substring(0, 2).toUpperCase()}
              </div>

              {/* Server details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{server.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '10px' }}>{server.ip}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {server.motd}
                </div>
              </div>

              {/* Status information */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0, paddingLeft: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--color-text-secondary)' }}>{server.players}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: getPingColor(server.ping), fontWeight: 'bold' }}>{server.ping}ms</span>
                  {/* Miniature signal strength bar */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
                    <div style={{ width: '2px', height: '4px', background: getPingColor(server.ping) }} />
                    <div style={{ width: '2px', height: '6px', background: server.ping < 50 ? getPingColor(server.ping) : 'rgba(255,255,255,0.2)' }} />
                    <div style={{ width: '2px', height: '8px', background: server.ping < 25 ? getPingColor(server.ping) : 'rgba(255,255,255,0.2)' }} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                <button
                  className="pill-btn primary"
                  style={{ padding: '6px 16px', fontSize: '0.8rem', minWidth: '70px', borderRadius: '100px' }}
                  onClick={() => handleJoinServer(server.name)}
                >
                  Join
                </button>
                <button
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px' }}
                  onClick={() => handleEditClick(server)}
                >
                  Edit
                </button>
                <button
                  className="pill-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '100px', borderColor: 'rgba(255, 74, 90, 0.4)', color: 'var(--color-error)' }}
                  onClick={() => handleDeleteServer(server.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {servers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '1rem' }}>
              No multiplayer servers added yet. Click "Add Server" to expand lists.
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons at the bottom */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack}>
          Back to Main
        </button>
        <button className="pill-btn primary" style={{ minWidth: '220px' }} onClick={() => setShowAddModal(true)}>
          Add Server
        </button>
      </div>

      {/* Modal: Add Server */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleAddServerSubmit} style={{ padding: '32px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">Add Server</h3>
            
            <div className="form-group">
              <label>Server Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Gravity Sandbox"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label>Server IP Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. play.example.net"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="glow-btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="glow-btn filled">
                Add Server
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Server */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleEditServerSubmit} style={{ padding: '32px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">Edit Server</h3>
            
            <div className="form-group">
              <label>Server Name</label>
              <input
                type="text"
                className="form-control"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label>Server IP Address</label>
              <input
                type="text"
                className="form-control"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="glow-btn" onClick={() => { setShowEditModal(false); setEditingId(null); setServerName(''); setServerIp(''); }}>
                Cancel
              </button>
              <button type="submit" className="glow-btn filled">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default Multiplayer;
