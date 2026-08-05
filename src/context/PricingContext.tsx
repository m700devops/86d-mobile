import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  refresh: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [byProductId, setByProductId] = useState<Record<string, PriceBookEntry>>({});
  const [loading, setLoading] = useState(false);
  const loadedLocationId = useRef<string | null>(null);

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
      loadedLocationId.current = locationId;
    } catch (err) {
      console.error('[PricingContext] failed to load price book:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    if (loadedLocationId.current === currentLocation.id) return;
    load(currentLocation.id);
  }, [currentLocation, load]);

  const refresh = useCallback(async () => {
    if (!currentLocation) return;
    await load(currentLocation.id);
  }, [currentLocation, load]);

  const priceFor = useCallback(
    (productId?: string) => (productId ? byProductId[productId]?.price : undefined),
    [byProductId]
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

  const entries = Object.values(byProductId).sort((a, b) =>
    `${a.brand ?? ''} ${a.name}`.trim().localeCompare(`${b.brand ?? ''} ${b.name}`.trim())
  );

  return (
    <PricingContext.Provider value={{ entries, loading, priceFor, setPrice, clearPrice, refresh }}>
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
