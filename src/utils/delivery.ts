// Delivery days and the "Deliver by" date on an order.
//
// Each distributor delivers on set days ("mon,thu", saved once in Settings —
// 86d-api distributors.delivery_days). The order screen fills in the next one
// by itself, so nobody picks a date on a normal week; one tap changes it for
// that order. No days saved = no date, and the email leaves the line out.

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

// JS getDay(): 0 = Sunday.
const JS_DAY: Record<Weekday, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function parseDays(raw?: string | null): Weekday[] {
  if (!raw) return [];
  const set = new Set(
    raw.toLowerCase().split(/[\s,;/]+/).map(s => s.slice(0, 3)).filter((d): d is Weekday =>
      (WEEKDAYS as readonly string[]).includes(d))
  );
  return WEEKDAYS.filter(d => set.has(d));
}

export function joinDays(days: Weekday[]): string {
  return WEEKDAYS.filter(d => days.includes(d)).join(',');
}

// The next delivery day AFTER today: an order sent today is for the next
// truck, not one that may already have left (or whose cutoff has passed).
export function nextDelivery(days: Weekday[], from: Date = new Date()): Date | null {
  if (!days.length) return null;
  const wanted = new Set(days.map(d => JS_DAY[d]));
  for (let i = 1; i <= 7; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (wanted.has(d.getDay())) return d;
  }
  return null;
}

// The next few delivery days, for the date picker (falls back to the next
// week of days when the distributor has none saved).
export function upcomingDates(days: Weekday[], count = 4, from: Date = new Date()): Date[] {
  const wanted = days.length ? new Set(days.map(d => JS_DAY[d])) : null;
  const out: Date[] = [];
  for (let i = 1; out.length < count && i <= 60; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (!wanted || wanted.has(d.getDay())) out.push(d);
  }
  return out;
}

// "2026-10-10" in the phone's own calendar (never toISOString, which is UTC
// and would hand a US evening order tomorrow's date).
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromIsoDate(s?: string | null): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Fri, Oct 10" — the same words the order email uses.
export function deliveryLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
