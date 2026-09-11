import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../services/api';
import { useLocation } from './LocationContext';
import { Bottle } from '../types';

// --- The product book ---
//
// Everything this bar has decided *once* about a bottle and should never be
// asked again: its price, its par level, and which distributor it's ordered
// from. All three live per (location, product) on the backend — price and par
// in `par_levels`, the distributor in `location_product_distributors` — so one
// bar's negotiated price or par never leaks to another bar on the same account.
//
// Everything that needs one of these looks it up by productId (`priceFor`,
// `parFor`, `distributorFor`) rather than copying the value onto a Bottle.
// That's what makes an AI scan "know" them automatically: the moment a scan
// resolves to a productId the lookup already has an answer, with no hydration
// step to race. Count Grey Goose this week, set its par and distributor once,
// and next week's scan of the same bottle arrives already parred and already
// filed under the right distributor.
//
// The copies still on Bottle (`parLevel`, `distributorId`) are a fallback, not
// the source of truth — they cover rows that have no productId yet (a scan
// still identifying in the background, a manual add) and drafts saved before
// this book existed. Book first, bottle second: see `useBottleDefaults`.

export interface PriceBookEntry {
  productId: string;
  price: number;
  name: string;
  brand?: string | null;
  size?: string | null;
  category?: string | null;
}

export interface PriceableProduct {
  id: string;
  name: string;
  brand?: string | null;
  size?: string | null;
  category?: string | null;
}

