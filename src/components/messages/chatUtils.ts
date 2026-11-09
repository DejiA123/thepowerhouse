import { supabase } from '@/integrations/supabase/client';
import { plainFormatting } from './whatsappFormat';
import { encryptFile, encryptedFileType, isEncryptedFile } from '@/lib/chatCrypto';
import { chatPeer } from '@/lib/chatPhotos';

/** A chat between two friends (made from Social Circle), named "A & B". */
export const isPrivateChat = (chat: { description?: string | null }) => chat.description === 'Private chat';

/**
 * What to call a chat: for a private chat, only the other person's name (never "A & B").
 * Their name is looked up from the chat's members (`useChatPeers`); until it arrives, the
 * stored "A & B" name is split by matching my own name.
 */
export function chatTitle(chat: { id?: string; name: string; description?: string | null }, myName?: string) {
  if (!isPrivateChat(chat)) return chat.name;
  const peerName = chat.id ? chatPeer(chat.id)?.name : null;
  if (peerName) return peerName;
  if (!chat.name.includes(' & ')) return chat.name;
  const [a, b] = chat.name.split(' & ');
  const mine = (myName || '').trim().toLowerCase();
  const first = mine.split(/\s+/)[0];
  if (a.trim().toLowerCase() === mine || (first && a.trim().toLowerCase().split(/\s+/)[0] === first)) return b.trim();
  if (b.trim().toLowerCase() === mine || (first && b.trim().toLowerCase().split(/\s+/)[0] === first)) return a.trim();
  return chat.name;
}

export const IMAGE_PREFIX = '::image::';
export const VIDEO_PREFIX = '::video::';
export const CALL_PREFIX = '::call::';
/** A voice message: "::voice::<seconds>:<waveform digits>:<url>" */
export const VOICE_PREFIX = '::voice::';
/** A document: "::file::<bytes>:<encoded name>:<url>", then an optional caption */
export const FILE_PREFIX = '::file::';

export interface VoiceNote {
  seconds: number;
  /** 0–9 for each bar of the waveform */
  bars: number[];
  url: string;
}

export function parseVoice(content: string): VoiceNote | null {
  const m = content.match(/^::voice::(\d+(?:\.\d+)?):([0-9]*):(\S+)$/);
  return m ? { seconds: +m[1], bars: m[2].split('').map(Number), url: m[3] } : null;
}

export interface ChatFile {
  size: number;
  name: string;
  url: string;
  caption: string;
}

export function parseFile(content: string): ChatFile | null {
  if (!content.startsWith(FILE_PREFIX)) return null;
  const [first, ...rest] = content.split('\n');
  const m = first.match(/^::file::(\d+):([^:]*):(\S+)$/);
  if (!m) return null;
  let name = m[2];
  try {
    name = decodeURIComponent(m[2]);
  } catch {
    /* keep it as it is */
  }
  return { size: +m[1], name: name || 'Document', url: m[3], caption: rest.join('\n').trim() };
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** A link's preview, made on the sender's phone: "::preview::<base64 JSON>", then the message */
export const PREVIEW_PREFIX = '::preview::';

export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  site?: string;
}

export function encodePreview(p: LinkPreview) {
  const json = JSON.stringify({ u: p.url, t: p.title.slice(0, 200), d: p.description?.slice(0, 300), i: p.image, s: p.site?.slice(0, 80) });
  return `${PREVIEW_PREFIX}${btoa(unescape(encodeURIComponent(json)))}`;
}

export function parsePreview(content: string): LinkPreview | null {
  if (!content.startsWith(PREVIEW_PREFIX)) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(escape(atob(content.split('\n')[0].slice(PREVIEW_PREFIX.length)))));
    if (!raw?.u || !raw?.t || !/^https?:\/\//.test(raw.u)) return null;
    return { url: raw.u, title: raw.t, description: raw.d, image: typeof raw.i === 'string' && /^https:\/\//.test(raw.i) ? raw.i : undefined, site: raw.s };
  } catch {
    return null;
  }
}

/** A poll, like WhatsApp's: "::poll::<base64 JSON>" (inside the encrypted message); votes are in chat_poll_votes */
export const POLL_PREFIX = '::poll::';
export const MAX_POLL_OPTIONS = 12;

export interface Poll {
  question: string;
  options: string[];
  /** More than one answer allowed */
  multi: boolean;
}

export function encodePoll(p: Poll) {
  const json = JSON.stringify({ q: p.question.trim().slice(0, 300), o: p.options.map((o) => o.trim().slice(0, 100)).filter(Boolean).slice(0, MAX_POLL_OPTIONS), m: p.multi ? 1 : 0 });
  return `${POLL_PREFIX}${btoa(unescape(encodeURIComponent(json)))}`;
}

