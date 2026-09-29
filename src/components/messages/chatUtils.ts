import { supabase } from '@/integrations/supabase/client';

/** A chat between two friends (made from Social Circle), named "A & B". */
export const isPrivateChat = (chat: { description?: string | null }) => chat.description === 'Private chat';

/** What to call a chat: for a private chat, the other person's name. */
export function chatTitle(chat: { name: string; description?: string | null }, myName?: string) {
  if (!isPrivateChat(chat) || !chat.name.includes(' & ')) return chat.name;
  const [a, b] = chat.name.split(' & ');
  const mine = (myName || '').trim().toLowerCase();
  const first = mine.split(/\s+/)[0];
  if (a.trim().toLowerCase() === mine || (first && a.trim().toLowerCase().split(/\s+/)[0] === first)) return b.trim();
  if (b.trim().toLowerCase() === mine || (first && b.trim().toLowerCase().split(/\s+/)[0] === first)) return a.trim();
  return chat.name;
}

export const IMAGE_PREFIX = '::image::';
export const VIDEO_PREFIX = '::video::';

export const isGifUrl = (url: string) => /\.gif(?:$|[?#])/i.test(url);

/** A message that is just a link to a GIF (e.g. copied from Giphy or Tenor) shows the GIF itself. */
const GIF_LINK = /^https:\/\/\S+\.gif(?:\?\S*)?$/i;

/**
 * Photos, GIFs and videos are stored as "::image::<url>" or "::video::<url>",
 * then an optional caption on the following lines.
 */
export function parseMessageContent(content: string): { imageUrl: string | null; videoUrl: string | null; text: string } {
  for (const [prefix, kind] of [[IMAGE_PREFIX, 'image'], [VIDEO_PREFIX, 'video']] as const) {
    if (content.startsWith(prefix)) {
      const [first, ...rest] = content.split('\n');
      const url = first.slice(prefix.length).trim();
      return { imageUrl: kind === 'image' ? url : null, videoUrl: kind === 'video' ? url : null, text: rest.join('\n').trim() };
    }
  }
  const trimmed = content.trim();
  if (GIF_LINK.test(trimmed)) return { imageUrl: trimmed, videoUrl: null, text: '' };
  return { imageUrl: null, videoUrl: null, text: content };
}

export const previewText = (content: string) => {
  const { imageUrl, videoUrl, text } = parseMessageContent(content || '');
  const label = videoUrl ? '🎥 Video' : imageUrl ? (isGifUrl(imageUrl) ? '🎞️ GIF' : '📷 Photo') : null;
  if (label) return text ? `${label.split(' ')[0]} ${text}` : label;
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

export const isGifFile = (file: File) => file.type === 'image/gif' || /\.gif$/i.test(file.name);
export const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp)$/i.test(file.name);

/** Decode any photo the phone can show (including iPhone HEIC photos, which some decoders can't read). */
async function decodeImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close?.() };
  } catch {
    /* fall back to an <img> below */
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/**
 * Every photo is sent as a phone-sized JPEG, whatever format it started in,
 * so it shows on every phone and sends fast on mobile data. GIFs are left
 * alone so they keep moving.
 */
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (isGifFile(file)) return file;
  const decoded = await decodeImage(file);
  if (!decoded || !decoded.width || !decoded.height) return file;
  const scale = Math.min(1, maxSize / Math.max(decoded.width, decoded.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(decoded.width * scale);
  canvas.height = Math.round(decoded.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.done();
    return file;
  }
  // JPEG has no transparency: a white background instead of black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  decoded.done();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || !blob.size) return file;
  // Keep an already-small JPEG as it is; anything else becomes the JPEG
  return file.type === 'image/jpeg' && file.size <= blob.size ? file : blob;
}

const storageExt = (type: string) =>
  type === 'image/png' ? 'png' : type === 'image/gif' ? 'gif' : type === 'image/webp' ? 'webp' : 'jpg';

/** Uploads to the public avatars bucket under the user's own folder (allowed by storage policy). */
export async function uploadChatImage(userId: string, file: File, folder: 'chat' | 'groups' = 'chat'): Promise<string> {
  const blob = await compressImage(file);
  const type = isGifFile(file) ? 'image/gif' : ['image/png', 'image/gif', 'image/webp', 'image/jpeg'].includes(blob.type) ? blob.type : 'image/jpeg';
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${storageExt(type)}`;
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/** Straight to the media store (Cloudflare R2), with progress. */
function putWithProgress(url: string, body: Blob, type: string, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = 15 * 60 * 1000;
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'));
    xhr.ontimeout = () => reject(new Error('Upload took too long'));
    xhr.send(body);
  });
}

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v'];

/**
 * A video for a chat: uploaded to the media store (no size problems, smooth
 * playback). Falls back to app storage if the media store isn't available.
 */
export async function uploadChatVideo(chatId: string, userId: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  const type = VIDEO_TYPES.includes(file.type) ? file.type : /\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4';
  const { data, error } = await supabase.functions.invoke('chat-media', { body: { chatId, fileType: type, size: file.size } });
  if (!error && data?.uploadUrl) {
    await putWithProgress(data.uploadUrl, file, type, onProgress);
    return data.publicUrl as string;
  }
  // The function's own reason (e.g. the video is too long) is shown as is
  let reason: string | null = null;
  try {
    const reply = error ? await (error as { context?: Response }).context?.json() : data;
    if (reply?.error && !reply?.fallback) reason = reply.error;
  } catch {
    /* not JSON */
  }
  if (reason) throw new Error(reason);

  const ext = type === 'video/quicktime' ? 'mov' : type === 'video/webm' ? 'webm' : 'mp4';

  // Not deployed yet: the media store's general upload link (also used by the choir pages)
  const general = await supabase.functions
    .invoke('get-r2-upload-url', { body: { fileName: `chat-${chatId}-${userId.slice(0, 8)}.${ext}`, fileType: type } })
    .catch(() => null);
  if (general && !general.error && general.data?.uploadUrl && general.data?.publicUrl) {
    try {
      await putWithProgress(general.data.uploadUrl, file, type, onProgress);
      return general.data.publicUrl as string;
    } catch {
      /* fall back to app storage below */
    }
  }

  const path = `${userId}/chat/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { contentType: type, cacheControl: '31536000', upsert: false });
  if (uploadError) throw new Error(/size|large|exceed/i.test(uploadError.message) ? 'That video is too big to send. Try a shorter clip.' : uploadError.message);
  onProgress?.(100);
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
