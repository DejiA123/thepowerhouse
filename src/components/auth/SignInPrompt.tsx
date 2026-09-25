import { useNavigate } from 'react-router-dom';
import { Lock, MessageCircle, Phone, Video, type LucideIcon } from 'lucide-react';
import { authUrl } from '@/lib/authRedirect';
import { cn } from '@/lib/utils';

export interface SignInReason {
  title: string;
  message: string;
  icon?: LucideIcon;
  /** Show the chat + voice + video trio instead of a single icon. */
  messaging?: boolean;
}

export const MESSAGING_REASON: SignInReason = {
  title: 'Messages & calls',
  message: 'Sign in to chat and make voice and video calls with your church family. It only takes a minute.',
  messaging: true,
};

/**
 * Shown instead of a members-only page (or action) to people who aren't signed
 * in: explains why, and offers Sign in / Create account. After signing in they
 * come straight back to what they were doing.
 */
const SignInPrompt = ({ reason, next, className }: { reason?: SignInReason; next: string; className?: string }) => {
  const navigate = useNavigate();
  const r = reason ?? { title: 'Members only', message: 'Sign in or create a free account to continue.' };
  const Icon = r.icon ?? Lock;

  return (
    <div className={cn('flex min-h-[70vh] items-center justify-center px-6 py-12', className)}>
      <div className="w-full max-w-sm text-center">
        {r.messaging ? (
          <div className="mx-auto mb-6 flex items-center justify-center gap-3">
            {[MessageCircle, Phone, Video].map((I, i) => (
              <span
                key={i}
                className={cn(
                  'flex items-center justify-center rounded-2xl text-white shadow-lg',
                  i === 1 ? 'h-16 w-16 bg-blue-600 shadow-blue-600/30' : 'h-12 w-12 bg-blue-500/90 shadow-blue-500/20',
                )}
              >
                <I className={i === 1 ? 'h-7 w-7' : 'h-5 w-5'} />
              </span>
            ))}
          </div>
        ) : (
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <Icon className="h-7 w-7" />
          </span>
        )}
        <h1 className="font-outfit text-[28px] font-extrabold leading-tight tracking-tight text-foreground">{r.title}</h1>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted-foreground">{r.message}</p>
        <div className="mt-7 space-y-3">
          <button
            onClick={() => navigate(authUrl(next, 'signin'))}
            className="h-12 w-full rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98]"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate(authUrl(next, 'signup'))}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-card text-base font-bold text-foreground transition active:scale-[0.98] dark:border-slate-700"
          >
            Create an account
          </button>
        </div>
        <button onClick={() => navigate('/')} className="mt-5 text-sm font-medium text-muted-foreground hover:text-foreground">
          Not now
        </button>
      </div>
    </div>
  );
};

export default SignInPrompt;
