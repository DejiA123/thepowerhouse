import { supabase } from '@/integrations/supabase/client';

export const IMAGE_PREFIX = '::image::';

/** Messages carrying a photo are stored as "::image::<url>\n<optional caption>". */
export function parseMessageContent(content: string): { imageUrl: string | null; text: string } {
  if (content.startsWith(IMAGE_PREFIX)) {
    const [first, ...rest] = content.split('\n');
    return { imageUrl: first.slice(IMAGE_PREFIX.length).trim(), text: rest.join('\n').trim() };
  }
  return { imageUrl: null, text: content };
}

export const previewText = (content: string) => {
  const { imageUrl, text } = parseMessageContent(content || '');
  if (imageUrl) return text ? `📷 ${text}` : '📷 Photo';
  return text.replace(/\s+/g, ' ').trim();
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const formatClock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** "Today", "Yesterday", "Monday", "3 March 2025" */
export function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  const diffDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** Compact time for the chat list: 14:05 · Yesterday · Mon · 03/03/25 */
export function formatListTime(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return formatClock(iso);
  if (sameDay(date, yesterday)) return 'Yesterday';
  if ((now.getTime() - date.getTime()) / 86_400_000 < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const dayKey = (iso: string) => new Date(iso).toDateString();

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,12}$/u;
export const isEmojiOnly = (text: string) => {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 16 && EMOJI_ONLY.test(trimmed) && !/^\d+$/.test(trimmed);
};

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]])/g;

/** Split text into plain strings and links for safe rendering (no innerHTML). */
export function linkify(text: string): Array<{ type: 'text' | 'link'; value: string }> {
  const parts: Array<{ type: 'text' | 'link'; value: string }> = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: 'text', value: text.slice(last, index) });
    parts.push({ type: 'link', value: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

/** Downscale a photo before upload so it sends fast on mobile data. */
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob && blob.size < file.size ? blob : file;
}

/** Uploads to the public avatars bucket under the user's own folder (allowed by storage policy). */
export async function uploadChatImage(userId: string, file: File, folder: 'chat' | 'groups' = 'chat'): Promise<string> {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : 'jpg';
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
