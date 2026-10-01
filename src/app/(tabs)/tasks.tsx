import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { addTask, fetchTasks, removeTask, setCompleted } from '@/lib/tasks';
import { Priority, Task } from '@/types/task';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const COLORS: Record<Priority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};
function sortTasks(list: Task[]): Task[] {
  return [...list].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      b.created_at.localeCompare(a.created_at),
  );
}
export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTasks(await fetchTasks());
    } catch (e: any) {
      Alert.alert('Could not load tasks', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAdd() {
    const text = title.trim();
    if (!text) return;
    try {
      await addTask(text, priority);
      setTitle('');
      await load();
    } catch (e: any) {
      Alert.alert('Could not add task', e.message);
    }
  }

  async function onToggle(task: Task) {
    // Update the screen immediately, then save to the database
        setTasks((prev) =>
      sortTasks(
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
      ),
    );
    try {
      await setCompleted(task.id, !task.completed);
    } catch (e: any) {
      Alert.alert('Could not update task', e.message);
      load();
    }
  }

  function onDelete(task: Task) {
    Alert.alert('Delete task?', task.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeTask(task.id);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
          } catch (e: any) {
            Alert.alert('Could not delete task', e.message);
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.wrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedText type="title">Tasks</ThemedText>

          <View style={styles.addBox}>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
              onSubmitEditing={onAdd}
              returnKeyType="done"
            />
            <View style={styles.row}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.chip,
                    { borderColor: COLORS[p] },
                    priority === p && { backgroundColor: COLORS[p] },
                  ]}>
                  <ThemedText style={[styles.chipText, priority === p && { color: '#fff' }]}>
                    {p}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable style={styles.addBtn} onPress={onAdd}>
                <ThemedText style={styles.addText}>Add</ThemedText>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    load();
                  }}
                />
              }
              ListEmptyComponent={
                <ThemedText style={styles.empty}>
                  No tasks yet. Add your first one above.
                </ThemedText>
              }
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <Pressable onPress={() => onToggle(item)} style={styles.check}>
                    <ThemedText style={styles.checkText}>{item.completed ? '☑' : '☐'}</ThemedText>
                  </Pressable>

                  <View style={[styles.dot, { backgroundColor: COLORS[item.priority] }]} />

                  <ThemedText
                    style={[styles.itemTitle, item.completed && styles.done]}
                    numberOfLines={2}>
                    {item.title}
                  </ThemedText>

                  <Pressable onPress={() => onDelete(item)} style={styles.del}>
                    <ThemedText style={styles.delText}>✕</ThemedText>
                  </Pressable>
                </View>
              )}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  addBox: { gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    marginLeft: 'auto',
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  addText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#888',
  },
  check: { padding: 4 },
  checkText: { fontSize: 24 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemTitle: { flex: 1, fontSize: 16 },
  done: { textDecorationLine: 'line-through', opacity: 0.5 },
  del: { padding: 8 },
  delText: { color: '#ef4444', fontSize: 18, fontWeight: '700' },
});