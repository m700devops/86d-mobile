import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from '../services/api';
import { useLocation } from './LocationContext';

// --- The price book ---
//
// Prices live per (location, product) in the backend's par_levels table — one
// bar's negotiated price never leaks to another bar on the same account. They
// are set once from the Pricing screen and kept forever; nothing in the counting
// flow asks for a price.
//
// Everything that needs a price looks it up by productId through `priceFor`
// rather than copying the number onto a Bottle. That's what makes an AI scan
// "know" the price automatically: the moment a scan resolves to a productId,
// the lookup already has an answer, with no hydration step to race. It also
// means editing a price here is reflected in the next order immediately,
// instead of leaving stale copies on rows counted before the change.

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

interface PricingContextType {
  entries: PriceBookEntry[];
  loading: boolean;
  priceFor: (productId?: string) => number | undefined;
  setPrice: (product: PriceableProduct, price: number) => Promise<void>;
  clearPrice: (productId: string) => Promise<void>;
  mergeInto: (sourceProductId: string, targetProductId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [byProductId, setByProductId] = useState<Record<string, PriceBookEntry>>({});
  const [loading, setLoading] = useState(false);
  // Which bar the loaded map actually belongs to. This is state, not a ref, on
  // purpose: reads are gated on it matching the selected bar, so it has to
  // re-render the consumers when it changes.
  const [bookLocationId, setBookLocationId] = useState<string | null>(null);
  // A failed load isn't cosmetic here: priceFor() returning undefined means
  // order lines silently price at $0. Track it so the reconnect listener
  // below can heal the price book without anyone noticing it was gone.
  const loadFailedRef = useRef(false);

  const load = useCallback(async (locationId: string) => {
    setLoading(true);
    try {
      const parLevels = await apiService.getParLevels(locationId);
      const next: Record<string, PriceBookEntry> = {};
      parLevels.forEach(pl => {
        if (!pl.price || pl.price <= 0) return;
        next[pl.product_id] = {
          productId: pl.product_id,
          price: pl.price,
          name: pl.product?.name ?? 'Unknown bottle',
          brand: pl.product?.brand ?? null,
          size: pl.product?.size ?? null,
          category: pl.product?.category ?? null,
        };
      });
      setByProductId(next);
      setBookLocationId(locationId);
      loadFailedRef.current = false;
    } catch (err) {
      console.error('[PricingContext] failed to load price book:', err);
      loadFailedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    if (bookLocationId === currentLocation.id) return;
    load(currentLocation.id);
  }, [currentLocation, bookLocationId, load]);

  // Reload on reconnect after a failed load — same pattern as the inventory
  // draft's retry-on-reconnect, and for the same reason: the state it feeds
  // (order totals) is wrong in a way nobody notices until the email is sent.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected || state.isInternetReachable === false) return;
      if (loadFailedRef.current && currentLocation) {
        load(currentLocation.id);
      }
    });
    return () => unsubscribe();
  }, [currentLocation, load]);

  const refresh = useCallback(async () => {
    if (!currentLocation) return;
    await load(currentLocation.id);
  }, [currentLocation, load]);

  // Never answer with a price from a map belonging to a different bar. Switching
  // bars leaves the previous map in place until the new fetch lands — and if that
  // fetch fails (offline, cold backend) it stays indefinitely. Product IDs are
  // shared across an account's bars, so without this gate an overlapping bottle
  // would price at the other bar's negotiated rate and go out on a real order
  // email. Undefined here reads as "no price yet", which the Pricing screen
  // already surfaces and the reconnect listener above heals.
  const bookMatchesLocation = !!currentLocation && bookLocationId === currentLocation.id;

  const priceFor = useCallback(
    (productId?: string) =>
      productId && bookMatchesLocation ? byProductId[productId]?.price : undefined,
    [byProductId, bookMatchesLocation]
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

  // Merging rewrites par_levels rows server-side (prices can move between
  // products, rows can disappear), so the local map is refetched rather than
  // patched — guessing the result here would drift from what actually landed.
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
    <PricingContext.Provider
      value={{ entries, loading, priceFor, setPrice, clearPrice, mergeInto, refresh }}
    >
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricing must be used within PricingProvider');
  }
  return context;
};
