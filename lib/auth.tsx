import * as React from 'react';

import { supabase } from '@/lib/supabase';

export type User = {
  id: string;
  email?: string;
  aud?: string;
  role?: string;
  email_confirmed_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at?: string;
  [key: string]: any;
};

export type Session = {
  user: User;
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      if (mounted) {
        setSession(nextSession);
        setError(null);
        setIsLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }: any) => {
      if (!mounted) return;
      setSession(data?.session ?? null);
      setError(sessionError ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, session, isLoading, error, signOut }),
    [session, isLoading, error, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
