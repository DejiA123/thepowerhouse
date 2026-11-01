import { useSyncExternalStore } from 'react';

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
