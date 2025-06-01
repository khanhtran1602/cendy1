import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
  isNewUser: boolean | null;
}

export const useAuth = () => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
    isNewUser: null,
  });

  // Check initial session and profile
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const isNewUser = await checkProfile(session.user.id);
          setAuthState({
            session,
            user: session.user,
            loading: false,
            error: null,
            isNewUser,
          });
        } else {
          setAuthState({
            session: null,
            user: null,
            loading: false,
            error: null,
            isNewUser: null,
          });
        }
      } catch (err) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error(t('error.initializeSession')),
          isNewUser: null,
        }));
      }
    };
    initializeSession();
  }, [t]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const isNewUser = await checkProfile(session.user.id);
        setAuthState((prev) => ({
          ...prev,
          session,
          user: session.user,
          loading: false,
          error: null,
          isNewUser,
        }));
      } else {
        setAuthState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
          isNewUser: null,
        }));
      }
    });
    return () => subscription.unsubscribe();
  }, [t]);

  // Check user profile via Database Function
  const checkProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('check_profile', { user_id: userId });
      if (error) throw new Error(error.message);
      return data.is_new_user ?? false;
    } catch {
      return false; // Default to returning user on error
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const redirectUrl = makeRedirectUri({ scheme: 'cendy', path: 'auth' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error(t('error.noOAuthUrl'));

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        if (errorCode) throw new Error(`${t('error.oauthError')}: ${errorCode}`);

        const { access_token, refresh_token } = params;
        if (!access_token) throw new Error(t('error.noAccessToken'));

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) throw sessionError;

        const isNewUser = await checkProfile(sessionData.session?.user?.id ?? '');
        setAuthState((prev) => ({
          ...prev,
          session: sessionData.session,
          user: sessionData.session?.user ?? null,
          loading: false,
          error: null,
          isNewUser,
        }));
      } else {
        throw new Error(t('error.oauthCanceled'));
      }
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(t('error.signIn')),
        isNewUser: null,
      }));
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthState({
        session: null,
        user: null,
        loading: false,
        error: null,
        isNewUser: null,
      });
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(t('error.signOut')),
        isNewUser: null,
      }));
    }
  };

  // Get current session
  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let isNewUser: boolean | null = null;
      if (session && session.user) {
        isNewUser = await checkProfile(session.user.id);
      }
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
        isNewUser,
      }));
      return session;
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error(t('error.getSession')),
        isNewUser: null,
      }));
      return null;
    }
  };

    // Set isNewUser state
    const setIsNewUser = (isNewUser: boolean | null) => {
      setAuthState((prev) => ({
        ...prev,
        isNewUser,
      }));
    };

  return {
    session: authState.session,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isNewUser: authState.isNewUser,
    signInWithGoogle,
    signOut,
    getSession,
    setIsNewUser,
  };
};