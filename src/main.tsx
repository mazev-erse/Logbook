import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initContinuousCorners } from './lib/continuousCorners';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

initContinuousCorners();

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady();
}

// Clean up any stale Supabase API service worker caches from earlier builds
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('supabase-api-swr').catch(() => {});
}

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.dataset.mounted = 'true';
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
