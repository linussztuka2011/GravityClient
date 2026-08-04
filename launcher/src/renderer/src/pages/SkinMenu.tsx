import React, { useCallback, useEffect, useState } from 'react';
import { GlobalSettings, SkinEntry, SkinModel } from '../types/index.js';

interface SkinMenuProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToSettingsProfiles: () => void;
  onNavigateToTab: (tab: string) => void;
}

/**
 * Renders the head from a real Minecraft skin PNG.
 *
 * The head is an 8x8 region at (8,8) of a 64-wide skin, with the hat overlay at
 * (40,8). Scaling the whole sheet by 8x and offsetting shows just the face — no
 * image decoding required, and it stays pixel-sharp.
 */
export const SkinHead: React.FC<{ dataUri: string; size?: number; title?: string }> = ({ dataUri, size = 48, title }) => {
  const scale = size / 8;
  const layer: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${dataUri})`,
    backgroundRepeat: 'no-repeat',
    // 64px-wide sheet scaled so each source pixel is `scale` screen pixels.
    backgroundSize: `${64 * scale}px auto`,
    imageRendering: 'pixelated',
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }} title={title}>
      <div style={{ ...layer, backgroundPosition: `-${8 * scale}px -${8 * scale}px` }} />
      <div style={{ ...layer, backgroundPosition: `-${40 * scale}px -${8 * scale}px` }} />
    </div>
  );
};

/** Fallback avatar for accounts with no skin selected yet. */
const PlaceholderHead: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" style={{ flexShrink: 0 }}>
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
);

export const SkinMenu: React.FC<SkinMenuProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToSettingsProfiles,
  onNavigateToTab,
}) => {
  const [skins, setSkins] = useState<SkinEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>(settings.activeSkin || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  const activeAccount = settings.activeAccount || 'Player_Name';
  const activeRich = (settings.richAccounts || []).find((a) => a?.name === activeAccount);
  const isPremium = activeRich?.type === 'microsoft';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const library = await window.gravityAPI.listSkins();
      setSkins(library);
      setSelectedId((current) => (library.some((s) => s.id === current) ? current : library[0]?.id ?? ''));
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Could not read the skin library.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = skins.find((s) => s.id === selectedId) ?? null;

  const runImport = async (label: string, action: () => Promise<any>) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result?.canceled) return;
      if (!result?.success) {
        setMessage({ kind: 'error', text: result?.error || `${label} failed.` });
        return;
      }
      await refresh();
      if (result.skin?.id) setSelectedId(result.skin.id);
      setMessage({ kind: 'info', text: `${label}: "${result.skin?.name ?? 'skin'}" added to your library.` });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || `${label} failed.` });
    } finally {
      setBusy(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlValue.trim();
    if (!url) return;
    setUrlModalOpen(false);
    setUrlValue('');
    await runImport('Download from URL', () => window.gravityAPI.importSkinFromUrl(url));
  };

  const handleModelChange = async (model: SkinModel) => {
    if (!selected) return;
    // Persisted server-side on the next apply; reflect it immediately here.
    setSkins((prev) => prev.map((s) => (s.id === selected.id ? { ...s, model } : s)));
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Remove "${selected.name}" from your skin library?`)) return;
    setBusy(true);
    try {
      await window.gravityAPI.deleteSkin(selected.id);
      await refresh();
      setMessage({ kind: 'info', text: 'Skin removed from your library.' });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Could not delete that skin.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndEquip = async () => {
    if (!selected) {
      setMessage({ kind: 'error', text: 'Add a skin to your library first.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    onSaveSettings({ ...settings, activeSkin: selected.id });

    try {
      const result = await window.gravityAPI.applySkin(selected.id, selected.model);
      if (result.success) {
        setMessage({ kind: 'info', text: `"${selected.name}" uploaded to Mojang and applied to ${activeAccount}.` });
      } else {
        // Saving locally still succeeded — say exactly what did and did not happen.
        setMessage({ kind: 'error', text: result.error || 'Could not apply the skin to your account.' });
      }
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Could not apply the skin to your account.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Skin Menu</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: '24px', flex: 1, alignItems: 'stretch' }}>
        {/* Active identity */}
        <div className="glass-panel" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ padding: '8px', borderRadius: '16px', border: '3px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)' }}>
            {selected ? <SkinHead dataUri={selected.dataUri} size={104} /> : <PlaceholderHead size={104} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{activeAccount}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
              {isPremium ? 'Premium Account' : 'Offline Account'}
            </p>
          </div>
          {!isPremium && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Skins upload to Mojang only for signed-in Microsoft accounts. Your library still works offline.
            </p>
          )}
        </div>

        {/* Library */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '340px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Selected Skin
              </span>
              <button
                className="pill-btn"
                style={{ padding: '4px 14px', fontSize: '0.75rem', borderRadius: '100px' }}
                disabled={busy || !isPremium}
                title={isPremium ? 'Download the skin this account is currently wearing' : 'Requires a Microsoft account'}
                onClick={() => runImport('Import current skin', () => window.gravityAPI.importActiveAccountSkin())}
              >
                Import Worn Skin
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
              {selected ? <SkinHead dataUri={selected.dataUri} size={56} /> : <PlaceholderHead size={56} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected?.name ?? 'No skin selected'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {selected ? `${selected.width}×${selected.height} PNG` : 'Import a 64×64 skin to begin'}
                </span>
              </div>

              {selected && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  {(['classic', 'slim'] as SkinModel[]).map((model) => (
                    <button
                      key={model}
                      className="pill-btn"
                      style={{
                        padding: '6px 14px', fontSize: '0.78rem', borderRadius: '100px',
                        borderColor: selected.model === model ? 'var(--color-accent)' : 'var(--color-border)',
                        color: selected.model === model ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      }}
                      onClick={() => handleModelChange(model)}
                    >
                      {model === 'classic' ? 'Classic (4px)' : 'Slim (3px)'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                My Skins
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {loading ? 'Loading…' : `${skins.length} in library`}
              </span>
            </div>

            <div className="custom-scroller" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: '12px', overflowY: 'auto', maxHeight: '180px', paddingRight: '8px', paddingBottom: '8px' }}>
              {skins.map((skin) => (
                <div
                  key={skin.id}
                  onClick={() => setSelectedId(skin.id)}
                  title={skin.name}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    padding: '8px', borderRadius: '12px', border: '1px solid',
                    borderColor: selectedId === skin.id ? 'var(--color-accent)' : 'var(--color-border)',
                    background: selectedId === skin.id ? 'rgba(255, 174, 115, 0.15)' : 'rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SkinHead dataUri={skin.dataUri} size={38} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {skin.name}
                  </span>
                </div>
              ))}

              {!loading && skins.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  Your library is empty — upload a PNG or paste a skin URL below.
                </div>
              )}
            </div>
          </div>

          {message && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem',
              background: message.kind === 'error' ? 'rgba(255,74,90,0.1)' : 'rgba(96,255,174,0.08)',
              border: `1px solid ${message.kind === 'error' ? 'var(--color-error)' : 'rgba(96,255,174,0.35)'}`,
              color: message.kind === 'error' ? 'var(--color-error)' : '#60FFAE',
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Get More Skins</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="pill-btn"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                disabled={busy}
                onClick={() => window.gravityAPI.openExternal('https://www.minecraftskins.com/')}
              >
                Browse Online Library
              </button>
              <button
                className="pill-btn"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                disabled={busy}
                onClick={() => runImport('Upload from computer', () => window.gravityAPI.importSkinFromFile())}
              >
                Upload from Computer
              </button>
              <button
                className="pill-btn"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                disabled={busy}
                onClick={() => setUrlModalOpen(true)}
              >
                Download from URL
              </button>
            </div>
          </div>
        </div>

        {/* Side actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '180px', textAlign: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>Skin Library</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Stored as real PNG files in your launcher data folder and shared across every profile.
            </span>
            <button
              className="pill-btn"
              style={{ padding: '6px 16px', fontSize: '0.78rem', marginTop: '4px' }}
              disabled={!selected || busy}
              onClick={handleDelete}
            >
              Remove Selected
            </button>
          </div>
          <button className="pill-btn" style={{ padding: '14px' }} onClick={() => onNavigateToTab('settings')}>Settings</button>
          <button className="pill-btn" style={{ padding: '14px' }} onClick={() => onNavigateToTab('account_login')}>Accounts</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Settings Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Back</button>
        <button className="pill-btn primary" style={{ minWidth: '220px' }} disabled={busy || !selected} onClick={handleSaveAndEquip}>
          {busy ? 'Working…' : isPremium ? 'Save & Upload to Mojang' : 'Save Selection'}
        </button>
      </div>

      {urlModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form className="glass-panel" onSubmit={handleUrlSubmit} style={{ padding: '32px', width: '460px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }} className="cyan-gradient-text">Download Skin from URL</h3>
            <div className="form-group">
              <label>Direct PNG URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://textures.minecraft.net/texture/…"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                autoFocus
                required
              />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                Must be a 64×64 (or legacy 64×32) PNG. The file is validated before it is saved.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="pill-btn" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={() => { setUrlModalOpen(false); setUrlValue(''); }}>
                Cancel
              </button>
              <button type="submit" className="pill-btn primary" style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '100px' }}>
                Download
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default SkinMenu;
