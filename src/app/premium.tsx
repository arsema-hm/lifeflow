import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const FEATURES = [
  'Unlimited tasks and reminders',
  'Voice notes on every task',
  'Advanced statistics',
  'Cloud backup',
];

export default function PremiumScreen() {
  const router = useRouter();
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title">LifeFlow Premium ✨</ThemedText>
        <View style={styles.list}>
          {FEATURES.map((f) => (
            <ThemedText key={f} style={styles.feature}>
              ✓ {f}
            </ThemedText>
          ))}
        </View>
        <ThemedText style={styles.price}>$2.99 / month</ThemedText>

        <Pressable
          style={styles.upgrade}
          onPress={() =>
            Alert.alert(
              'Demo only',
              'In production this button starts an App Store / Google Play subscription through RevenueCat.',
            )
          }>
          <ThemedText style={styles.upgradeText}>Upgrade</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={{ textAlign: 'center', opacity: 0.7 }}>Maybe later</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24, justifyContent: 'center', gap: 20 },
  list: { gap: 12 },
  feature: { fontSize: 17 },
  price: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  upgrade: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  upgradeText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});