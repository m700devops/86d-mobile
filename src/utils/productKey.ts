// Mirror of the backend's normalize_match_text (86d-api helpers.py). The AI
// re-reads the label on every scan, so the same bottle can come back phrased
// differently — "Jack Daniel's" one time, "Jack Daniels" the next. Comparing
// raw strings treats those as two bottles; comparing on these keys doesn't.

export const normalizeMatchText = (value?: string | null): string =>
  (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Sorting the two tokens is what makes this swap-tolerant: "Gatorade"/"Blue
// Bolt" and "Blue Bolt"/"Gatorade" collapse to the same key, so a scan whose
// name and brand arrive the other way round still merges into the row that's
// already on screen instead of adding a second one (which would split the
// count and over-order).
//
// Returns '' when there's nothing identifying to compare — callers must treat
// that as "no opinion" rather than a match, or every unidentified row would
// merge into the first one.
export const bottleMatchKey = (brand?: string | null, name?: string | null): string => {
  const parts = [normalizeMatchText(brand), normalizeMatchText(name)].filter(Boolean).sort();
  return parts.join('|');
};
