import type { Session, User } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

// Utility function for logging
const debugLog = (message: string, data?: any) => {
  console.log(`[AUTH DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Utility for handling errors
const handleError = (err: unknown, defaultMessage: string): Error => {
  return err instanceof Error ? err : new Error(defaultMessage);
};

// Timeout wrapper for async operations
const withTimeout = async <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeout]);
};

// Retry logic for async operations
const withRetry = async <T>(fn: () => Promise<T>, retries: number, delayMs: number): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        debugLog('Retrying operation', { attempt: i + 1, error: String(err) });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

// Singleton for auth state change listener
let authListener: { unsubscribe: () => void } | null = null;

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  needsProfileCompletion: boolean | null;
}

export const useAuth = () => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
    needsProfileCompletion: null,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce utility
  const debounce = (fn: () => Promise<void>, delay: number) => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(async () => {
        await fn();
      }, delay);
    };
  };

  // Check if profile completion is needed
  const checkProfileCompletion = useCallback(async (userId: string): Promise<boolean> => {
    try {
      debugLog('Checking profile completion for user', { userId });

      // Refresh session to ensure valid token
      debugLog('Refreshing session before RPC');
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        debugLog('Session refresh error', { error: refreshError.message });
        throw refreshError;
      }
      debugLog('Session refreshed', { hasSession: !!session, userId: session?.user?.id });

      const rpcPromise = async (): Promise<{ data: boolean | null; error: PostgrestError | null }> => {
        return await supabase.rpc('should_user_complete_profile').single();
      };

      const { data, error } = await withRetry(
        () => withTimeout(rpcPromise(), 10000, 'Profile completion check timed out'),
        3,
        1500
      );

      debugLog('Profile completion check result', { data, error });

      if (error) {
        debugLog('Error checking profile completion', { error: error.message });
        throw error;
      }

      const needsCompletion = !data;
      debugLog('Needs profile completion', { needsCompletion });
      return needsCompletion;
    } catch (err) {
      debugLog('Exception in checkProfileCompletion', {
        error: err instanceof Error ? err.message : String(err),
      });
      return true; // Assume incomplete if error
    }
  }, []);

  // Check initial session (no profile check)
  useEffect(() => {
    const initializeSession = async () => {
      try {
        debugLog('Initializing session');
        const { data: { session } } = await supabase.auth.getSession();
        debugLog('Initial session retrieved', {
          hasSession: !!session,
          userId: session?.user?.id,
        });

        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
          needsProfileCompletion: null,
        });
      } catch (err) {
        debugLog('Error initializing session', {
          error: err instanceof Error ? err.message : String(err),
        });
        setAuthState({
          session: null,
          user: null,
          loading: false,
          error: handleError(err, t('error.initializeSession')),
          needsProfileCompletion: null,
        });
      }
    };
    initializeSession();
  }, [t]);

  // Listen for auth state changes
  useEffect(() => {
    debugLog('Setting up auth state change listener');
    if (!authListener) {
      const listener = supabase.auth.onAuthStateChange(async (event, session) => {
        debugLog('Auth state changed', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
        });

        if (event === 'SIGNED_IN' && session?.user?.id) {
          const updateProfileState = async () => {
            try {
              const needsProfileCompletion = await checkProfileCompletion(session.user.id);
              debugLog('Updating auth state after SIGNED_IN', {
                event,
                hasSession: !!session,
                userId: session.user.id,
                needsProfileCompletion,
              });
              setAuthState({
                session,
                user: session.user,
                loading: false,
                error: null,
                needsProfileCompletion,
              });
            } catch (err) {
              debugLog('Error during SIGNED_IN profile check', {
                error: err instanceof Error ? err.message : String(err),
              });
              setAuthState({
                session,
                user: session.user,
                loading: false,
                error: null,
                needsProfileCompletion: true,
              });
            }
          };
          // Debounce profile check to avoid concurrent calls
          debounce(updateProfileState, 500)();
        } else {
          debugLog('Updating auth state for non-SIGNED_IN event', { event });
          setAuthState({
            session,
            user: session?.user ?? null,
            loading: false,
            error: null,
            needsProfileCompletion: null,
          });
        }
      });
      authListener = listener.data.subscription;
    }

    return () => {
      debugLog('Cleaning up auth state change listener');
      if (authListener) {
        authListener.unsubscribe();
        authListener = null;
      }
    };
  }, [checkProfileCompletion]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      debugLog('Starting Google Sign-In');
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const redirectUrl = makeRedirectUri({ scheme: 'cendy', path: 'auth' });
      debugLog('Redirect URL', { redirectUrl });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        debugLog('OAuth initialization error', { error: error.message });
        throw error;
      }

      if (!data.url) {
        debugLog('No OAuth URL received');
        throw new Error(t('error.noOAuthUrl'));
      }

      debugLog('Opening OAuth session', { url: data.url });
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      debugLog('OAuth session result', { result });

      if (result.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        debugLog('OAuth params', { params, errorCode });

        if (errorCode || params.error) {
          debugLog('OAuth error received', { errorCode, error: params.error });
          const errorMessage =
            params.error_description === '403: Only student email addresses are allowed'
              ? t('error.studentEmailRequired')
              : `${t('error.oauthError')}: ${errorCode || params.error}`;
          throw new Error(errorMessage);
        }

        const { access_token, refresh_token } = params;
        if (!access_token) {
          debugLog('No access token received');
          throw new Error(t('error.noAccessToken'));
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        debugLog('Session set result', {
          hasSession: !!sessionData.session,
          userId: sessionData.session?.user?.id,
          sessionError,
        });

        if (sessionError) {
          debugLog('Session error', { error: sessionError.message });
          throw sessionError;
        }
      } else {
        debugLog('OAuth session not successful', { result });
        throw new Error(t('error.oauthCanceled'));
      }
    } catch (err) {
      debugLog('Google Sign-In error', {
        error: err instanceof Error ? err.message : String(err),
      });
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: handleError(err, t('error.signIn')),
        needsProfileCompletion: null,
      }));
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      debugLog('Starting sign out');
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signOut();
      if (error) {
        debugLog('Sign out error', { error: error.message });
        throw error;
      }
      debugLog('Sign out successful');
      setAuthState({
        session: null,
        user: null,
        loading: false,
        error: null,
        needsProfileCompletion: null,
      });
    } catch (err) {
      debugLog('Sign out error', {
        error: err instanceof Error ? err.message : String(err),
      });
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: handleError(err, t('error.signOut')),
        needsProfileCompletion: null,
      }));
    }
  };

  // Get current session
  const getSession = async () => {
    try {
      debugLog('Getting current session');
      const { data: { session } } = await supabase.auth.getSession();
      let needsProfileCompletion: boolean | null = null;
      if (session?.user?.id) {
        needsProfileCompletion = await checkProfileCompletion(session.user.id);
      }
      debugLog('Session retrieved', {
        hasSession: !!session,
        userId: session?.user?.id,
        needsProfileCompletion,
      });
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
        needsProfileCompletion,
      }));
      return session;
    } catch (err) {
      debugLog('Error getting session', {
        error: err instanceof Error ? err.message : String(err),
      });
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: handleError(err, t('error.getSession')),
        needsProfileCompletion: null,
      }));
      return null;
    }
  };

  return {
    session: authState.session,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    needsProfileCompletion: authState.needsProfileCompletion,
    signInWithGoogle,
    signOut,
    getSession,
  };
};