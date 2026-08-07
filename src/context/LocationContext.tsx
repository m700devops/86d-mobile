import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Location } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  currentLocation: Location | null;
  locations: Location[];
  loading: boolean;
  // True once we've tried everything (cache and server) and still have no
  // location — the signal for screens to show a retry state instead of a
  // spinner that can never resolve.
  loadFailed: boolean;
  setCurrentLocation: (id: string) => void;
  addLocation: (name: string, address?: string) => Promise<void>;
  updateOrderRoundingMode: (mode: 'up' | 'nearest') => Promise<void>;
  reload: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Locations are the root of the whole offline story: inventory drafts, staff
// lists, and price lookups are all keyed by location id, and every one of
// those flows dies if currentLocation is null. Fetching locations only from
// the server meant one failed request on launch (bad cell signal in a
// stockroom, Render cold start, captive wifi) left the app permanently
// spinner-locked — Review, Order Summary, and Order History all gate on
// state that never arrives, and worse, the inventory draft's local
// persistence never turns on, so a force-quit loses the count.
//
// So: cache the location list per user, serve it instantly on launch, and
// treat the server fetch as a background refresh. The cache is keyed by user
// id so a different account on the same phone can't inherit another bar's
// locations.
const locationsKey = (userId: string) => `@86d_locations_${userId}`;

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const userId = user?.id;
  const fetchSeq = useRef(0);

  const applyServerList = useCallback((fetched: Location[], uid: string) => {
    setLocations(fetched);
    // Keep the user's current selection across refreshes when it still
    // exists; only fall back to the first location otherwise.
    setCurrentLocationState(prev => fetched.find(l => l.id === prev?.id) ?? fetched[0] ?? null);
    AsyncStorage.setItem(locationsKey(uid), JSON.stringify(fetched)).catch(() => {});
  }, []);

  const fetchFromServer = useCallback(async (uid: string, hasAnyLocation: boolean) => {
    const token = ++fetchSeq.current;
    try {
      const fetched = await apiService.getLocations();
      if (token !== fetchSeq.current) return; // superseded by a newer fetch
      if (fetched.length === 0) {
        // Fresh account — create a default location so nothing downstream
        // (distributor assignment, stock saves) blocks on setup. Renameable
        // in Settings later.
        const created = await apiService.createLocation('My Bar');
        if (token !== fetchSeq.current) return;
        applyServerList([created], uid);
      } else {
        applyServerList(fetched, uid);
      }
      setLoadFailed(false);
    } catch (err) {
      console.error('[LocationContext] failed to load locations:', err);
      // Only a failure state when the cache gave us nothing to work with —
      // with a cached location the app is fully usable and this refresh
      // just quietly didn't happen.
      if (token === fetchSeq.current && !hasAnyLocation) setLoadFailed(true);
    } finally {
      if (token === fetchSeq.current) setLoading(false);
    }
  }, [applyServerList]);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setLoadFailed(false);

    let cached: Location[] = [];
    try {
      const raw = await AsyncStorage.getItem(locationsKey(uid));
      if (raw) cached = JSON.parse(raw);
    } catch {
      cached = [];
    }

    if (cached.length > 0) {
      setLocations(cached);
      setCurrentLocationState(prev => cached.find(l => l.id === prev?.id) ?? cached[0]);
      // The app is usable right now, offline included — the server fetch
      // below is just a freshness pass.
      setLoading(false);
    }

    fetchFromServer(uid, cached.length > 0);
  }, [fetchFromServer]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      fetchSeq.current++;
      setLocations([]);
      setCurrentLocationState(null);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    load(userId);
  }, [isAuthenticated, userId, load]);

  // A failed first load (fresh account, dead network) shouldn't be terminal:
  // retry as soon as connectivity comes back rather than waiting for the
  // user to find the retry button.
  useEffect(() => {
    if (!loadFailed || !userId) return;
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        load(userId);
      }
    });
    return () => unsubscribe();
  }, [loadFailed, userId, load]);

  const reload = useCallback(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const setCurrentLocation = (id: string) => {
    const location = locations.find(l => l.id === id);
    if (location) {
      setCurrentLocationState(location);
    }
  };

  const addLocation = async (name: string, address?: string) => {
    const created = await apiService.createLocation(name, address);
    setLocations(prev => {
      const next = [...prev, created];
      if (userId) AsyncStorage.setItem(locationsKey(userId), JSON.stringify(next)).catch(() => {});
      return next;
    });
    setCurrentLocationState(created);
  };

  const updateOrderRoundingMode = async (mode: 'up' | 'nearest') => {
    if (!currentLocation) return;
    const updated = await apiService.updateLocation(currentLocation.id, { order_rounding_mode: mode });
    setLocations(prev => {
      const next = prev.map(l => (l.id === updated.id ? updated : l));
      if (userId) AsyncStorage.setItem(locationsKey(userId), JSON.stringify(next)).catch(() => {});
      return next;
    });
    setCurrentLocationState(updated);
  };

  return (
    <LocationContext.Provider
      value={{ currentLocation, locations, loading, loadFailed, setCurrentLocation, addLocation, updateOrderRoundingMode, reload }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
};
