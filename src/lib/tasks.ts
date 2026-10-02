import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { Priority, Task } from '@/types/task';

const CACHE_KEY = 'tasks_cache_v1';
const SYNC_KEY = 'tasks_last_sync_v1';

// Turn network failures into a message a user can understand
function friendly(error: any): Error {
  const text = String(error?.message ?? error ?? '').toLowerCase();
  if (text.includes('fetch') || text.includes('network')) {
    return new Error('You are offline. Connect to the internet to make changes.');
  }
  return error instanceof Error ? error : new Error(String(error?.message ?? error));
}

// Try the database first. If there is no internet, fall back to the saved copy.
export async function fetchTasksWithStatus(): Promise<{
  tasks: Task[];
  offline: boolean;
  lastSynced: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;

    const tasks = data ?? [];
    const now = new Date().toISOString();
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(tasks)],
      [SYNC_KEY, now],
    ]);
    return { tasks, offline: false, lastSynced: now };
  } catch (e) {
    const [[, raw], [, synced]] = await AsyncStorage.multiGet([CACHE_KEY, SYNC_KEY]);
    if (raw) return { tasks: JSON.parse(raw), offline: true, lastSynced: synced };
    throw friendly(e);
  }
}

export async function fetchTasks(): Promise<Task[]> {
  return (await fetchTasksWithStatus()).tasks;
}

// Called on logout so the next user never sees someone else's tasks
export async function clearTasksCache() {
  await AsyncStorage.multiRemove([CACHE_KEY, SYNC_KEY]);
}

export async function addTask(title: string, priority: Priority) {
  try {
    const { error } = await supabase.from('tasks').insert({ title, priority });
    if (error) throw error;
  } catch (e) {
    throw friendly(e);
  }
}

export async function setCompleted(id: string, completed: boolean) {
  try {
    const { error } = await supabase.from('tasks').update({ completed }).eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw friendly(e);
  }
}

export async function removeTask(id: string) {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw friendly(e);
  }
}

export async function updateTask(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    due_date?: string | null;
  },
) {
  try {
    const { error } = await supabase.from('tasks').update(fields).eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw friendly(e);
  }
}