/**
 * The church's API.Bible account: public-domain Bibles plus the licensed NIV
 * text and the NIV audio Bible (The Listener's Bible, read by Max McLean).
 *
 * Licensed content must be reported with API.Bible's Fair Use Management
 * System (FUMS): each passage shown and each chapter listened to. Responses
 * carry a token for that (ask with fums-version=3); the small tracker script
 * is loaded the first time it's needed.
 */
export const API_BIBLE_KEY = 'vaHPm0BRIAiMR-ys4_hUH';
export const API_BIBLE_BASE_URL = 'https://rest.api.bible/v1';

/** The licensed NIV (2011) text and audio on this account */
export const API_NIV_TEXT_ID = '78a9f6124f344018-01';
export const API_NIV_AUDIO_ID = '5dd1a42b02d2dee6-01';

export const NIV_COPYRIGHT =
  'Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.';
export const NIV_AUDIO_COPYRIGHT = "The Listener's Bible®: NIV® Edition. Audio ℗ 2011 by Max McLean. Used by permission.";

type FumsQueue = { (...args: unknown[]): void; q?: unknown[] };

let loaded = false;

function tracker(): FumsQueue | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { fums?: FumsQueue; fumsData?: unknown[] };
  // The stub queues calls until the script has loaded (as API.Bible's guide shows)
  w.fumsData = w.fumsData || [];
  w.fums =
    w.fums ||
    function (...args: unknown[]) {
      w.fumsData!.push(args);
    };
  if (!loaded) {
    loaded = true;
    const script = document.createElement('script');
    script.src = 'https://pkg.api.bible/fumsV3.min.js';
    script.async = true;
    script.onerror = () => {
      loaded = false; // try again next time
    };
    document.head.appendChild(script);
  }
  return w.fums;
}

const reported = new Set<string>();

/** A licensed passage was shown (or read aloud by the AI voice). Once per display. */
export function reportView(token: string | undefined | null) {
  if (!token) return;
  try {
    tracker()?.('trackView', token);
  } catch {
    /* reporting must never get in the way of reading */
  }
}

/** A licensed audio chapter started playing. Once per token. */
export function reportListen(token: string | undefined | null) {
  if (!token || reported.has(token)) return;
  reported.add(token);
  try {
    tracker()?.('trackListen', token);
  } catch {
    /* reporting must never get in the way of listening */
  }
}
