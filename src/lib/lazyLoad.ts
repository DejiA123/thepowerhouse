import { lazy, type ComponentType } from 'react';

/**
 * Parts of the app load on demand. After an update an open app can ask for a
 * piece of the old version that no longer exists (iPhone: "Importing a module
 * script failed"); the new version's offline copy takes over and the page reloads
 * into it. Never more than once every 30 seconds, so a real outage can't loop.
 */
export const isChunkError = (error: unknown) =>
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Unable to preload CSS|error loading dynamically/i.test(
    String((error as Error)?.message ?? error),
  );

/**
 * The offline copy (service worker) still holds the old version and would serve it again
 * after a plain reload, so the missing piece would stay missing (pieces left out of the
 * offline copy, like the choir page, are gone from the server after an update). Fetch the
 * new version's worker, let it take over, then reload. Gives up quietly after a few seconds.
 */
async function activateNewVersion() {
  try {
    const sw = navigator.serviceWorker;
    const reg = await sw?.getRegistration();
    if (!sw || !reg) return;
    await reg.update().catch(() => undefined);
    const installing = reg.installing;
    if (installing && !reg.waiting) {
      await new Promise<void>((done) => {
        const t = window.setTimeout(done, 10_000);
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' || installing.state === 'redundant') {
            window.clearTimeout(t);
            done();
          }
        });
      });
    }
    const waiting = reg.waiting;
    if (!waiting) return;
    await new Promise<void>((done) => {
      const t = window.setTimeout(done, 4_000);
      sw.addEventListener('controllerchange', () => { window.clearTimeout(t); done(); }, { once: true });
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  } catch {
    /* reload anyway */
  }
}

let updating = false;
/** True once the app has started switching to the newest version (screens show nothing meanwhile) */
export const isUpdating = () => updating;

/** A small note while the switch takes a few seconds (plain DOM: React may be mid-crash) */
function showUpdatingNote() {
  try {
    if (document.getElementById('app-updating')) return;
    const el = document.createElement('div');
    el.id = 'app-updating';
    el.setAttribute('role', 'status');
    el.textContent = 'Updating to the newest version…';
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.96);color:#334155;font:600 16px Inter,system-ui,sans-serif;';
    document.body.appendChild(el);
  } catch {
    /* no body yet */
  }
}

/** Into the newest version: the new offline copy takes over first, then the page reloads */
export function freshReload() {
  updating = true;
  showUpdatingNote();
  void activateNewVersion().finally(() => window.location.reload());
}

export function reloadForUpdate(): boolean {
  try {
    const last = Number(sessionStorage.getItem('chunk-reload-at') || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  } catch {
    /* private window: reload anyway */
  }
  freshReload();
  return true;
}

/** React.lazy that reloads into the new version instead of crashing when a piece is gone */
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const never = () => new Promise<{ default: T }>(() => undefined);
    try {
      const mod = await load();
      // A failed piece can come back empty (Vite's preload error, handled in main.tsx):
      // that's an update too, not a crash
      if (!mod?.default) {
        if (isUpdating() || reloadForUpdate()) return never();
        throw new Error('A piece of the app is missing (Failed to fetch dynamically imported module)');
      }
      return mod;
    } catch (error) {
      // Reloading: show nothing meanwhile rather than the error screen
      if (isChunkError(error) && (isUpdating() || reloadForUpdate())) return never();
      throw error;
    }
  });
}
