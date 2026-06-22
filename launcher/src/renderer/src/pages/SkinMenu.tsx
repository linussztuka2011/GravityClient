import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';

interface SkinMenuProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
  onNavigateToSettingsProfiles: () => void;
}

// A dictionary of SVG-based Minecraft 8x8 pixel avatars for each skin
export const SKIN_AVATARS: Record<string, React.ReactNode> = {
  'Steve': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      {/* Hair */}
      <rect x="0" y="0" width="8" height="3" fill="#4B2513" />
      {/* Face skin */}
      <rect x="0" y="3" width="8" height="5" fill="#E2A68C" />
      <rect x="1" y="2" width="6" height="1" fill="#E2A68C" />
      {/* Eyes */}
      <rect x="1" y="4" width="2" height="1" fill="#FFFFFF" />
      <rect x="1" y="4" width="1" height="1" fill="#3D50B5" />
      <rect x="5" y="4" width="2" height="1" fill="#FFFFFF" />
      <rect x="6" y="4" width="1" height="1" fill="#3D50B5" />
      {/* Nose/mouth */}
      <rect x="3" y="5" width="2" height="1" fill="#B37E66" />
      <rect x="2" y="6" width="4" height="1" fill="#402010" />
    </svg>
  ),
  'Creepar_Bot': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      {/* Background green */}
      <rect x="0" y="0" width="8" height="8" fill="#1EB02E" />
      {/* Eyes */}
      <rect x="1" y="2" width="2" height="2" fill="#000000" />
      <rect x="5" y="2" width="2" height="2" fill="#000000" />
      {/* Mouth */}
      <rect x="3" y="4" width="2" height="2" fill="#000000" />
      <rect x="2" y="5" width="4" height="3" fill="#000000" />
      <rect x="2" y="7" width="1" height="1" fill="#1EB02E" />
      <rect x="5" y="7" width="1" height="1" fill="#1EB02E" />
    </svg>
  ),
  'Creegar_Bot': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#157B21" />
      <rect x="1" y="2" width="2" height="2" fill="#111111" />
      <rect x="5" y="2" width="2" height="2" fill="#111111" />
      <rect x="3" y="4" width="2" height="2" fill="#111111" />
      <rect x="2" y="5" width="4" height="3" fill="#111111" />
    </svg>
  ),
  'Sentiiml_Prime': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#B02525" />
      {/* Helmet details */}
      <rect x="1" y="1" width="6" height="2" fill="#1E47B0" />
      <rect x="2" y="3" width="4" height="2" fill="#E2D48C" />
      <rect x="2" y="4" width="1" height="1" fill="#444" />
      <rect x="5" y="4" width="1" height="1" fill="#444" />
      <rect x="3" y="6" width="2" height="2" fill="#E2E4E9" />
    </svg>
  ),
  'Sentiiml_Prine': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#485D73" />
      <rect x="1" y="1" width="6" height="2" fill="#FA895E" />
      <rect x="2" y="3" width="4" height="2" fill="#E2D48C" />
      <rect x="3" y="5" width="2" height="2" fill="#111" />
    </svg>
  ),
  'Custom Prime': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#751590" />
      <rect x="1" y="2" width="2" height="1" fill="#60FFAE" />
      <rect x="5" y="2" width="2" height="1" fill="#60FFAE" />
      <rect x="2" y="4" width="4" height="3" fill="#222" />
    </svg>
  ),
  'Custom_Design 01': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#FA895E" />
      <rect x="1" y="2" width="2" height="2" fill="#3D50B5" />
      <rect x="5" y="2" width="2" height="2" fill="#3D50B5" />
      <rect x="3" y="4" width="2" height="2" fill="#111" />
    </svg>
  ),
  'Revita': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#FFEB60" />
      <rect x="1" y="3" width="2" height="1" fill="#B92F47" />
      <rect x="5" y="3" width="2" height="1" fill="#B92F47" />
      <rect x="2" y="5" width="4" height="2" fill="#6A1A37" />
    </svg>
  ),
  'Stree_Cosk': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#3B3561" />
      <rect x="1" y="2" width="2" height="1" fill="#E2C2C6" />
      <rect x="5" y="2" width="2" height="1" fill="#E2C2C6" />
      <rect x="3" y="4" width="2" height="2" fill="#FFF" />
    </svg>
  ),
  'Custom_Deedits': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#D1603D" />
      <rect x="2" y="2" width="4" height="2" fill="#EFE9F4" />
      <rect x="2" y="4" width="4" height="2" fill="#5F0F40" />
    </svg>
  ),
  'Petcarros': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#0A0908" />
      <rect x="1" y="2" width="2" height="1" fill="#FF8C42" />
      <rect x="5" y="2" width="2" height="1" fill="#FF8C42" />
      <rect x="2" y="5" width="4" height="2" fill="#FFF" />
    </svg>
  ),
  'Page Flip': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#4C8077" />
      <rect x="1" y="2" width="2" height="1" fill="#FFE2C6" />
      <rect x="5" y="2" width="2" height="1" fill="#FFE2C6" />
      <rect x="3" y="5" width="2" height="2" fill="#D63B5E" />
    </svg>
  ),
  'Custom_Robins': (
    <svg viewBox="0 0 8 8" width="100%" height="100%" shapeRendering="crispEdges">
      <rect x="0" y="0" width="8" height="8" fill="#7D84B2" />
      <rect x="1" y="2" width="2" height="2" fill="#2E4057" />
      <rect x="5" y="2" width="2" height="2" fill="#2E4057" />
      <rect x="2" y="5" width="4" height="2" fill="#D81E5B" />
    </svg>
  )
};

