import { supabase } from '@/lib/supabase';

const BUCKET = 'voice-notes';

// Upload a local recording and attach it to the task
export async function uploadVoiceNote(taskId: string, userId: string, uri: string) {
  const path = `${userId}/${taskId}-${Date.now()}.m4a`;
  const file = await fetch(uri);
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'audio/m4a', upsert: true });
  if (error) throw error;

  const { error: dbError } = await supabase
    .from('tasks')
    .update({ voice_path: path })
    .eq('id', taskId);
  if (dbError) throw dbError;
  return path;
}

// Private files need a temporary link to play
export async function getVoiceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}