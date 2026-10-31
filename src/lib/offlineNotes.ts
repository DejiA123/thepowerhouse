import { supabase } from '@/integrations/supabase/client';
import { NOTES_CHANGED } from '@/components/bible/highlightColors';
import type { NoteRecord } from '@/components/notes/noteUtils';

/**
 * Notes work offline. Every change is kept on the phone first, as a draft
 * (`note_draft_<user>_<note id>`), and only then sent. A draft is removed once
 * that exact version is saved to the account, so nothing typed is ever lost:
 * not with no signal, not if the app is closed mid-save. New notes get their id
 * on the phone, so several written offline never overwrite each other, and the
 * lists show drafts straight away ("not synced yet"). Drafts are sent when the
 * connection is back, when the app comes back on screen, and every 30 seconds
 * while any are waiting (OfflineSync).
 */

export const noteDraftKey = (userId: string, id: string | null) => `note_draft_${userId}_${id ?? 'new'}`;

/** window event: drafts were saved to the account (lists reload) */
export const NOTES_SYNCED = 'notes:synced';

export interface NoteDraft {
  html: string;
  title?: string;
  /** When this version was written */
  at: string;
  /** Written on this phone and never saved to the account yet */
  isNew?: boolean;
  /** The account's version this was written from (its updated_at): changed since = another device edited it */
  base?: string | null;
  created_at?: string;
  book?: string;
  chapter?: number;
  verse?: number | null;
  folder_id?: string | null;
  is_favorite?: boolean;
  is_pinned?: boolean;
}

/** Drafts the open editor is looking after itself */
export const openDrafts = new Set<string>();

/** A new note's id, made on the phone (randomUUID isn't in Safari 14) */
export function newNoteId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function saveDraft(userId: string, id: string, draft: NoteDraft) {
  try {
    localStorage.setItem(noteDraftKey(userId, id), JSON.stringify(draft));
  } catch {
    /* storage full */
  }
}

export function readDraft(userId: string, id: string | null): NoteDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(noteDraftKey(userId, id)) || 'null');
    return draft && typeof draft.html === 'string' ? draft : null;
  } catch {
    return null;
  }
}

/** Remove a draft, unless it was written again since (`at` changed) */
export function removeDraft(userId: string, id: string | null, onlyIfAt?: string) {
  const current = readDraft(userId, id);
  if (onlyIfAt && current && current.at !== onlyIfAt) return;
  localStorage.removeItem(noteDraftKey(userId, id));
}

/** Every draft waiting on this phone ("new": an older kind with no id yet) */
export function allDrafts(userId: string): { id: string; draft: NoteDraft }[] {
  const prefix = `note_draft_${userId}_`;
  const out: { id: string; draft: NoteDraft }[] = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(prefix)) continue;
    const id = key.slice(prefix.length);
    const draft = readDraft(userId, id);
    if (draft) out.push({ id, draft });
  }
  return out;
}

export const hasDrafts = (userId: string) => allDrafts(userId).length > 0;

/** A time in ms. The database writes microseconds ("…:00.123456+00:00"), which not every Safari reads */
export const timeOf = (iso?: string | null) => (iso ? Date.parse(iso.replace(/(\.\d{3})\d+/, '$1')) || 0 : 0);

/** A draft as a note for the lists (`pending`: not saved to the account yet) */
export function draftAsNote(userId: string, id: string, draft: NoteDraft, base?: NoteRecord): NoteRecord {
  return {
    ...(base ?? {
      id,
      user_id: userId,
      book: draft.book ?? 'genesis',
      chapter: draft.chapter ?? 1,
      verse: draft.verse ?? null,
      created_at: draft.created_at ?? draft.at,
      category: 'insight',
    }),
    title: draft.title ?? base?.title ?? null,
    note_text: draft.html,
    folder_id: draft.folder_id !== undefined ? draft.folder_id : base?.folder_id ?? null,
    is_favorite: draft.is_favorite ?? base?.is_favorite ?? false,
    is_pinned: draft.is_pinned ?? base?.is_pinned ?? false,
    updated_at: draft.at,
    pending: true,
  };
}

/**
 * Notes from the account with this phone's drafts laid over them: new notes
 * written here are added, and edits newer than the account's copy win.
 */
