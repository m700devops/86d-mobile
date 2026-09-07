import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as ImageManipulator from 'expo-image-manipulator';
import { Bottle } from '../types';
import { useLocation } from './LocationContext';
import { apiService } from '../services/api';
import { deleteScanPhoto } from '../utils/scanPhotos';
import { bottleMatchKey } from '../utils/productKey';
import {
  isAutoRetryable,
  isOrphanedRetry,
  nextFailureState,
  isTransientRequestError,
} from '../utils/retryPolicy';

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
  repointProduct: (sourceProductId: string, target: { productId: string; name: string; brand: string }) => void;
  markScanFailed: (id: string, reason?: 'network' | 'other') => void;
  retryScan: (bottle: Bottle) => Promise<void>;
  // Rows an automatic retry has filled in since the user last looked, so
  // Review can say so — a scan that identified itself in the background is
  // invisible otherwise.
  autoResolvedCount: number;
  acknowledgeAutoResolved: () => void;
  clearBottles: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const draftKey = (locationId: string) => `@86d_inventory_draft_${locationId}`;
const SAVE_DEBOUNCE_MS = 400;

// While the app is open, re-check on this cadence. NetInfo only reports hard
// connectivity transitions, and the case that started all this — bad-but-not-
// zero service that quietly improves as you drive — never fires one.
const RETRY_POLL_MS = 30_000;

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [autoResolvedCount, setAutoResolvedCount] = useState(0);
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
  //
  // Never push an EMPTY list: with one account on two phones, a device with
  // no local session would otherwise clobber a teammate's in-progress count
  // on the server. Deliberate clears go through clearBottles, which deletes
  // the server draft explicitly.
  useEffect(() => {
    if (!currentLocation || !isHydrated || hydratedLocationId.current !== currentLocation.id) return;
    if (bottles.length === 0) return;

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
      if (bottlesRef.current.length === 0) return;
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
      // Keys are normalized and swap-tolerant so a differently-phrased re-read
      // of the same label still merges (see utils/productKey).
      const infoKey = bottleMatchKey(info.brand, info.name);
      const dup = prev.find(b =>
        b.id !== id &&
        b.scanStatus === undefined &&
        ((info.productId && b.productId === info.productId) ||
          (!!infoKey && bottleMatchKey(b.brand, b.name) === infoKey))
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

  // Follow-up to merging two products in the Pricing screen: rows already
  // counted in this draft still point at the retired product, so without this
  // they'd stay unpriced and order at $0. Relabels them to the kept product
  // and, when the duplicate split one bottle across two rows, collapses them.
  //
  // The surviving count is the larger of the two rather than their sum — the
  // same rule the backend merge applies to current_stock — so a merge run
  // after both rows were counted can never silently double what's on hand.
  const repointProduct = (
    sourceProductId: string,
    target: { productId: string; name: string; brand: string }
  ) => {
    setBottles(prev => {
      const affected = prev.filter(b => b.productId === sourceProductId);
      if (affected.length === 0) return prev;

      const keeper = prev.find(b => b.productId === target.productId);
      if (!keeper) {
        return prev.map(b =>
          b.productId === sourceProductId
            ? { ...b, productId: target.productId, name: target.name, brand: target.brand }
            : b
        );
      }

      const mergedStock = Math.max(
        keeper.currentStock || 0,
        ...affected.map(b => b.currentStock || 0)
      );
      return prev
        .filter(b => b.productId !== sourceProductId)
        .map(b => (b.id === keeper.id ? { ...b, currentStock: mergedStock } : b));
    });
  };

  const markScanFailed = (id: string, reason: 'network' | 'other' = 'other') => {
    setBottles(prev => prev.map(b =>
      b.id === id
        // Stamping the time here anchors the backoff ladder to the original
        // failure, so the first automatic attempt is spaced like every other
        // one instead of firing on whatever poll happens to come next.
        ? { ...b, scanStatus: 'failed' as const, failureReason: reason, name: 'Unknown bottle', lastRetryAt: Date.now() }
        : b
    ));
  };

  // Re-run identification for a failed row using the photo captured at scan
  // time. Shared by the manual "retry" chip in Review and the automatic
  // sweep below, so both go through the exact same path.
  //
  // `auto` is what separates the two: an automatic attempt spends the row's
  // unreadable budget only when the server actually answered, whereas a human
  // tap means "try again now" — it resets both counters and, on a no-match,
  // marks the row terminal so it stops promising to fix itself. Demoting a row
  // to 'other' on the FIRST unattended no-match (the old behavior) is what let
  // one bad mid-drive attempt disqualify a row from every later retry.
  const retryScan = async (bottle: Bottle, opts: { auto?: boolean } = {}) => {
    const auto = opts.auto === true;
    if (!bottle.imageUrl) {
      // Nothing to re-send — the photo is gone (cache eviction, or the row
      // predates durable photo storage). Say so instead of leaving the row
      // claiming it'll retry itself.
      if (auto) markScanFailed(bottle.id, 'other');
      return;
    }

    const attempts = auto ? (bottle.retryAttempts ?? 0) + 1 : 0;
    const unreadableBefore = auto ? (bottle.unreadableAttempts ?? 0) : 0;

    setBottles(prev => prev.map(b =>
      b.id === bottle.id
        ? {
            ...b,
            scanStatus: 'pending' as const,
            name: 'Identifying…',
            retryAttempts: attempts,
            unreadableAttempts: unreadableBefore,
            lastRetryAt: Date.now(),
          }
        : b
    ));

    const failWith = (reason: 'network' | 'other', unreadable: number) => {
      setBottles(prev => prev.map(b =>
        b.id === bottle.id
          ? {
              ...b,
              scanStatus: 'failed' as const,
              failureReason: reason,
              name: 'Unknown bottle',
              retryAttempts: attempts,
              unreadableAttempts: unreadable,
              lastRetryAt: Date.now(),
            }
          : b
      ));
    };

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
        if (auto) setAutoResolvedCount(n => n + 1);
        return;
      }
      // The server answered and still couldn't place the bottle. A weak
      // connection can produce this too (a half-uploaded photo), so it costs
      // one of the unreadable attempts rather than ending things outright —
      // but once those run out, only a human tap will do. A manual retry is
      // its own answer: the human asked, so a miss is reported as a miss.
      const next = nextFailureState(unreadableBefore, { answered: true });
      failWith(auto ? next.failureReason : 'other', next.unreadableAttempts);
    } catch (err: any) {
      // A connection failure never spends the unreadable budget: the AI never
      // got a look at this photo, so the attempt says nothing about whether
      // it's readable. That's what lets a row survive a long dead zone and
      // still identify itself on the drive home.
      const next = nextFailureState(unreadableBefore, { answered: !isTransientRequestError(err) });
      failWith(next.failureReason, next.unreadableAttempts);
    }
  };

  // Sweep every row that's waiting on a better connection — sequential, not
  // parallel, so a backlog doesn't hammer the API all at once.
  const retryingRef = useRef(false);
  const runNetworkRetries = async () => {
    if (retryingRef.current) return;
    const now = Date.now();

    // A 'network' row with no photo can never self-heal — there's nothing to
    // re-send. Demote it so it stops claiming it will, and Review can show
    // the honest "tap to retry" chip instead.
    const orphaned = bottlesRef.current.filter(isOrphanedRetry);
    if (orphaned.length > 0) {
      const ids = new Set(orphaned.map(b => b.id));
      setBottles(prev => prev.map(b => (ids.has(b.id) ? { ...b, failureReason: 'other' as const } : b)));
    }

    const due = bottlesRef.current.filter(b => isAutoRetryable(b, now));
    if (due.length === 0) return;

    // Skip a sweep we know will fail. Nothing is lost if this is wrong (a
    // connection failure costs the row nothing), but a confirmed-offline
    // device shouldn't spend an upload attempt or advance its backoff.
    const net = await NetInfo.fetch().catch(() => null);
    if (net && (!net.isConnected || net.isInternetReachable === false)) return;

    retryingRef.current = true;
    try {
      for (const bottle of due) {
        // Re-read the row: a manual retry or a delete may have landed while
        // the queue was draining.
        const current = bottlesRef.current.find(b => b.id === bottle.id);
        if (!current || current.scanStatus !== 'failed') continue;
        await retryScan(current, { auto: true });
      }
    } finally {
      retryingRef.current = false;
    }
  };
  const retriesRef = useRef(runNetworkRetries);
  retriesRef.current = runNetworkRetries;

  // Four things kick a sweep, because any one of them alone leaves a hole:
  //
  //  1. hydration       — rows restored from a draft, app opened with signal
  //  2. connectivity     — NetInfo reports we're online
  //  3. foreground       — the app came back to the front
  //  4. a 30s poll       — the app stayed open while signal improved
  //
  // (2) deliberately does NOT require having seen an offline event first.
  // Weak-but-present service (the grocery-store case) never reports offline,
  // so an edge-triggered listener sat there waiting for a transition that
  // never came, and nothing retried on the drive home.
  useEffect(() => {
    if (!isHydrated) return;
    retriesRef.current();
  }, [isHydrated]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected || state.isInternetReachable === false) return;
      retriesRef.current();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') retriesRef.current();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      retriesRef.current();
    }, RETRY_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const acknowledgeAutoResolved = () => setAutoResolvedCount(0);

  // Called once an order's been successfully sent — that draft is done,
  // don't let it resurface (and get accidentally re-sent) on the next scan.
  const clearBottles = () => {
    // Failed rows that never got resolved before the order was sent still
    // hold a photo — nothing will retry them once the draft is cleared.
    bottlesRef.current.forEach(b => { if (b.imageUrl) deleteScanPhoto(b.imageUrl); });
    setBottles([]);
    setAutoResolvedCount(0);
    if (currentLocation) {
      AsyncStorage.removeItem(draftKey(currentLocation.id)).catch(() => {});
      apiService.deleteInventoryDraft(currentLocation.id).catch(() => {});
    }
  };

  return (
    <InventoryContext.Provider
      value={{ bottles, isHydrated, addBottle, updateBottle, removeBottle, resolveScan, repointProduct, markScanFailed, retryScan, autoResolvedCount, acknowledgeAutoResolved, clearBottles }}
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
