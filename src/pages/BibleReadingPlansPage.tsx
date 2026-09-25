import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Clock, Flame, Play, RotateCcw, Trophy } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Page, PageHeader, SectionLabel } from '@/components/page/PageKit';
import { PlanCover, ProgressRing } from '@/components/plans/planArt';
import PlanDetailSheet, { scheduleLabel } from '@/components/plans/PlanDetailSheet';
import PlanDayReader from '@/components/plans/PlanDayReader';
import { useAuth } from '@/contexts/AuthContext';
import { useBiblePreferences } from '@/hooks/useBiblePreferences';
import { appAlert } from '@/lib/appAlert';
import { cn } from '@/lib/utils';
import { readingPlanService, type PlanTag, type ReadingPlan } from '@/services/readingPlanService';
import {
  completedCount, isFinished, localDate, nextDay, readingPlanProgressService, readingStreak,
  type PlanProgress, type ProgressMap,
} from '@/services/readingPlanProgressService';

const FILTERS: { value: 'all' | PlanTag; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'start', label: 'Start here' },
  { value: 'short', label: 'Under a month' },
  { value: 'jesus', label: 'Jesus' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'deep', label: 'Go deeper' },
];

const toneClass = {
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
};

const BibleReadingPlansPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { preferences } = useBiblePreferences();
  const plans = readingPlanService.getAllPlans();

  const [progress, setProgress] = useState<ProgressMap>(() => readingPlanProgressService.cached(user?.id));
  const [filter, setFilter] = useState<'all' | PlanTag>('all');
  const [detailId, setDetailId] = useState<string | null>(() => params.get('plan'));
  const [reader, setReader] = useState<{ planId: string; day: number } | null>(null);
  const [toStop, setToStop] = useState<ReadingPlan | null>(null);

  // ── Data ────────────────────────────────────────────────────────────
  useEffect(() => {
    setProgress(readingPlanProgressService.cached(user?.id));
    readingPlanProgressService
      .load(user?.id)
      .then(setProgress)
      .catch((error) => console.warn('Could not load plan progress', error));
  }, [user?.id]);

  // Keep ?plan=<id> in the address so a plan can be shared or reopened
  useEffect(() => {
    const current = params.get('plan');
    if ((detailId || null) === current) return;
    const next = new URLSearchParams(params);
    if (detailId) next.set('plan', detailId);
    else next.delete('plan');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  const commit = useCallback(
    async (plan: ReadingPlan, next: PlanProgress | null) => {
      setProgress((prev) => {
        const map = { ...prev };
        if (next) map[plan.id] = next;
        else delete map[plan.id];
        return map;
      });
      try {
        if (next) await readingPlanProgressService.save(user?.id, next, plan.totalDays);
        else await readingPlanProgressService.remove(user?.id, plan.id);
      } catch (error) {
        console.warn('Plan progress not synced', error);
        appAlert('Saved on this device', "We'll sync your progress to your account next time you're online.", 'info');
      }
    },
    [user?.id],
  );

  const startPlan = (plan: ReadingPlan) => {
    commit(plan, { planId: plan.id, startedAt: new Date().toISOString(), completed: {} });
    appAlert('Plan started', `${plan.name} · day 1 is ready when you are`, 'success');
  };

  const restartPlan = (plan: ReadingPlan) => {
    commit(plan, { planId: plan.id, startedAt: new Date().toISOString(), completed: {} });
    appAlert('Starting fresh', `${plan.name} is back to day 1`, 'success');
  };

  const stopPlan = (plan: ReadingPlan) => {
    setToStop(null);
    commit(plan, null);
    appAlert('Plan stopped', plan.name, 'info');
  };

  const completeDay = async (plan: ReadingPlan, day: number) => {
    const current = progress[plan.id] ?? { planId: plan.id, startedAt: new Date().toISOString(), completed: {} };
    const next: PlanProgress = { ...current, completed: { ...current.completed, [day]: localDate() } };
    await commit(plan, next);
    return { finishedPlan: isFinished(next, plan.totalDays) };
  };

  // ── Derived ─────────────────────────────────────────────────────────
  const active = plans.filter((p) => progress[p.id] && !isFinished(progress[p.id], p.totalDays));
  const finished = plans.filter((p) => progress[p.id] && isFinished(progress[p.id], p.totalDays));
  const discover = plans.filter((p) => !progress[p.id] && (filter === 'all' || p.tags.includes(filter)));
  const { streak, doneToday } = useMemo(() => readingStreak(progress), [progress]);
  const totalDaysRead = useMemo(() => Object.values(progress).reduce((n, p) => n + completedCount(p), 0), [progress]);
  const featured = active.length === 0 && filter === 'all' ? plans.find((p) => p.id === 'bible-year' && !progress[p.id]) : undefined;

  const detailPlan = detailId ? readingPlanService.getPlanById(detailId) : null;
  const readerPlan = reader ? readingPlanService.getPlanById(reader.planId) : null;

  // ── UI ──────────────────────────────────────────────────────────────
  return (
    <Page grouped>
      <PageHeader title="Bible Plans" back={{ label: 'Resources', onClick: () => navigate('/resources') }} />

      {/* Streak */}
      {(active.length > 0 || streak > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', streak ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
              <Flame className="h-5 w-5" />
            </span>
            <p className="mt-2 font-outfit text-2xl font-extrabold text-foreground">
              {streak} <span className="text-base font-bold text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
            </p>
            <p className="text-[12.5px] text-muted-foreground">{doneToday ? 'Streak · read today ✓' : streak ? 'Streak · read today to keep it' : 'Start a streak today'}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <p className="mt-2 font-outfit text-2xl font-extrabold text-foreground">{totalDaysRead}</p>
            <p className="text-[12.5px] text-muted-foreground">{totalDaysRead === 1 ? 'Day read' : 'Days read'} across your plans</p>
          </div>
        </div>
      )}

      {/* Continue */}
      {active.length > 0 && (
        <>
          <SectionLabel>My plans</SectionLabel>
          <div className="space-y-3">
            {active.map((plan) => {
              const p = progress[plan.id];
              const day = nextDay(p, plan.totalDays);
              const reading = plan.dailyReadings.find((r) => r.day === day);
              const schedule = scheduleLabel(p, plan.totalDays);
              const pct = (100 * completedCount(p)) / plan.totalDays;
              return (
                <div key={plan.id} className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
                  <button onClick={() => setDetailId(plan.id)} className="flex w-full items-center gap-3 p-4 pb-3 text-left">
                    <PlanCover plan={plan} className="h-14 w-14 shrink-0 rounded-2xl" iconClassName="left-1/2 top-1/2 right-auto h-6 w-6 -translate-x-1/2 -translate-y-1/2" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-bold text-foreground">{plan.name}</span>
                      <span className="block text-[13px] text-muted-foreground">
                        Day {day} of {plan.totalDays} · <span className={cn('font-semibold', toneClass[schedule.tone])}>{schedule.text}</span>
                      </span>
                    </span>
                    <ProgressRing value={pct} />
                  </button>
                  <div className="px-4 pb-4">
                    {reading?.teachingTitle && <p className="mb-1.5 text-[13.5px] font-semibold text-foreground">{reading.teachingTitle}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {reading?.readings.map((r) => (
                        <span key={r} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12.5px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {r}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => setReader({ planId: plan.id, day })}
                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
                    >
                      <Play className="h-4 w-4 fill-current" /> Read day {day}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Featured, for people who haven't started anything */}
      {featured && (
        <>
          <SectionLabel>Featured</SectionLabel>
          <button onClick={() => setDetailId(featured.id)} className="block w-full overflow-hidden rounded-[24px] text-left shadow-lg shadow-blue-900/10">
            <PlanCover plan={featured} className="px-5 pb-5 pt-16" iconClassName="h-10 w-10 right-5 top-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/80">{featured.totalDays} days · ~{featured.minutesPerDay} min a day</p>
              <p className="mt-1 font-outfit text-[28px] font-extrabold leading-tight tracking-tight">{featured.name}</p>
              <p className="mt-1 max-w-sm text-[14.5px] text-white/85">{featured.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900">
                See the plan <ChevronRight className="h-4 w-4" />
              </span>
            </PlanCover>
          </button>
        </>
      )}

      {/* Discover */}
      <SectionLabel>{active.length ? 'Find another plan' : 'Find a plan'}</SectionLabel>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'h-9 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition',
              filter === f.value ? 'bg-foreground text-background' : 'bg-white text-muted-foreground shadow-sm hover:text-foreground dark:bg-slate-800',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {discover.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-muted-foreground dark:border-slate-800">
          You’ve started every plan here. Nice!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {discover.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setDetailId(plan.id)}
              className="group overflow-hidden rounded-[20px] border border-slate-200/70 bg-card text-left shadow-sm transition active:scale-[0.98] dark:border-slate-800"
            >
              <PlanCover plan={plan} className="flex aspect-[16/11] items-end p-3">
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11.5px] font-semibold text-white backdrop-blur">
                  {plan.totalDays} days
                </span>
              </PlanCover>
              <div className="p-3">
                <p className="line-clamp-2 text-[14.5px] font-bold leading-snug text-foreground">{plan.name}</p>
                <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> ~{plan.minutesPerDay} min a day
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Completed */}
      {finished.length > 0 && (
        <>
          <SectionLabel>Completed</SectionLabel>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card shadow-sm dark:divide-slate-800 dark:border-slate-800">
            {finished.map((plan) => (
              <div key={plan.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                  <Trophy className="h-5 w-5" />
                </span>
                <button onClick={() => setDetailId(plan.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{plan.name}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{plan.reward}</span>
                </button>
                <button
                  onClick={() => restartPlan(plan)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-semibold text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Again
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <PlanDetailSheet
        plan={detailPlan}
        progress={detailPlan ? progress[detailPlan.id] : undefined}
        open={!!detailPlan && !reader}
        onOpenChange={(open) => !open && setDetailId(null)}
        onStart={startPlan}
        onOpenDay={(plan, day) => setReader({ planId: plan.id, day })}
        onRestart={restartPlan}
        onStop={setToStop}
      />

      {readerPlan && reader && (
        <PlanDayReader
          plan={readerPlan}
          day={reader.day}
          version={preferences.preferredTranslation}
          isDone={progress[readerPlan.id]?.completed[reader.day] !== undefined}
          streak={readingStreak(progress).streak}
          onComplete={(day) => completeDay(readerPlan, day)}
          onOpenDay={(day) => setReader({ planId: readerPlan.id, day })}
          onClose={() => setReader(null)}
        />
      )}

      <AlertDialog open={!!toStop} onOpenChange={(o) => !o && setToStop(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Stop {toStop?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Your progress on this plan will be cleared. You can start it again any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep reading</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-red-600 hover:bg-red-700" onClick={() => toStop && stopPlan(toStop)}>
              Stop plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
};

export default BibleReadingPlansPage;
