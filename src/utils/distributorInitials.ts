// Distributor badge initials, derived from the name rather than typed.
//
// They used to be a required field in Settings that was then thrown away:
// `addDistributor` only ever sent name/email/phone/repName to the API, and the
// backend has no initials column, so what someone typed never survived the
// round trip and every badge fell back to a literal "D". Deriving them removes
// both the question and the lie.
//
// Two initials for two different distributors have to differ, or the badge
// stops identifying anything — so this resolves collisions across the whole
// list rather than per name.

const STOPWORDS = new Set(['the', 'and', 'of', 'a', 'an', 'at', 'for']);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Name split into meaningful words: accents folded, punctuation dropped. */
function words(name: string): string[] {
  const raw = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Apostrophes stay inside the word. Splitting on them turns "O'Malley"
    // into a one-letter word "O", so "O'Malley & Sons" badges as OM
    // (O + Malley) instead of OS.
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  // Only drop filler when something is left — "The Anchor" should give TA
  // rather than nothing, but "Southern Glazer and Sons" shouldn't give SA.
  const meaningful = raw.filter(w => !STOPWORDS.has(w.toLowerCase()));
  return meaningful.length > 0 ? meaningful : raw;
}

/**
 * Initials this name would like, best first.
 *
 * Ordered so the natural answer comes out unless it's already taken:
 * first letters of the first two words ("Southern Glazer" → SG), then the
 * first word paired with each later word, then the first letter against each
 * following letter of the name (so "Breakthru Beverage" can fall back to BR
 * before it resorts to anything arbitrary), and only then letters and digits
 * that aren't in the name at all.
 */
function* candidates(name: string): Generator<string> {
  const ws = words(name);
  if (ws.length === 0) {
    yield 'D';
    return;
  }

  const squashed = ws.join('').toUpperCase();
  const first = squashed[0];

  // A one-character name has no second character to pair with; "X" reads
  // better than "XA".
  if (squashed.length === 1) yield first;

  for (let i = 1; i < ws.length; i++) yield (first + ws[i][0]).toUpperCase();
  for (let i = 1; i < squashed.length; i++) yield first + squashed[i];
  for (const letter of LETTERS) yield first + letter;
  for (let digit = 2; digit <= 9; digit++) yield first + String(digit);
  // Last resort, and the reason uniqueness is guaranteed rather than merely
  // likely: every remaining two-character pair. Keeping the name's first
  // letter only offers ~34 badges, which a list of forty "B" distributors
  // exhausts.
  for (const a of ALPHANUM) for (const b of ALPHANUM) yield a + b;
}

/** What this name resolves to with nothing else competing for it. */
export function preferredInitials(name: string): string {
  const { value } = candidates(name).next();
  return value ?? 'D';
}

export interface NamedDistributor {
  id: string;
  name: string;
}

/**
 * id → initials for a whole list, with no two ids sharing a value.
 *
 * The input is sorted by name before assigning, so the result doesn't depend
 * on the order the caller happens to hold: the context appends a newly created
 * distributor to the end of local state but reloads it name-sorted from the
 * API, and a badge that silently changed on the next launch would be worse
 * than one that was never unique.
 *
 * Which distributor keeps the plain initials when two want them is settled by
 * name order — arbitrary, but stable: "Blue Bottle" takes BB and "Bravo
 * Brands" falls to BR, and that stays true however the list is reordered later.
 *
 * Candidates run through every two-character pair before giving up, so the
 * result is unique for any list shorter than 1296. Past that the last one
 * repeats an earlier badge rather than throwing — a duplicate badge is a
 * cosmetic problem, a crash in Settings is not.
 */
export function buildInitialsMap(distributors: readonly NamedDistributor[]): Record<string, string> {
  const ordered = [...distributors].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  );

  const taken = new Set<string>();
  const map: Record<string, string> = {};

  for (const distributor of ordered) {
    let chosen: string | undefined;
    for (const candidate of candidates(distributor.name)) {
      if (!taken.has(candidate)) {
        chosen = candidate;
        break;
      }
    }
    const value = chosen ?? preferredInitials(distributor.name);
    taken.add(value);
    map[distributor.id] = value;
  }

  return map;
}
