import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, ChevronRight, Loader2, ScanLine } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

/**
 * Church Space's front door. Churches can't be browsed or searched: people
 * come in with their church's link, its QR code, or its join code. Pastors
 * can create a church space from here.
 */
const FindChurchPage = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [scanHelp, setScanHelp] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new Event('app-ready'));
  }, []);

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
        <h1 className="mt-4 text-center font-outfit text-[28px] font-bold leading-tight text-foreground">Join your church</h1>
        <p className="mt-1 text-center text-[14.5px] text-muted-foreground">
          Type the join code from your church's
          <br />
          screen, flyer or poster.
        </p>

        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
            setCodeError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && useCode()}
          placeholder="JOIN CODE"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Join code"
          className="mt-6 h-14 w-full rounded-2xl border-2 border-slate-200 bg-white text-center font-outfit text-[24px] font-bold tracking-[.2em] text-foreground outline-none placeholder:text-[18px] placeholder:tracking-[.12em] placeholder:text-slate-300 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,.15)] dark:border-slate-700 dark:bg-slate-900"
        />
        {codeError && <p className="mt-2 text-center text-[13.5px] text-rose-600">{codeError}</p>}
        <button
          onClick={useCode}
          disabled={code.length < 4 || checking}
          className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[16px] font-semibold text-white shadow-md shadow-blue-600/25 disabled:opacity-50"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" />} Find my church
        </button>

        <div className="mt-6 flex items-center gap-3 text-[13px] text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          or
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <button
          onClick={() => setScanHelp(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-[22px] border border-slate-200/70 bg-white px-4 py-3.5 text-left shadow-sm active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60">
            <ScanLine className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-foreground">Scan a QR code</span>
            <span className="block text-[13px] text-muted-foreground">Opens your church straight away</span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </button>

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          Leading a church?{' '}
          <button onClick={() => navigate('/create-church')} className="font-semibold text-blue-600">
            Create your church space
          </button>
        </p>
      </div>

      <Sheet open={scanHelp} onOpenChange={setScanHelp}>
        <SheetContent side="bottom" className="rounded-t-[28px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 sm:mx-auto sm:max-w-md">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
          <SheetTitle className="font-outfit text-[21px] font-bold">Scan with your camera</SheetTitle>
          <SheetDescription className="text-[14px] leading-relaxed">
            Open your phone's <b>Camera</b> app and point it at your church's QR code. Tap the link that appears, and your church opens here.
          </SheetDescription>
          <button onClick={() => setScanHelp(false)} className="mt-5 h-[52px] w-full rounded-full bg-blue-600 text-[16px] font-semibold text-white">
            OK
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FindChurchPage;
