import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { appAlert } from '@/lib/appAlert';
import { takeNext } from '@/lib/authRedirect';
import { finishGoogleSignIn } from '@/lib/googleSignIn';

/** Where Google sends people back after "Continue with Google" (see lib/googleSignIn). */
const GoogleSignInPage = () => {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    finishGoogleSignIn().then((result) => {
      if (result.ok) {
        navigate(takeNext(), { replace: true });
        return;
      }
      if (result.reason === 'expired') {
        appAlert('Sign-in took too long', 'Please tap Continue with Google again.', 'info');
      } else if (result.reason === 'failed') {
        console.error('[google sign-in]', result.message);
        appAlert("Google sign-in didn't finish", 'Please try again in a moment.', 'error');
      }
      navigate('/auth', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="text-[15px] text-muted-foreground">Signing you in…</p>
    </div>
  );
};

export default GoogleSignInPage;
