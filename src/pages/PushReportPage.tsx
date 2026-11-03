import { useEffect, useState } from 'react';
import { Page, PageHeader } from '@/components/page/PageKit';
import { getPushState } from '@/lib/push';

interface Entry {
  at: string;
  title?: string;
  shown?: string;
  how?: string;
  copies?: number;
}

/** What happened to the last chat notifications on this phone (kept by public/push-sw.js) */
function readLog(): Promise<Entry[]> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('ph-push-log', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('log', { autoIncrement: true });
      req.onsuccess = () => {
        const db = req.result;
        const all = db.transaction('log').objectStore('log').getAll();
        all.onsuccess = () => {
          resolve(((all.result || []) as Entry[]).reverse());
          db.close();
        };
        all.onerror = () => resolve([]);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/** Me → Settings → Notification preferences → Notification report (also /push-report) */
const PushReportPage = () => {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [state, setState] = useState('');
  useEffect(() => {
    readLog().then(setEntries);
    getPushState().then((s) => setState(JSON.stringify(s))).catch(() => setState('unknown'));
  }, []);
  return (
    <Page grouped>
      <PageHeader title="Notification report" />
      <div className="space-y-3 px-4 pb-10">
        <p className="text-sm text-muted-foreground">
          What this phone did with the last chat notifications. If one said “🔒 New message”, take a screenshot of this page.
        </p>
        <p className="break-words font-mono text-[11px] text-muted-foreground">{navigator.userAgent}</p>
        <p className="break-words font-mono text-[11px] text-muted-foreground">Push: {state}</p>
        {entries === null ? null : entries.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">No chat notifications on this phone yet (since this update).</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
            {entries.map((e, i) => (
              <div key={i} className="p-3 text-sm">
                <p className="font-medium text-foreground">{e.title || 'Message'} · {new Date(e.at).toLocaleString()}</p>
                <p className="text-muted-foreground">Showed: {e.shown}</p>
                <p className="text-muted-foreground">How: {e.how || '—'}{typeof e.copies === 'number' ? ` · key copies sent: ${e.copies}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
};

export default PushReportPage;
