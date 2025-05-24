import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  // Check initial session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session:', session ? 'Found' : 'Not found');
        setAuthState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Error initializing session:', err);
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error('Failed to initialize session'),
        }));
      }
    };
    initializeSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'Session present' : 'No session');
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
      }));
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const redirectUrl = makeRedirectUri({ scheme: 'cendy', path: 'auth' });
      console.log('Redirect URL:', redirectUrl); // Debug: Log redirect URL

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl, // cendy://auth
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Supabase OAuth error:', error.message);
        throw error;
      }
      if (!data.url) {
        console.error('No OAuth URL returned from Supabase');
        throw new Error('No OAuth URL returned');
      }
      console.log('OAuth URL:', data.url); // Debug: Log OAuth URL

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log('WebBrowser result:', result); // Debug: Log browser result

      if (result.type === 'success') {
        const { params, errorCode } = QueryParams.getQueryParams(result.url);
        console.log('Redirect params:', params, 'Error code:', errorCode); // Debug: Log params

        if (errorCode) throw new Error(`OAuth error: ${errorCode}`);

        const { access_token, refresh_token } = params;
        if (!access_token) throw new Error('No access token received');

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          console.error('Session error:', sessionError.message);
          throw sessionError;
        }

        console.log('Session set:', sessionData.session ? 'Success' : 'Failed');
        setAuthState((prev) => ({
          ...prev,
          session: sessionData.session,
          user: sessionData.session?.user ?? null,
          loading: false,
          error: null,
        }));
      } else {
        console.warn('OAuth flow result:', result.type);
        throw new Error('OAuth flow canceled or failed');
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Unknown error during sign-in'),
      }));
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Signed out successfully');
      setAuthState({
        session: null,
        user: null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Sign-out error:', err);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to sign out'),
      }));
    }
  };

  // Get current session
  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'Found' : 'Not found');
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
        error: null,
      }));
      return session;
    } catch (err) {
      console.error('Get session error:', err);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to get session'),
      }));
      return null;
    }
  };

  return {
    session: authState.session,
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signInWithGoogle,
    signOut,
    getSession,
  };
};