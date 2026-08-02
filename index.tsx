import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID.apps.googleusercontent.com';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// Service worker registration is handled by vite-plugin-pwa (registerType: 'autoUpdate').
// Its workbox runtimeCaching already CacheFirsts huggingface.co model files, so the old
// manual /service-worker.js registration was redundant — and worse, it claimed the same
// root scope, so the two registrations overwrote each other nondeterministically.

// One-time cleanup: unregister the legacy worker still installed in returning visitors'
// browsers. Safe to delete this block once traffic has cycled through.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((r) => r.active?.scriptURL.endsWith('/service-worker.js'))
        .forEach((r) => void r.unregister());
    });
  });
}