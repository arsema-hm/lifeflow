import {
    AudioModule,
    AudioPlayer,
    RecordingPresets,
    createAudioPlayer,
    setAudioModeAsync,
    useAudioRecorder,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    GestureResponderEvent,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { VoiceNoteRow, deleteVoiceNote, getVoiceUrl, listVoiceNotes, uploadVoiceNote } from '@/lib/voice';
import { useAuth } from '@/providers/AuthProvider';
import { Task } from '@/types/task';

type Props = { task: Task; onSaved: () => void };
type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

function fmt(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Download once, then reuse the local copy
async function ensureLocal(note: VoiceNoteRow): Promise<string> {
  const dest = new File(Paths.cache, `voice-${note.id}.m4a`);
  if (dest.exists && dest.size > 0) return dest.uri;
  if (dest.exists) dest.delete();

  const url = await getVoiceUrl(note.path);
  const local = await File.downloadFileAsync(url, dest);
  if (!local.size) throw new Error('The saved file is empty. Delete it and record again.');
  return local.uri;
}

type RowProps = {
  note: VoiceNoteRow;
  isActive: boolean;
  state: PlayState;
  position: number;
  duration: number;
  onToggle: () => void;
  onSeek: (ratio: number) => void;
  onDelete: () => void;
};

function NoteRow({ note, isActive, state, position, duration, onToggle, onSeek, onDelete }: RowProps) {
  const [barWidth, setBarWidth] = useState(1);
  const total = isActive && duration > 0 ? duration : (note.duration_ms ?? 0) / 1000;
  const current = isActive ? position : 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const clock = new Date(note.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.noteRow}>
      <Pressable style={styles.playBtn} onPress={onToggle}>
        {isActive && state === 'loading' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={styles.playIcon}>
            {isActive && state === 'playing' ? '❚❚' : '▶'}
          </ThemedText>
        )}
      </Pressable>

      <View style={{ flex: 1 }}>
        <Pressable
          style={styles.barHit}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width || 1)}
          onPress={(e: GestureResponderEvent) => onSeek(e.nativeEvent.locationX / barWidth)}>
          <View pointerEvents="none" style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </Pressable>
        <ThemedText style={styles.time}>
          {fmt(current)} / {fmt(total)} · {clock}
        </ThemedText>
      </View>

      <Pressable onPress={onDelete} style={styles.delBtn}>
        <ThemedText style={{ fontSize: 18 }}>🗑</ThemedText>
      </Pressable>
    </View>
  );
}

