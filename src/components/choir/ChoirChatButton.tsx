import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import CountBadge from '@/components/common/CountBadge';
import { useChoirChats } from '@/lib/choirChats';
import ChoirChatSheet from './ChoirChatSheet';

/**
 * "Chat" in the choir page's header, on every part of the choir (home, Songs, Band,
 * Lessons, singing): one tap opens the choir's group chat, with its unread count.
 * Several chats, or one I'm not in yet (join / ask to join), open a sheet instead.
 * Shows nothing when no chat is linked to the choir (chat info → Choir).
 */
const ChoirChatButton = ({ locationId, className }: { locationId?: string; className?: string }) => {
  const navigate = useNavigate();
  // The page's one live copy (the home card shares it)
  const { chats } = useChoirChats(locationId, { live: true });
  const [open, setOpen] = useState(false);
  if (!locationId || !chats.length) return null;

  const direct = chats.length === 1 && chats[0].is_member ? chats[0] : null;
  const unread = chats.reduce((n, c) => n + (c.is_member ? c.unread : 0), 0);
  const asked = !chats.some((c) => c.is_member) && chats.some((c) => c.asked_at);

  return (
    <>
      <button
        type="button"
        onClick={() => (direct ? navigate(`/group-chats?chat=${direct.id}`) : setOpen(true))}
        className={cn(
          'relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition hover:bg-white active:scale-95 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-800',
          className,
        )}
        aria-label={direct ? `Open ${direct.name}${unread ? `, ${unread} unread` : ''}` : 'The choir’s chat'}
        title={direct ? `Open ${direct.name}` : 'The choir’s chat'}
        data-testid="choir-chat-button"
      >
        <MessageCircle className="h-4 w-4" />
        {asked ? 'Asked' : 'Chat'}
        <CountBadge count={unread} />
      </button>
      {/* Stays mounted, so a request answered while it's open turns into "Open chat" in place */}
      <ChoirChatSheet open={open} onOpenChange={setOpen} location={locationId} chats={chats} />
    </>
  );
};

export default ChoirChatButton;
