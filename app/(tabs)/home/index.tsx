import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';

export default function HomeScreen() {
  const { session, user, signOut, loading, error } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Redirect to login if no session
  useEffect(() => {
    if (!session && !loading) {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert(t('error.title'), error.message || t('error.generic'));
    }
  }, [error]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      Alert.alert(t('error.title'), t('error.signOut'));
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>{t('loading')}</Text>
      ) : user ? (
        <>
          <Text style={styles.welcome}>
            {t('home.welcome', { name: user.user_metadata?.name || 'User' })}
          </Text>
          <Button title={t('home.signOut')} onPress={handleSignOut} />
        </>
      ) : (
        <Text>{t('home.noUser')}</Text>
      )}
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
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});