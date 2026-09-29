import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_FAVOURITES, DEFAULT_SECTIONS, itemById } from '@/data/resourceCatalog';

/**
 * Each person's own Resources page: favourites, the order of sections and
 * items, what's hidden, section names and how favourites look.
 *
 * Saved on the phone straight away (works offline), and in the account's
 * profile so it's the same on every device they sign in on.
 */
export interface ResourcesLayout {
  favourites: string[];
  /** Items hidden from their section (still found by search) */
  hidden: string[];
  sections: { id: string; items: string[]; hidden?: boolean; title?: string }[];
  favouriteStyle: 'tiles' | 'list';
  showChurch: boolean;
  updatedAt: number;
}

const KEY = 'resources_layout_v1';
const ACCOUNT_KEY = 'resources_layout';

export const defaultLayout = (): ResourcesLayout => ({
  favourites: [...DEFAULT_FAVOURITES],
  hidden: [],
  sections: DEFAULT_SECTIONS.map((s) => ({ id: s.id, items: [...s.items] })),
  favouriteStyle: 'tiles',
  showChurch: true,
  updatedAt: 0,
});

const known = (id: unknown): id is string => typeof id === 'string' && itemById.has(id);

/** Keep a saved layout valid as the app changes: things that no longer exist drop out, new things go to their usual section. */
export function normaliseLayout(raw: unknown): ResourcesLayout {
  const base = defaultLayout();
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Partial<ResourcesLayout>;

  const sections: ResourcesLayout['sections'] = [];
  const placed = new Set<string>();
  for (const s of Array.isArray(saved.sections) ? saved.sections : []) {
    const def = DEFAULT_SECTIONS.find((d) => d.id === s?.id);
    if (!def || sections.some((x) => x.id === def.id)) continue;
    const items = (Array.isArray(s.items) ? s.items : []).filter(known).filter((id) => !placed.has(id));
    items.forEach((id) => placed.add(id));
    const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim().slice(0, 40) : undefined;
    sections.push({ id: def.id, items, hidden: !!s.hidden, title });
  }
  for (const def of DEFAULT_SECTIONS) {
    let section = sections.find((s) => s.id === def.id);
    if (!section) {
      section = { id: def.id, items: [] };
      sections.push(section);
    }
    for (const id of def.items) {
      if (!placed.has(id)) {
        section.items.push(id);
        placed.add(id);
      }
    }
  }

  return {
    favourites: Array.isArray(saved.favourites) ? [...new Set(saved.favourites.filter(known))] : base.favourites,
    hidden: Array.isArray(saved.hidden) ? [...new Set(saved.hidden.filter(known))] : [],
    sections,
    favouriteStyle: saved.favouriteStyle === 'list' ? 'list' : 'tiles',
    showChurch: saved.showChurch !== false,
    updatedAt: Number(saved.updatedAt) || 0,
  };
}

function readLocal(): ResourcesLayout {
  try {
    return normaliseLayout(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return defaultLayout();
  }
}

export function useResourcesLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<ResourcesLayout>(readLocal);
  const layoutRef = useRef(layout);
  const signedIn = useRef(!!user);
  signedIn.current = !!user;
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();

  const pushToAccount = useCallback((next: ResourcesLayout) => {
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (!signedIn.current || navigator.onLine === false) return;
      supabase.auth.updateUser({ data: { [ACCOUNT_KEY]: next } }).catch(() => undefined);
    }, 1500);
  }, []);

  const apply = useCallback((next: ResourcesLayout) => {
    layoutRef.current = next;
    setLayout(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full */
    }
  }, []);

  // The same layout on every device: take the account's copy if it's newer,
  // or send this device's copy up if it was changed while offline
  useEffect(() => {
    if (!user) return;
    const fromAccount = (user.user_metadata as Record<string, unknown> | undefined)?.[ACCOUNT_KEY];
    const remote = fromAccount ? normaliseLayout(fromAccount) : null;
    if (remote && remote.updatedAt > layoutRef.current.updatedAt) apply(remote);
    else if (layoutRef.current.updatedAt > (remote?.updatedAt ?? 0)) pushToAccount(layoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => () => clearTimeout(pushTimer.current), []);

  const update = useCallback(
    (change: (current: ResourcesLayout) => ResourcesLayout) => {
      const next = { ...change(layoutRef.current), updatedAt: Date.now() };
      apply(next);
      pushToAccount(next);
    },
    [apply, pushToAccount],
  );

  const reset = useCallback(() => update(() => defaultLayout()), [update]);

  return { layout, update, reset };
}
