import { SocialService, type Person } from '@/services/socialService';
import { dueLabel } from './brain';
import type { Todo } from './types';

/**
 * Accountability: a friend keeps you to it. People who tell someone what they'll do, and
 * by when, follow through far more often. The friend gets a message in your one-to-one
 * chat (end-to-end encrypted like any message) when you commit, and another when you tick
 * it done. Nothing else about your list is shared: they never see your tasks.
 */

/** Your friends (the phone's copy first; then the account's) */
export function savedFriends(): Person[] {
  return SocialService.savedCircle()?.friends.map((f) => f.person) ?? [];
}

export async function loadFriends(): Promise<Person[]> {
  try {
    return (await SocialService.circle()).friends.map((f) => f.person);
  } catch {
    return savedFriends();
  }
}

async function send(personId: string, text: string): Promise<boolean> {
  try {
    const chat = await SocialService.chatWith(personId);
    // Loaded only when it's needed (the chat code is large)
    const { GroupChatService } = await import('@/services/groupChatService');
    const sent = await GroupChatService.sendMessage(chat.id, text);
    return !!sent;
  } catch (e) {
    console.warn('[todo] message to friend failed', e);
    return false;
  }
}

export function commitMessage(t: Todo): string {
  const due = t.due_at ? dueLabel({ ...t, status: 'open' }, new Date())?.replace(/^Due /, '') : null;
  return `🙏 I’m committing to: *${t.title.trim()}*${due ? ` by ${due}` : ''}. Will you check on me?`;
}

export function doneMessage(t: Todo): string {
  return `✅ Done: *${t.title.trim()}*. Thanks for keeping me going! 🙌`;
}

export const tellCommit = (personId: string, t: Todo) => send(personId, commitMessage(t));
export const tellDone = (personId: string, t: Todo) => send(personId, doneMessage(t));
