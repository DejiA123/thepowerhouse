import { BookOpen, Cross, Flame, Globe, Heart, Lightbulb, Music, Scroll, Sprout, Sun, Wind, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadingPlan } from '@/services/readingPlanService';

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  cross: Cross,
  heart: Heart,
  sun: Sun,
  sprout: Sprout,
  music: Music,
  lightbulb: Lightbulb,
  wind: Wind,
  scroll: Scroll,
  flame: Flame,
};

export const planIcon = (plan: ReadingPlan): LucideIcon => ICONS[plan.cover.icon] ?? BookOpen;

/** Gradient artwork for a plan, from a small square to a full-width banner. */
export const PlanCover = ({
  plan,
  className,
  iconClassName,
  children,
}: {
  plan: ReadingPlan;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}) => {
  const Icon = planIcon(plan);
  return (
    <div className={cn('relative isolate overflow-hidden bg-gradient-to-br text-white', plan.cover.gradient, className)}>
      {/* soft light shapes */}
      <span className="absolute -right-6 -top-8 -z-10 h-28 w-28 rounded-full bg-white/15" />
      <span className="absolute -bottom-10 -left-4 -z-10 h-24 w-24 rounded-full bg-black/10" />
      <Icon className={cn('absolute right-3 top-3 h-7 w-7 text-white/90 drop-shadow-sm', iconClassName)} strokeWidth={1.75} />
      {children}
    </div>
  );
};

/** Small circular progress indicator */
export const ProgressRing = ({ value, size = 44, className }: { value: number; size?: number; className?: string }) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="fill-none stroke-blue-600 transition-[stroke-dashoffset] duration-700 dark:stroke-blue-400"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">{Math.round(pct)}%</span>
    </div>
  );
};
