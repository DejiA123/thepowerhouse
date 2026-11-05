import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { SocialService, type Person } from '@/services/socialService';

export interface PickablePerson {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

interface Props {
  userId: string;
  selected: PickablePerson[];
  onChange: (people: PickablePerson[]) => void;
  /** People who are already members (shown as added, not selectable) */
  excludeIds?: string[];
  /** The list grows with the page instead of scrolling in its own box (full-screen use) */
  fill?: boolean;
}

const pickable = (p: Person): PickablePerson => ({ id: p.id, full_name: p.name, avatar_url: p.avatar });

/** Choose people from friends or by searching everyone in the church app. */
const MemberPicker = ({ userId, selected, onChange, excludeIds = [], fill = false }: Props) => {
  const [friends, setFriends] = useState<PickablePerson[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickablePerson[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const saved = SocialService.savedCircle();
    if (saved) setFriends(saved.friends.map((f) => pickable(f.person)));
    SocialService.circle()
      .then((circle) => setFriends(circle.friends.map((f) => pickable(f.person))))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const page = await SocialService.discover(q);
        if (!cancelled) setResults(page.people.map((p) => pickable(p.person)).filter((p) => p.id !== userId));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, userId]);

  // Everyone in the church app (not just friends), a page at a time, A–Z
  const [everyone, setEveryone] = useState<PickablePerson[]>([]);
  const [more, setMore] = useState<{ offset: number; has: boolean }>({ offset: 0, has: false });
  const [loadingEveryone, setLoadingEveryone] = useState(true);
  const loadEveryone = async (offset: number) => {
    setLoadingEveryone(true);
    try {
      const page = await SocialService.discover('', offset);
      const people = page.people.map((p) => pickable(p.person)).filter((p) => p.id !== userId);
      setEveryone((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...people.filter((p) => !seen.has(p.id))];
      });
      setMore({ offset: page.nextOffset, has: page.hasMore });
    } catch {
      setMore((m) => ({ ...m, has: false }));
    } finally {
      setLoadingEveryone(false);
    }
  };
  useEffect(() => {
    setEveryone([]);
    void loadEveryone(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const searchingNow = query.trim().length >= 2;
  // Friends first in search results too
  const searchList = useMemo(
    () => [...results].sort((a, b) => Number(friendIds.has(b.id)) - Number(friendIds.has(a.id))),
    [results, friendIds],
  );
  const others = useMemo(() => everyone.filter((p) => !friendIds.has(p.id)), [everyone, friendIds]);

  const toggle = (person: PickablePerson) => {
    if (excluded.has(person.id)) return;
    onChange(selectedIds.has(person.id) ? selected.filter((p) => p.id !== person.id) : [...selected, person]);
  };

  const row = (person: PickablePerson, label?: string) => {
    const isMember = excluded.has(person.id);
    const isSelected = selectedIds.has(person.id);
    return (
      <button
        key={person.id}
        onClick={() => toggle(person)}
        disabled={isMember}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition',
          isMember ? 'opacity-60' : 'hover:bg-muted active:bg-muted',
        )}
      >
        <UserAvatar name={person.full_name} src={person.avatar_url} seed={person.id} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{person.full_name || person.email}</p>
          {label && <p className="truncate text-xs text-muted-foreground">{label}</p>}
        </div>
        {isMember ? (
          <span className="text-xs text-muted-foreground">Member</span>
        ) : (
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2 transition',
              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-muted-foreground/30',
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" />}
          </span>
        )}
      </button>
    );
  };

  const heading = (text: string) => (
    <p className="px-1 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pt-0">{text}</p>
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className="flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-1 pr-2 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              <UserAvatar name={p.full_name} src={p.avatar_url} seed={p.id} className="h-6 w-6" />
              <span className="max-w-[120px] truncate">{p.full_name || p.email}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search everyone by name"
          className="h-11 rounded-xl pl-10"
        />
        {searching && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      <div className={cn('-mx-1 min-h-[120px] px-1', !fill && 'max-h-[42vh] overflow-y-auto')} data-testid="member-picker-list">
        {searchingNow ? (
          <>
            {heading('Search results')}
            {searchList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{searching ? 'Searching…' : 'No one found'}</p>
            ) : (
              searchList.map((p) => row(p, friendIds.has(p.id) ? 'Friend' : undefined))
            )}
          </>
        ) : (
          <>
            {friends.length > 0 && (
              <>
                {heading('Your friends')}
                {friends.map((p) => row(p))}
              </>
            )}
            {heading('Everyone on the app')}
            {others.map((p) => row(p))}
            {loadingEveryone ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : more.has ? (
              <button onClick={() => loadEveryone(more.offset)} className="my-2 w-full rounded-xl py-2.5 text-[14px] font-semibold text-blue-600 hover:bg-muted dark:text-blue-400">
                Show more people
              </button>
            ) : others.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No one else on the app yet</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default MemberPicker;
