import React, { useState } from 'react';
import { GlobalSettings } from '../types/index.js';

interface AccountLoginProps {
  settings: GlobalSettings;
  onSaveSettings: (settings: GlobalSettings) => void;
  onBack: () => void;
}

export const AccountLogin: React.FC<AccountLoginProps> = ({
  settings,
  onSaveSettings,
  onBack,
}) => {
  const [offlineName, setOfflineName] = useState('');
  const [accounts, setAccounts] = useState<string[]>(settings.accounts || ['Player_Name']);
  const [activeAccount, setActiveAccount] = useState<string>(settings.activeAccount || 'Player_Name');

  const handleAddOfflineAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = offlineName.trim();
    if (!trimmed) return;

    if (accounts.includes(trimmed)) {
      alert('This account name already exists!');
      return;
    }

    const updatedAccounts = [...accounts, trimmed];
    setAccounts(updatedAccounts);
    setActiveAccount(trimmed);
    setOfflineName('');

    const updatedSettings = {
      ...settings,
      accounts: updatedAccounts,
      activeAccount: trimmed,
    };
    onSaveSettings(updatedSettings);
    alert(`Account "${trimmed}" registered and set as active.`);
  };

  const handleSelectAccount = (accountName: string) => {
    setActiveAccount(accountName);
    const updatedSettings = {
      ...settings,
      activeAccount: accountName,
    };
    onSaveSettings(updatedSettings);
  };

  const handleDeleteAccount = (e: React.MouseEvent, accountName: string) => {
    e.stopPropagation();
    if (accounts.length <= 1) {
      alert('You must have at least one account registered!');
      return;
    }

    const updatedAccounts = accounts.filter((a) => a !== accountName);
    let nextActive = activeAccount;
    if (activeAccount === accountName) {
      nextActive = updatedAccounts[0];
    }

    setAccounts(updatedAccounts);
    setActiveAccount(nextActive);

    const updatedSettings = {
      ...settings,
      accounts: updatedAccounts,
      activeAccount: nextActive,
    };
    onSaveSettings(updatedSettings);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Account & Login Manager</p>
      </header>

      {/* Main glass box */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Active Account Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.05)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, #FA895E 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.4rem', fontWeight: 'bold', color: '#6A1A37' }}>
            {activeAccount.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Currently Logged In</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: '2px' }}>{activeAccount}</h3>
          </div>
          <span style={{ marginLeft: 'auto', background: 'rgba(78, 175, 10, 0.2)', color: '#60FFAE', border: '1px solid rgba(78, 175, 10, 0.3)', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: '600' }}>
            OFFLINE MODE
          </span>
        </div>

        {/* Offline Player Input */}
        <form onSubmit={handleAddOfflineAccount} className="form-group" style={{ marginBottom: 0 }}>
          <label>Add Offline Account</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Enter custom username..."
              value={offlineName}
              onChange={(e) => setOfflineName(e.target.value)}
            />
            <button type="submit" className="pill-btn primary" style={{ padding: '0 28px', fontSize: '0.95rem' }}>
              Add Profile
            </button>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            Create a custom offline player name. No password required.
          </p>
        </form>

        {/* Accounts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Registered Accounts
          </label>
          <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
            {accounts.map((accName) => {
              const isActive = accName === activeAccount;
              return (
                <div
                  key={accName}
                  onClick={() => handleSelectAccount(accName)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderRadius: '100px',
                    background: isActive ? 'rgba(255, 174, 115, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? '#6A1A37' : '#FFF' }}>
                      {accName.substring(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)' }}>{accName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isActive && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold', marginRight: '8px' }}>ACTIVE</span>
                    )}
                    <button
                      onClick={(e) => handleDeleteAccount(e, accName)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '50%',
                        fontSize: '1rem',
                        transition: 'color 0.2s, background 0.2s',
                      }}
                      className="hover-bright"
                      title="Delete account"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Third-party Authentication Options (Microsoft / Mojang) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
            Premium Authentication
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              type="button"
              className="pill-btn"
              style={{ display: 'flex', gap: '10px', padding: '14px' }}
              onClick={() => alert('Microsoft OAuth authentication is simulated. Offline mode is immediately operational!')}
            >
              <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 23 23">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M12 1h10v10H12z"/>
                <path fill="#00A4EF" d="M1 12h10v10H1z"/>
                <path fill="#FFB900" d="M12 12h10v10H12z"/>
              </svg>
              Login with Microsoft
            </button>
            <button
              type="button"
              className="pill-btn"
              style={{ display: 'flex', gap: '10px', padding: '14px' }}
              onClick={() => alert('Mojang login is deprecated. Please register an Offline name or use Microsoft OAuth!')}
            >
              <span style={{ fontSize: '1.1rem' }}>M</span>
              Login with Mojang
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack}>
          Back to Settings
        </button>
      </div>
    </div>
  );
};
export default AccountLogin;
