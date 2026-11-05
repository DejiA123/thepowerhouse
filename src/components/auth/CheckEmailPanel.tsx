import { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { appAlert } from '@/lib/appAlert';
import { appUrl } from '@/lib/authRedirect';

const WAIT_S = 60;

/**
 * After signing up (or trying to sign in before confirming): where the email
 * went, what to check, and a way to send it again, fix the address, or use
 * Google instead. Never a dead end.
 */
const CheckEmailPanel = ({ email, onChangeEmail, onSignIn, onGoogle, googleBusy }: {
  email: string;
  onChangeEmail: () => void;
  onSignIn: () => void;
  onGoogle: () => void;
  googleBusy: boolean;
}) => {
  const [wait, setWait] = useState(WAIT_S);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: appUrl('/email-confirmation') } });
    setSending(false);
    if (error) {
      const busy = error.status === 429 || /rate limit|too many|security purposes/i.test(error.message);
      appAlert(
        busy ? "Couldn't send it just now" : "Couldn't send the email",
        busy ? 'Too many emails were sent in the last hour. Try again later, or continue with Google.' : error.message,
        'error',
      );
      return;
    }
    setWait(WAIT_S);
    appAlert('Sent again', `Check ${email} in a minute or two (and the Spam folder).`, 'success');
  };

  return (
    <div className="space-y-5 text-center" data-testid="check-email">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
        <MailCheck className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Check your email</h3>
        <p className="mt-2 text-[15px] leading-snug text-gray-600 dark:text-gray-300">
          We sent a link to <span className="break-all font-semibold text-gray-900 dark:text-gray-100">{email}</span>. Tap it to finish creating your account, then sign in.
        </p>
      </div>
      <ul className="space-y-1.5 rounded-2xl bg-slate-50 p-4 text-left text-[13.5px] leading-snug text-gray-600 dark:bg-slate-700/50 dark:text-gray-300">
        <li>• It can take a few minutes to arrive.</li>
        <li>• Look in Junk or Spam too. On Yahoo it's the “Spam” folder.</li>
        <li>• Search your inbox for “Confirm Your Signup”.</li>
      </ul>
      <div className="space-y-2.5">
        <Button type="button" onClick={resend} disabled={wait > 0 || sending} className="h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-semibold text-white">
          {sending ? 'Sending…' : wait > 0 ? `Send it again in ${wait}s` : 'Send the email again'}
        </Button>
        <Button type="button" variant="outline" onClick={onSignIn} className="h-12 w-full rounded-2xl border-2 font-semibold">
          I've confirmed: sign in
        </Button>
        <Button type="button" variant="outline" onClick={onGoogle} disabled={googleBusy} className="h-12 w-full rounded-2xl border-2 font-semibold">
          {googleBusy ? 'Opening Google…' : 'Use Google instead'}
        </Button>
        <button type="button" onClick={onChangeEmail} className="w-full py-2 text-[14px] font-semibold text-blue-600 dark:text-blue-400">
          Wrong address? Change it
        </button>
      </div>
    </div>
  );
};

export default CheckEmailPanel;
