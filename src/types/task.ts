export type Priority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  completed: boolean;
  due_date: string | null;
  created_at: string;
};