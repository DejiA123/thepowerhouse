import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth state changed:', event, !!session);
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
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
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
      await supabase.auth.signOut();
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