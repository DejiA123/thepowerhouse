/**
 * How the last few launches went: how long until the first screen was ready,
 * and whether the app came from the copy saved on the phone or had to be
 * downloaded. Shown in Settings → App speed, so a slow start on someone's
 * phone can be understood from a screenshot.
 */

export interface LaunchRecord {
  at: number;
  /** Until the first screen was ready (ms from opening the page) */
  readyMs: number;
  /** The page itself arrived after this long */
  pageMs: number;
  /** The page came from the phone's saved copy (service worker), not the internet */
  fromPhone: boolean;
  /** Files in the saved offline copy at the time */
  savedFiles: number | null;
  online: boolean;
}

const KEY = 'launch_report_v1';

export function launchHistory(): LaunchRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

async function savedFileCount() {
  try {
    const names = await caches.keys();
    const precache = names.find((n) => n.startsWith('workbox-precache'));
    return precache ? (await (await caches.open(precache)).keys()).length : 0;
  } catch {
    return null;
  }
}

/** Call once at start-up: records this launch when the first screen is ready. */
export function recordLaunch() {
  window.addEventListener(
    'app-ready',
    () => {
      const readyMs = Math.round(performance.now());
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const fromPhone = !!navigator.serviceWorker?.controller && (nav ? nav.workerStart > 0 : true);
      // Off the critical path
      setTimeout(async () => {
        const record: LaunchRecord = {
          at: Date.now(),
          readyMs,
          pageMs: Math.round(nav?.responseEnd ?? 0),
          fromPhone,
          savedFiles: await savedFileCount(),
          online: navigator.onLine !== false,
        };
        try {
          localStorage.setItem(KEY, JSON.stringify([record, ...launchHistory()].slice(0, 6)));
        } catch {
          /* storage full */
        }
      }, 4000);
    },
    { once: true },
  );
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function describeLaunch(r: LaunchRecord) {
  return `${seconds(r.readyMs)} · ${r.fromPhone ? 'from the phone' : 'downloaded'}${r.online ? '' : ' · offline'}`;
}

export function launchDetails() {
  const list = launchHistory();
  if (!list.length) return 'Nothing recorded yet. Close the app fully and open it again.';
  const lines = list.map((r) => {
    const when = new Date(r.at).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return `${when}: ready in ${seconds(r.readyMs)} (page ${seconds(r.pageMs)}), ${r.fromPhone ? 'from the phone' : 'downloaded'}${r.online ? '' : ', offline'}`;
  });
  const saved = list[0].savedFiles;
  return `${lines.join('\n')}\n\nOffline copy: ${saved === null ? 'unknown' : saved ? `${saved} files saved` : 'not saved yet'}`;
}
