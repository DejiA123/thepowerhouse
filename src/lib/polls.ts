import { supabase } from '@/integrations/supabase/client';
import { broadcast } from '@/lib/realtime';
import { signalsTopic } from '@/services/groupChatService';

/**
 * Polls in chats, like WhatsApp. The question and options travel inside the
 * (encrypted) message ("::poll::…", chatUtils `encodePoll`); the server only
 * keeps who picked which option number (`chat_poll_votes`, members only).
 */
export interface PollVote {
  message_id: string;
  user_id: string;
  option_index: number;
  /** When it was cast (votes made on this phone just now have none yet) */
  created_at?: string;
}

const table = () => supabase.from('chat_poll_votes' as never);

/** Every vote in a chat (polls are few; one small query) */
export async function getPollVotes(chatId: string): Promise<PollVote[]> {
  const { data, error } = await table().select('message_id, user_id, option_index, created_at').eq('chat_id', chatId).limit(5000);
  if (error) throw error;
  return (data as PollVote[] | null) ?? [];
}

/** My votes on a poll after tapping an option (single choice: tapping it again takes the vote back) */
export function nextVotes(mine: number[], option: number, multi: boolean): number[] {
  if (mine.includes(option)) return mine.filter((o) => o !== option);
  return multi ? [...mine, option].sort((a, b) => a - b) : [option];
}

/** Save my votes on a poll (the others see them at once) */
export async function setMyVotes(chatId: string, messageId: string, userId: string, before: number[], after: number[]) {
  const drop = before.filter((o) => !after.includes(o));
  const add = after.filter((o) => !before.includes(o));
  if (drop.length) {
    const { error } = await table().delete().eq('message_id', messageId).eq('user_id', userId).in('option_index', drop);
    if (error) throw error;
  }
  if (add.length) {
    const { error } = await table().upsert(
      add.map((option_index) => ({ message_id: messageId, chat_id: chatId, user_id: userId, option_index })) as never,
      { onConflict: 'message_id,user_id,option_index', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  broadcast(signalsTopic(chatId), 'signal', { type: 'poll', from: userId, payload: { messageId } }).catch(() => undefined);
}

/** Votes grouped by poll */
export function votesByPoll(votes: PollVote[]): Record<string, PollVote[]> {
  const out: Record<string, PollVote[]> = {};
  for (const v of votes) (out[v.message_id] ||= []).push(v);
  return out;
}

/** Ready-made polls (the choir's rehearsal one first) */
export const POLL_TEMPLATES: { label: string; question: string; options: string[]; multi?: boolean }[] = [
  { label: 'Rehearsal', question: 'Who’s coming to rehearsal on Saturday?', options: ['Yes, I’ll be there 🙌', 'No, I can’t make it', 'Maybe / running late'] },
  { label: 'Sunday', question: 'Who’s singing on Sunday?', options: ['I’m in 🎤', 'Not this Sunday'] },
  { label: 'Pick a time', question: 'Which time works for you?', options: ['Friday 7pm', 'Saturday 10am', 'Saturday 2pm'], multi: true },
];
