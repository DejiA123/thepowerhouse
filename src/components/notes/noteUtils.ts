import { bibleBooks } from '@/components/bible/BibleBookList';
import { appAlert } from '@/lib/appAlert';

export interface NoteRecord {
  id: string;
  user_id: string;
  book: string;
  chapter: number;
  verse?: number | null;
  note_text: string;
  title?: string | null;
  tags?: string[] | null;
  category?: string | null;
  is_favorite?: boolean | null;
  is_private?: boolean | null;
  is_pinned?: boolean | null;
  folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

const allBooks = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];

/** Plain text from the stored rich-text HTML (cached — lists call this a lot). */
const textCache = new Map<string, string>();
export function htmlToText(html: string): string {
  if (!html) return '';
  const cached = textCache.get(html);
  if (cached !== undefined) return cached;
  let text = '';
  try {
    const doc = new DOMParser().parseFromString(
      html.replace(/<\/(p|h[1-6]|li|div|blockquote|tr)>/gi, '</$1>\n').replace(/<br\s*\/?>/gi, '\n'),
      'text/html',
    );
    text = (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (textCache.size > 500) textCache.clear();
  textCache.set(html, text);
  return text;
}

export const isBlankHtml = (html: string) => htmlToText(html).trim().length === 0 && !/<img|<table/i.test(html || '');

export function noteTitle(note: Pick<NoteRecord, 'title' | 'note_text'>): string {
  if (note.title?.trim()) return note.title.trim();
  const first = htmlToText(note.note_text).split('\n').find((l) => l.trim());
  if (!first) return 'Untitled note';
  return first.length > 60 ? `${first.slice(0, 59).trimEnd()}…` : first.trim();
}

/** Body preview without repeating the title line. */
export function notePreview(note: Pick<NoteRecord, 'title' | 'note_text'>, max = 180): string {
  const lines = htmlToText(note.note_text).split('\n').map((l) => l.trim()).filter(Boolean);
  const body = (note.title?.trim() ? lines : lines.slice(1)).join(' ');
  return body.length > max ? `${body.slice(0, max - 1).trimEnd()}…` : body;
}

export function bookName(apiName?: string | null) {
  if (!apiName) return '';
  return allBooks.find((b) => b.apiName === apiName)?.name ?? apiName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function passageLabel(note: Pick<NoteRecord, 'book' | 'chapter' | 'verse'>) {
  if (!note.book) return '';
  return `${bookName(note.book)} ${note.chapter}${note.verse ? `:${note.verse}` : ''}`;
}

export function relativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (diff < 7 * 86400) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

const safeFileName = (title: string) =>
  `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'note'}-${new Date().toISOString().split('T')[0]}`;

export async function exportNotePdf(note: NoteRecord) {
  try {
    const { default: html2pdf } = await import('html2pdf.js');
    const title = noteTitle(note);
    const element = document.createElement('div');
    const heading = document.createElement('h1');
    heading.textContent = title;
    heading.setAttribute('style', 'color:#1e3a8a;border-bottom:3px solid #3b82f6;padding-bottom:10px;margin-bottom:8px;font-family:Arial,sans-serif');
    const meta = document.createElement('p');
    meta.textContent = [passageLabel(note), new Date(note.updated_at || note.created_at).toLocaleString()].filter(Boolean).join(' · ');
    meta.setAttribute('style', 'color:#6b7280;font-size:13px;margin-bottom:24px;font-family:Arial,sans-serif');
    const body = document.createElement('div');
    body.innerHTML = (await import('dompurify')).default.sanitize(note.note_text);
    body.setAttribute('style', 'line-height:1.7;color:#1f2937;font-family:Arial,sans-serif');
    element.setAttribute('style', 'padding:32px;max-width:760px');
    element.append(heading, meta, body);
    await html2pdf()
      .set({
        margin: 10,
        filename: `${safeFileName(title)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  } catch (error) {
    console.error('PDF export failed', error);
    appAlert('Could not create the PDF', 'Please try again.', 'error');
  }
}

export async function exportNoteWord(note: NoteRecord) {
  try {
    const [{ Document, Packer, Paragraph, TextRun, HeadingLevel }, { saveAs }] = await Promise.all([
      import('docx'),
      import('file-saver'),
    ]);
    const title = noteTitle(note);
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
          new Paragraph({
            children: [new TextRun({
              text: [passageLabel(note), new Date(note.updated_at || note.created_at).toLocaleString()].filter(Boolean).join(' · '),
              color: '6B7280',
              size: 20,
            })],
            spacing: { after: 320 },
          }),
          ...htmlToText(note.note_text).split('\n').map((line) => new Paragraph({ text: line, spacing: { after: 160 } })),
        ],
      }],
    });
    saveAs(await Packer.toBlob(doc), `${safeFileName(title)}.docx`);
  } catch (error) {
    console.error('Word export failed', error);
    appAlert('Could not create the Word document', 'Please try again.', 'error');
  }
}
