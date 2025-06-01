import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const formSchema = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters'),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export default function OnboardingScreen() {
  const { session, user, isNewUser, loading, error, setIsNewUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      avatarUrl: '',
    },
  });

  // Redirect based on auth state
  useEffect(() => {
    if (!session || !user) {
      router.replace('/(auth)/login');
    } else if (isNewUser === false) {
      router.replace('/(tabs)/home');
    }
  }, [session, user, isNewUser]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert(t('error.title'), error.message || t('error.generic'));
    }
  }, [error]);

  const onSubmit = async (data: FormData) => {
    try {
      if (!user) throw new Error('No user found');

      const { data: result, error } = await supabase.rpc('update_profile', {
        user_id: user.id,
        display_name: data.displayName,
        avatar_url: data.avatarUrl || null,
      });

      if (error) throw new Error(error.message);
      if (result.error) throw new Error(result.error);

      if (result.success) {
        // Update auth state to reflect returning user
        setIsNewUser(false);
        router.replace('/(tabs)/home');
      }
    } catch (err) {
      Alert.alert(t('error.title'), t('error.updateProfile'));
    }
  };

  if (loading || isNewUser === null) {
    return <Text>{t('loading')}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('onboarding.title')}</Text>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.displayNamePlaceholder')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {errors.displayName && (
              <Text style={styles.error}>{errors.displayName.message}</Text>
            )}
          </View>
        )}
      />
      <Controller
        control={control}
        name="avatarUrl"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.avatarUrlPlaceholder')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
            {errors.avatarUrl && (
              <Text style={styles.error}>{errors.avatarUrl.message}</Text>
            )}
          </View>
        )}
      />
      <Button title={t('onboarding.submit')} onPress={handleSubmit(onSubmit)} />
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
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '100%',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
});