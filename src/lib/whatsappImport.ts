import { unzipSync } from 'fflate';

/**
 * Reading a chat exported from WhatsApp (chat → contact/group name → Export
 * chat). iPhone gives a .zip with "_chat.txt" (plus photos when "Attach media"
 * is chosen); Android gives a .txt, or a .zip with media.
 *
 * Lines look like:
 *   iPhone   [02/11/2026, 21:15:03] Cormac: Hello            (or 12-hour: [11/2/26, 9:15:03 PM])
 *   Android  02/11/2026, 21:15 - Cormac: Hello                (or 11/2/26, 9:15 PM - …, 02.11.26, …)
 * A line that doesn't start with a date belongs to the message above. Lines
 * with no "Name: " are WhatsApp's own notes ("… created group") and are left out.
 */

export interface WaMessage {
  at: Date;
  sender: string;
  text: string;
  /** A file sent with it ("IMG-20261102-WA0001.jpg", "00000012-PHOTO-….jpg") */
  attachment?: string;
  /** Exported "Without media": what it was */
  omitted?: string;
}

export type DateOrder = 'ymd' | 'dmy' | 'mdy';

export interface WaChat {
  messages: WaMessage[];
  /** How the dates were read (the member can swap day and month if it guessed wrong) */
  order: DateOrder;
  /** The chat's text, to read again with the other date order */
  text: string;
  /** Everyone who wrote, most messages first */
  senders: { name: string; count: number }[];
  /** Photos found in the export (file name → file) */
  media: Map<string, Blob>;
  first?: Date;
  last?: Date;
}

const HEAD = /^\[?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:[-–]\s+)?(.*)$/;
/** iPhone: "<attached: FILE>", at the start, or after a caption written in the same message */
const ATTACHED_IOS_ANYWHERE = /<attached:\s*([^>]+)>/i;
const ATTACHED_ANDROID = /^(.+?\.[A-Za-z0-9]{2,5})\s+\((?:file attached|archivo adjunto|fichier joint|Datei angehängt)\)\s*([\s\S]*)$/i;
const OMITTED = /^(image|video|audio|sticker|document|GIF|Contact card|video note) omitted$/i;
const EDITED = /\s*<This message was edited>\s*$/i;

const IMAGE_FILE = /\.(jpe?g|png|webp|gif|heic)$/i;
const VIDEO_FILE = /\.(mp4|mov|3gp|m4v)$/i;
const AUDIO_FILE = /\.(opus|ogg|m4a|mp3|aac|amr)$/i;

/** Tidy up the export: line endings, and the invisible direction marks WhatsApp adds */
function clean(text: string) {
  return text
    .replace(/^\ufeff/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\u202f\u00a0]/g, ' ');
}

interface Head {
  a: number;
  b: number;
  c: number;
  h: number;
  m: number;
  s: number;
  ampm: string | null;
  rest: string;
}

/** Does this phone write the day before the month? (WhatsApp exports in the phone's own date format) */
function phoneWritesDayFirst(): boolean {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'numeric' }).formatToParts(new Date(2020, 11, 31));
    return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month');
  } catch {
    return true;
  }
}

/** Day/month order: a part over 12 settles it; otherwise the phone's own way of writing dates */
function dateOrder(heads: Head[]): DateOrder {
  if (heads.some((x) => x.a > 31)) return 'ymd';
  if (heads.some((x) => x.a > 12)) return 'dmy';
  if (heads.some((x) => x.b > 12)) return 'mdy';
  return phoneWritesDayFirst() ? 'dmy' : 'mdy';
}

