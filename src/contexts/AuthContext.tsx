import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { detachPushFromUser } from '@/lib/push';
import { installOfflineAuth, isOffline, storedSession } from '@/lib/offlineAuth';

installOfflineAuth();

/**
 * Returning from Google carries ?code=… (or ?error=… when it failed or was
 * cancelled). Supabase finishes the sign-in and tidies the address; if that
 * doesn't produce a session, say so rather than silently showing the page.
 */
const oauthReturn = (() => {
  // Google returns to the home page (the email link has its own page)
  if (typeof window === 'undefined' || window.location.pathname !== '/') return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = query.get('error_description') || hash.get('error_description') || query.get('error') || hash.get('error');
  const code = query.get('code');
  return error || code ? { error, code } : null;
})();

const reportOAuthProblem = (detail?: string | null) => {
  const cancelled = /access_denied|cancel/i.test(detail || '');
  window.dispatchEvent(
    new CustomEvent('showInAppNotification', {
      detail: {
        kind: cancelled ? 'info' : 'error',
        title: cancelled ? 'Google sign-in cancelled' : "Couldn't finish signing in with Google",
        message: cancelled
          ? 'No problem. You can try again any time.'
          : 'Please try again. If it keeps happening, open the app in Safari or Chrome and sign in there.',
      },
    }),
  );
  // Don't leave the error in the address bar
  try {
    const url = new URL(window.location.href);
    ['error', 'error_code', 'error_description', 'code', 'state'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  } catch {
    /* ignore */
  }
};

// Debug React availability
console.log('AuthContext.tsx: React loaded:', !!React);
console.log('AuthContext.tsx: createContext available:', !!React.createContext);
console.log('AuthContext.tsx: React namespace:', Object.keys(React));

// Ensure React.createContext is available before using it
if (!React || !React.createContext) {
  console.error('AuthContext.tsx: React.createContext is not available!');
  throw new Error('React is not properly loaded');
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any; needsMFA?: boolean; factorId?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  // MFA methods
  getAuthenticatorAssuranceLevel: () => Promise<{ currentLevel: string | null; nextLevel: string | null; factors: any[] }>;
  enrollMFA: () => Promise<{ qrCode: string; secret: string; factorId: string } | null>;
  verifyMFAEnrollment: (factorId: string, code: string) => Promise<{ error: any }>;
  verifyMFA: (factorId: string, code: string) => Promise<{ error: any }>;
  unenrollMFA: (factorId: string) => Promise<{ error: any }>;
  // Email OTP methods
  signInWithOTP: (email: string) => Promise<{ error: any }>;
  verifyOTP: (email: string, token: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('AuthProvider: Initializing...');

  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener...');

    try {
      /**
       * A sign-in that couldn't be renewed (no connection) is still a sign-in:
       * Supabase deletes the saved session when it's truly invalid, so if one
       * is still saved, keep the person signed in until the renewal succeeds.
       */
      const keepSaved = () => {
        const saved = storedSession();
        if (!saved) return false;
        setSession(saved);
        setUser(saved.user);
        setLoading(false);
        return true;
      };

      // Offline: open straight away with the saved sign-in
      if (isOffline()) keepSaved();

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth state changed:', event, !!session);
          if (!session && event !== 'SIGNED_OUT' && keepSaved()) return;
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // Get initial session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          console.log('Initial session loaded:', !!session);
        }
        if (!session && keepSaved()) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (oauthReturn && (!session || oauthReturn.error)) {
          // The banner system mounts just after this; give it a moment
          setTimeout(() => reportOAuthProblem(oauthReturn.error || (error as { message?: string } | null)?.message), 800);
        }
      });

      return () => {
        console.log('AuthProvider: Cleaning up auth listener...');
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth:', error);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        // MFA is required
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];

        if (totpFactor) {
          console.log('MFA required for login');
          return { error: null, needsMFA: true, factorId: totpFactor.id };
        }
      }

      console.log('Sign in successful');
      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('AuthProvider: Attempting sign up...', { email, fullName });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://thepowerhouse.lovable.app/email-confirmation`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      } else {
        console.log('Sign up successful:', data.user);
        return { data, error: null };
      }
    } catch (error) {
      console.error('Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Attempting sign out...');
      // Stop personal (chat/call) pushes to this device before the session ends
      if (!isOffline()) await detachPushFromUser().catch(() => undefined);
      // Offline the server can't be told; sign out on this device regardless
      const { error } = await supabase.auth.signOut(isOffline() ? { scope: 'local' } : undefined);
      if (error) await supabase.auth.signOut({ scope: 'local' });
      // The next person on this phone mustn't see this account's saved data
      try {
        if ('caches' in window) await caches.delete('supabase-data');
      } catch {
        /* ignore */
      }
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // MFA Methods
  const getAuthenticatorAssuranceLevel = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        console.error('Error getting AAL:', error);
        return { currentLevel: null, nextLevel: null, factors: [] };
      }

      // Get enrolled factors
      const { data: factors } = await supabase.auth.mfa.listFactors();

      return {
        currentLevel: data?.currentLevel || null,
        nextLevel: data?.nextLevel || null,
        factors: factors?.all || [],
      };
    } catch (error) {
      console.error('getAuthenticatorAssuranceLevel exception:', error);
      return { currentLevel: null, nextLevel: null, factors: [] };
    }
  };

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error || !data) {
        console.error('MFA enrollment error:', error);
        return null;
      }

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (error) {
      console.error('enrollMFA exception:', error);
      return null;
    }
  };

  const verifyMFAEnrollment = async (factorId: string, code: string) => {
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        return { error: challenge.error };
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      return { error: verify.error };
    } catch (error) {
      console.error('verifyMFAEnrollment exception:', error);
      return { error };
    }
  };

  const verifyMFA = async (factorId: string, code: string) => {
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        return { error: challenge.error };
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      return { error: verify.error };
    } catch (error) {
      console.error('verifyMFA exception:', error);
      return { error };
    }
  };

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      return { error };
    } catch (error) {
      console.error('unenrollMFA exception:', error);
      return { error };
    }
  };

  // Email OTP Methods
  const signInWithOTP = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
      return { error };
    } catch (error) {
      console.error('signInWithOTP exception:', error);
      return { error };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      return { error };
    } catch (error) {
      console.error('verifyOTP exception:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
    getAuthenticatorAssuranceLevel,
    enrollMFA,
    verifyMFAEnrollment,
    verifyMFA,
    unenrollMFA,
    signInWithOTP,
    verifyOTP,
  };

  console.log('AuthProvider: Rendering, loading=', loading, 'user=', !!user);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};