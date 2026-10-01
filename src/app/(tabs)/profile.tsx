import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { clearTasksCache } from '@/lib/tasks';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();

  async function logout() {
    await clearTasksCache();
    await supabase.auth.signOut();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText>{session?.user.email}</ThemedText>

        <Pressable style={styles.premium} onPress={() => router.push('/premium')}>
          <ThemedText style={styles.btnText}>Go Premium ✨</ThemedText>
        </Pressable>
        <Pressable style={styles.logout} onPress={logout}>
          <ThemedText style={styles.btnText}>Log Out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  premium: { backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  logout: { backgroundColor: '#ef4444', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});