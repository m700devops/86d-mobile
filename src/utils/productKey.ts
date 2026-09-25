// The AI re-reads the label on every scan, so the same bottle can come back
// phrased differently — "Jack Daniel's" one time, "Jack Daniels" the next,
// "Patrón" or "Patron". Comparing raw strings treats those as two bottles;
// comparing on these keys doesn't.
//
// Accented letters FOLD to their base letter. This used to mirror the backend's
// normalize_match_text, which deletes them ("Patrón" -> "patrn", never meeting
// "patron"); the backend now matches products on a key that folds them
// (product_match_key in 86d-api helpers.py), and this follows it. An explicit
// map rather than String.prototype.normalize, so nothing depends on the JS
// engine's Unicode tables.
const FOLD: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ā: 'a', ą: 'a',
  ç: 'c', ć: 'c', č: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ē: 'e', ę: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ł: 'l', ñ: 'n', ń: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ś: 's', š: 's', ß: 'ss',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y', ż: 'z', ź: 'z', ž: 'z',
  æ: 'ae', œ: 'oe',
};

export const normalizeMatchText = (value?: string | null): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^\x00-\x7f]/g, ch => FOLD[ch] ?? '')
    .replace(/[^a-z0-9]+/g, '');

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

// A bottle's size in millilitres, from the way the server writes sizes
// ("750ml", "1L", "1.75L", "12oz") or a catalog entry someone typed ("750 mL",
// "1 Liter"). null when there isn't one.
const SIZE_RE = /(\d+(?:\.\d+)?)\s*(ml|cl|l|lt|ltr|liters?|litres?|fl\.?\s*oz|oz)\b/i;

export const sizeMl = (text?: string | null): number | null => {
  const m = SIZE_RE.exec(text ?? '');
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 'ml') return value;
  if (unit === 'cl') return value * 10;
  if (unit.startsWith('l')) return value * 1000;
  return value * 29.5735; // oz / fl oz
};

// Two rows are different bottles when BOTH sizes are known and differ — a 1L
// and a 750ml of the same product must not merge, or one count replaces the
// other. A row with no size never conflicts. Same 2% slack as the server
// (sizes_compatible in 86d-api helpers.py): "12oz" and "355ml" are one can.
export const sizesConflict = (a?: string | null, b?: string | null): boolean => {
  const x = sizeMl(a);
  const y = sizeMl(b);
  if (x == null || y == null) return false;
  return Math.abs(x - y) > 0.02 * Math.max(x, y);
};
