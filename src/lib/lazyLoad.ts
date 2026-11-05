import { lazy, type ComponentType } from 'react';

/**
 * Parts of the app load on demand. After an update an open app can ask for a
 * piece of the old version that no longer exists (iPhone: "Importing a module
 * script failed"); reloading picks up the new version. Never more than once
 * every 30 seconds, so a real outage can't loop.
 */
export const isChunkError = (error: unknown) =>
  /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Unable to preload CSS|error loading dynamically/i.test(
    String((error as Error)?.message ?? error),
  );

export function reloadForUpdate(): boolean {
  try {
    const last = Number(sessionStorage.getItem('chunk-reload-at') || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  } catch {
    /* private window: reload anyway */
  }
  window.location.reload();
  return true;
}

/** React.lazy that reloads into the new version instead of crashing when a piece is gone */
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await load();
    } catch (error) {
      // Reloading: show nothing meanwhile rather than the error screen
      if (isChunkError(error) && reloadForUpdate()) return new Promise<{ default: T }>(() => undefined);
      throw error;
    }
  });
}
