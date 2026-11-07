// First: which church this is (before anything reads its name, colours or parts)
import '@/lib/churchSpace';
import { freshReload, isChunkError, isUpdating, reloadForUpdate } from '@/lib/lazyLoad';
import { track } from '@/lib/activity';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register';
import { appAlert } from '@/lib/appAlert';
import { recordLaunch } from '@/lib/launchReport';
import { markUpdateReady, setUpdater } from '@/lib/appUpdate';
import { church } from '@/config/church';
// Catches Android's "this app can be installed" offer, which comes once, early
import '@/lib/install';
import { startActivity } from '@/lib/activity';
import { keepRealtimeAwake } from '@/lib/realtime';

// What people use in the app, for the church's admins (actions only, never content)
startActivity();

// Chats, calls and lists stay live after the phone was locked or the app was put away
keepRealtimeAwake();

recordLaunch();

// Bible text downloaded before it was saved one entry per book: move it over
// once, in the background, well after the app has opened (see offlineTextStore)
window.addEventListener(
  'app-ready',
  () => {
    if (localStorage.getItem('bible_text_packed_v1') === '1') return;
    setTimeout(() => {
      import('@/services/offlineTextStore').then((m) => m.packDownloadedText()).catch(() => undefined);
    }, 15000);
  },
  { once: true },
);

// Service worker: offline app shell + Web Push.
// A new version downloads in the background and waits. A pop-up then offers
// "Refresh" (see UpdatePrompt); otherwise it takes over when the app is put
// away, never on its own while it's on screen (no surprise reload).
let updateReady = false;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true;
    markUpdateReady();
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
setUpdater(updateSW);
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
      setTimeout(() => appAlert('Ready to use offline', `${church.name} now opens even with no internet.`, 'success'), 4000);
    }
  }).catch(() => undefined);
}

// A piece of the old version that's gone after an update: reload into the new one
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForUpdate()) event.preventDefault();
});
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkError(event.reason)) reloadForUpdate();
});

/** Catches render errors so one broken screen doesn't blank the whole app. */
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null; reloading: boolean }> {
  state = { error: null as Error | null, reloading: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
    // The app was updated while open: reload into the new version (no error screen)
    if (isUpdating() || (isChunkError(error) && reloadForUpdate())) {
      this.setState({ reloading: true });
      return;
    }
    // Kept with the app's activity, so the cause can be found and fixed
    track('crash', {
      message: String(error?.message ?? error).slice(0, 300),
      stack: String(error?.stack ?? '').slice(0, 800),
      component: String(info.componentStack ?? '').slice(0, 600),
    });
    // Don't keep the splash screen over the error message
    window.dispatchEvent(new Event('app-ready'));
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.reloading) return null;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <img src="/icons/icon-192.png" alt="" width={72} height={72} style={{ margin: '0 auto 16px', borderRadius: 16 }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
            Sorry about that. Reloading usually fixes it.
          </p>
          <button
            onClick={() => freshReload()}
            style={{ background: '#2563eb', color: 'white', border: 0, borderRadius: 999, padding: '12px 28px', fontWeight: 600, fontSize: 16 }}
          >
            Reload app
          </button>
          <p style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 20, lineHeight: 1.4, wordBreak: 'break-word' }}>
            {String(this.state.error?.message ?? this.state.error).slice(0, 160)}
          </p>
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
