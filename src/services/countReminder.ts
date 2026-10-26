import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiService } from './api';
import {
  CountSchedule, isCountDay, isCountTime, reminderText, reminderTrigger,
} from '../utils/countDay';
import type { User } from '../types';

// When this bar counts, and the weekly reminder on that day.
//
// LOCAL notifications only, scheduled on the phone: no push server, no device
// token, and no push entitlement on the build (expo-notifications' config
// plugin is deliberately NOT in app.json — it adds aps-environment, which
// changes the provisioning profile, and a scheduled local reminder doesn't
// need it).
//
// The schedule is kept on the phone as well as in the profile
// (users.count_day / count_time), so the reminder works offline and on an API
// that hasn't got those columns yet.

const SCHEDULE_KEY = '@86d_count_schedule';
const REMINDER_ID_KEY = '@86d_count_reminder_id';
const FIRST_TRY_KEY = '@86d_first_try_done';

// A reminder that arrives while the app is open still shows — it's the one
// notification this app sends.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Web preview / a platform without notifications: nothing to configure.
}

export async function loadSchedule(user?: User | null): Promise<CountSchedule | null> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (isCountDay(s?.day)) return { day: s.day, time: isCountTime(s.time) ? s.time : null };
    }
  } catch {
    // fall through to the profile
  }
  if (user && isCountDay(user.count_day)) {
    return { day: user.count_day, time: isCountTime(user.count_time) ? user.count_time : null };
  }
  return null;
}

/** Saved on the phone first, then to the profile. Never throws. */
export async function saveSchedule(s: CountSchedule): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(s));
  } catch {
    // the profile copy below still lands
  }
  try {
    await apiService.updateProfile({ count_day: s.day, count_time: s.time });
  } catch {
    // An older API answers "no fields" (it doesn't know count_day yet); the
    // phone's copy is what the reminder runs from either way.
  }
}

export async function isFirstTryDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FIRST_TRY_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markFirstTryDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_TRY_KEY, '1');
  } catch {
    // worst case the first-run framing shows once more
  }
  // The reminder said "start with 3 bottles"; that's done now.
  const s = await loadSchedule();
  if (s && (await reminderIsOn())) await schedule(s, false);
}

export async function reminderIsOn(): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(REMINDER_ID_KEY));
  } catch {
    return false;
  }
}

async function cancelExisting(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  } catch {
    // nothing scheduled, or nothing to cancel it with
  }
}

async function schedule(s: CountSchedule, firstCount: boolean): Promise<boolean> {
  const trigger = reminderTrigger(s);
  await cancelExisting();
  if (!trigger) return false;
  try {
    const text = reminderText(s, firstCount);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: text.title, body: text.body, data: { kind: 'count_day' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, ...trigger },
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask for notification permission (iOS shows its dialog once) and schedule
 * the weekly count-day reminder. 'on', 'declined' (they said no, or the
 * system won't ask again), or 'unavailable' (no set day, or no notifications
 * on this platform).
 */
export async function enableReminder(s: CountSchedule): Promise<'on' | 'declined' | 'unavailable'> {
  if (!reminderTrigger(s)) return 'unavailable';
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) {
      perm = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    }
    if (!perm.granted) return 'declined';
  } catch {
    return 'unavailable';
  }
  return (await schedule(s, !(await isFirstTryDone()))) ? 'on' : 'unavailable';
}

export async function disableReminder(): Promise<void> {
  await cancelExisting();
}

/** Fires when someone taps the reminder; returns the unsubscribe. */
export function onReminderOpened(handler: () => void): () => void {
  try {
    // Cold start: the tap that launched the app.
    Notifications.getLastNotificationResponseAsync()
      .then(r => { if (r?.notification.request.content.data?.kind === 'count_day') handler(); })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      if (r.notification.request.content.data?.kind === 'count_day') handler();
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
