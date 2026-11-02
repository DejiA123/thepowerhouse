import { isEncryptedFile, openEncryptedFile } from '@/lib/chatCrypto';

/**
 * Saving a chat's photo, video, voice message or document to the phone, like
 * WhatsApp's "Save". On iPhone the share sheet is the only way into Photos
 * ("Save Image" / "Save Video") or Files; Android and computers download it.
 * Encrypted files are opened on the phone first.
 *
 * iPhone only shows the share sheet straight from a tap, so the file is got
 * ready beforehand (`prepareSave`, when the menu or viewer opens) and shared
 * with no waiting in between.
 */

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const ready = new Map<string, File>();
const preparing = new Map<string, Promise<File>>();

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf',
};

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/** A file name for what's being saved ("photo-20261102-213000.jpg"), or the document's own name */
export function saveName(kind: 'photo' | 'video' | 'voice' | 'document', type: string, own?: string) {
  if (own) return own;
  const ext = EXT[type] ?? (kind === 'voice' ? 'mp3' : kind === 'video' ? 'mp4' : 'jpg');
  return `${kind === 'voice' ? 'voice-message' : kind}-${stamp()}.${ext}`;
}

/** Download (and open, if encrypted) a chat file, ready to save */
export function prepareSave(url: string, kind: 'photo' | 'video' | 'voice' | 'document', own?: string): Promise<File> {
  const known = preparing.get(url);
  if (known) return known;
  const p = (async () => {
    const href = isEncryptedFile(url) ? await openEncryptedFile(url) : url;
    const res = await fetch(href);
    if (!res.ok) throw new Error(`Couldn't download it (${res.status})`);
    const blob = await res.blob();
    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : kind === 'voice' ? 'audio/mpeg' : kind === 'video' ? 'video/mp4' : kind === 'photo' ? 'image/jpeg' : 'application/octet-stream';
    const file = new File([blob], saveName(kind, type, own), { type });
    ready.set(url, file);
    return file;
  })();
  p.catch(() => preparing.delete(url));
  preparing.set(url, p);
  return p;
}

function download(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/**
 * Save it to the phone. Returns what happened: 'shared' (iPhone share sheet),
 * 'downloaded', 'cancelled', or 'not-ready' (still downloading: try again in a moment).
 */
export async function saveToPhone(url: string, kind: 'photo' | 'video' | 'voice' | 'document', own?: string): Promise<'shared' | 'downloaded' | 'cancelled' | 'not-ready'> {
  const file = ready.get(url);
  if (isIOS() && typeof navigator.share === 'function') {
    if (!file) {
      // Not downloaded yet: get it, then the next tap shares it (iPhone needs the tap)
      prepareSave(url, kind, own).catch(() => undefined);
      return 'not-ready';
    }
    if (navigator.canShare?.({ files: [file] }) !== false) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'cancelled';
        /* sharing files not allowed here: download instead */
      }
    }
  }
  download(file ?? (await prepareSave(url, kind, own)));
  return 'downloaded';
}
