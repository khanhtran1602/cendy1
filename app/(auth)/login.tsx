import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithGoogle, session, needsProfileCompletion, loading, error } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Handle navigation based on auth state
  useEffect(() => {
    if (session && needsProfileCompletion !== null) {
      console.log('[LOGIN DEBUG] Navigating based on auth state', {
        hasSession: !!session,
        needsProfileCompletion,
      });
      if (needsProfileCompletion) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, needsProfileCompletion, router]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.log('[LOGIN DEBUG] Showing error alert', { error: error.message });
      Alert.alert(t('error.title'), error.message || t('error.generic'));
    }
  }, [error, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('login.title')}</Text>
      <Button
        title={loading ? t('login.signingIn') : t('login.signIn')}
        onPress={signInWithGoogle}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});