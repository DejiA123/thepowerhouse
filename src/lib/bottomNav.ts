import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * The bottom bar's height on screen right now (0 when there isn't one; it
 * differs between phones and Home Screen apps), measured by BottomNavigation.
 * Full-screen layers that keep the bar visible (the note editor, a plan's day)
 * end above it: `bottom: var(--bottom-nav-h)` in CSS, or useBottomNavHeight(). Bottom sheets
 * (ui/sheet, ui/drawer) do this for every screen.
 */
let height = 0;
const listeners = new Set<() => void>();

export function setBottomNavHeight(px: number) {
  const next = Math.max(0, Math.round(px));
  if (next === height) return;
  height = next;
  document.documentElement.style.setProperty('--bottom-nav-h', `${next}px`);
  // Above the bar, a sheet needs no gap for the iPhone's home indicator (the bar has it):
  // var(--sheet-safe-bottom, env(safe-area-inset-bottom))
  if (next > 0) document.documentElement.style.setProperty('--sheet-safe-bottom', '0px');
  else document.documentElement.style.removeProperty('--sheet-safe-bottom');
  listeners.forEach((l) => l());
}

export const useBottomNavHeight = () =>
  useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => height,
    () => 0,
  );

/** Typing somewhere that brings up the keyboard */
function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el instanceof HTMLInputElement && !/^(button|checkbox|radio|range|submit|reset|file|color|image)$/.test(el.type);
}

let tallest = 0;
let tallestWidth = 0;

/**
 * Android's keyboard shrinks the page (interactive-widget=resizes-content), which
 * would lift the bar onto the keyboard, between it and what you're typing. The
 * iPhone's keyboard covers the page instead (the bar stays put, under it).
 */
function keyboardLiftsPage(): boolean {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w !== tallestWidth) {
    tallestWidth = w; // turned the phone: measure again
    tallest = h;
  }
  tallest = Math.max(tallest, h);
  return typing() && tallest - h > 150;
}

/** True while the keyboard is up and has shrunk the page (Android): the bar steps aside until it closes */
export function useKeyboardLiftsPage(): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const check = () => setUp(keyboardLiftsPage());
    const soon = () => window.setTimeout(check, 60); // the resize can come just before or after the focus change
    check();
    window.addEventListener('resize', check);
    document.addEventListener('focusin', soon);
    document.addEventListener('focusout', soon);
    return () => {
      window.removeEventListener('resize', check);
      document.removeEventListener('focusin', soon);
      document.removeEventListener('focusout', soon);
    };
  }, []);
  return up;
}