export function parsePoll(content: string): Poll | null {
  if (!content.startsWith(POLL_PREFIX)) return null;
  try {
    const raw = JSON.parse(decodeURIComponent(escape(atob(content.slice(POLL_PREFIX.length).trim()))));
    if (typeof raw?.q !== 'string' || !Array.isArray(raw.o) || raw.o.length < 2) return null;
    return { question: raw.q, options: raw.o.filter((o: unknown) => typeof o === 'string').slice(0, MAX_POLL_OPTIONS), multi: !!raw.m };
  } catch {
    return null;
  }
}

/** "@[Name](user id)": someone mentioned in a group */
export const MENTION = /@\[([^\]\n]{1,80})\]\(([0-9a-f-]{36})\)/g;
/** "@all" / "@everyone": the whole group, like WhatsApp */
export const MENTION_ALL = /(^|[\s([{"'])@(all|everyone)(?![\w])/i;

/** Who a message mentions: member ids, or ['all'] for the whole group (for notifications) */
export function mentionsIn(text: string): string[] {
  if (MENTION_ALL.test(text)) return ['all'];
  return [...new Set([...text.matchAll(MENTION)].map((m) => m[2]))].slice(0, 50);
}

/** The text with mentions as plain "@Name" (lists, notifications, editing) */
export const plainMentions = (text: string) => text.replace(MENTION, '@$1');

// Calls are kept in the chat like WhatsApp: "::call::missed:audio" (nobody answered)
// or "::call::ended:video:125" (answered, lasted 125 seconds)
export const missedCallContent = (type: 'audio' | 'video') => `${CALL_PREFIX}missed:${type}`;
export const answeredCallContent = (type: 'audio' | 'video', seconds: number) =>
  `${CALL_PREFIX}ended:${type}:${Math.max(1, Math.round(seconds))}`;

type CallRecord = { type: 'audio' | 'video'; missed: boolean; seconds: number };

export function parseCall(content: string): CallRecord | null {
  if (!content.startsWith(CALL_PREFIX)) return null;
  const [outcome, type, seconds] = content.slice(CALL_PREFIX.length).split(':');
  return { type: type === 'video' ? 'video' : 'audio', missed: outcome === 'missed', seconds: Number(seconds) || 0 };
}

/** An answered call isn't unread for anyone (they were on it) and gets no banner. */
export const isAnsweredCall = (content: string) => parseCall(content)?.missed === false;

/** "45 sec", "2 min", "1 hr 5 min" */
function formatCallLength(seconds: number) {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * What a call says from my side: "Voice call · 2 min" for everyone once answered;
 * otherwise the caller sees "Voice call · No answer" and everyone else "Missed voice call".
 */
export function describeCall(call: CallRecord, mine: boolean) {
  const kind = call.type === 'video' ? 'video call' : 'voice call';
  const Kind = kind[0].toUpperCase() + kind.slice(1);
  if (!call.missed) return { title: Kind, detail: formatCallLength(call.seconds) };
  return mine ? { title: Kind, detail: 'No answer' } : { title: `Missed ${kind}`, detail: 'Tap to call back' };
}

export const isGifUrl = (url: string) => /\.gif(?:$|[?#])/i.test(url) || (isEncryptedFile(url) && encryptedFileType(url) === 'image/gif');

/** A message that is just a link to a GIF (e.g. copied from Giphy or Tenor) shows the GIF itself. */
const GIF_LINK = /^https:\/\/\S+\.gif(?:\?\S*)?$/i;

/**
 * Photos, GIFs and videos are stored as "::image::<url>" or "::video::<url>",
 * then an optional caption on the following lines.
 */
export function parseMessageContent(content: string): { imageUrl: string | null; videoUrl: string | null; text: string } {
  if (content.startsWith(CALL_PREFIX) || content.startsWith(VOICE_PREFIX)) return { imageUrl: null, videoUrl: null, text: '' };
  if (content.startsWith(POLL_PREFIX)) {
    const poll = parsePoll(content);
    return { imageUrl: null, videoUrl: null, text: poll ? `📊 ${poll.question}\n${poll.options.map((o) => `• ${o}`).join('\n')}` : '' };
  }
  if (content.startsWith(FILE_PREFIX)) return { imageUrl: null, videoUrl: null, text: parseFile(content)?.caption ?? '' };
  if (content.startsWith(PREVIEW_PREFIX)) return { imageUrl: null, videoUrl: null, text: content.split('\n').slice(1).join('\n') };
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

/** One line for chat lists and notifications. `mine`: I sent it (a call reads differently for the caller). */
export const previewText = (content: string, mine = false) => {
  const call = parseCall(content || '');
  if (call) {
    const { title, detail } = describeCall(call, mine);
    return `${call.type === 'video' ? '📹' : '📞'} ${title}${mine || !call.missed ? ` · ${detail}` : ''}`;
  }
  const voice = parseVoice(content || '');
  if (voice) return `🎤 Voice message (${formatSeconds(voice.seconds)})`;
  const poll = parsePoll(content || '');
  if (poll) return `📊 Poll: ${poll.question.replace(/\s+/g, ' ').trim()}`;
  const file = parseFile(content || '');
  if (file) return file.caption ? `📄 ${plainFormatting(plainMentions(file.caption))}` : `📄 ${file.name}`;
  const { imageUrl, videoUrl, text } = parseMessageContent(content || '');
  const label = videoUrl ? '🎥 Video' : imageUrl ? (isGifUrl(imageUrl) ? '🎞️ GIF' : '📷 Photo') : null;
  if (label) return text ? `${label.split(' ')[0]} ${plainFormatting(plainMentions(text))}` : label;
  // Like WhatsApp: no *bold* or _italic_ marks in lists and notifications
  return plainFormatting(plainMentions(text)).replace(/\s+/g, ' ').trim();
};

/** A database time in ms (it writes microseconds, which not every Safari reads) */
export const timeMs = (iso?: string | null) => (iso ? Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) || 0 : 0);

/** Like WhatsApp: the sender can edit a message for 15 minutes (the database enforces it) */
export const EDIT_WINDOW_MS = 15 * 60_000;

const isMediaContent = (content: string) => content.startsWith(IMAGE_PREFIX) || content.startsWith(VIDEO_PREFIX);

/** Text and captions can be edited; calls and GIF links can't */
export function canEditMessage(message: { user_id: string; content: string; created_at: string; pending?: boolean; failed?: boolean; is_deleted?: boolean; locked?: boolean; imported_from?: string | null }, myId: string, now = Date.now()) {
  if (message.user_id !== myId || message.pending || message.failed || message.is_deleted || message.locked || message.imported_from) return false;
  if (parseCall(message.content) || message.content.startsWith(VOICE_PREFIX) || message.content.startsWith(FILE_PREFIX) || message.content.startsWith(POLL_PREFIX)) return false;
  const { imageUrl, videoUrl } = parseMessageContent(message.content);
  if ((imageUrl || videoUrl) && !isMediaContent(message.content)) return false;
  return now - timeMs(message.created_at) < EDIT_WINDOW_MS;
}

/** What's edited: the text, or a photo's or video's caption (a link preview stays as it is) */
export const editableText = (content: string) =>
  isMediaContent(content) || content.startsWith(PREVIEW_PREFIX) ? parseMessageContent(content).text : content;

/** The message after an edit (a photo or video keeps its file) */
export function withEditedText(content: string, text: string) {
  if (content.startsWith(PREVIEW_PREFIX)) return `${content.split('\n')[0]}\n${text}`;
  if (!isMediaContent(content)) return text;
  const first = content.split('\n')[0];
  return text ? `${first}\n${text}` : first;
}

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

/** "Last seen today at 14:05", "Last seen Monday at 9:30", "Last seen 3 March at 18:10" */
export function formatLastSeen(iso: string) {
  const day = formatDayLabel(iso);
  return `Last seen ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day} at ${formatClock(iso)}`;
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
export async function uploadChatImage(userId: string, file: File, folder: 'chat' | 'groups' = 'chat', encrypt = false): Promise<string> {
  const blob = await compressImage(file);
  const type = isGifFile(file) ? 'image/gif' : ['image/png', 'image/gif', 'image/webp', 'image/jpeg'].includes(blob.type) ? blob.type : 'image/jpeg';
  if (encrypt) {
    // End-to-end encrypted: the file is stored scrambled; its key travels inside the encrypted message
    const sealed = await encryptFile(new Blob([blob], { type }));
    const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.bin`;
    const { error } = await supabase.storage.from('avatars').upload(path, sealed.data, {
      contentType: 'application/octet-stream',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;
    return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}#${sealed.fragment}`;
  }
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${storageExt(type)}`;
  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/**
 * A voice message or document: end-to-end encrypted when encryption is on
 * (its key travels inside the encrypted message). Small files go to app
 * storage; bigger ones to the media store.
 */
export async function uploadChatFile(userId: string, file: Blob, opts: { encrypt: boolean; ext: string; onProgress?: (pct: number) => void }): Promise<string> {
  let body: Blob = file;
  let type = file.type || 'application/octet-stream';
  let fragment = '';
  if (opts.encrypt) {
    const sealed = await encryptFile(file);
    body = sealed.data;
    type = 'application/octet-stream';
    fragment = `#${sealed.fragment}`;
  }
  const ext = opts.encrypt ? 'bin' : opts.ext.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'bin';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (body.size <= 8 * 1024 * 1024) {
    const path = `${userId}/chat-files/${name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: type, cacheControl: '31536000', upsert: false });
    if (!error) {
      opts.onProgress?.(100);
      return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}${fragment}`;
    }
    if (body.size <= 2 * 1024 * 1024) throw error;
  }
  const { data, error } = await supabase.functions.invoke('get-r2-upload-url', { body: { fileName: `chat-${userId.slice(0, 8)}-${name}`, fileType: type } });
  if (error || !data?.uploadUrl || !data?.publicUrl) throw new Error("Couldn't upload the file. Check your connection and try again.");
  await putWithProgress(data.uploadUrl, body, type, opts.onProgress);
  return `${data.publicUrl}${fragment}`;
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
