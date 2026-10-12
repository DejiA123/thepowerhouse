/**
 * A new version of the app has downloaded and is waiting. The service worker
 * registration (main.tsx) reports it here; the update pop-up listens and
 * offers a Refresh button.
 */

export const UPDATE_EVENT = 'app:update-ready';

let apply: ((reload?: boolean) => Promise<void>) | null = null;
let ready = false;

/** main.tsx hands over the function that switches to the new version. */
export const setUpdater = (fn: (reload?: boolean) => Promise<void>) => {
  apply = fn;
};

export const isUpdateReady = () => ready;

export const markUpdateReady = () => {
  ready = true;
  window.dispatchEvent(new Event(UPDATE_EVENT));
};

/** Switch to the new version now (the page reloads). */
export const applyUpdate = async () => {
  try {
    if (apply) await apply(true);
    else window.location.reload();
  } catch {
    window.location.reload();
  }
};
