import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, Loader2, Lock, MessageCircle, Music, Phone, Users } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import SetupCheck from '@/components/onboarding/SetupCheck';
import { useAuth } from '@/contexts/AuthContext';
import { appAlert } from '@/lib/appAlert';
import { church } from '@/config/church';

/** "the Power House app" (not "the The Power House app") */
const appName = church.name.replace(/^the\s+/i, '');
import { GroupChatService } from '@/services/groupChatService';

type Preview = Awaited<ReturnType<typeof GroupChatService.invitePreview>>;

const PENDING_KEY = 'pending_chat_invite';

/** An invite link the person opened before signing in: joined as soon as they're signed in */
export const pendingInvite = () => {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
};
export const clearPendingInvite = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* private window */
  }
};

/**
 * /join/<code>: a group's invite link, like WhatsApp's. Shows the group (name,
 * picture, how many are in it) before anything else; one tap joins once signed
 * in (Google or email, and it comes straight back here). Then "You're nearly set
 * up": Home Screen and notifications, so it works like WhatsApp from day one.
 */
const JoinChatPage = () => {
  const { code = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    GroupChatService.invitePreview(code)
      .then((p) => !stale && setPreview(p))
      .catch(() => !stale && setPreview(null));
    return () => {
      stale = true;
    };
  }, [code, user]);

  const join = async () => {
    setJoining(true);
    try {
      const chatId = await GroupChatService.joinByInvite(code);
      clearPendingInvite();
      setJoined(chatId);
    } catch (e) {
      appAlert("Couldn't join", (e as Error).message, 'error');
    } finally {
      setJoining(false);
    }
  };

  // Came back from signing in: join straight away (they already tapped Join)
  useEffect(() => {
    if (!user || !preview || joined || joining) return;
    if (pendingInvite() === code && !preview.is_member) void join();
    else if (pendingInvite() === code) clearPendingInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, preview]);

  const signInToJoin = () => {
    try {
      localStorage.setItem(PENDING_KEY, code);
    } catch {
      /* private window: they tap Join again after */
    }
    navigate(`/auth?next=${encodeURIComponent(`/join/${code}`)}`);
  };

  const openChat = (chatId: string) => navigate(`/group-chats?chat=${chatId}`, { replace: true });

  if (preview === undefined || authLoading) {
    return <div className="flex min-h-[70dvh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  if (preview === null) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users className="h-7 w-7" /></span>
        <h1 className="mt-4 text-xl font-bold text-foreground">This invite link doesn’t work any more</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may have been reset. Ask the group’s admin for a new link.</p>
      </div>
    );
  }

  // Joined: what to do next, so messages reach them like WhatsApp's
  if (joined || (preview.is_member && user)) {
    const chatId = joined ?? preview.chat_id;
    return (
      <div className="mx-auto max-w-md px-4 pb-10 pt-6">
        <div className="flex flex-col items-center text-center">
          <UserAvatar name={preview.name} src={preview.avatar_url} seed={preview.chat_id} className="h-20 w-20 text-2xl" />
          <h1 className="mt-3 text-2xl font-bold text-foreground">{joined ? 'You’re in! 🎉' : 'You’re already in'}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">{preview.name}</p>
        </div>
        <SetupCheck groupName={preview.name} always className="mt-5" />
        <button onClick={() => openChat(chatId)} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[17px] font-semibold text-white shadow-lg shadow-blue-600/25 active:scale-[0.98]">
          <MessageCircle className="h-5 w-5" /> Open the chat
        </button>
      </div>
    );
  }

  const perks = [
    { icon: MessageCircle, text: 'Chat, voice notes, photos, like WhatsApp' },
    { icon: Phone, text: 'Free voice and video calls' },
    { icon: Music, text: 'Songs, lyrics and the setlist in one place' },
    { icon: Bell, text: 'Notifications that show the message' },
    { icon: Lock, text: 'End-to-end encrypted' },
  ];

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="flex flex-col items-center text-center">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-blue-600">You’re invited</p>
        <UserAvatar name={preview.name} src={preview.avatar_url} seed={preview.chat_id} className="mt-3 h-24 w-24 text-3xl" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">{preview.name}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Group · {preview.members} {preview.members === 1 ? 'member' : 'members'} · on the {appName} app
        </p>
        {preview.description && preview.description !== 'Private chat' && (
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{preview.description}</p>
        )}
      </div>

      <button
        onClick={user ? join : signInToJoin}
        disabled={joining}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[17px] font-semibold text-white shadow-lg shadow-blue-600/25 active:scale-[0.98] disabled:opacity-70"
      >
        {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
        {user ? `Join ${preview.name}` : 'Join with Google or email'}
      </button>
      {!user && <p className="mt-2 text-center text-[13px] text-muted-foreground">Free · one tap with Google · you come straight back here</p>}

      <ul className="mt-6 space-y-2.5 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border/60">
        {perks.map((p) => (
          <li key={p.text} className="flex items-center gap-3 text-[14.5px] text-foreground">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"><p.icon className="h-4 w-4" /></span>
            {p.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default JoinChatPage;
