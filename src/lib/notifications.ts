import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Expo Go on Android cannot load expo-notifications (removed in SDK 53).
// In Expo Go we skip it, so the app never crashes. In a development
// build or a store build, reminders work normally.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const remindersSupported = !(inExpoGo && Platform.OS === 'android');

type NotificationsModule = typeof import('expo-notifications');
let cached: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (!remindersSupported) return null;
  if (cached) return cached;
  try {
    const mod: NotificationsModule = require('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
    return mod;
  } catch {
    return null;
  }
}

async function requestPermission(N: NotificationsModule): Promise<boolean> {
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('reminders', {
      name: 'Task reminders',
      importance: N.AndroidImportance.HIGH,
    });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  return (await N.requestPermissionsAsync()).granted;
}

// Returns false if reminders are unavailable, permission is denied or the time is past
export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  when: Date,
): Promise<boolean> {
  const N = getNotifications();
  if (!N || when.getTime() <= Date.now()) return false;
  if (!(await requestPermission(N))) return false;

  await N.cancelScheduledNotificationAsync(`task-${taskId}`);
  await N.scheduleNotificationAsync({
    identifier: `task-${taskId}`,
    content: { title: 'LifeFlow reminder', body: title },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: 'reminders',
    },
  });
  return true;
}

export async function cancelTaskReminder(taskId: string) {
  const N = getNotifications();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(`task-${taskId}`);
}