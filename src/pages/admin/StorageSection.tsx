import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { SectionLabel } from '@/components/page/PageKit';
import { supabase } from '@/integrations/supabase/client';
import { currentChurchId } from '@/lib/churchSpace';
import { cn } from '@/lib/utils';

/**
 * Me → Admin → Storage: how full each place the app keeps things is, against its free
 * allowance: the media store (Cloudflare R2, 10 GB: chat videos, documents, lyric sheets,
 * composed songs), the app's own file storage (Supabase, 1 GB: photos, backing tracks) and
 * the database (Supabase, 500 MB). R2 comes from song-writer's 'storage' action, the rest
 * from admin_storage_usage().
 */
interface Part { name: string; files: number; bytes: number }
interface Meter { title: string; about: string; used: number; limit: number; parts: Part[] }

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const size = (b: number) => (b >= GB ? `${(b / GB).toFixed(b >= 10 * GB || b % GB === 0 ? 0 : 1)} GB` : b >= MB ? `${Math.round(b / MB)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const R2_NAMES: Record<string, string> = {
  'chat-media': 'Chat videos and photos',
  songs: 'Composed songs',
  lyrics: 'Choir lyric sheets',
  uploads: 'Uploaded files',
  checks: 'Test songs',
  tts: 'Read-aloud Bible (kept chapters)',
};
const BUCKET_NAMES: Record<string, string> = {
  avatars: 'Profile and group photos',
  'backing-tracks': 'Backing tracks',
  'song-drafts': 'Composed songs (backup)',
  'chat-files': 'Chat files',
};

const MeterCard = ({ m }: { m: Meter }) => {
  const share = m.used / m.limit;
  const tone = share > 0.85 ? 'from-red-500 to-red-600' : share > 0.6 ? 'from-amber-400 to-amber-500' : 'from-emerald-500 to-teal-500';
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold text-foreground">{m.title}</p>
        <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{size(m.used)}</span> of {size(m.limit)}
        </p>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">{m.about}</p>
      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={m.title} aria-valuemin={0} aria-valuemax={m.limit} aria-valuenow={m.used}>
        <div className={cn('h-full rounded-full bg-gradient-to-r', tone)} style={{ width: `${Math.max(1.5, Math.min(100, share * 100))}%` }} />
      </div>
      <p className="mt-1.5 text-[12.5px] font-medium text-foreground">{size(Math.max(0, m.limit - m.used))} free · {Math.round(share * 100)}% used</p>
      {!!m.parts.length && (
        <ul className="mt-2.5 space-y-1 border-t border-slate-200/70 pt-2.5 text-[13px] dark:border-slate-800">
          {m.parts.map((p) => (
            <li key={p.name} className="flex justify-between gap-3">
              <span className="truncate text-muted-foreground">{p.name}{p.files ? ` · ${p.files} ${p.files === 1 ? 'file' : 'files'}` : ''}</span>
              <span className="shrink-0 tabular-nums text-foreground">{size(p.bytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const StorageSection = () => {
  const [meters, setMeters] = useState<Meter[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [media, own] = await Promise.all([
        supabase.functions.invoke('song-writer', { body: { action: 'storage', churchId: currentChurchId } }).catch(() => ({ data: null })),
        supabase.rpc('admin_storage_usage' as never).then((r) => r, () => ({ data: null })),
      ]);
      const list: Meter[] = [];
      const r2 = (media as { data: { r2?: { bytes: number; limit_bytes: number; folders: { folder: string; files: number; bytes: number }[] } | null } | null }).data?.r2;
      if (r2) {
        list.push({
          title: 'Media store',
          about: 'Chat videos, documents, lyric sheets and composed songs (Cloudflare R2). Playing and downloading are free.',
          used: r2.bytes,
          limit: r2.limit_bytes,
          parts: r2.folders.map((f) => ({ name: R2_NAMES[f.folder] ?? f.folder, files: f.files, bytes: f.bytes })),
        });
      }
      const app = (own as { data: unknown }).data as { buckets: { bucket: string; files: number; bytes: number }[]; database_bytes: number } | null;
      if (app) {
        list.push({
          title: 'App file storage',
          about: 'Photos and backing tracks (Supabase).',
          used: app.buckets.reduce((a, b) => a + b.bytes, 0),
          limit: GB,
          parts: app.buckets.map((b) => ({ name: BUCKET_NAMES[b.bucket] ?? b.bucket, files: b.files, bytes: b.bytes })),
        });
        list.push({ title: 'Database', about: 'Messages, notes, songs’ words, activity and everything else (Supabase).', used: app.database_bytes, limit: 500 * MB, parts: [] });
      }
      if (alive) setMeters(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (meters && !meters.length) return null;
  return (
    <section aria-label="Storage" data-testid="admin-storage">
      <SectionLabel>Storage</SectionLabel>
      {!meters ? (
        <div className="flex items-center gap-2 rounded-[22px] border border-slate-200/70 bg-card p-4 text-[14px] text-muted-foreground dark:border-slate-800">
          <HardDrive className="h-4 w-4" /> Adding up the space used…
        </div>
      ) : (
        <div className="space-y-2.5">
          {meters.map((m) => (
            <MeterCard key={m.title} m={m} />
          ))}
        </div>
      )}
    </section>
  );
};

export default StorageSection;
