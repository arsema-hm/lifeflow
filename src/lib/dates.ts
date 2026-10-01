export type DueOption = 'none' | 'today' | 'tomorrow' | 'week';

// Turn a button choice into a date the database can store
export function dueFromOption(option: DueOption): string | null {
  if (option === 'none') return null;
  const d = new Date();
  d.setHours(23, 59, 0, 0); // end of that day
  if (option === 'tomorrow') d.setDate(d.getDate() + 1);
  if (option === 'week') d.setDate(d.getDate() + 7);
  return d.toISOString();
}

export function isOverdue(due: string | null, completed: boolean): boolean {
  return !!due && !completed && new Date(due).getTime() < Date.now();
}

// Show "Today", "Tomorrow" or "Oct 12" instead of a raw timestamp
export function formatDue(due: string | null): string {
  if (!due) return '';
  const target = new Date(due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(target);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}