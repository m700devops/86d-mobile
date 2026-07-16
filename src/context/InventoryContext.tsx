import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bottle } from '../types';
import { useLocation } from './LocationContext';
import { apiService } from '../services/api';

interface ResolvedScanInfo {
  productId?: string;
  name: string;
  brand: string;
  category: string;
}

interface InventoryContextType {
  bottles: Bottle[];
  isHydrated: boolean;
  addBottle: (bottle: Bottle) => void;
  updateBottle: (id: string, updates: Partial<Bottle>) => void;
  removeBottle: (id: string) => void;
  resolveScan: (id: string, info: ResolvedScanInfo) => void;
  markScanFailed: (id: string) => void;
  clearBottles: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const draftKey = (locationId: string) => `@86d_inventory_draft_${locationId}`;
const SAVE_DEBOUNCE_MS = 400;

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedLocationId = useRef<string | null>(null);
  const bottlesRef = useRef<Bottle[]>(bottles);
  bottlesRef.current = bottles;

  // Rehydrate whenever the active location changes (including first load).
  // A scan that was still "pending" when the app died will never resolve —
  // its in-flight promise is gone with the old JS context — so surface it as
  // failed rather than leaving a row stuck "Identifying..." forever.
  useEffect(() => {
    if (!currentLocation) return;
    if (hydratedLocationId.current === currentLocation.id) return;

    let cancelled = false;
    setIsHydrated(false);

    const recoverPending = (list: Bottle[]) =>
      list.map(b =>
        b.scanStatus === 'pending' ? { ...b, scanStatus: 'failed' as const, name: 'Unknown bottle' } : b
      );

    (async () => {
      let recovered: Bottle[] = [];
      try {
        const raw = await AsyncStorage.getItem(draftKey(currentLocation.id));
        if (raw) recovered = recoverPending(JSON.parse(raw));
      } catch {
        recovered = [];
      }

      // No local draft — could be a fresh install or a new device. Fall back
      // to the server-side backup before concluding there's nothing to resume.
      if (recovered.length === 0) {
        try {
          const remote = await apiService.getInventoryDraft(currentLocation.id);
          if (remote.bottles && remote.bottles.length > 0) {
            recovered = recoverPending(remote.bottles as Bottle[]);
          }
        } catch {
          // offline or server hiccup — proceed with an empty draft locally
        }
      }

      if (cancelled) return;
      setBottles(recovered);
      hydratedLocationId.current = currentLocation.id;
      setIsHydrated(true);
    })();

    return () => { cancelled = true; };
  }, [currentLocation]);

  // Persist on every change, debounced — skipped until hydration for the
  // current location has landed, so we don't clobber a saved draft with []
  // in the gap before the read above resolves.
  useEffect(() => {
    if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(draftKey(currentLocation.id), JSON.stringify(bottles)).catch(() => {});
      apiService.saveInventoryDraft(currentLocation.id, bottles).catch(() => {});
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [bottles, currentLocation, isHydrated]);

  // Belt-and-suspenders: the debounce above closes almost all of the data-loss
  // window, but iOS backgrounding the app is the one moment we know a kill
  // might follow — flush immediately rather than waiting out the debounce.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'background' && nextState !== 'inactive') return;
      if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      AsyncStorage.setItem(draftKey(currentLocation.id), JSON.stringify(bottlesRef.current)).catch(() => {});
      apiService.saveInventoryDraft(currentLocation.id, bottlesRef.current).catch(() => {});
    });
    return () => sub.remove();
  }, [currentLocation, isHydrated]);

  const addBottle = (bottle: Bottle) => {
    setBottles(prev => [bottle, ...prev]);
  };

  const updateBottle = (id: string, updates: Partial<Bottle>) => {
    setBottles(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBottle = (id: string) => {
    setBottles(prev => prev.filter(b => b.id !== id));
  };

  // Fill in a fire-and-forget row once background identification lands.
  // Runs against the latest state so the duplicate-merge can't race with
  // other rows added while the scan was in flight.
  const resolveScan = (id: string, info: ResolvedScanInfo) => {
    setBottles(prev => {
      const row = prev.find(b => b.id === id);
      if (!row) return prev; // row was undone/deleted before the result landed

      // Same product already identified in this session? Merge — the newer
      // typed count becomes the total, and the placeholder row disappears.
      const dup = prev.find(b =>
        b.id !== id &&
        b.scanStatus === undefined &&
        ((info.productId && b.productId === info.productId) ||
          (b.name.toLowerCase() === info.name.toLowerCase() &&
           b.brand.toLowerCase() === info.brand.toLowerCase()))
      );
      if (dup) {
        return prev
          .filter(b => b.id !== id)
          .map(b => (b.id === dup.id ? { ...b, currentStock: row.currentStock } : b));
      }

      return prev.map(b =>
        b.id === id ? { ...b, ...info, scanStatus: undefined } : b
      );
    });
  };

  const markScanFailed = (id: string) => {
    setBottles(prev => prev.map(b =>
      b.id === id ? { ...b, scanStatus: 'failed' as const, name: 'Unknown bottle' } : b
    ));
  };

  // Called once an order's been successfully sent — that draft is done,
  // don't let it resurface (and get accidentally re-sent) on the next scan.
  const clearBottles = () => {
    setBottles([]);
    if (currentLocation) {
      AsyncStorage.removeItem(draftKey(currentLocation.id)).catch(() => {});
      apiService.deleteInventoryDraft(currentLocation.id).catch(() => {});
    }
  };

  return (
    <InventoryContext.Provider
      value={{ bottles, isHydrated, addBottle, updateBottle, removeBottle, resolveScan, markScanFailed, clearBottles }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};
