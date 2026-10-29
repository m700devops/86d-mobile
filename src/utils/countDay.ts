// When a bar counts, and when to remind it — pure, so it's tested without a
// phone. The values match 86d-api's users.count_day / count_time.
//
// Why ask at all: a sign-up usually happens on a sales call, away from the
// bar, days before the next count. Five bars signed up in October 2026 and
// none of them counted; nothing tied "I signed up Tuesday" to "I count Sunday
// night". Saying when and where you'll do something is the best-evidenced
// follow-through technique there is (implementation intentions), and the
// answer is what the count-day reminder is scheduled from.

export type CountDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'varies';
export type CountTime = 'before_open' | 'afternoon' | 'after_close';

export interface CountSchedule {
  day: CountDay;
  time: CountTime | null;
}

// Monday first: a bar's week, and how the chips read left to right.
export const WEEKDAYS: { key: Exclude<CountDay, 'varies'>; short: string; long: string }[] = [
  { key: 'mon', short: 'Mon', long: 'Monday' },
  { key: 'tue', short: 'Tue', long: 'Tuesday' },
  { key: 'wed', short: 'Wed', long: 'Wednesday' },
  { key: 'thu', short: 'Thu', long: 'Thursday' },
  { key: 'fri', short: 'Fri', long: 'Friday' },
  { key: 'sat', short: 'Sat', long: 'Saturday' },
  { key: 'sun', short: 'Sun', long: 'Sunday' },
];

export const COUNT_TIMES: { key: CountTime; label: string; phrase: string }[] = [
  { key: 'before_open', label: 'Before opening', phrase: 'before opening' },
  { key: 'afternoon', label: 'Afternoon', phrase: 'in the afternoon' },
  { key: 'after_close', label: 'After close', phrase: 'after close' },
];

// iOS calendar weekday: 1 = Sunday … 7 = Saturday.
const IOS_WEEKDAY: Record<Exclude<CountDay, 'varies'>, number> = {
  sun: 1, mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7,
};

// When the reminder fires on count day, on the phone's own clock: ahead of
// the count, at a moment a manager is looking at their phone — not at 2am
// for an after-close count, when it would be one more buzz mid-close.
const REMIND_AT: Record<CountTime, { hour: number; minute: number }> = {
  before_open: { hour: 9, minute: 30 },
  afternoon: { hour: 12, minute: 30 },
  after_close: { hour: 17, minute: 0 },
};
const REMIND_AT_DEFAULT = { hour: 12, minute: 30 };

export function isCountDay(v: unknown): v is CountDay {
  return typeof v === 'string' && (v === 'varies' || Object.prototype.hasOwnProperty.call(IOS_WEEKDAY, v));
}

export function isCountTime(v: unknown): v is CountTime {
  return v === 'before_open' || v === 'afternoon' || v === 'after_close';
}

/** "Sunday after close", "Monday", "No set day" — null when not set. */
export function countPhrase(s: CountSchedule | null): string | null {
  if (!s) return null;
  if (s.day === 'varies') return 'No set day';
  const day = WEEKDAYS.find(d => d.key === s.day)!.long;
  const time = COUNT_TIMES.find(t => t.key === s.time);
  return time ? `${day} ${time.phrase}` : day;
}

/** Plural day for a button: "Sundays". */
export function dayPlural(day: CountDay): string | null {
  if (day === 'varies') return null;
  return WEEKDAYS.find(d => d.key === day)!.long + 's';
}

/** The weekly trigger for the count-day reminder, or null for "no set day". */
export function reminderTrigger(s: CountSchedule): { weekday: number; hour: number; minute: number } | null {
  if (s.day === 'varies') return null;
  const at = s.time ? REMIND_AT[s.time] : REMIND_AT_DEFAULT;
  return { weekday: IOS_WEEKDAY[s.day], hour: at.hour, minute: at.minute };
}

/** What the reminder says. `firstCount` while they've never finished a try. */
export function reminderText(s: CountSchedule, firstCount: boolean): { title: string; body: string } {
  const when = s.time === 'after_close' ? 'tonight' : 'today';
  return {
    title: `Count day ${when}`,
    body: firstCount
      ? 'Open 86’d and start with 3 bottles: point at the label, tap, type how many. About a minute.'
      : 'Open 86’d when you start: point at the label, tap, type how many.',
  };
}

/** "48 seconds", "2 minutes" — how long the first three bottles took. */
export function durationPhrase(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.round(s / 60);
  if (m > 30) return null; // they wandered off mid-try; a number this big says nothing useful
  return `${m} minute${m === 1 ? '' : 's'}`;
}
