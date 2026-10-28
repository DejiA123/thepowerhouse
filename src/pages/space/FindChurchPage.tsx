import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, ChevronRight, KeyRound, Loader2, ScanLine, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import type { ChurchRow } from '@/config/church';
import { ChurchLogo } from '@/components/space/ChurchBits';

/**
 * Church Space's front door: find your church by name or town, or with a join
 * code. Pastors can create a church space from here.
 */
const FindChurchPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ChurchRow[] | null>(null);
  const [sheet, setSheet] = useState<'code' | 'scan' | null>(null);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    window.dispatchEvent(new Event('app-ready'));
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      supabase.rpc('church_directory' as never, { search: q } as never).then(({ data }) => setResults((data as ChurchRow[] | null) ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const useCode = async () => {
    setChecking(true);
    setCodeError('');
    const { data } = await supabase.rpc('church_by_code' as never, { code } as never);
    setChecking(false);
    if (typeof data === 'string' && data) navigate(`/${data}`);
    else setCodeError("That code didn't match a church. Check it and try again.");
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-5 pb-10 pt-[max(env(safe-area-inset-top),24px)] dark:bg-slate-950">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-500 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/30">
          <Church className="h-9 w-9" />
        </div>
        <h1 className="mt-4 text-center font-outfit text-[28px] font-bold leading-tight text-foreground">Find your church</h1>
        <p className="mt-1 text-center text-[14.5px] text-muted-foreground">
          Bible, prayer, messages and more,
          <br />
          all in your church's own app.
        </p>

        <label className="mt-6 flex h-[52px] items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-white px-3.5 focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,.15)] dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Church name or town"
            className="h-full flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-slate-400"
          />
        </label>

        {results && (
          <div className="mt-3 overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {results.length === 0 ? (
              <p className="px-4 py-5 text-center text-[14px] text-muted-foreground">No church by that name yet. Try its town, or ask your church for its join code.</p>
            ) : (
              results.map((row, i) => (
                <button
                  key={row.id}
                  onClick={() => navigate(`/${row.slug}`)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 ${i ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
                >
                  <ChurchLogo row={row} className="h-11 w-11 text-[16px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold text-foreground">{row.name}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {[row.profile?.city, `${row.members ?? 0} ${row.members === 1 ? 'member' : 'members'}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-300" />
                </button>
              ))
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3 text-[13px] text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          or
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        {(
          [
            ['code', KeyRound, 'I have a join code', "From your church's screen or flyer"],
            ['scan', ScanLine, 'Scan a QR code', 'Opens your church straight away'],
          ] as const
        ).map(([id, Icon, title, subtitle]) => (
          <button
            key={id}
            onClick={() => setSheet(id)}
            className="mt-2.5 flex w-full items-center gap-3 rounded-[22px] border border-slate-200/70 bg-white px-4 py-3.5 text-left shadow-sm active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{title}</span>
              <span className="block text-[13px] text-muted-foreground">{subtitle}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </button>
        ))}

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          Leading a church?{' '}
          <button onClick={() => navigate('/create-church')} className="font-semibold text-blue-600">
            Create your church space
          </button>
        </p>
      </div>

      <Sheet open={!!sheet} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-[28px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 sm:mx-auto sm:max-w-md">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
          {sheet === 'code' ? (
            <>
              <SheetTitle className="font-outfit text-[21px] font-bold">Type your join code</SheetTitle>
              <SheetDescription className="text-[13.5px]">It's on your church's screen, flyer or poster.</SheetDescription>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && useCode()}
                placeholder="GRACE27"
                autoCapitalize="characters"
                className="mt-4 h-14 w-full rounded-2xl border-2 border-slate-200 bg-white text-center font-outfit text-[24px] font-bold tracking-[.2em] text-foreground outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
              />
              {codeError && <p className="mt-2 text-center text-[13.5px] text-rose-600">{codeError}</p>}
              <button
                onClick={useCode}
                disabled={code.length < 4 || checking}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/25 disabled:opacity-50"
              >
                {checking && <Loader2 className="h-4 w-4 animate-spin" />} Find my church
              </button>
            </>
          ) : (
            <>
              <SheetTitle className="font-outfit text-[21px] font-bold">Scan with your camera</SheetTitle>
              <SheetDescription className="text-[14px] leading-relaxed">
                Open your phone's <b>Camera</b> app and point it at your church's QR code. Tap the link that appears, and your church opens here.
              </SheetDescription>
              <button onClick={() => setSheet(null)} className="mt-5 h-[52px] w-full rounded-full bg-blue-600 text-[16px] font-semibold text-white">
                OK
              </button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FindChurchPage;
