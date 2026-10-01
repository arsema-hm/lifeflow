import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { session } = useAuth();

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText>{session?.user.email}</ThemedText>

        <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
          <ThemedText style={styles.logoutText}>Log Out</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  logout: { backgroundColor: '#ef4444', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  logoutText: { color: '#fff', fontWeight: '700' },
});