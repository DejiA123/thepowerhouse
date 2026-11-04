import { cn } from '@/lib/utils';

/**
 * The red count on an icon's top-right corner, like WhatsApp's unread chats
 * (99+ past 99). Nothing when the count is 0.
 */
const CountBadge = ({ count, className, label = 'unread' }: { count: number; className?: string; label?: string }) =>
  count > 0 ? (
    <span
      className={cn(
        'pointer-events-none absolute -right-1.5 -top-1.5 z-10 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-[5px] text-[11.5px] font-bold leading-none text-white shadow-sm ring-2 ring-white tabular-nums animate-in zoom-in-50 duration-200 dark:ring-slate-900',
        className,
      )}
      aria-label={`${count} ${label}`}
      data-testid="count-badge"
    >
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

export default CountBadge;
