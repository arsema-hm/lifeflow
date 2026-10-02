import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioRecorder,
} from 'expo-audio';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getVoiceUrl, uploadVoiceNote } from '@/lib/voice';
import { useAuth } from '@/providers/AuthProvider';
import { Task } from '@/types/task';

type Props = { task: Task; onSaved: () => void };

export function VoiceNote({ task, onSaved }: Props) {
  const { session } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  async function start() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Allow microphone access for Expo Go in Settings.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  async function stop() {
    setRecording(false);
    setBusy(true);
    try {
      await recorder.stop();
      if (recorder.uri && session) {
        await uploadVoiceNote(task.id, session.user.id, recorder.uri);
        onSaved();
        Alert.alert('Saved', 'Voice note attached to this task.');
      }
    } catch (e: any) {
      Alert.alert('Could not save voice note', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function play() {
    if (!task.voice_path) return;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace({ uri: await getVoiceUrl(task.voice_path) });
      player.play();
    } catch (e: any) {
      Alert.alert('Could not play', e.message);
    }
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, recording && { backgroundColor: '#ef4444' }]}
        onPress={recording ? stop : start}
        disabled={busy}>
        <ThemedText style={styles.btnText}>
          {busy ? 'Saving…' : recording ? '⏹ Stop' : '🎙 Record'}
        </ThemedText>
      </Pressable>
      {task.voice_path && !recording && (
        <Pressable style={[styles.btn, { backgroundColor: '#0f766e' }]} onPress={play}>
          <ThemedText style={styles.btnText}>▶ Play</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});