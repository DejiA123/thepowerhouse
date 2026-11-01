import { useSyncExternalStore } from 'react';

/**
 * The bottom bar's height on screen right now (0 when there isn't one; it
 * differs between phones and Home Screen apps), measured by BottomNavigation.
 * Full-screen layers that keep the bar visible (the note editor, a plan's day)
 * end above it: `bottom: var(--bottom-nav-h)` in CSS, or useBottomNavHeight().
 */
let height = 0;
const listeners = new Set<() => void>();

export function setBottomNavHeight(px: number) {
  const next = Math.max(0, Math.round(px));
  if (next === height) return;
  height = next;
  document.documentElement.style.setProperty('--bottom-nav-h', `${next}px`);
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
