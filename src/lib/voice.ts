import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';

const BUCKET = 'voice-notes';

export type VoiceNoteRow = {
  id: string;
  task_id: string;
  user_id: string;
  path: string;
  duration_ms: number | null;
  created_at: string;
};

// All voice notes of one task, oldest first
export async function listVoiceNotes(taskId: string): Promise<VoiceNoteRow[]> {
  const { data, error } = await supabase
    .from('voice_notes')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Upload a local recording and add it to the task's list
export async function uploadVoiceNote(
  taskId: string,
  userId: string,
  uri: string,
  durationMs: number,
) {
  const path = `${userId}/${taskId}-${Date.now()}.m4a`;

  const file = new File(uri);
  const bytes = await file.bytes();

  if (bytes.byteLength < 4000) {
    throw new Error(
      `Recording is only ${bytes.byteLength} bytes, so the microphone captured no sound. Check the Microphone permission and record again.`,
    );
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'audio/mp4', upsert: true });
  if (error) throw error;

  const { error: rowError } = await supabase
    .from('voice_notes')
    .insert({ task_id: taskId, path, duration_ms: durationMs });
  if (rowError) throw rowError;

  // Keeps the 🎙 icon on the task list working
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ voice_path: path })
    .eq('id', taskId);
  if (taskError) throw taskError;
}

export async function deleteVoiceNote(note: VoiceNoteRow) {
  await supabase.storage.from(BUCKET).remove([note.path]);

  const { error } = await supabase.from('voice_notes').delete().eq('id', note.id);
  if (error) throw error;

  const { count } = await supabase
    .from('voice_notes')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', note.task_id);
  if (!count) {
    await supabase.from('tasks').update({ voice_path: null }).eq('id', note.task_id);
  }
}

// Private files need a temporary link to download
export async function getVoiceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}