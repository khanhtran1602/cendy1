import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function CompleteProfileScreen() {
  const { session, needsProfileCompletion, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    avatarUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if profile is complete or no session
  useEffect(() => {
    if (!authLoading && session !== null && needsProfileCompletion !== null) {
      console.log('[COMPLETE PROFILE DEBUG] Checking navigation', {
        hasSession: !!session,
        needsProfileCompletion,
      });
      if (!session) {
        router.replace('/(auth)/login');
      } else if (!needsProfileCompletion) {
        router.replace('/(tabs)/home');
      }
    }
  }, [session, needsProfileCompletion, authLoading, router]);

  const handleSubmit = async () => {
    if (!form.displayName.trim() || !form.username.trim()) {
      setError(t('completeProfile.error.requiredFields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[COMPLETE PROFILE DEBUG] Submitting profile', form);
      const { error: rpcError } = await supabase.rpc('complete_user_profile', {
        p_display_name: form.displayName.trim(),
        p_username: form.username.trim(),
        p_avatar_url: form.avatarUrl.trim() || null,
      });

      if (rpcError) {
        console.log('[COMPLETE PROFILE DEBUG] RPC error', { error: rpcError.message });
        if (rpcError.message.includes('duplicate key value violates unique constraint')) {
          throw new Error(t('completeProfile.error.usernameTaken'));
        }
        throw new Error(rpcError.message);
      }

      console.log('[COMPLETE PROFILE DEBUG] Profile submission successful');
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('completeProfile.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  // Handle errors
  useEffect(() => {
    if (error) {
      console.log('[COMPLETE PROFILE DEBUG] Showing error alert', { error });
      Alert.alert(t('error.title'), error);
    }
  }, [error, t]);

  if (authLoading || session === null || needsProfileCompletion === null) {
    return (
      <View style={styles.container}>
        <Text>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('completeProfile.title')}</Text>
      <Text style={styles.label}>{t('completeProfile.displayName')}</Text>
      <TextInput
        style={styles.input}
        value={form.displayName}
        onChangeText={(text) => setForm((prev) => ({ ...prev, displayName: text }))}
        placeholder={t('completeProfile.displayNamePlaceholder')}
        autoCapitalize="words"
      />
      <Text style={styles.label}>{t('completeProfile.username')}</Text>
      <TextInput
        style={styles.input}
        value={form.username}
        onChangeText={(text) => setForm((prev) => ({ ...prev, username: text }))}
        placeholder={t('completeProfile.usernamePlaceholder')}
        autoCapitalize="none"
      />
      <Text style={styles.label}>{t('completeProfile.avatarUrl')}</Text>
      <TextInput
        style={styles.input}
        value={form.avatarUrl}
        onChangeText={(text) => setForm((prev) => ({ ...prev, avatarUrl: text }))}
        placeholder={t('completeProfile.avatarUrlPlaceholder')}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Button
        title={loading ? t('completeProfile.submitting') : t('completeProfile.submit')}
        onPress={handleSubmit}
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
  label: {
    fontSize: 16,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
});