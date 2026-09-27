import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register';
import { appAlert } from '@/lib/appAlert';
import { recordLaunch } from '@/lib/launchReport';

recordLaunch();

// Service worker: offline app shell + Web Push.
// A new version downloads in the background and waits. It only takes over when
// the app is put away, never while it's on screen: no reload (and white flash)
// while opening or while in use, and the next open is already the new version.
let updateReady = false;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    // Look for updates when the app returns to the foreground and hourly
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
    });
    setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
  },
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && updateReady) updateSW(true);
});

// Once the offline copy is saved: keep the app's storage from being cleared
// when the phone runs low, and say (once) that it now works with no internet
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(async (registration) => {
    try {
      if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
    } catch {
      /* not supported */
    }
    const KEY = 'offline_ready_notice_v1';
    if (registration.active && !localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      setTimeout(() => appAlert('Ready to use offline', 'The Power House now opens even with no internet.', 'success'), 4000);
    }
  }).catch(() => undefined);
}

/** Catches render errors so one broken screen doesn't blank the whole app. */
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
    // Don't keep the splash screen over the error message
    window.dispatchEvent(new Event('app-ready'));
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <img src="/icons/icon-192.png" alt="" width={72} height={72} style={{ margin: '0 auto 16px', borderRadius: 16 }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
            Sorry about that. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 999, padding: '12px 28px', fontWeight: 600, fontSize: 16 }}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
