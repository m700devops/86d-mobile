// The ONE rule for how many bottles of something get ordered. OrderSummary
// builds the distributor orders with it and ReviewGrid's "N SHORT" badge shows
// it, so the badge is always the number that lands on the order.
//
// Reorder point is a fraction of par (the bar's reorder threshold, default 0.7,
// adjustable in Settings). Once stock drops below that line, order whole bottles
// back up to full par. Stock is decimal (4.75 = 4 backups + one open at 3/4),
// so the order rounds up — you can't order a fractional bottle. Par 0 means
// nobody set one, and is never ordered.

export const DEFAULT_REORDER_THRESHOLD = 0.7;

export function orderQuantity(
  stock: number | null | undefined,
  par: number | null | undefined,
  threshold: number | null | undefined = DEFAULT_REORDER_THRESHOLD
): number {
  const s = stock || 0;
  const p = par || 0;
  const reorderPoint = p * (threshold ?? DEFAULT_REORDER_THRESHOLD);
  return s < reorderPoint ? Math.max(0, Math.ceil(p - s)) : 0;
}