export function withDrafts(userId: string, notes: NoteRecord[]): NoteRecord[] {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const added: NoteRecord[] = [];
  for (const { id, draft } of allDrafts(userId)) {
    if (id === 'new') continue; // the editor recovers these
    const server = byId.get(id);
    if (server) {
      if (timeOf(draft.at) > timeOf(server.updated_at)) byId.set(id, draftAsNote(userId, id, draft, server));
    } else if (draft.isNew) {
      added.push(draftAsNote(userId, id, draft));
    }
  }
  return [...added, ...notes.map((n) => byId.get(n.id) ?? n)];
}

/** Give up on a request after this long (a weak signal can hang for minutes) */
const TIMEOUT_MS = 15_000;

/**
 * Save a draft to the account and return the saved note. Throws when it can't
 * be sent (offline): the draft stays. Nothing written is ever thrown away: if
 * another device changed the note since this was written, this version is
 * saved as a copy beside it ("… (copy)").
 */
export async function pushDraft(userId: string, id: string, draft: NoteDraft): Promise<NoteRecord> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const { data: current, error: readError } = await supabase
      .from('bible_notes')
      .select('id, updated_at, title, note_text')
      .eq('id', id)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (readError) throw readError;

    const fields = {
      title: draft.title?.trim() || null,
      note_text: draft.html,
      updated_at: draft.at,
      ...(draft.folder_id !== undefined && { folder_id: draft.folder_id }),
      ...(draft.is_favorite !== undefined && { is_favorite: draft.is_favorite }),
      ...(draft.is_pinned !== undefined && { is_pinned: draft.is_pinned }),
    };
    const insert = async (noteId: string, extra: Partial<typeof fields> = {}) => {
      const { data, error } = await supabase
        .from('bible_notes')
        .upsert({
          ...fields,
          ...extra,
          id: noteId,
          user_id: userId,
          book: draft.book ?? 'genesis',
          chapter: draft.chapter ?? 1,
          verse: draft.verse ?? null,
          category: 'insight',
          is_private: false,
          ...(draft.created_at && { created_at: draft.created_at }),
        }, { onConflict: 'id' })
        .select()
        .abortSignal(controller.signal)
        .single();
      if (error) throw error;
      return data as unknown as NoteRecord;
    };

    // New (its id was made on this phone, so sending it twice can't make two),
    // or deleted on another device meanwhile: keep what was written here
    if (!current) return await insert(id);

    const sameContent = current.note_text === draft.html && (current.title ?? '') === (draft.title?.trim() || '');
    const since = draft.base ?? (draft.isNew ? null : draft.at);
    const changedElsewhere = !sameContent && !!since && timeOf(current.updated_at) > timeOf(since) + 1000;
    if (changedElsewhere) {
      return await insert(newNoteId(), { title: `${draft.title?.trim() || 'Untitled note'} (copy)` });
    }

    const { data, error } = await supabase
      .from('bible_notes')
      .update(fields)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .abortSignal(controller.signal)
      .single();
    if (error) throw error;
    return data as unknown as NoteRecord;
  } finally {
    clearTimeout(timer);
  }
}

let syncing = false;

/** Send every waiting draft (not the ones an open editor is handling). */
export async function syncNoteDrafts(userId: string) {
  if (syncing || navigator.onLine === false) return;
  syncing = true;
  let changed = false;
  try {
    for (const { id, draft } of allDrafts(userId)) {
      if (openDrafts.has(noteDraftKey(userId, id))) continue;
      if (id === 'new') {
        // An older kind of draft: give it an id and send it like the others
        if (!draft.book) continue; // from before notes kept their passage: the editor recovers it
        const fresh = newNoteId();
        saveDraft(userId, fresh, { ...draft, isNew: true });
        localStorage.removeItem(noteDraftKey(userId, 'new'));
        await pushDraft(userId, fresh, { ...draft, isNew: true });
        removeDraft(userId, fresh, draft.at);
      } else {
        await pushDraft(userId, id, draft);
        removeDraft(userId, id, draft.at);
      }
      changed = true;
    }
  } catch {
    /* still offline: try again later */
  } finally {
    syncing = false;
    if (changed) {
      window.dispatchEvent(new CustomEvent(NOTES_SYNCED));
      window.dispatchEvent(new CustomEvent(NOTES_CHANGED));
    }
  }
}

/** A failure because there's no connection (rather than the database saying no) */
export const isOffline = (error: unknown) =>
  navigator.onLine === false || /fetch|network|load failed|abort|timed? ?out/i.test(String((error as { message?: string })?.message ?? error));
