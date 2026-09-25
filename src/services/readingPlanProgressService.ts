/**
 * Reading plan progress: kept on the device for instant, offline use and
 * synced to Supabase (reading_plan_progress) so it follows people across
 * devices. People who aren't signed in keep progress on the device; it moves
 * to their account when they sign in.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PlanProgress {
  planId: string;
  startedAt: string;
  /** Day number → date it was completed (YYYY-MM-DD, local time) */
  completed: Record<number, string>;
  /** Changed on this device and not yet saved to the account */
  pending?: boolean;
}

export type ProgressMap = Record<string, PlanProgress>;

const GUEST = 'guest';
const cacheKey = (userId: string) => `plan_progress_v2_${userId}`;
const legacyKey = (userId: string) => `reading_plans_${userId}`;

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const readCache = (userId: string): ProgressMap => {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId)) || '{}');
  } catch {
    return {};
  }
};

const writeCache = (userId: string, map: ProgressMap) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(map));
  } catch {
    /* storage full */
  }
};

/** Progress saved by the old plans page: { enrolled, progress: { planId: nextDay }, completed } */
const readLegacy = (userId: string): ProgressMap => {
  try {
    const raw = JSON.parse(localStorage.getItem(legacyKey(userId)) || 'null');
    if (!raw) return {};
    const out: ProgressMap = {};
    const ids = new Set<string>([...(raw.enrolled || []), ...(raw.completed || [])]);
    ids.forEach((planId) => {
      const next = Number(raw.progress?.[planId] || 1);
      const completed: Record<number, string> = {};
      for (let d = 1; d < next; d++) completed[d] = '';
      out[planId] = { planId, startedAt: new Date().toISOString(), completed, pending: true };
    });
    return out;
  } catch {
    return {};
  }
};

/** Union of two copies of the same plan, so nothing done offline is lost. */
const mergeOne = (a?: PlanProgress, b?: PlanProgress): PlanProgress | undefined => {
  if (!a) return b;
  if (!b) return a;
  const completed = { ...b.completed };
  Object.entries(a.completed).forEach(([day, date]) => {
    if (!(day in completed) || (!completed[Number(day)] && date)) completed[Number(day)] = date;
  });
  return {
    planId: a.planId,
    startedAt: a.startedAt < b.startedAt ? a.startedAt : b.startedAt,
    completed,
    pending: a.pending || b.pending,
  };
};

const merge = (...maps: ProgressMap[]): ProgressMap => {
  const out: ProgressMap = {};
  maps.forEach((m) => Object.values(m).forEach((p) => (out[p.planId] = mergeOne(out[p.planId], p)!)));
  return out;
};

const same = (a?: PlanProgress, b?: PlanProgress) =>
  !!a && !!b && JSON.stringify(Object.keys(a.completed).sort()) === JSON.stringify(Object.keys(b.completed).sort());

const toRow = (userId: string, p: PlanProgress, totalDays?: number) => {
  const days = Object.keys(p.completed).map(Number).sort((x, y) => x - y);
  let next = 1;
  while (p.completed[next] !== undefined) next++;
  return {
    user_id: userId,
    plan_id: p.planId,
    current_day: totalDays ? Math.min(next, totalDays) : next,
    completed_days: days.map((d) => (p.completed[d] ? `${d}|${p.completed[d]}` : String(d))),
    enrolled_at: p.startedAt,
  };
};

const fromRow = (row: { plan_id: string; completed_days: string[] | null; enrolled_at: string | null; current_day: number | null }): PlanProgress => {
  const completed: Record<number, string> = {};
  (row.completed_days || []).forEach((entry) => {
    const [day, date] = entry.split('|');
    if (Number(day) > 0) completed[Number(day)] = date || '';
  });
  // Rows written before completed_days was used only carry the current day
  if (!row.completed_days?.length && (row.current_day || 1) > 1) {
    for (let d = 1; d < (row.current_day || 1); d++) completed[d] = '';
  }
  return { planId: row.plan_id, startedAt: row.enrolled_at || new Date().toISOString(), completed };
};

