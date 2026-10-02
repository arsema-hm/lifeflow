import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VoiceNote } from '@/components/voice-note';
import { DueOption, dueFromOption, formatDue } from '@/lib/dates';
import { remindersSupported, scheduleTaskReminder } from '@/lib/notifications';
import { updateTask } from '@/lib/tasks';
import { Priority, Task } from '@/types/task';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const COLORS: Record<Priority, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};
const DUE_CHOICES: { key: DueOption; label: string }[] = [
  { key: 'none', label: 'No date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'In a week' },
];

type RemindOption = 'none' | '1min' | '1hour' | 'tomorrow';
const REMIND_CHOICES: { key: RemindOption; label: string }[] = [
  { key: 'none', label: 'No change' },
  { key: '1min', label: 'In 1 min' },
  { key: '1hour', label: 'In 1 hour' },
  { key: 'tomorrow', label: 'Tomorrow 9am' },
];

type Props = {
  task: Task | null; // null means the popup is closed
  onClose: () => void;
  onSaved: () => void;
};

export function EditTaskModal({ task, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [due, setDue] = useState<DueOption | 'keep'>('none');
  const [saving, setSaving] = useState(false);
  const [remind, setRemind] = useState<RemindOption>('none');

  // Fill the form only when a different task is opened
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDue(task.due_date ? 'keep' : 'none');
    setRemind('none');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  async function save() {
    if (!task) return;
    if (!title.trim()) {
      Alert.alert('Title needed', 'A task must have a title.');
      return;
    }
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: due === 'keep' ? task.due_date : dueFromOption(due),
      });

      if (remind !== 'none') {
        const when = new Date();
        if (remind === '1min') when.setMinutes(when.getMinutes() + 1);
        if (remind === '1hour') when.setHours(when.getHours() + 1);
        if (remind === 'tomorrow') {
          when.setDate(when.getDate() + 1);
          when.setHours(9, 0, 0, 0);
        }
        const ok = await scheduleTaskReminder(task.id, title.trim(), when);
        if (!ok) {
          Alert.alert(
            'Reminder not set',
            remindersSupported
              ? 'Allow notifications for LifeFlow in your phone settings.'
              : 'Reminders need a development build. They are not available in Expo Go on Android.',
          );
        }
      }

      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!task} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ThemedView style={styles.card}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Edit task</ThemedText>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor="#888"
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Notes (optional)"
              placeholderTextColor="#888"
              multiline
            />

            <ThemedText type="small">Priority</ThemedText>
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
            </View>

            <ThemedText type="small">Due date</ThemedText>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {task?.due_date && (
                <Pressable
                  onPress={() => setDue('keep')}
                  style={[styles.chip, { borderColor: '#4f46e5' }, due === 'keep' && styles.chipOn]}>
                  <ThemedText style={[styles.chipText, due === 'keep' && { color: '#fff' }]}>
                    Keep: {formatDue(task.due_date)}
                  </ThemedText>
                </Pressable>
              )}
              {DUE_CHOICES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setDue(c.key)}
                  style={[styles.chip, { borderColor: '#4f46e5' }, due === c.key && styles.chipOn]}>
                  <ThemedText style={[styles.chipText, due === c.key && { color: '#fff' }]}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {task && (
              <>
                <ThemedText type="small">Voice note</ThemedText>
                <VoiceNote task={task} onSaved={onSaved} />
              </>
            )}

            <ThemedText type="small">Remind me</ThemedText>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {REMIND_CHOICES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setRemind(c.key)}
                  style={[styles.chip, { borderColor: '#4f46e5' }, remind === c.key && styles.chipOn]}>
                  <ThemedText style={[styles.chipText, remind === c.key && { color: '#fff' }]}>
                    {c.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <Pressable style={styles.cancel} onPress={onClose}>
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.save} onPress={save} disabled={saving}>
                <ThemedText style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  content: { padding: 20, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: { borderWidth: 2, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 13, fontWeight: '600' },
  cancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#888' },
  save: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#4f46e5' },
  saveText: { color: '#fff', fontWeight: '700' },
});