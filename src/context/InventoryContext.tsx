import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as ImageManipulator from 'expo-image-manipulator';
import { Bottle } from '../types';
import { useLocation } from './LocationContext';
import { apiService } from '../services/api';
import { deleteScanPhoto } from '../utils/scanPhotos';

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
  markScanFailed: (id: string, reason?: 'network' | 'other') => void;
  retryScan: (bottle: Bottle) => Promise<void>;
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

    // A row stuck "pending" when the app died is worth an automatic retry —
    // we still have its photo, and there's no reason to believe it would fail
    // again — so route it through the same 'network' auto-retry path rather
    // than leaving it for a manual tap.
    const recoverPending = (list: Bottle[]) =>
      list.map(b =>
        b.scanStatus === 'pending'
          ? { ...b, scanStatus: 'failed' as const, failureReason: 'network' as const, name: 'Unknown bottle' }
          : b
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

  // Local write on every change, undebounced — a hard crash doesn't fire any
  // JS event we could hook (AppState 'background' only fires on a graceful
  // transition), so the only real protection against losing the *latest*
  // change is not delaying the write in the first place. AsyncStorage writes
  // for a small JSON array are cheap enough that this isn't a perf concern.
  useEffect(() => {
    if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;
    AsyncStorage.setItem(draftKey(currentLocation.id), JSON.stringify(bottles)).catch(() => {});
  }, [bottles, currentLocation, isHydrated]);

  // Backend sync, debounced — this is belt-and-suspenders for device loss,
  // not crash recovery (the local write above already covers that), so it's
  // fine for it to lag slightly behind in exchange for not firing a network
  // request on every single scan during a fast-moving session.
  useEffect(() => {
    if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiService.saveInventoryDraft(currentLocation.id, bottles).catch(() => {});
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [bottles, currentLocation, isHydrated]);

  // Flush the backend debounce immediately when backgrounding — the one
  // moment we know a kill might follow, so it's worth not waiting it out.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'background' && nextState !== 'inactive') return;
      if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
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
    setBottles(prev => {
      const row = prev.find(b => b.id === id);
      if (row?.imageUrl) deleteScanPhoto(row.imageUrl);
      return prev.filter(b => b.id !== id);
    });
  };

  // Fill in a fire-and-forget row once background identification lands.
  // Runs against the latest state so the duplicate-merge can't race with
  // other rows added while the scan was in flight.
  const resolveScan = (id: string, info: ResolvedScanInfo) => {
    setBottles(prev => {
      const row = prev.find(b => b.id === id);
      if (!row) return prev; // row was undone/deleted before the result landed

      // Fully identified now — the photo was only ever needed in case this
      // row needed a retry, so it's safe to clean up once it succeeds.
      if (row.imageUrl) deleteScanPhoto(row.imageUrl);

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
        b.id === id ? { ...b, ...info, scanStatus: undefined, imageUrl: undefined } : b
      );
    });
  };

  const markScanFailed = (id: string, reason: 'network' | 'other' = 'other') => {
    setBottles(prev => prev.map(b =>
      b.id === id ? { ...b, scanStatus: 'failed' as const, failureReason: reason, name: 'Unknown bottle' } : b
    ));
  };

  // Re-run identification for a failed row using the photo captured at scan
  // time. Shared by the manual "retry" chip in Review and the automatic
  // retry-on-reconnect below, so both go through the exact same path.
  const retryScan = async (bottle: Bottle) => {
    if (!bottle.imageUrl) return;
    setBottles(prev => prev.map(b =>
      b.id === bottle.id ? { ...b, scanStatus: 'pending' as const, name: 'Identifying…' } : b
    ));
    try {
      const resized = await ImageManipulator.manipulateAsync(
        bottle.imageUrl,
        [{ resize: { width: 800 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const result = resized.base64 ? await apiService.analyzeBottleImage(resized.base64) : null;
      if (result && result.matched_product_id) {
        resolveScan(bottle.id, {
          productId: result.matched_product_id,
          name: result.name,
          brand: result.brand,
          category: result.category,
        });
      } else {
        markScanFailed(bottle.id, 'other');
      }
    } catch (err: any) {
      const isNetwork = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') ||
        !!err?.request || err?.message?.includes('Network');
      markScanFailed(bottle.id, isNetwork ? 'network' : 'other');
    }
  };

  // Auto-retry scans that failed for connectivity reasons once we're back
  // online — sequential, not parallel, so a burst of queued retries doesn't
  // hammer the API all at once.
  const retryingRef = useRef(false);
  const runNetworkRetries = async () => {
    if (retryingRef.current) return;
    const pending = bottlesRef.current.filter(b => b.scanStatus === 'failed' && b.failureReason === 'network');
    if (pending.length === 0) return;
    retryingRef.current = true;
    try {
      for (const bottle of pending) {
        await retryScan(bottle);
      }
    } finally {
      retryingRef.current = false;
    }
  };

  // Check once on launch (in case network-failed rows were recovered from a
  // saved draft and we're already online), then again on every reconnect.
  useEffect(() => {
    if (!isHydrated) return;
    NetInfo.fetch().then(state => {
      if (state.isConnected && state.isInternetReachable !== false) runNetworkRetries();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  useEffect(() => {
    let wasOffline = false;
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      if (!isOnline) {
        wasOffline = true;
        return;
      }
      if (!wasOffline) return;
      wasOffline = false;
      runNetworkRetries();
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called once an order's been successfully sent — that draft is done,
  // don't let it resurface (and get accidentally re-sent) on the next scan.
  const clearBottles = () => {
    // Failed rows that never got resolved before the order was sent still
    // hold a photo — nothing will retry them once the draft is cleared.
    bottlesRef.current.forEach(b => { if (b.imageUrl) deleteScanPhoto(b.imageUrl); });
    setBottles([]);
    if (currentLocation) {
      AsyncStorage.removeItem(draftKey(currentLocation.id)).catch(() => {});
      apiService.deleteInventoryDraft(currentLocation.id).catch(() => {});
    }
  };

  return (
    <InventoryContext.Provider
      value={{ bottles, isHydrated, addBottle, updateBottle, removeBottle, resolveScan, markScanFailed, retryScan, clearBottles }}
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
