import React, { useState, useEffect } from 'react';
import { InstanceConfig } from '../types/index.js';

interface ModrinthInstallProps {
  instance: InstanceConfig;
  onBack: () => void;
}

interface ModrinthMod {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  author: string;
  categories: string[];
}

export const ModrinthInstall: React.FC<ModrinthInstallProps> = ({ instance, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mods, setMods] = useState<ModrinthMod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks installation status for each projectId: 'idle' | 'installing' | 'success' | 'error'
  const [installStatus, setInstallStatus] = useState<Record<string, 'idle' | 'installing' | 'success' | 'error'>>({});
  // Tracks download progress for each projectId (0-100)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [installError, setInstallError] = useState<Record<string, string>>({});

  // Perform default search on load to display popular suggestions
  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await window.gravityAPI.modrinthSearch(query, instance.minecraftVersion);
      setMods(results);
    } catch (err: any) {
      console.error('Modrinth search failed:', err);
      setError(err.message || 'Failed to search mods. Modrinth API might be temporarily down.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallMod = async (mod: ModrinthMod) => {
    const projectId = mod.project_id;
    
    // Update local status
    setInstallStatus(prev => ({ ...prev, [projectId]: 'installing' }));
    setDownloadProgress(prev => ({ ...prev, [projectId]: 0 }));

    // Subscribe to download progress events
    const unsubscribeProgress = window.gravityAPI.onModrinthInstallProgress(
      instance.id,
      projectId,
      (percent: number) => {
        setDownloadProgress(prev => ({ ...prev, [projectId]: percent }));
      }
    );

    try {
      const result = await window.gravityAPI.modrinthInstall(instance.id, projectId, instance.minecraftVersion);
      unsubscribeProgress();

      if (result.success) {
        setInstallStatus(prev => ({ ...prev, [projectId]: 'success' }));
      } else {
        setInstallStatus(prev => ({ ...prev, [projectId]: 'error' }));
        setInstallError(prev => ({ ...prev, [projectId]: result.error || 'Failed' }));
      }
    } catch (err: any) {
      unsubscribeProgress();
      setInstallStatus(prev => ({ ...prev, [projectId]: 'error' }));
      setInstallError(prev => ({ ...prev, [projectId]: err.message || 'Exception' }));
    }
  };

  const formatDownloads = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }} className="cyan-gradient-text">Modrinth Mod Downloader</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Installing Fabric mods into profile: <strong style={{ color: 'var(--color-accent)' }}>{instance.name}</strong> (MC {instance.minecraftVersion})
          </p>
        </div>
        <button className="pill-btn" onClick={onBack}>
          &larr; Back to Profiles
        </button>
      </header>

      {/* Search Input and suggestions */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search on Modrinth (e.g. Sodium, Iris, JourneyMap, Waystones...)"
          style={{ flex: 1, borderRadius: '100px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch(searchQuery);
          }}
        />
        <button className="pill-btn primary" style={{ padding: '12px 28px', fontSize: '0.95rem', borderRadius: '100px' }} onClick={() => handleSearch(searchQuery)}>
          Search
        </button>
      </div>

      {/* Suggestion tags */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingLeft: '8px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Quick suggestions:</span>
        {['Sodium', 'Iris', 'Lithium', 'BetterF3', 'Xaero Minimap', 'Inventory Profiles', 'AppleSkin'].map(tag => (
          <button
            key={tag}
            className="pill-btn"
            style={{ padding: '4px 14px', fontSize: '0.75rem', borderRadius: '100px', background: 'rgba(255, 255, 255, 0.05)' }}
            onClick={() => {
              setSearchQuery(tag);
              handleSearch(tag);
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255, 74, 90, 0.1)', border: '1px solid var(--color-error)', color: 'var(--color-error)', borderRadius: '10px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Search Results Listing */}
      <div className="custom-scroller" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '64px 0' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Polling Modrinth registry...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {mods.map((mod) => {
              const status = installStatus[mod.project_id] || 'idle';
              const progress = downloadProgress[mod.project_id] || 0;
              const errorMsg = installError[mod.project_id] || '';

              return (
                <div
                  key={mod.project_id}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    background: 'rgba(0, 0, 0, 0.18)',
                    borderRadius: '16px',
                    border: '1px solid var(--color-border)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Mod Icon */}
                    {mod.icon_url ? (
                      <img
                        src={mod.icon_url}
                        alt={`${mod.title} Icon`}
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        M
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#FFFFFF' }}>{mod.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                          ⬇ {formatDownloads(mod.downloads)}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 500 }}>
                        by {mod.author}
                      </span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  {/* Installation Control Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    {status === 'installing' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Downloading and verifying jar...</span>
                          <span style={{ color: 'var(--color-accent)' }}>{progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--color-bg-secondary)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-accent-dim) 0%, var(--color-accent) 100%)', transition: 'width 0.1s linear' }} />
                        </div>
                      </div>
                    )}

                    {status === 'success' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600, justifyContent: 'center', padding: '6px' }}>
                        ✓ Mod successfully installed in profile!
                      </div>
                    )}

                    {status === 'error' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-error)', fontSize: '0.8rem', textAlign: 'center' }}>
                        <span>✕ Installation failed: {errorMsg}</span>
                        <button className="pill-btn" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '100px', alignSelf: 'center', marginTop: '4px' }} onClick={() => handleInstallMod(mod)}>
                          Retry
                        </button>
                      </div>
                    )}

                    {status === 'idle' && (
                      <button
                        className="pill-btn primary"
                        style={{
                          width: '100%',
                          padding: '8px 0',
                          fontSize: '0.85rem',
                          borderRadius: '100px',
                          background: 'linear-gradient(135deg, rgba(69, 162, 158, 0.45) 0%, rgba(31, 40, 51, 0.6) 100%)',
                          border: '1px solid var(--color-border)',
                          boxShadow: 'none'
                        }}
                        onClick={() => handleInstallMod(mod)}
                      >
                        Install Mod into {instance.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!loading && mods.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                No compatible mods found for query "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ModrinthInstall;
