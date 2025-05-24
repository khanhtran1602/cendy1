import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const { session, user, signOut, loading, error } = useAuth();
  const router = useRouter();

  // Redirect to login if no session
  useEffect(() => {
    if (!session && !loading) {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  }, [error]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Loading...</Text>
      ) : user ? (
        <>
          <Text style={styles.welcome}>
            Welcome, {user.user_metadata?.name || 'User'}!
          </Text>
          <Button title="Log out" onPress={handleSignOut} />
        </>
      ) : (
        <Text>No user signed in</Text>
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