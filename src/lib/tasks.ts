import { supabase } from '@/lib/supabase';
import { Priority, Task } from '@/types/task';

// Read all of the logged-in user's tasks
export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('completed', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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