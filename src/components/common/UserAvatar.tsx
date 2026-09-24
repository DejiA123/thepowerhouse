import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const PALETTE = [
  'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-fuchsia-600', 'bg-rose-600',
  'bg-orange-600', 'bg-amber-600', 'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600',
];

const TEXT_PALETTE = [
  'text-blue-600 dark:text-blue-400', 'text-indigo-600 dark:text-indigo-400', 'text-violet-600 dark:text-violet-400',
  'text-fuchsia-600 dark:text-fuchsia-400', 'text-rose-600 dark:text-rose-400', 'text-orange-600 dark:text-orange-400',
  'text-amber-700 dark:text-amber-400', 'text-emerald-700 dark:text-emerald-400', 'text-teal-700 dark:text-teal-400',
  'text-cyan-700 dark:text-cyan-400',
];

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Stable colour per person, so names are easy to tell apart in group chats. */
export const nameColor = (seed: string) => TEXT_PALETTE[hash(seed || '?') % TEXT_PALETTE.length];

export const initials = (name?: string | null) => {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

interface Props {
  name?: string | null;
  src?: string | null;
  seed?: string;
  className?: string;
  online?: boolean;
}

const UserAvatar = ({ name, src, seed, className, online }: Props) => {
  const [failed, setFailed] = useState(false);
  const color = PALETTE[hash(seed || name || '?') % PALETTE.length];

  return (
    <div className={cn('relative shrink-0', className ?? 'h-10 w-10')}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full select-none items-center justify-center rounded-full font-semibold text-white',
            color,
          )}
          style={{ containerType: 'inline-size' } as CSSProperties}
        >
          {/* Scales with the avatar size (text-sm where container units are unsupported) */}
          <span className="text-sm leading-none" style={{ fontSize: '38cqw' }}>{initials(name)}</span>
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </div>
  );
};

export default UserAvatar;
