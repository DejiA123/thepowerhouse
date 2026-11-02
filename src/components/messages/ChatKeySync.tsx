import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uniqueTopic } from '@/lib/realtime';
import { KEYS_ARRIVED, e2eReady, keysArrived, myDevice, shareAllKeys } from '@/lib/chatCrypto';

/**
 * Keeps end-to-end encryption working in the background, while the app is open:
 * - registers this phone (its public key) the first time;
 * - sends the chat keys this phone holds to members' devices that don't have
 *   them yet (a new phone, the Home Screen app, a new member): on start, when
 *   the app comes back on screen, and when someone adds a device;
 * - hears when keys are sent to this phone, so waiting messages open.
 */
const ChatKeySync = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let alive = true;
    let last = 0;
    let soon: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const share = (force = false) => {
      if (!force && Date.now() - last < 2 * 60_000) return;
      last = Date.now();
      shareAllKeys(user.id).catch(() => undefined);
    };
    const onVisible = () => document.visibilityState === 'visible' && share();

    const start = setTimeout(async () => {
      if (!(await e2eReady()) || !alive) return;
      const device = await myDevice(user.id).catch(() => null);
      if (!device || !alive) return;
      share(true);
      channel = supabase
        .channel(uniqueTopic(`chat-keys:${device.id}`))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_keys', filter: `device_id=eq.${device.id}` }, ({ new: row }) => {
          const chatId = (row as { chat_id?: string }).chat_id;
          if (!chatId) return;
          keysArrived(chatId);
          window.dispatchEvent(new CustomEvent(KEYS_ARRIVED, { detail: { chatId } }));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_devices' }, ({ new: row }) => {
          if ((row as { id?: string }).id === device.id) return;
          // Someone set up a new phone: send it the keys it needs (after a moment, in case several come at once)
          clearTimeout(soon);
          soon = setTimeout(() => share(true), 2500);
        })
        .subscribe();
      document.addEventListener('visibilitychange', onVisible);
    }, 2500);

    return () => {
      alive = false;
      clearTimeout(start);
      clearTimeout(soon);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};

export default ChatKeySync;
