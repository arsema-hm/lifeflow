import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(mode: 'login' | 'signup') {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check your details', 'Enter an email and a password of at least 6 characters.');
      return;
    }

    setBusy(true);
    const credentials = { email: email.trim(), password };
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(false);

    if (error) Alert.alert('Something went wrong', error.message);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title" style={styles.center}>
            LifeFlow
          </ThemedText>
          <ThemedText type="small" style={styles.center}>
            Plan your day. Stay on track.
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {busy ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              <Pressable style={styles.primary} onPress={() => submit('login')}>
                <ThemedText style={styles.primaryText}>Log In</ThemedText>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => submit('signup')}>
                <ThemedText style={styles.secondaryText}>Create account</ThemedText>
              </Pressable>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  form: { gap: 12 },
  center: { textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  primary: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { padding: 14, alignItems: 'center' },
  secondaryText: { color: '#4f46e5', fontWeight: '600' },
});