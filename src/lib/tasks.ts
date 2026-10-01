import { supabase } from '@/lib/supabase';
import { Priority, Task } from '@/types/task';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Read all of the logged-in user's tasks
const CACHE_KEY = 'tasks_cache_v1';
const SYNC_KEY = 'tasks_last_sync_v1';

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
    throw e;
  }
}

export async function fetchTasks(): Promise<Task[]> {
  return (await fetchTasksWithStatus()).tasks;
}

// Called on logout so the next user never sees someone else's tasks
export async function clearTasksCache() {
  await AsyncStorage.multiRemove([CACHE_KEY, SYNC_KEY]);
}

// Create a task (user_id is filled in automatically by the database)
export async function addTask(title: string, priority: Priority) {
  const { error } = await supabase.from('tasks').insert({ title, priority });
  if (error) throw error;
}

// Mark a task done or not done
export async function setCompleted(id: string, completed: boolean) {
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', id);
  if (error) throw error;
}

// Delete a task
export async function removeTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
// Change a task's title, notes, priority or due date
export async function updateTask(
  id: string,
  fields: {
    title?: string;
    description?: string | null;
    priority?: Priority;
    due_date?: string | null;
  },
) {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}