export const SkinMenu: React.FC<SkinMenuProps> = ({
  settings,
  onSaveSettings,
  onBack,
  onNavigateToSettingsProfiles,
}) => {
  const [selectedSkin, setSelectedSkin] = useState<string>(settings.activeSkin || 'Steve');

  const handleSaveAndEquip = () => {
    const updated = {
      ...settings,
      activeSkin: selectedSkin,
    };
    onSaveSettings(updated);
    alert(`Skin "${selectedSkin}" equipped and saved successfully!`);
    onBack();
  };

  const handleResetToDefault = () => {
    setSelectedSkin('Steve');
  };

  const availableSkins = Object.keys(SKIN_AVATARS);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Skin Menu</p>
      </header>

      {/* Main Grid matching Layout: columns left, middle, right */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: '24px', flex: 1, alignItems: 'stretch' }}>
        
        {/* Left column: User profile card */}
        <div className="glass-panel" style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '16px', border: '3px solid rgba(255,255,255,0.15)', overflow: 'hidden', padding: '6px', background: 'rgba(0,0,0,0.2)' }}>
            {SKIN_AVATARS[selectedSkin] || SKIN_AVATARS['Steve']}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{settings.activeAccount || 'Player_Name'}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Active Operative</p>
          </div>
        </div>

        {/* Center column: Skin selection grid */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '340px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Skin</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '8px', border: '1px solid var(--color-border)', overflow: 'hidden', padding: '3px', background: 'rgba(0,0,0,0.1)' }}>
                {SKIN_AVATARS[selectedSkin] || SKIN_AVATARS['Steve']}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedSkin}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Local Skin Profile</span>
              </div>
              <button className="pill-btn" style={{ marginLeft: 'auto', padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => alert('Change Skin action clicked! Browse online or upload files below.')}>Change Skin</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>My Skins</span>
            <div className="custom-scroller" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px', overflowY: 'auto', maxHeight: '180px', paddingRight: '8px', paddingBottom: '8px' }}>
              {availableSkins.map((skinName) => (
                <div
                  key={skinName}
                  onClick={() => setSelectedSkin(skinName)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedSkin === skinName ? 'var(--color-accent)' : 'var(--color-border)',
                    background: selectedSkin === skinName ? 'rgba(255, 174, 115, 0.15)' : 'rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '4px', overflow: 'hidden', pointerEvents: 'none' }}>
                    {SKIN_AVATARS[skinName]}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {skinName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom library inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Get More Skins</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="pill-btn" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={() => alert('Browsing Online Library... (Mocked)')}>Browse Online Library</button>
              <button className="pill-btn" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={() => alert('Select skin file from your hard drive...')}>Upload from Computer</button>
              <button className="pill-btn" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }} onClick={() => {
                const url = prompt('Enter direct Minecraft skin image URL:');
                if (url) alert('Downloading skin metadata...');
              }}>Download from URL</button>
            </div>
          </div>
        </div>

        {/* Right column: Friends/Discord card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', fontWeight: 500 }}>(Discord/Friends)</span>
          </div>
          <button className="pill-btn" style={{ padding: '14px' }} onClick={() => alert('Opening Settings panel...')}>Settings</button>
          <button className="pill-btn" style={{ padding: '14px' }} onClick={() => alert('Opening Changelogs details...')}>Changelog</button>
        </div>
      </div>

      {/* Main bottom navigation bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onNavigateToSettingsProfiles}>Settings Profiles</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={onBack}>Back</button>
        <button className="pill-btn" style={{ minWidth: '160px' }} onClick={handleResetToDefault}>Reset to Default</button>
        <button className="pill-btn primary" style={{ minWidth: '200px' }} onClick={handleSaveAndEquip}>Save & Equip</button>
      </div>
    </div>
  );
};
export default SkinMenu;