export function parseWhatsAppText(text: string, forceOrder?: DateOrder): Omit<WaChat, 'media'> {
  const lines = clean(text).split('\n');
  const raw: { head: Head; extra: string[] }[] = [];
  for (const line of lines) {
    const m = line.match(HEAD);
    if (m) {
      raw.push({
        head: { a: +m[1], b: +m[2], c: +m[3], h: +m[4], m: +m[5], s: m[6] ? +m[6] : 0, ampm: m[7] ?? null, rest: m[8] ?? '' },
        extra: [],
      });
    } else if (raw.length) {
      raw[raw.length - 1].extra.push(line);
    }
  }
  const order = forceOrder ?? dateOrder(raw.map((r) => r.head));

  const messages: WaMessage[] = [];
  let previous = 0;
  for (const { head, extra } of raw) {
    const split = head.rest.indexOf(': ');
    if (split <= 0) continue; // WhatsApp's own notes
    const sender = head.rest.slice(0, split).trim();
    let body = [head.rest.slice(split + 2), ...extra].join('\n').replace(EDITED, '').trim();

    const [yy, mo, d] = order === 'ymd' ? [head.a, head.b, head.c] : order === 'dmy' ? [head.c, head.b, head.a] : [head.c, head.a, head.b];
    const y = yy < 100 ? yy + 2000 : yy;
    let hour = head.h;
    if (head.ampm) {
      const pm = /p/i.test(head.ampm);
      hour = (hour % 12) + (pm ? 12 : 0);
    }
    let time = new Date(y, mo - 1, d, hour, head.m, head.s).getTime();
    if (!Number.isFinite(time)) continue;
    // Several in the same minute (Android has no seconds): keep WhatsApp's order
    if (time <= previous) time = previous + 1;
    previous = time;

    const message: WaMessage = { at: new Date(time), sender, text: body };
    const ios = body.match(ATTACHED_IOS_ANYWHERE);
    const android = !ios ? body.match(ATTACHED_ANDROID) : null;
    if (ios) {
      // The caption is whatever else the message says, before or after the tag
      message.attachment = ios[1].trim();
      message.text = body.replace(ios[0], ' ').replace(/[ \t]+\n/g, '\n').replace(/\s{2,}/g, ' ').trim();
    } else if (android) {
      message.attachment = android[1].trim();
      message.text = android[2].trim();
    } else if (OMITTED.test(body) || /^<Media omitted>$/i.test(body)) {
      message.omitted = (body.match(OMITTED)?.[1] || 'media').toLowerCase();
      message.text = '';
    }
    body = message.text;
    messages.push(message);
  }

  const counts = new Map<string, number>();
  messages.forEach((m) => counts.set(m.sender, (counts.get(m.sender) ?? 0) + 1));
  const senders = [...counts.entries()].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count);
  return { messages, senders, order, text, first: messages[0]?.at, last: messages[messages.length - 1]?.at };
}

/** A WhatsApp export (.zip or .txt) → its messages and photos */
export async function readWhatsAppExport(file: File): Promise<WaChat> {
  const isZip = /\.zip$/i.test(file.name) || file.type.includes('zip');
  if (!isZip) {
    return { ...parseWhatsAppText(await file.text()), media: new Map() };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Only the chat and photos are opened (videos and voice notes can be huge)
  const files = unzipSync(bytes, { filter: (f) => /(^|\/)(_chat|WhatsApp Chat.*)\.txt$/i.test(f.name) || IMAGE_FILE.test(f.name) });
  const names = Object.keys(files);
  const chatName = names.find((n) => /(^|\/)_chat\.txt$/i.test(n)) ?? names.find((n) => /\.txt$/i.test(n));
  if (!chatName) throw new Error('This zip has no WhatsApp chat in it (no _chat.txt).');
  const parsed = parseWhatsAppText(new TextDecoder().decode(files[chatName]));
  const media = new Map<string, Blob>();
  for (const name of names) {
    if (name === chatName) continue;
    const base = name.split('/').pop()!;
    const ext = base.split('.').pop()!.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
    media.set(base, new Blob([files[name]], { type }));
  }
  return { ...parsed, media };
}

/** Could the day and month be the other way round? (no date in the chat settles it) */
export const canSwapDates = (chat: Pick<WaChat, 'order' | 'messages'>) =>
  chat.order !== 'ymd' && !chat.messages.some((m) => m.at.getDate() > 12);

/** The same chat with day and month swapped */
export function swapDates(chat: WaChat): WaChat {
  const parsed = parseWhatsAppText(chat.text, chat.order === 'dmy' ? 'mdy' : 'dmy');
  return { ...parsed, media: chat.media };
}

/** How a message that can't be brought over reads in the chat */
export function placeholderFor(m: WaMessage): string {
  const what = m.attachment ?? '';
  const kind = m.omitted ?? (IMAGE_FILE.test(what) ? 'image' : VIDEO_FILE.test(what) ? 'video' : AUDIO_FILE.test(what) ? 'audio' : 'document');
  const label =
    kind === 'image' ? '📷 Photo'
      : kind === 'video' || kind === 'video note' ? '🎥 Video'
      : kind === 'audio' ? '🎤 Voice message'
      : kind === 'sticker' ? '🙂 Sticker'
      : kind === 'gif' ? '🎞️ GIF'
      : kind === 'contact card' ? '👤 Contact'
      : kind === 'media' ? '📎 Photo or file'
      : `📄 ${what || 'Document'}`;
  return `${label} (not imported)${m.text ? `\n${m.text}` : ''}`;
}

export const isImageAttachment = (name?: string) => !!name && IMAGE_FILE.test(name) && !/\.heic$/i.test(name);
