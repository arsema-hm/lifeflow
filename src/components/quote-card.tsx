import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Quote = { quote: string; author: string };
const KEY = 'last_quote_v1';

export function QuoteCard() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://dummyjson.com/quotes/random');
      if (!res.ok) throw new Error('Bad response');
      const json = await res.json();
      const q: Quote = { quote: json.quote, author: json.author };
      setQuote(q);
      await AsyncStorage.setItem(KEY, JSON.stringify(q));
    } catch {
      const saved = await AsyncStorage.getItem(KEY);
      setQuote(
        saved ? JSON.parse(saved) : { quote: 'Small progress is still progress.', author: 'LifeFlow' },
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.card}>
      <ThemedText style={styles.label}>Today&apos;s focus</ThemedText>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <ThemedText style={styles.quote}>&ldquo;{quote?.quote}&rdquo;</ThemedText>
          <ThemedText style={styles.author}>— {quote?.author}</ThemedText>
        </>
      )}
      <Pressable onPress={load} style={styles.refresh}>
        <ThemedText style={styles.refreshText}>↻ Refresh</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0f766e', borderRadius: 16, padding: 20, gap: 8 },
  label: { color: '#ccfbf1', fontSize: 13 },
  quote: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 26 },
  author: { color: '#ccfbf1', fontSize: 13 },
  refresh: { alignSelf: 'flex-start', marginTop: 4 },
  refreshText: { color: '#fff', fontWeight: '700' },
});