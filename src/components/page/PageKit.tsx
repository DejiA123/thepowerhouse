import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for the app's pages so every screen feels the same:
 * a large title, iOS-style segmented tabs, section labels and grouped lists.
 */

export const Page = ({
  children,
  grouped,
  wide,
  className,
}: {
  children: ReactNode;
  /** Soft grey background so white list groups stand out (Settings, Resources). */
  grouped?: boolean;
  /** Allow a wider column on desktop for card-heavy pages. */
  wide?: boolean;
  className?: string;
}) => (
  <div className={cn('min-h-full pb-28', grouped ? 'bg-slate-100/80 dark:bg-slate-950' : 'bg-background', className)}>
    <div className={cn('mx-auto w-full px-4 pt-4', wide ? 'max-w-5xl' : 'max-w-2xl')}>{children}</div>
  </div>
);

export const PageHeader = ({
  title,
  eyebrow,
  action,
  back,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  back?: { label: string; onClick: () => void };
}) => (
  <header className="mb-4">
    {back && (
      <button
        type="button"
        onClick={back.onClick}
        className="-ml-1.5 mb-1 inline-flex items-center text-[15px] font-medium text-blue-600 active:opacity-60 dark:text-blue-400"
      >
        <ChevronLeft className="h-5 w-5" />
        {back.label}
      </button>
    )}
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="text-sm font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className="truncate font-outfit text-[32px] font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  </header>
);

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('mb-4 flex rounded-[14px] bg-slate-200/70 p-[3px] dark:bg-slate-800/80', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-[11px] px-2 py-[7px] text-[13.5px] font-semibold transition-all',
              on ? 'bg-white text-foreground shadow-sm dark:bg-slate-700' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {!!o.count && (
              <span className="min-w-[18px] rounded-full bg-blue-600 px-1.5 text-[11px] leading-[18px] text-white">{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SectionLabel = ({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) => (
  <div className={cn('mb-2 mt-6 flex items-baseline justify-between gap-3 px-1', className)}>
    <h2 className="text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{children}</h2>
    {action}
  </div>
);

export const SectionLink = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="text-[13.5px] font-semibold text-blue-600 active:opacity-60 dark:text-blue-400">
    {children}
  </button>
);

export const ListGroup = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'divide-y divide-slate-100 overflow-hidden rounded-[20px] border border-slate-200/70 bg-card shadow-sm dark:divide-slate-800 dark:border-slate-800',
      className,
    )}
  >
    {children}
  </div>
);

export const IconBadge = ({ icon: Icon, className }: { icon: LucideIcon; className?: string }) => (
  <span
    className={cn(
      'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
      className,
    )}
  >
    <Icon className="h-[18px] w-[18px]" />
  </span>
);

export interface ListRowProps {
  icon?: LucideIcon;
  iconClassName?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  className?: string;
}

export const ListRow = ({
  icon,
  iconClassName,
  leading,
  title,
  subtitle,
  value,
  trailing,
  chevron,
  onClick,
  href,
  destructive,
  className,
}: ListRowProps) => {
  const interactive = !!(onClick || href);
  const showChevron = chevron ?? (interactive && !trailing);
  const body = (
    <>
      {leading ?? (icon && <IconBadge icon={icon} className={iconClassName} />)}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[15px] font-semibold', destructive ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
          {title}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{subtitle}</span>}
      </span>
      {value != null && value !== '' && <span className="shrink-0 text-sm text-muted-foreground">{value}</span>}
      {trailing}
      {showChevron && <ChevronRight className="-mr-1 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />}
    </>
  );
  const cls = cn(
    'flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left',
    interactive && 'transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60 dark:active:bg-slate-800',
    className,
  );
  if (href) {
    const external = /^https?:/.test(href);
    return (
      <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
};

/** Small pill used for counts and states ("New", "Pinned", "Praise report"). */
export const Pill = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      className,
    )}
  >
    {children}
  </span>
);

export const EmptyState = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center rounded-[20px] border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
      <Icon className="h-6 w-6" />
    </span>
    <p className="font-semibold text-foreground">{title}</p>
    {children && <div className="mt-1 max-w-xs text-sm text-muted-foreground">{children}</div>}
  </div>
);
