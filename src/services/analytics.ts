import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, APP_VERSION, STORAGE_KEYS } from '../config/api';

// The five steps between tapping the icon and having an account, then the
// steps from a new account to a first count. The server sees a scan only once
// a photo is sent, and nothing at all of the start screen, the camera prompt
// or the count-day question — so when five bars signed up and none counted,
// there was no way to say where they stopped.
//
// Names must match APP_EVENTS in the backend's main.py — anything else is
// dropped on arrival rather than stored.
export type AppEvent =
  | 'app_opened'
  | 'login_viewed'
  | 'register_viewed'
  | 'register_submitted'
  | 'register_succeeded'
  // sign-up → first count
  | 'bar_name_saved'
  | 'count_day_set'
  | 'count_day_skipped'
  | 'start_screen_viewed'
  | 'start_tapped'
  | 'camera_allowed'
  | 'camera_denied'
  | 'first_scan_sent'
  | 'first_scan_identified'
  | 'first_bottle_saved'
  | 'first_try_done'
  | 'practice_cleared'
  | 'reminder_on'
  | 'reminder_declined'
  | 'reminder_opened'
  | 'review_opened'
  | 'order_sent'
  | 'how_video_opened'
  | 'how_video_finished';

const ANON_ID_KEY = '@86d_anon_id';

// Batch briefly so a screen that fires two events doesn't make two requests.
const FLUSH_DELAY_MS = 2000;
// Matches the server's per-batch cap. A queue longer than this means flushes
// are failing, and the fix for that is to drop events, not to grow.
const MAX_QUEUE = 20;
const FLUSH_TIMEOUT_MS = 5000;

let queue: AppEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let anonIdPromise: Promise<string> | null = null;

// Not a device identifier: a random per-install id, stored only on this
// phone, that exists so one install's open → view → submit can be joined
// into a funnel. A reinstall gets a new one and that is fine — this measures
// installs deciding whether to sign up, not people across time.
function newAnonId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

async function getAnonId(): Promise<string> {
  if (!anonIdPromise) {
    anonIdPromise = (async () => {
      try {
        const existing = await AsyncStorage.getItem(ANON_ID_KEY);
        if (existing) return existing;
        const fresh = newAnonId();
        await AsyncStorage.setItem(ANON_ID_KEY, fresh);
        return fresh;
      } catch {
        // Storage unavailable — still emit, just unjoinable across launches.
        return newAnonId();
      }
    })();
  }
  return anonIdPromise;
}

async function flush(): Promise<void> {
  flushTimer = null;
  const events = queue;
  queue = [];
  if (events.length === 0) return;

  try {
    const anonId = await getAnonId();
    // Deliberately fetch, not the axios client: that one carries auth
    // interceptors with a refresh-and-retry path, and a metric must never be
    // able to trigger a token refresh or a re-login loop.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // No token is the normal case here — these events are mostly pre-signup.
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS);
    try {
      await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          anon_id: anonId,
          events,
          platform: Platform.OS,
          app_version: APP_VERSION,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Swallowed on purpose, and NOT re-queued. Bar wifi fails constantly; a
    // retry ladder here would mean a growing queue and repeated requests in
    // exactly the conditions where the app needs its bandwidth for scans.
    // A lost funnel event is cheaper than that.
  }
}

/** Record a funnel event. Fire-and-forget: never throws, never blocks a render. */
export function track(event: AppEvent): void {
  if (queue.length >= MAX_QUEUE) return;
  queue.push(event);
  if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      void flush();
    }, FLUSH_DELAY_MS);
  }
}

const ONCE_PREFIX = '@86d_once_';
const sentOnce = new Set<AppEvent>();

/**
 * Record an event at most once per install — for "first scan", "first bottle
 * saved" and the like, which would otherwise fire on every bottle of every
 * count. Same fire-and-forget rules as track().
 */
export function trackOnce(event: AppEvent): void {
  if (sentOnce.has(event)) return;
  sentOnce.add(event);
  AsyncStorage.getItem(ONCE_PREFIX + event)
    .then(seen => {
      if (seen) return;
      track(event);
      return AsyncStorage.setItem(ONCE_PREFIX + event, '1');
    })
    .catch(() => {});
}