export function VoiceNote({ task, onSaved }: Props) {
  const { session } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [notes, setNotes] = useState<VoiceNoteRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const recordingRef = useRef(false);

  const playerRef = useRef<AudioPlayer | null>(null);
  const token = useRef(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const reload = useCallback(async () => {
    try {
      setNotes(await listVoiceNotes(task.id));
    } catch (e: any) {
      Alert.alert('Could not load voice notes', e.message);
    } finally {
      setLoadingList(false);
    }
  }, [task.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live timer while recording
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [recording]);

  // Stop everything when the popup closes
  useEffect(() => {
    return () => {
      token.current += 1;
      try {
        playerRef.current?.remove();
      } catch {}
      playerRef.current = null;
      if (recordingRef.current) {
        try {
          recorder.stop().catch(() => {});
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function releasePlayer() {
    token.current += 1;
    try {
      playerRef.current?.remove();
    } catch {}
    playerRef.current = null;
    setActiveId(null);
    setPlayState('idle');
    setPosition(0);
    setDuration(0);
  }

  // ---------- Recording ----------
  async function startRecording() {
    releasePlayer();
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Allow microphone access in your phone settings.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      recordingRef.current = true;
      setElapsed(0);
      setRecording(true);
    } catch (e: any) {
      Alert.alert('Could not start recording', e.message);
    }
  }

  async function cancelRecording() {
    recordingRef.current = false;
    setRecording(false);
    try {
      await recorder.stop();
    } catch {}
  }

  async function sendRecording() {
    const durationMs = Date.now() - startedAt.current;
    recordingRef.current = false;
    setRecording(false);
    setBusy(true);
    try {
      await recorder.stop();
      if (durationMs < 1000) {
        Alert.alert('Too short', 'Hold on a little longer. Record at least 1 second.');
        return;
      }
      if (recorder.uri && session) {
        await uploadVoiceNote(task.id, session.user.id, recorder.uri, durationMs);
        await reload();
        onSaved();
      }
    } catch (e: any) {
      Alert.alert('Could not save voice note', e.message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Playback ----------
  async function togglePlay(note: VoiceNoteRow) {
    // Same note: pause or resume
    if (activeId === note.id && playerRef.current && playState !== 'loading') {
      const p = playerRef.current;
      if (playState === 'playing') {
        p.pause();
        setPlayState('paused');
      } else {
        p.play();
        setPlayState('playing');
      }
      return;
    }

    // Different note: stop the old one and start this one
    releasePlayer();
    const mine = token.current;
    setActiveId(note.id);
    setPlayState('loading');
    setDuration((note.duration_ms ?? 0) / 1000);

    try {
      const uri = await ensureLocal(note);
      if (mine !== token.current) return; // user tapped something else meanwhile

      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const player = createAudioPlayer({ uri }, { updateInterval: 250 });
      playerRef.current = player;
      player.volume = 1;
      player.addListener('playbackStatusUpdate', (status) => {
        if (mine !== token.current) return;
        setPosition(status.currentTime);
        if (status.duration > 0) setDuration(status.duration);
        if (status.didJustFinish) {
          setPlayState('paused');
          setPosition(0);
          player.seekTo(0).catch(() => {});
        }
      });
      player.play();
      setPlayState('playing');
    } catch (e: any) {
      if (mine === token.current) releasePlayer();
      Alert.alert('Could not play', e.message);
    }
  }

  function seek(note: VoiceNoteRow, ratio: number) {
    if (activeId !== note.id || !playerRef.current || duration <= 0) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    setPosition(clamped * duration);
    playerRef.current.seekTo(clamped * duration).catch(() => {});
  }

  function confirmDelete(note: VoiceNoteRow) {
    Alert.alert('Delete voice note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (activeId === note.id) releasePlayer();
          try {
            await deleteVoiceNote(note);
            await reload();
            onSaved();
          } catch (e: any) {
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      {recording ? (
        <View style={styles.recordBar}>
          <Pressable onPress={cancelRecording} style={styles.cancelBtn}>
            <ThemedText style={styles.btnText}>✕</ThemedText>
          </Pressable>
          <ThemedText style={styles.recText}>● Recording {fmt(elapsed)}</ThemedText>
          <Pressable onPress={sendRecording} style={styles.sendBtn}>
            <ThemedText style={styles.btnText}>Send ➤</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.recordBtn} onPress={startRecording} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.btnText}>🎙 Record voice note</ThemedText>
          )}
        </Pressable>
      )}

      {loadingList ? (
        <ActivityIndicator style={{ marginTop: 8 }} />
      ) : notes.length === 0 ? (
        <ThemedText style={styles.empty}>No voice notes yet.</ThemedText>
      ) : (
        notes.map((n) => (
          <NoteRow
            key={n.id}
            note={n}
            isActive={activeId === n.id}
            state={playState}
            position={position}
            duration={duration}
            onToggle={() => togglePlay(n)}
            onSeek={(r) => seek(n, r)}
            onDelete={() => confirmDelete(n)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  recordBtn: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 12, alignItems: 'center' },
  recordBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    padding: 8,
  },
  recText: { flex: 1, color: '#ef4444', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#6b7280', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  sendBtn: { backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  empty: { opacity: 0.6, fontSize: 13 },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 12,
    padding: 8,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
  barHit: { height: 28, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.4)', overflow: 'hidden' },
  fill: { height: 6, backgroundColor: '#4f46e5' },
  time: { fontSize: 12, opacity: 0.7 },
  delBtn: { padding: 6 },
});