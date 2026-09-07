import { Bottle } from '../types';

// Policy for automatically re-running a failed bottle identification. Pure and
// dependency-free so it can be reasoned about (and tested) on its own — the
// scheduling around it lives in InventoryContext.
//
// The rule that matters: "no signal" and "the AI can't read this photo" are
// opposite situations wearing the same "failed" badge.
//
//  - No signal is not the bottle's fault and says nothing about whether it can
//    ever be identified, so it never counts against the row. A scan taken in a
//    grocery-store dead zone keeps trying for as long as it takes to get
//    service back, which is the entire point.
//  - A definitive miss (the server answered, the AI still couldn't place it)
//    does count. Re-uploading that photo forever buys nothing, so after
//    MAX_UNREADABLE_ATTEMPTS the row stops promising to fix itself and asks
//    for a human tap instead.
//
// Cost is bounded by the backoff ladder rather than by an attempt cap: a long
// outage settles into one attempt every 30 minutes.

export const MAX_UNREADABLE_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = [15_000, 60_000, 300_000, 900_000, 1_800_000];

/** Gap required before attempt N+1, given N attempts already made. */
export function retryBackoffFor(attempts: number): number {
  const i = Math.min(Math.max(attempts, 0), RETRY_BACKOFF_MS.length - 1);
  return RETRY_BACKOFF_MS[i];
}

/**
 * Is this row worth an unattended retry right now? It must have failed for a
 * reason that might not repeat, still have the photo to re-send, and be past
 * its backoff window. Rows that used up their unreadable budget were marked
 * 'other' when that happened, so they fall out here.
 */
export function isAutoRetryable(b: Bottle, now: number): boolean {
  return (
    b.scanStatus === 'failed' &&
    b.failureReason === 'network' &&
    !!b.imageUrl &&
    now - (b.lastRetryAt ?? 0) >= retryBackoffFor(b.retryAttempts ?? 0)
  );
}

/**
 * A 'network' row with no photo can never self-heal — there's nothing left to
 * send — so it shouldn't keep claiming it will.
 */
export function isOrphanedRetry(b: Bottle): boolean {
  return b.scanStatus === 'failed' && b.failureReason === 'network' && !b.imageUrl;
}

/**
 * Where a failed automatic attempt leaves the row. `answered` means the server
 * responded and simply couldn't identify the bottle; anything else (timeout,
 * no connection, 5xx, 429) never spends the unreadable budget.
 */
export function nextFailureState(
  previousUnreadable: number,
  outcome: { answered: boolean }
): { failureReason: 'network' | 'other'; unreadableAttempts: number } {
  if (!outcome.answered) {
    return { failureReason: 'network', unreadableAttempts: previousUnreadable };
  }
  const unreadableAttempts = previousUnreadable + 1;
  return {
    failureReason: unreadableAttempts < MAX_UNREADABLE_ATTEMPTS ? 'network' : 'other',
    unreadableAttempts,
  };
}

/** Classify a thrown request error: could this have been the connection? */
export function isTransientRequestError(err: any): boolean {
  const status = err?.response?.status;
  return (
    err?.code === 'ECONNABORTED' ||
    err?.message?.includes('timeout') ||
    !!err?.request ||
    err?.message?.includes('Network') ||
    (typeof status === 'number' && (status >= 500 || status === 429))
  );
}
