import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { takeNext } from '@/lib/authRedirect';
import { church } from '@/config/church';

type Status = 'checking' | 'signed-in' | 'confirmed' | 'failed';

/**
 * Where the sign-up email's link and the Passcode email's sign-in link land.
 * Says what really happened (it used to say "Email Confirmed!" whatever
 * happened): signed in, confirmed (sign in with the password), or the link
 * didn't work here and what to do instead.
 */
const EmailConfirmationPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const signInLink = params.get('via') === 'link';
  const [status, setStatus] = useState<Status>('checking');
  const [reason, setReason] = useState('');

  useEffect(() => {
    // The email server reports an expired or used link in the address
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const error = params.get('error_description') || hash.get('error_description') || params.get('error') || hash.get('error');
    if (error) {
      setReason(/expired|invalid/i.test(error) ? 'The link has expired or was already used.' : error);
      setStatus('failed');
      return;
    }
    let done = false;
    const finish = (signedIn: boolean) => {
      if (done) return;
      done = true;
      // A sign-up link confirms the email before it gets here, even when it can't sign in
      // this browser (opened somewhere other than where the account was made)
      setStatus(signedIn ? 'signed-in' : signInLink ? 'failed' : 'confirmed');
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) finish(true);
    });
    // getSession waits for the link's sign-in to be tried
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
      else setTimeout(() => finish(false), 1500);
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed in: carry on to where they were heading
  useEffect(() => {
    if (status !== 'signed-in') return;
    const t = setTimeout(() => navigate(takeNext(null), { replace: true }), 1500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  const card = 'w-full max-w-md rounded-3xl bg-white/95 p-8 text-center shadow-2xl dark:bg-slate-800/95';
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      {status === 'checking' ? (
        <div className={card} data-testid="email-link-status">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
          <p className="mt-4 text-[16px] text-gray-600 dark:text-gray-300">{signInLink ? 'Signing you in…' : 'Confirming your email…'}</p>
        </div>
      ) : status === 'failed' ? (
        <div className={card} data-testid="email-link-status">
          <MailWarning className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">That link didn't work</h1>
          <p className="mt-3 text-[15px] leading-snug text-gray-600 dark:text-gray-300">
            {reason || 'It may have expired or been used already, or it was opened somewhere other than where you asked for it.'}
          </p>
          <ul className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left text-[13.5px] leading-snug text-gray-600 dark:bg-slate-700/50 dark:text-gray-300">
            <li>• Use the newest email: asking again makes older links stop working.</li>
            <li>• Open it on the same phone, in the same app or browser, where you asked for it.</li>
            <li>• Or sign in with your password, or with Google.</li>
          </ul>
          <div className="mt-6 space-y-2.5">
            <Button onClick={() => navigate('/auth', { replace: true })} className="h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white">
              Go to sign in
            </Button>
            <Button variant="outline" onClick={() => navigate('/', { replace: true })} className="h-12 w-full rounded-2xl border-2 font-semibold">
              Go to Home
            </Button>
          </div>
        </div>
      ) : (
        <div className={card} data-testid="email-link-status">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {status === 'signed-in' ? (signInLink ? "You're signed in" : 'Email confirmed') : 'Email confirmed'}
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-gray-600 dark:text-gray-300">
            {status === 'signed-in'
              ? `Welcome to ${church.name}. Taking you in…`
              : 'Your account is ready. Sign in with your email and the password you chose.'}
          </p>
          <Button
            onClick={() => navigate(status === 'signed-in' ? takeNext(null) : '/auth', { replace: true })}
            className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white"
          >
            {status === 'signed-in' ? 'Continue' : 'Sign in'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmailConfirmationPage;
