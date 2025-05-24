import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { signInWithGoogle, session, loading, error } = useAuth();
  const router = useRouter();

  // Redirect to homepage if already signed in
  useEffect(() => {
    if (session) {
      router.replace('/(tab)');
    }
  }, [session]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    }
  }, [error]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Cendy</Text>
      <Button
        title={loading ? 'Signing in...' : 'Log in with Google'}
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