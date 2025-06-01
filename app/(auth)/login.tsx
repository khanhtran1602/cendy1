import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithGoogle, session, isNewUser, loading, error } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Redirect based on auth state
  useEffect(() => {
    if (session) {
      if (isNewUser === true) {
        router.replace('/(auth)/onboarding');
      } else if (isNewUser === false) {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, isNewUser]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert(t('error.title'), error.message || t('error.generic'));
    }
  }, [error]);

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