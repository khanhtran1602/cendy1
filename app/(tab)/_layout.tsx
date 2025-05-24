import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Dismiss the in-app browser after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  // Ensure Supabase client is initialized
  useEffect(() => {
    return () => {
      // Clean up any Supabase subscriptions on unmount
      supabase.auth.onAuthStateChange(() => {}).data.subscription.unsubscribe();
    };
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}