import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuoteCard } from '@/components/quote-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDue, isOverdue } from '@/lib/dates';
import { fetchTasks } from '@/lib/tasks';
import { useAuth } from '@/providers/AuthProvider';
import { Task } from '@/types/task';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks().then(setTasks).catch(() => {});
    }, []),
  );

  const name = session?.user.email?.split('@')[0] ?? '';
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const overdue = tasks.filter((t) => isOverdue(t.due_date, t.completed)).length;

  const upNext = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
    .slice(0, 3);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">
            {greeting()}, {name}
          </ThemedText>

          <View style={styles.card}>
            <ThemedText style={styles.cardLabel}>Today&apos;s progress</ThemedText>
            <ThemedText style={styles.big}>{percent}%</ThemedText>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
            <ThemedText style={styles.cardLabel}>
              {done} of {total} tasks done
            </ThemedText>
          </View>

          {overdue > 0 && (
            <View style={[styles.card, { backgroundColor: '#7f1d1d' }]}>
              <ThemedText style={styles.big}>{overdue}</ThemedText>
              <ThemedText style={styles.cardLabel}>
                overdue {overdue === 1 ? 'task' : 'tasks'}
              </ThemedText>
            </View>
          )}

          <QuoteCard />

          <ThemedText type="subtitle">Up next</ThemedText>
          {upNext.length === 0 ? (
            <ThemedText style={{ opacity: 0.6 }}>
              Nothing pending. Add tasks in the Tasks tab.
            </ThemedText>
          ) : (
            upNext.map((t) => (
              <View key={t.id} style={styles.next}>
                <ThemedText style={{ flex: 1 }} numberOfLines={1}>
                  {t.title}
                </ThemedText>
                {t.due_date && (
                  <ThemedText style={isOverdue(t.due_date, t.completed) ? styles.late : styles.soon}>
                    {formatDue(t.due_date)}
                  </ThemedText>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  card: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, gap: 6 },
  cardLabel: { color: '#e0e7ff', fontSize: 14 },
  big: { color: '#fff', fontSize: 44, fontWeight: '800', lineHeight: 52 },
  track: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 10, backgroundColor: '#fff' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
  },
  soon: { opacity: 0.6, fontSize: 13 },
  late: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
});