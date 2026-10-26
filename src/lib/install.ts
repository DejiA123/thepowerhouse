/**
 * Getting the app onto people's Home Screens.
 *
 * Android (Chrome, Edge, Samsung Internet) lets the app offer its own Install
 * button: the browser's offer is caught here as soon as the app starts (it
 * comes early, once) and kept until someone taps Install. iPhones have no such
 * offer, so they get pictures of the taps for the browser they're in (see
 * InstallGuide). Apps like Instagram open links in their own browser, which
 * can't install anything: those people are shown how to get to Safari/Chrome.
 */
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallContext =
  | { kind: 'installed' }
  /** Inside another app's browser (Instagram, Facebook…): can't install from here */
  | { kind: 'in-app'; app: string; os: 'ios' | 'android' }
  | { kind: 'ios'; browser: 'safari' | 'chrome' | 'other'; ipad: boolean; safariVersion: number }
  | { kind: 'android'; canPrompt: boolean }
  /** A computer: only offered when the browser can install it in one tap */
  | { kind: 'desktop'; canPrompt: boolean };

const CHANGE = 'app-install:changed';
export const INSTALL_GUIDE_EVENT = 'app:install-guide';
const INSTALLED_KEY = 'app_installed_v1';

let offer: BeforeInstallPromptEvent | null = null;

const emit = () => window.dispatchEvent(new CustomEvent(CHANGE));

const markInstalled = () => {
  try {
    localStorage.setItem(INSTALLED_KEY, '1');
  } catch {
    /* private mode */
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Our own card offers it instead of the browser's small bar
    event.preventDefault();
    offer = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    markInstalled();
    emit();
  });
}

/** Opened from the Home Screen (or as an installed app on a computer) */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  const mode = (m: string) => window.matchMedia(`(display-mode: ${m})`).matches;
  return mode('standalone') || mode('fullscreen') || mode('minimal-ui') || (navigator as { standalone?: boolean }).standalone === true;
}

/** Other apps' built-in browsers, by what they add to the browser's name */
const IN_APP: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN\/Messenger|FB_IAB\/MESSENGER|MessengerForiOS/i, 'Messenger'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/Snapchat/i, 'Snapchat'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Pinterest/i, 'Pinterest'],
  [/ Line\//, 'LINE'],
  [/GSA\//, 'the Google app'],
];

export function installContext(): InstallContext {
  if (isInstalled()) return { kind: 'installed' };
  const ua = navigator.userAgent;
  // iPads describe themselves as Macs; they're the "Macs" with touch screens
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ios = ipad || /iPhone|iPod/.test(ua);
  const android = /Android/.test(ua);

  if (ios || android) {
    const app = IN_APP.find(([pattern]) => pattern.test(ua))?.[1]
      // Other apps' browsers: on iPhone they leave out "Safari", on Android they add "wv"
      ?? (ios && !/Safari\//.test(ua) ? 'this app' : android && /; wv\)/.test(ua) ? 'this app' : null);
    if (app) return { kind: 'in-app', app, os: ios ? 'ios' : 'android' };
  }
  if (ios) {
    // The real Safari version (iOS 26 Safari reports an older iOS number in its name)
    const safariVersion = Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0);
    const browser = /CriOS/.test(ua) ? 'chrome' : /EdgiOS|FxiOS|OPiOS|Ddg\//.test(ua) ? 'other' : 'safari';
    return { kind: 'ios', browser, ipad, safariVersion };
  }
  if (android) return { kind: 'android', canPrompt: !!offer };
  return { kind: 'desktop', canPrompt: !!offer };
}

/** Shows the browser's own "Install app" box (Android, computers). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const pending = offer;
  if (!pending) return 'unavailable';
  // Each offer can only be shown once
  offer = null;
  emit();
  await pending.prompt();
  const { outcome } = await pending.userChoice;
  if (outcome === 'accepted') markInstalled();
  return outcome;
}

/** Installed earlier from this browser (Android keeps the browser's storage, so the card can stay away) */
export const installedBefore = () => {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * "Install the app": the browser's own Install box where there is one,
 * otherwise the step-by-step pictures (mounted once in the layout).
 */
export const openInstallGuide = () => {
  const now = installContext();
  if ((now.kind === 'android' || now.kind === 'desktop') && now.canPrompt) {
    promptInstall().catch(() => undefined);
    return;
  }
  window.dispatchEvent(new Event(INSTALL_GUIDE_EVENT));
};

/** Where this device stands; updates when Android offers or finishes an install. */
export function useInstallContext(): InstallContext {
  const [context, setContext] = useState(installContext);
  useEffect(() => {
    const update = () => setContext(installContext());
    window.addEventListener(CHANGE, update);
    const standalone = window.matchMedia('(display-mode: standalone)');
    standalone.addEventListener?.('change', update);
    return () => {
      window.removeEventListener(CHANGE, update);
      standalone.removeEventListener?.('change', update);
    };
  }, []);
  return context;
}
