import { User } from '../types';

// Mirrors the backend's is_entitled() in main.py — kept in sync manually.
// The backend is the actual source of truth (it re-checks on every scan);
// this is just so the app can show the right screen without waiting on a
// failed request first.
export function isEntitled(user: User | null): boolean {
  if (!user) return false;
  if (user.subscription_status === 'active') return true;
  if (user.subscription_status === 'trial') {
    if (!user.trial_ends_at) return true;
    const ends = new Date(user.trial_ends_at).getTime();
    if (Number.isNaN(ends)) return true;
    return ends > Date.now();
  }
  return false;
}

// Whole days remaining in an active trial — null if not on a trial, or the
// trial has no end date, or it's already expired (that's isEntitled's job).
export function trialDaysLeft(user: User | null): number | null {
  if (!user || user.subscription_status !== 'trial' || !user.trial_ends_at) return null;
  const ends = new Date(user.trial_ends_at).getTime();
  if (Number.isNaN(ends)) return null;
  const msLeft = ends - Date.now();
  if (msLeft <= 0) return null;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}
