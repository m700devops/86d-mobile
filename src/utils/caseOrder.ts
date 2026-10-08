// Case or bottles — decided for the bar, per bottle, per order.
//
// Bars order fast movers by the case (cheaper per bottle, no split-case fee)
// and the top shelf by the bottle. Asking the manager to decide that for every
// bottle is the opposite of what 86'd is for, so the app decides, from what it
// already knows about THIS bar, and shows the answer with a short reason:
//
//   Round the shortfall up to a full case only when the extra bottles would be
//   used within CASE_CLEAR_WEEKS. Otherwise order exactly what's short.
//
//   Tito's: short 4, uses ~6/week → the other 8 are gone in ~1 week → 1 case
//   Green Chartreuse: short 1, ~1/month → 11 extra sit for months → 1 bottle
//
// How fast the bar goes through a bottle comes from its own sent orders
// (86d-api GET /locations/{id}/order-usage); with no order history yet, from
// its par, read conservatively as about PAR_WEEKS weeks of stock — so a guess
// errs toward NOT buying the extra bottles. With neither, it's bottles.
//
// The bar can override any bottle with one tap ("bottle" / "case"); that
// choice is saved in its product book and never second-guessed. `quantity` is
// always bottles, a case line included: 2 cases of 12 is 24 (86d-api's order
// email spells out "2 cases (12/cs, 24 bottles)").

export const CASE_CLEAR_WEEKS = 3;
// Par read as roughly three weeks of stock when there's no order history.
// Most bars set par to cover one to two weeks, so this UNDER-states how fast
// they go through a bottle — on purpose: a wrong guess orders bottles, not a
// case that sits on the shelf.
export const PAR_WEEKS = 3;

export type OrderChoice = 'bottle' | 'case' | null | undefined;

export interface UsageData {
  span_days: number;
  products: Record<string, number>;
  names: Record<string, number>;
}

export interface CasePlan {
  quantity: number;            // bottles, always
  unit: 'bottle' | 'case';
  caseSize: number | null;     // set on a case line
  cases: number;
  loose: number;
  // Why, in a few words, when there was a real decision to make. Empty when
  // there wasn't (no case size known, or the bar chose).
  reason: string;
  // Whether this came from the bar's own tap rather than the app's call.
  chosen: boolean;
}

// Bottles per case for a bottle size, when the size alone says it reliably.
// Distributors can pack differently; the bar can change it in the Bottle Book.
// Minis and anything unrecognised return null: never rounded to a case.
export function defaultCaseSize(size?: string | null): number | null {
  const ml = sizeMl(size);
  if (ml == null) return null;
  if (Math.abs(ml - 355) < 15) return 24;      // 12oz cans/bottles
  if (Math.abs(ml - 375) < 10) return 24;
  if (Math.abs(ml - 750) < 10) return 12;
  if (Math.abs(ml - 1000) < 10) return 12;
  if (Math.abs(ml - 1500) < 10) return 6;
  if (Math.abs(ml - 1750) < 10) return 6;
  return null;
}

export function sizeMl(size?: string | null): number | null {
  if (!size) return null;
  const m = String(size).toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(ml|cl|l|liter|litre|oz)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'ml': return n;
    case 'cl': return n * 10;
    case 'oz': return n * 29.5735;
    default: return n * 1000;   // l, liter, litre
  }
}

// Bottles per week this bar goes through, or null when nothing says.
export function weeklyUse(opts: {
  productId?: string | null;
  name?: string | null;
  par?: number | null;
  usage?: UsageData | null;
}): { perWeek: number | null; source: 'orders' | 'par' | null } {
  const { productId, name, par, usage } = opts;
  if (usage && usage.span_days > 0) {
    const weeks = usage.span_days / 7;
    const byId = productId ? usage.products[productId] : undefined;
    const byName = name ? usage.names[nameKey(name)] : undefined;
    const bottles = byId ?? byName;
    if (bottles !== undefined) return { perWeek: bottles / weeks, source: 'orders' };
    // History exists but this bottle wasn't in it: slower than every order
    // cycle in the window. Treat it as next to no use, not as "unknown".
    return { perWeek: 0, source: 'orders' };
  }
  if (par && par > 0) return { perWeek: par / PAR_WEEKS, source: 'par' };
  return { perWeek: null, source: null };
}