export const readingPlanProgressService = {
  /** Instant copy from the device */
  cached(userId?: string | null): ProgressMap {
    const id = userId || GUEST;
    return merge(readLegacy(id), readCache(id));
  },

  /**
   * Load from the account. The account is the source of truth; this device's
   * copy only adds to it when it holds changes that never reached the server
   * (offline, or made before signing in).
   */
  async load(userId?: string | null): Promise<ProgressMap> {
    if (!userId) return this.cached(null);
    const local = readCache(userId);
    const carryOver = merge(readLegacy(userId), readCache(GUEST));
    const { data, error } = await supabase.from('reading_plan_progress').select('*').eq('user_id', userId);
    if (error) throw error;
    const server: ProgressMap = {};
    (data || []).forEach((row) => (server[row.plan_id] = fromRow(row)));

    const merged: ProgressMap = {};
    Object.values(server).forEach((p) => {
      merged[p.planId] = local[p.planId]?.pending ? mergeOne(p, local[p.planId])! : p;
    });
    [...Object.values(local).filter((p) => p.pending), ...Object.values(carryOver)].forEach((p) => {
      merged[p.planId] = mergeOne(merged[p.planId], p)!;
    });

    const toPush = Object.values(merged).filter((p) => p.pending || !same(p, server[p.planId]));
    if (toPush.length) {
      const { error: pushError } = await supabase
        .from('reading_plan_progress')
        .upsert(toPush.map((p) => toRow(userId, p)), { onConflict: 'user_id,plan_id' });
      if (pushError) console.warn('Plan progress sync failed', pushError);
      else toPush.forEach((p) => (merged[p.planId] = { ...merged[p.planId], pending: false }));
    }
    writeCache(userId, merged);
    try {
      localStorage.removeItem(legacyKey(userId));
      localStorage.removeItem(cacheKey(GUEST));
    } catch {
      /* ignore */
    }
    return merged;
  },

  /** Save one plan's progress: on the device straight away, then to the account. */
  async save(userId: string | null | undefined, progress: PlanProgress, totalDays?: number) {
    const id = userId || GUEST;
    writeCache(id, { ...readCache(id), [progress.planId]: { ...progress, pending: true } });
    if (!userId) return;
    const { error } = await supabase
      .from('reading_plan_progress')
      .upsert(toRow(userId, progress, totalDays), { onConflict: 'user_id,plan_id' });
    if (error) throw error;
    writeCache(id, { ...readCache(id), [progress.planId]: { ...progress, pending: false } });
  },

  async remove(userId: string | null | undefined, planId: string) {
    const id = userId || GUEST;
    const map = { ...readCache(id) };
    delete map[planId];
    writeCache(id, map);
    try {
      // Keep the old page's copy from bringing the plan back
      const legacy = JSON.parse(localStorage.getItem(legacyKey(id)) || 'null');
      if (legacy) {
        legacy.enrolled = (legacy.enrolled || []).filter((p: string) => p !== planId);
        legacy.completed = (legacy.completed || []).filter((p: string) => p !== planId);
        localStorage.setItem(legacyKey(id), JSON.stringify(legacy));
      }
    } catch {
      /* ignore */
    }
    if (!userId) return;
    const { error } = await supabase.from('reading_plan_progress').delete().eq('user_id', userId).eq('plan_id', planId);
    if (error) throw error;
  },
};

// ── Derived stats ──────────────────────────────────────────────────────

export const completedCount = (p: PlanProgress) => Object.keys(p.completed).length;

/** First day not yet read */
export const nextDay = (p: PlanProgress, totalDays: number) => {
  for (let d = 1; d <= totalDays; d++) if (p.completed[d] === undefined) return d;
  return totalDays;
};

export const isFinished = (p: PlanProgress, totalDays: number) => completedCount(p) >= totalDays;

/** Positive = days behind the plan's calendar, negative = ahead */
export const daysBehind = (p: PlanProgress, totalDays: number) => {
  const start = new Date(p.startedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expected = Math.min(totalDays, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
  return expected - completedCount(p);
};

/** Consecutive days (ending today, or yesterday) with at least one reading done. */
export const readingStreak = (map: ProgressMap) => {
  const dates = new Set<string>();
  Object.values(map).forEach((p) => Object.values(p.completed).forEach((d) => d && dates.add(d)));
  const day = new Date();
  if (!dates.has(localDate(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (dates.has(localDate(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return { streak, doneToday: dates.has(localDate()) };
};
