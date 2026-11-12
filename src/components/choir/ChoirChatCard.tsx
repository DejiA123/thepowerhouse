import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Globe, Lock, MessageCircle, UserPlus } from 'lucide-react';
import { formatListTime } from '@/components/messages/chatUtils';
import UserAvatar from '@/components/common/UserAvatar';
import { chatFacts, useChoirChats, type ChoirChat } from '@/lib/choirChats';
import ChoirChatSheet from './ChoirChatSheet';

/**
 * On a choir's front page: the group chat(s) linked to that choir (chat info → Choir).
 * A chat I'm in opens in one tap, with the latest message and the unread count like the
 * chat list; one I'm not in says Join / Ask to join / Asked and opens the choir chat
 * sheet. The header's Chat button keeps the shared copy live.
 */
const ChoirChatCard = ({ locationId }: { locationId?: string }) => {
  const navigate = useNavigate();
  const { chats, signedIn } = useChoirChats(locationId);
  const [sheet, setSheet] = useState(false);

  if (!locationId || !chats.length) return null;

  const action = (c: ChoirChat) => (!signedIn ? 'Join' : c.asked_at ? 'Asked to join' : c.is_private ? 'Ask to join' : 'Join');

  return (
    <div className="mb-6 space-y-2.5" data-testid="choir-chat-card">
      {chats.map((c) => {
        const unread = c.is_member && c.unread > 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => (c.is_member ? navigate(`/group-chats?chat=${c.id}`) : setSheet(true))}
            className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200/70 bg-card p-3.5 text-left shadow-sm transition active:scale-[0.99] dark:border-slate-800"
          >
            <span className="relative shrink-0">
              <UserAvatar name={c.name} src={c.avatar_url} seed={c.id} className="h-12 w-12" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card">
                <MessageCircle className="h-3 w-3" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-emerald-600 dark:text-emerald-400">Choir chat</span>
                {c.is_member && c.last && <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">{formatListTime(c.last.at)}</span>}
              </span>
              <span className="block truncate text-[16px] font-semibold text-foreground">{c.name}</span>
              {c.is_member ? (
                <span className={`block truncate text-[13.5px] ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {c.last ? `${c.last.who ? `${c.last.who}: ` : ''}${c.last.text}` : 'Open the chat'}
                </span>
              ) : (
                <span className="flex items-center gap-1 truncate text-[13.5px] text-muted-foreground">
                  {c.is_private ? <Lock className="h-3.5 w-3.5 shrink-0" aria-label="Private group" /> : <Globe className="h-3.5 w-3.5 shrink-0" aria-label="Community group" />}
                  <span className="truncate">{c.members !== null ? `${c.members} ${c.members === 1 ? 'member' : 'members'}` : chatFacts(c)}</span>
                </span>
              )}
            </span>
            {c.is_member ? (
              unread || c.marked_unread ? (
                <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[12px] font-bold text-white tabular-nums" aria-label={`${c.unread || 1} unread`}>
                  {c.unread && !c.marked_unread ? (c.unread > 99 ? '99+' : c.unread) : ''}
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                  c.asked_at ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-blue-600 text-white'
                }`}
              >
                {!c.asked_at && signedIn && c.is_private && <UserPlus className="h-3.5 w-3.5" />}
                {action(c)}
              </span>
            )}
          </button>
        );
      })}
      <ChoirChatSheet open={sheet} onOpenChange={setSheet} location={locationId} chats={chats} />
    </div>
  );
};

export default ChoirChatCard;
