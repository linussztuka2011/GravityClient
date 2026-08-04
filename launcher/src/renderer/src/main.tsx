import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('GravityClient could not find its application root.');
}

// The launcher APIs only exist in Electron's secure preload bridge. Keeping a
// browser mock here made a web preview claim that profiles, downloads, login,
// and game launches had succeeded when nothing had touched Minecraft.
if (!window.gravityAPI) {
  ReactDOM.createRoot(root).render(
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', color: '#fff', background: '#0B0C10', fontFamily: 'system-ui' }}>
      <section style={{ maxWidth: '34rem', textAlign: 'center' }}>
        <h1>GravityClient requires the desktop launcher</h1>
        <p style={{ color: '#b7c0cc', lineHeight: 1.6 }}>
          This browser preview cannot install mods, authenticate a Minecraft account, or start the game. Run it through Electron to test a real instance.
        </p>
      </section>
    </main>
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
