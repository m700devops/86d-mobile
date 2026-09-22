import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, APP_VERSION, STORAGE_KEYS } from '../config/api';

// The five steps between tapping the icon and having an account. Everything
// after this is already visible server-side (users, inventory_sessions,
// /v1/crm/funnel); none of this was, so "how many people open the app and
// never finish signing up" had no answer.
//
// Names must match APP_EVENTS in the backend's main.py — anything else is
// dropped on arrival rather than stored.
export type AppEvent =
  | 'app_opened'
  | 'login_viewed'
  | 'register_viewed'
  | 'register_submitted'
  | 'register_succeeded';

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
