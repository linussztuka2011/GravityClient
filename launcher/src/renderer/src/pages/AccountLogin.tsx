import React, { useState, useEffect } from 'react';
import { GlobalSettings, RichAccount } from '../types/index.js';

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
  const safeSettings = settings || {};
  const [offlineName, setOfflineName] = useState('');
  const [accounts, setAccounts] = useState<string[]>(
    Array.isArray(safeSettings.accounts)
      ? safeSettings.accounts.filter((a): a is string => typeof a === 'string')
      : ['Player_Name']
  );
  const [activeAccount, setActiveAccount] = useState<string>(
    typeof safeSettings.activeAccount === 'string' && safeSettings.activeAccount
      ? safeSettings.activeAccount
      : 'Player_Name'
  );

  // Microsoft authentication state machine
  const [authStage, setAuthStage] = useState<'idle' | 'requesting' | 'prompt_code' | 'success' | 'error'>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [newPremiumAccount, setNewPremiumAccount] = useState<RichAccount | null>(null);

  // Sync state with settings changes safely
  useEffect(() => {
    const safe = settings || {};
    const newAccounts = Array.isArray(safe.accounts)
      ? safe.accounts.filter((a): a is string => typeof a === 'string')
      : ['Player_Name'];
    setAccounts(newAccounts.length > 0 ? newAccounts : ['Player_Name']);

    const newActive = typeof safe.activeAccount === 'string' && safe.activeAccount
      ? safe.activeAccount
      : 'Player_Name';
    setActiveAccount(newActive);
  }, [settings]);

  // Handle countdown timer for device code flow
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authStage === 'prompt_code' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setAuthStage('error');
            setErrorMsg('The authentication request has expired. Please try again.');
            if (window.gravityAPI && typeof window.gravityAPI.stopMicrosoftLogin === 'function') {
              window.gravityAPI.stopMicrosoftLogin().catch(console.error);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStage, countdown]);

  // Handle status polling from IPC layer
  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;

    if (authStage === 'requesting' || authStage === 'prompt_code') {
      if (window.gravityAPI && typeof window.gravityAPI.onMicrosoftLoginStatus === 'function') {
        unsubscribeStatus = window.gravityAPI.onMicrosoftLoginStatus(({ status, details }) => {
          console.log(`[AccountLogin] Microsoft Login Status: ${status}`, details);
          
          if (status === 'SUCCESS') {
            const premiumAcc = details as RichAccount;
            
            // Incorporate premium account into settings database
            const currentRich = Array.isArray(settings?.richAccounts) ? settings.richAccounts.filter(Boolean) : [];
            const updatedRich = currentRich.filter((a) => a.name !== premiumAcc.name);
            updatedRich.push(premiumAcc);

            const updatedAccounts = Array.isArray(settings?.accounts) ? [...settings.accounts] : [];
            if (!updatedAccounts.includes(premiumAcc.name)) {
              updatedAccounts.push(premiumAcc.name);
            }

            const updatedSettings: GlobalSettings = {
              ...settings,
              accounts: updatedAccounts,
              activeAccount: premiumAcc.name,
              richAccounts: updatedRich,
            } as GlobalSettings;

            onSaveSettings(updatedSettings);
            setNewPremiumAccount(premiumAcc);
            setAuthStage('success');
          } else if (status === 'EXPIRED') {
            setAuthStage('error');
            setErrorMsg('The Microsoft authentication session expired. Please restart the login flow.');
          } else if (status === 'ERROR') {
            setAuthStage('error');
            setErrorMsg(typeof details === 'string' ? details : 'An unexpected error occurred during Microsoft login.');
          }
        });
      }
    }

    return () => {
      if (unsubscribeStatus) {
        unsubscribeStatus();
      }
    };
  }, [authStage, settings, onSaveSettings]);

  // Clean up polling if component unmounts
  useEffect(() => {
    return () => {
      if (window.gravityAPI && typeof window.gravityAPI.stopMicrosoftLogin === 'function') {
        window.gravityAPI.stopMicrosoftLogin().catch((err) => console.error('Failed to clean up MS Login on unmount:', err));
      }
    };
  }, []);

  const handleStartMicrosoftAuth = async () => {
    setAuthStage('requesting');
    setErrorMsg('');
    try {
      if (!window.gravityAPI || typeof window.gravityAPI.startMicrosoftLogin !== 'function') {
        throw new Error('Microsoft authentication is not available in this environment.');
      }
      const res = await window.gravityAPI.startMicrosoftLogin();
      if (res.success && res.flow) {
        setUserCode(res.flow.userCode);
        setVerificationUri(res.flow.verificationUri);
        setCountdown(res.flow.expiresIn);
        setAuthStage('prompt_code');

        // Fire off token polling in the main process background
        if (typeof window.gravityAPI.pollMicrosoftLogin === 'function') {
          await window.gravityAPI.pollMicrosoftLogin(res.flow.deviceCode, res.flow.interval);
        }
      } else {
        setAuthStage('error');
        setErrorMsg(res.error || 'Failed to connect to Microsoft Authentication servers.');
      }
    } catch (err: any) {
      setAuthStage('error');
      setErrorMsg(err.message || 'An error occurred while launching Microsoft Authentication.');
    }
  };

  const handleCancelMicrosoftAuth = async () => {
    try {
      if (window.gravityAPI && typeof window.gravityAPI.stopMicrosoftLogin === 'function') {
        await window.gravityAPI.stopMicrosoftLogin();
      }
    } catch (err) {
      console.error(err);
    }
    setAuthStage('idle');
  };

  const handleAddOfflineAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = offlineName.trim();
    if (!trimmed) return;

    if (accounts.includes(trimmed)) {
      alert('This account name already exists!');
      return;
    }

    const updatedAccounts = [...accounts, trimmed];
    
    // Add offline rich representation
    const currentRich = Array.isArray(settings?.richAccounts) ? settings.richAccounts.filter(Boolean) : [];
    const updatedRich = currentRich.filter((a) => a.name !== trimmed);
    updatedRich.push({
      name: trimmed,
      uuid: `offline-uuid-${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      type: 'offline'
    });

    const updatedSettings = {
      ...settings,
      accounts: updatedAccounts,
      activeAccount: trimmed,
      richAccounts: updatedRich,
    } as GlobalSettings;
    onSaveSettings(updatedSettings);
    setOfflineName('');
    alert(`Offline profile "${trimmed}" registered and set as active.`);
  };

  const handleSelectAccount = (accountName: string) => {
    const updatedSettings = {
      ...settings,
      activeAccount: accountName,
    } as GlobalSettings;
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

    const currentRich = Array.isArray(settings?.richAccounts) ? settings.richAccounts.filter(Boolean) : [];
    const updatedRich = currentRich.filter((a) => a.name !== accountName);

    const updatedSettings = {
      ...settings,
      accounts: updatedAccounts,
      activeAccount: nextActive,
      richAccounts: updatedRich,
    } as GlobalSettings;
    onSaveSettings(updatedSettings);
  };

  // Locate rich details for currently active account
  const activeRich = Array.isArray(settings?.richAccounts)
    ? settings.richAccounts.find((a) => a && typeof a === 'object' && a.name === activeAccount)
    : undefined;
  const isActivePremium = activeRich?.type === 'microsoft';

  // Format countdown time helper (mm:ss)
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '650px', margin: '0 auto', width: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>GravityClient</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>Account & Login Manager</p>
      </header>

      {/* Main glass box */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Active Account Info Card */}
        {authStage === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.05)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              background: isActivePremium 
                ? 'linear-gradient(135deg, #00A4EF 0%, #7FBA00 100%)' 
                : 'linear-gradient(135deg, var(--color-accent) 0%, #FA895E 100%)', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              fontSize: '1.4rem', 
              fontWeight: 'bold', 
              color: '#fff' 
            }}>
              {String(activeAccount || '').substring(0, 1).toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Currently Active Identity</span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: '2px' }}>{activeAccount}</h3>
            </div>
            <span style={{ 
              marginLeft: 'auto', 
              background: isActivePremium ? 'rgba(0, 164, 239, 0.2)' : 'rgba(255, 174, 115, 0.15)', 
              color: isActivePremium ? '#66FCF1' : 'var(--color-accent)', 
              border: isActivePremium ? '1px solid rgba(0, 164, 239, 0.3)' : '1px solid var(--color-accent)', 
              padding: '4px 12px', 
              borderRadius: '100px', 
              fontSize: '0.8rem', 
              fontWeight: '600' 
            }}>
              {isActivePremium ? 'PREMIUM (MS)' : 'OFFLINE MODE'}
            </span>
          </div>
        )}

        {/* ----------------- AUTH STAGES RENDERERS ----------------- */}

        {/* 1. Requesting state */}
        {authStage === 'requesting' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px 0' }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTop: '4px solid var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>Connecting to Microsoft Authentication services...</p>
          </div>
        )}

        {/* 2. Prompt Device Code state */}
        {authStage === 'prompt_code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-accent)' }}>Authorize Your Account</h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                Please link your premium Minecraft Microsoft account.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 1: Copy this verification code
              </span>
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(userCode);
                  alert('Code copied to clipboard!');
                }}
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 'bold',
                  letterSpacing: '5px',
                  background: 'rgba(255, 174, 115, 0.08)',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-accent)',
                  color: 'var(--color-accent)',
                  textAlign: 'center',
                  textShadow: '0 0 10px rgba(255, 174, 115, 0.2)',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }} 
                className="hover-bright"
                title="Click to copy"
              >
                {userCode}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Step 2: Authenticate in browser
              </span>
              <button 
                type="button" 
                className="pill-btn primary" 
                style={{ padding: '12px 32px', display: 'flex', gap: '10px', alignItems: 'center' }}
                onClick={() => window.open(verificationUri, '_blank')}
              >
                Open Verification Page
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60FFAE', boxShadow: '0 0 8px #60FFAE', animation: 'pulse 1.5s infinite' }} />
                <style>{`
                  @keyframes pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 1; }
                    100% { opacity: 0.4; }
                  }
                `}</style>
                <span>Waiting for authorization...</span>
              </div>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Session expires in: <strong style={{ color: 'var(--color-accent)' }}>{formatTime(countdown)}</strong>
              </span>
            </div>

            <button type="button" className="pill-btn" style={{ padding: '8px', marginTop: '4px' }} onClick={handleCancelMicrosoftAuth}>
              Cancel Authorization
            </button>
          </div>
        )}

        {/* 3. Success state */}
        {authStage === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(96, 255, 174, 0.05)', border: '1px solid rgba(96,255,174,0.2)', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(96,255,174,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#60FFAE', fontSize: '1.8rem', fontWeight: 'bold' }}>
              ✓
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#60FFAE' }}>Success! Premium Account Linked</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Welcome aboard, <strong style={{ color: '#fff' }}>{newPremiumAccount?.name}</strong>. Your premium profile is verified and immediately active.
              </p>
            </div>
            <button type="button" className="pill-btn primary" style={{ padding: '8px 24px', fontSize: '0.9rem' }} onClick={() => setAuthStage('idle')}>
              Back to Accounts List
            </button>
          </div>
        )}

        {/* 4. Error state */}
        {authStage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,74,90,0.05)', border: '1px solid rgba(255,74,90,0.2)', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,74,90,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-error)', fontSize: '1.8rem', fontWeight: 'bold' }}>
              ✕
            </div>
            <div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-error)' }}>Authentication Failed</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '4px', wordBreak: 'break-word' }}>
                {errorMsg}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="pill-btn primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={handleStartMicrosoftAuth}>
                Try Again
              </button>
              <button type="button" className="pill-btn" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={() => setAuthStage('idle')}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ----------------- BASE FLOW OPTIONS (IDLE) ----------------- */}
        {authStage === 'idle' && (
          <>
            {/* Offline Player Input Form */}
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

            {/* Accounts list selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registered Profiles
              </label>
              <div className="custom-scroller" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {(accounts || []).map((accName) => {
                  if (typeof accName !== 'string') return null;
                  const isActive = accName === activeAccount;
                  const richAcc = Array.isArray(settings?.richAccounts)
                    ? settings.richAccounts.find((a) => a && typeof a === 'object' && a.name === accName)
                    : undefined;
                  const isPremium = richAcc?.type === 'microsoft';

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
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          background: isActive 
                            ? (isPremium ? 'linear-gradient(135deg, #00A4EF, #7FBA00)' : 'var(--color-accent)') 
                            : 'rgba(255,255,255,0.2)', 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          color: isActive ? '#fff' : '#FFF' 
                        }}>
                          {String(accName || '').substring(0, 1).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{accName}</span>
                          {isPremium && (
                            <span style={{ fontSize: '0.7rem', color: '#66FCF1', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                              <svg style={{ width: '8px', height: '8px' }} viewBox="0 0 23 23">
                                <path fill="#F25022" d="M1 1h10v10H1z"/>
                                <path fill="#7FBA00" d="M12 1h10v10H12z"/>
                                <path fill="#00A4EF" d="M1 12h10v10H1z"/>
                                <path fill="#FFB900" d="M12 12h10v10H12z"/>
                              </svg>
                              Premium MS Link
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isActive && (
                          <span style={{ fontSize: '0.75rem', color: isPremium ? '#66FCF1' : 'var(--color-accent)', fontWeight: 'bold', marginRight: '8px' }}>ACTIVE</span>
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

            {/* Premium integration option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                Premium Integration
              </span>
              <button
                type="button"
                className="pill-btn primary"
                style={{ display: 'flex', gap: '10px', padding: '14px 20px', width: '100%', justifyContent: 'center', fontSize: '1rem' }}
                onClick={handleStartMicrosoftAuth}
              >
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 23 23">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#7FBA00" d="M12 1h10v10H12z"/>
                  <path fill="#00A4EF" d="M1 12h10v10H1z"/>
                  <path fill="#FFB900" d="M12 12h10v10H12z"/>
                </svg>
                Connect Premium Microsoft Account
              </button>
            </div>
          </>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <button className="pill-btn" style={{ minWidth: '180px' }} onClick={onBack} disabled={authStage !== 'idle'}>
          Back to Settings
        </button>
      </div>
    </div>
  );
};

export default AccountLogin;
