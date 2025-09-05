import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const EmailConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Confirming your email...');

  useEffect(() => {
    const confirm = async () => {
      try {
        const tokenHash = window.location.hash; // Supabase may append hash params
        const hasType = searchParams.get('type');

        // If we came from email link, let Supabase process the URL
        if (tokenHash || hasType) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error checking session:', error);
          }
          // Supabase handles verification via redirect, so simply show success if user exists
          const user = data.session?.user;
          if (user && user.email_confirmed_at) {
            setStatus('success');
            setMessage('Your email has been confirmed successfully.');
            return;
          }
        }

        // Fallback: try to exchange code if provided as query
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
          if (data.session?.user?.email_confirmed_at) {
            setStatus('success');
            setMessage('Your email has been confirmed successfully.');
            return;
          }
        }

        // As a final attempt, re-fetch session after a tick
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.email_confirmed_at) {
            setStatus('success');
            setMessage('Your email has been confirmed successfully.');
          } else {
            setStatus('error');
            setMessage('We could not verify your email from this link. Please try signing in.');
          }
        }, 500);
      } catch (err) {
        console.error('Email confirmation error:', err);
        setStatus('error');
        setMessage('We could not verify your email. Please try signing in.');
      }
    };

    confirm();
  }, [searchParams]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-3xl font-bold mb-4">Email Confirmation</h1>
      <p className={`mb-6 ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>{message}</p>
      <div className="flex gap-3">
        <Button onClick={() => navigate('/')}>Go to Home</Button>
        <Button variant="outline" onClick={() => navigate('/auth')}>Sign In</Button>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;