interface ProductBookContextType {
  entries: PriceBookEntry[];
  loading: boolean;
  priceFor: (productId?: string) => number | undefined;
  // undefined means "no par has ever been set for this bottle at this bar",
  // which is a different thing from a par of 0 and is what the Review screen's
  // "Not set" badge and the generate-order guard key off.
  parFor: (productId?: string) => number | undefined;
  distributorFor: (productId?: string) => string | undefined;
  setPrice: (product: PriceableProduct, price: number) => Promise<void>;
  clearPrice: (productId: string) => Promise<void>;
  // Par and distributor are set mid-count, one tap at a time, often on a bar's
  // bad wifi — so unlike setPrice these don't make the caller await a round
  // trip or handle a rejection. They apply locally at once and queue the write.
  setPar: (productId: string, par: number) => void;
  setDistributor: (productId: string, distributorId: string) => void;
  mergeInto: (sourceProductId: string, targetProductId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProductBookContext = createContext<ProductBookContextType | undefined>(undefined);

// Long enough that a run up the par stepper is one write, short enough that a
// single tap followed by locking the phone still gets out the door (and if it
// doesn't, the queue below sends it on the next reconnect or foreground).
const WRITE_DEBOUNCE_MS = 350;

export const ProductBookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [byProductId, setByProductId] = useState<Record<string, PriceBookEntry>>({});
  const [parByProductId, setParByProductId] = useState<Record<string, number>>({});
  const [distByProductId, setDistByProductId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Which bar the loaded maps actually belong to. This is state, not a ref, on
  // purpose: reads are gated on it matching the selected bar, so it has to
  // re-render the consumers when it changes.
  const [bookLocationId, setBookLocationId] = useState<string | null>(null);
  // A failed load isn't cosmetic here: priceFor() returning undefined means
  // order lines silently price at $0, and parFor() returning undefined sends
  // a bartender back through par levels they already set. Track it so the
  // reconnect listener below can heal the book without anyone noticing.
  const loadFailedRef = useRef(false);

  // Writes that haven't landed yet, keyed by field+product so the newest value
  // for a given bottle replaces the older one rather than replaying a stale
  // number behind it. A par tapped in a walk-in with no signal is exactly the
  // thing this whole book exists to stop losing, so it retries on reconnect
  // instead of being dropped with a console warning.
  const pendingWrites = useRef<Map<string, () => Promise<unknown>>>(new Map());
  const writeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const send = useCallback((key: string) => {
    const run = pendingWrites.current.get(key);
    if (!run) return Promise.resolve();
    return run()
      .then(() => {
        // Only clear if this exact attempt is still the newest one queued —
        // a newer tap may have replaced it while the request was in flight.
        if (pendingWrites.current.get(key) === run) pendingWrites.current.delete(key);
      })
      .catch(err => {
        console.error(`[ProductBook] ${key} write failed, queued for retry:`, err);
      });
  }, []);

  // Debounced and keyed, so walking the par stepper from 1 to 6 sends one PATCH
  // carrying 6 rather than six racing PATCHes whose responses can land in any
  // order and leave the server on whichever one finished last.
  const runWrite = useCallback((key: string, run: () => Promise<unknown>) => {
    pendingWrites.current.set(key, run);
    const existing = writeTimers.current.get(key);
    if (existing) clearTimeout(existing);
    writeTimers.current.set(
      key,
      setTimeout(() => {
        writeTimers.current.delete(key);
        send(key);
      }, WRITE_DEBOUNCE_MS)
    );
  }, [send]);

  const flushPending = useCallback(async () => {
    // Anything still waiting out its debounce goes now, in full.
    writeTimers.current.forEach(timer => clearTimeout(timer));
    writeTimers.current.clear();
    for (const key of Array.from(pendingWrites.current.keys())) {
      await send(key);
    }
  }, [send]);

  const load = useCallback(async (locationId: string) => {
    setLoading(true);
    try {
      // Two endpoints, settled independently: a distributor fetch that fails
      // shouldn't also cost us the prices and pars that came back fine.
      const [parResult, distResult] = await Promise.allSettled([
        apiService.getParLevels(locationId),
        apiService.getProductDistributors(locationId),
      ]);

      if (parResult.status === 'fulfilled') {
        const prices: Record<string, PriceBookEntry> = {};
        const pars: Record<string, number> = {};
        parResult.value.forEach(pl => {
          if (pl.price && pl.price > 0) {
            prices[pl.product_id] = {
              productId: pl.product_id,
              price: pl.price,
              name: pl.product?.name ?? 'Unknown bottle',
              brand: pl.product?.brand ?? null,
              size: pl.product?.size ?? null,
              category: pl.product?.category ?? null,
            };
          }
          // 0 is the backend's "never set" for par, same as it is for price.
          if (pl.par_quantity && pl.par_quantity > 0) pars[pl.product_id] = pl.par_quantity;
        });
        setByProductId(prices);
        setParByProductId(pars);
        // Only claim the book belongs to this bar once the prices/pars behind
        // it are really loaded — see the gate on the readers below.
        setBookLocationId(locationId);
      }

      if (distResult.status === 'fulfilled') {
        const dists: Record<string, string> = {};
        distResult.value.forEach(a => { dists[a.product_id] = a.distributor_id; });
        setDistByProductId(dists);
      }

      loadFailedRef.current =
        parResult.status === 'rejected' || distResult.status === 'rejected';
      if (parResult.status === 'rejected') {
        console.error('[ProductBook] failed to load prices/pars:', parResult.reason);
      }
      if (distResult.status === 'rejected') {
        console.error('[ProductBook] failed to load distributor assignments:', distResult.reason);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    if (bookLocationId === currentLocation.id) return;
    load(currentLocation.id);
  }, [currentLocation, bookLocationId, load]);

  // Leaving the app is the last chance to get a queued write out before the OS
  // suspends the JS thread — a par tapped a moment before the phone went in a
  // pocket shouldn't wait for the next launch.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' || next === 'background') {
        if (pendingWrites.current.size > 0) flushPending();
      }
    });
    return () => sub.remove();
  }, [flushPending]);

  // Cancel outstanding debounce timers on unmount; the writes themselves stay
  // queued and go out on the next reconnect or foreground.
  useEffect(() => {
    const timers = writeTimers.current;
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Reload on reconnect after a failed load, and push anything still queued —
  // same pattern as the inventory draft's retry-on-reconnect, and for the same
  // reason: the state it feeds (order totals, par levels) is wrong in a way
  // nobody notices until the email is sent or next week's count starts.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected || state.isInternetReachable === false) return;
      if (pendingWrites.current.size > 0) flushPending();
      if (loadFailedRef.current && currentLocation) {
        load(currentLocation.id);
      }
    });
    return () => unsubscribe();
  }, [currentLocation, load, flushPending]);

  const refresh = useCallback(async () => {
    if (!currentLocation) return;
    await flushPending();
    await load(currentLocation.id);
  }, [currentLocation, load, flushPending]);

  // Never answer from a book belonging to a different bar. Switching bars
  // leaves the previous maps in place until the new fetch lands — and if that
  // fetch fails (offline, cold backend) it stays indefinitely. Product IDs are
  // shared across an account's bars, so without this gate an overlapping bottle
  // would price at the other bar's negotiated rate, order to the other bar's
  // par, and go out on a real order email. Undefined here reads as "nothing
  // saved yet", which every caller already handles and the reconnect listener
  // above heals.
  const bookMatchesLocation = !!currentLocation && bookLocationId === currentLocation.id;

  const priceFor = useCallback(
    (productId?: string) =>
      productId && bookMatchesLocation ? byProductId[productId]?.price : undefined,
    [byProductId, bookMatchesLocation]
  );

  const parFor = useCallback(
    (productId?: string) =>
      productId && bookMatchesLocation ? parByProductId[productId] : undefined,
    [parByProductId, bookMatchesLocation]
  );

  const distributorFor = useCallback(
    (productId?: string) =>
      productId && bookMatchesLocation ? distByProductId[productId] : undefined,
    [distByProductId, bookMatchesLocation]
  );

  // Write through optimistically so the list reacts instantly, then roll the
  // row back if the save actually failed — a price that silently didn't stick
  // would quietly under-report every order total that follows.
  const setPrice = useCallback(
    async (product: PriceableProduct, price: number) => {
      if (!currentLocation) throw new Error('No location selected');
      const rounded = Math.round(price * 100) / 100;
      const previous = byProductId[product.id];

      setByProductId(prev => ({
        ...prev,
        [product.id]: {
          productId: product.id,
          price: rounded,
          name: product.name,
          brand: product.brand ?? null,
          size: product.size ?? null,
          category: product.category ?? null,
        },
      }));

      try {
        await apiService.updateProductStock(currentLocation.id, product.id, { price: rounded });
      } catch (err) {
        setByProductId(prev => {
          const next = { ...prev };
          if (previous) next[product.id] = previous;
          else delete next[product.id];
          return next;
        });
        throw err;
      }
    },
    [currentLocation, byProductId]
  );

  // The backend treats a price of 0 as "unset" and hands back null, so
  // clearing is the same write path rather than a separate endpoint.
  const clearPrice = useCallback(
    async (productId: string) => {
      if (!currentLocation) throw new Error('No location selected');
      const previous = byProductId[productId];

      setByProductId(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });

      try {
        await apiService.updateProductStock(currentLocation.id, productId, { price: 0 });
      } catch (err) {
        if (previous) setByProductId(prev => ({ ...prev, [productId]: previous }));
        throw err;
      }
    },
    [currentLocation, byProductId]
  );

  // Applied locally first and never rolled back on failure: the tap is the
  // bartender's intent, and reverting the number under their thumb mid-count
  // is worse than a write that lands a minute later off the retry queue.
  const setPar = useCallback(
    (productId: string, par: number) => {
      if (!currentLocation) return;
      const locationId = currentLocation.id;
      const rounded = Math.max(0, Math.round(par));

      setParByProductId(prev => {
        const next = { ...prev };
        // 0 is "no par", so setting it back to 0 clears the entry rather than
        // recording a par of zero that would read as deliberately set.
        if (rounded > 0) next[productId] = rounded;
        else delete next[productId];
        return next;
      });

      runWrite(`par:${productId}`, () =>
        apiService.updateProductStock(locationId, productId, { par: rounded })
      );
    },
    [currentLocation, runWrite]
  );

  const setDistributor = useCallback(
    (productId: string, distributorId: string) => {
      if (!currentLocation) return;
      const locationId = currentLocation.id;

      setDistByProductId(prev => ({ ...prev, [productId]: distributorId }));

      runWrite(`dist:${productId}`, () =>
        apiService.assignProductDistributor(locationId, productId, distributorId)
      );
    },
    [currentLocation, runWrite]
  );

  // Merging rewrites par_levels and assignment rows server-side (prices, pars
  // and distributors can move between products, rows can disappear), so the
  // local maps are refetched rather than patched — guessing the result here
  // would drift from what actually landed.
  const mergeInto = useCallback(
    async (sourceProductId: string, targetProductId: string) => {
      await apiService.mergeProduct(sourceProductId, targetProductId);
      if (currentLocation) await load(currentLocation.id);
    },
    [currentLocation, load]
  );

  // Same gate as priceFor — the price list must not show the previous bar's
  // prices while the newly selected one is still loading or failed to load.
  const entries = bookMatchesLocation
    ? Object.values(byProductId).sort((a, b) =>
        `${a.brand ?? ''} ${a.name}`.trim().localeCompare(`${b.brand ?? ''} ${b.name}`.trim())
      )
    : [];

  return (
    <ProductBookContext.Provider
      value={{
        entries,
        loading,
        priceFor,
        parFor,
        distributorFor,
        setPrice,
        clearPrice,
        setPar,
        setDistributor,
        mergeInto,
        refresh,
      }}
    >
      {children}
    </ProductBookContext.Provider>
  );
};

export const useProductBook = () => {
  const context = useContext(ProductBookContext);
  if (!context) {
    throw new Error('useProductBook must be used within ProductBookProvider');
  }
  return context;
};

// Book first, bottle second. The Bottle copies exist for rows the book can't
// key on yet — a scan still identifying in the background, a manual add, a
// draft saved before this book existed — so they're the fallback, never the
// answer when the book has one.
export const useBottleDefaults = () => {
  const { parFor, distributorFor } = useProductBook();
  return useMemo(
    () => ({
      parOf: (bottle: Bottle) => parFor(bottle.productId) ?? bottle.parLevel,
      // True only when a human actually set this par — either in the saved book
      // or on this row during this count. The default parLevel of 1 that every
      // new scan carries is deliberately not enough.
      isParSet: (bottle: Bottle) =>
        parFor(bottle.productId) !== undefined || bottle.parLevelSet === true,
      distributorOf: (bottle: Bottle) =>
        distributorFor(bottle.productId) ?? bottle.distributorId,
    }),
    [parFor, distributorFor]
  );
};
