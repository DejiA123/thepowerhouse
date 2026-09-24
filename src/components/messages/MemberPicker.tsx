import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';
import { GroupChatService } from '@/services/groupChatService';
import { SocialService } from '@/services/socialService';

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
}

/** Choose people from friends or by searching everyone in the church app. */
const MemberPicker = ({ userId, selected, onChange, excludeIds = [] }: Props) => {
  const [friends, setFriends] = useState<PickablePerson[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickablePerson[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    SocialService.getFriends(userId)
      .then((rows) => setFriends(rows.map((r: any) => r.friend).filter(Boolean)))
      .catch(() => setFriends([]));
  }, [userId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await GroupChatService.searchUsers(q);
        setResults(found.filter((p) => p.id !== userId));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, userId]);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  const list = query.trim().length >= 2 ? results : friends;

  const toggle = (person: PickablePerson) => {
    if (excluded.has(person.id)) return;
    onChange(selectedIds.has(person.id) ? selected.filter((p) => p.id !== person.id) : [...selected, person]);
  };

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
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name or email"
          className="h-11 rounded-xl pl-10"
        />
        {searching && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {query.trim().length >= 2 ? 'Search results' : 'Your friends'}
      </p>

      <div className="-mx-1 max-h-[42vh] min-h-[120px] overflow-y-auto px-1">
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {query.trim().length >= 2
              ? searching ? 'Searching…' : 'No one found'
              : 'Search to find people in the church app'}
          </p>
        ) : (
          list.map((person) => {
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
                  {person.email && person.full_name && <p className="truncate text-xs text-muted-foreground">{person.email}</p>}
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
          })
        )}
      </div>
    </div>
  );
};

export default MemberPicker;