export function nameKey(name: string): string {
  return name.toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

export function planOrderLine(opts: {
  shortfall: number;            // whole bottles short (utils/orderQuantity)
  caseSize?: number | null;
  choice?: OrderChoice;
  perWeek?: number | null;
}): CasePlan {
  const shortfall = Math.max(0, Math.ceil(opts.shortfall));
  const cs = opts.caseSize && opts.caseSize >= 2 ? Math.round(opts.caseSize) : null;
  const bottles = (reason = '', chosen = false): CasePlan =>
    ({ quantity: shortfall, unit: 'bottle', caseSize: null, cases: 0, loose: shortfall, reason, chosen });
  const asCases = (quantity: number, reason = '', chosen = false): CasePlan => ({
    quantity, unit: 'case', caseSize: cs, cases: Math.floor(quantity / cs!), loose: quantity % cs!, reason, chosen,
  });

  if (shortfall === 0) return bottles();
  if (opts.choice === 'bottle') return bottles('', true);
  if (!cs) return bottles();
  if (opts.choice === 'case') return asCases(Math.ceil(shortfall / cs) * cs, '', true);

  const full = Math.ceil(shortfall / cs) * cs;
  const extra = full - shortfall;
  if (extra === 0) return asCases(full);                     // exactly whole cases
  const rate = opts.perWeek;
  if (rate != null && rate > 0) {
    const weeks = extra / rate;
    if (weeks <= CASE_CLEAR_WEEKS) {
      return asCases(full, `needed ${shortfall} — the other ${extra} ${lastFor(weeks)}`);
    }
  }
  // Not rounded up. Over a case short still says it in cases + loose bottles,
  // which is how a rep reads it.
  const why = rate == null ? '' : `a full case would leave ${extra} extra for ${weeksPhrase(extra / rate)}`;
  return shortfall >= cs ? asCases(shortfall, why) : bottles(why);
}

function lastFor(weeks: number): string {
  if (weeks < 1) return 'go within a week';
  return `last about ${Math.round(weeks)} week${Math.round(weeks) === 1 ? '' : 's'}`;
}

function weeksPhrase(weeks: number): string {
  if (!isFinite(weeks) || weeks > 26) return 'months';
  if (weeks >= 8) return `about ${Math.round(weeks / 4.3)} months`;
  return `about ${Math.round(weeks)} weeks`;
}

// "2 cs", "1 cs + 3", "4 btl" — the short form for cards and the share text.
export function shortQty(plan: Pick<CasePlan, 'quantity' | 'unit' | 'caseSize'>): string {
  if (plan.unit !== 'case' || !plan.caseSize) return `${fmt(plan.quantity)} btl`;
  const cases = Math.floor(plan.quantity / plan.caseSize);
  const loose = plan.quantity - cases * plan.caseSize;
  if (!cases) return `${fmt(loose)} btl`;
  return loose ? `${cases} cs + ${fmt(loose)}` : `${cases} cs`;
}

// Longer form for print and order history: "2 cases (24 bottles)".
export function longQty(plan: Pick<CasePlan, 'quantity' | 'unit' | 'caseSize'>): string {
  const q = plan.quantity;
  const btl = `${fmt(q)} bottle${q === 1 ? '' : 's'}`;
  if (plan.unit !== 'case' || !plan.caseSize) return btl;
  const cases = Math.floor(q / plan.caseSize);
  const loose = q - cases * plan.caseSize;
  if (!cases) return `${btl} (${plan.caseSize}/cs)`;
  const parts = `${cases} case${cases === 1 ? '' : 's'}` + (loose ? ` + ${fmt(loose)}` : '');
  return `${parts} (${btl})`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
