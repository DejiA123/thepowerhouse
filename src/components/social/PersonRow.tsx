import type { ReactNode } from 'react';
import UserAvatar from '@/components/common/UserAvatar';
import type { Person } from '@/services/socialService';

/**
 * One person in a Social Circle list: photo, name, a line about them, and
 * actions beside the name (or, with `below`, on their own line underneath).
 */
export const PersonRow = ({ person, subtitle, children, below }: { person: Person; subtitle?: ReactNode; children?: ReactNode; below?: ReactNode }) => (
    <div className="px-4 py-3">
        <div className="flex items-center gap-3">
            <UserAvatar name={person.name} src={person.avatar} seed={person.id} className="h-12 w-12 text-base" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[15.5px] font-semibold leading-tight text-foreground">{person.name}</p>
                {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{subtitle}</p>}
            </div>
            {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
        </div>
        {below && <div className="mt-2.5 flex gap-2 pl-[60px]">{below}</div>}
    </div>
);

/** A rounded card holding a list of people. */
export const PeopleCard = ({ children }: { children: ReactNode }) => (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
        {children}
    </div>
);

export const SectionLabel = ({ children }: { children: ReactNode }) => (
    <p className="mb-2 mt-1 px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{children}</p>
);

/** Friendly empty state with an optional action. */
export const EmptyState = ({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) => (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-800">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">{icon}</div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const monthYear = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
