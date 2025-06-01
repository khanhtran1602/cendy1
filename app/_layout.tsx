import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../i18n/i18n'; // Initialize i18next
import { supabase } from '../lib/supabase';
// Dismiss the in-app browser after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  // Clean up Supabase subscriptions on unmount
  useEffect(() => {
    return () => {
      supabase.auth.onAuthStateChange(() => {}).data.subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}