import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Distributor } from '../types';
import { buildInitialsMap } from '../utils/distributorInitials';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';

interface DistributorContextType {
  distributors: Distributor[];
  loading: boolean;
  // Badge initials, derived from the names and guaranteed distinct across the
  // list. Nobody types these: the field that used to ask for them was never
  // persisted (the API has no initials column and addDistributor never sent
  // one), so every badge quietly rendered a literal "D".
  initialsFor: (id: string) => string;
  // Resolves with the distributor the server created — callers that need to
  // use it straight away (assigning it to a bottle) need its real id, not the
  // throwaway one they passed in.
  addDistributor: (distributor: Distributor) => Promise<Distributor>;
  updateDistributor: (id: string, updates: Partial<Distributor>) => Promise<void>;
  removeDistributor: (id: string) => Promise<void>;
  // This bar's account number with a distributor (per bar: each licensed bar
  // gets its own). Asked for once — in Settings or right on the order screen —
  // and kept until edited. Every order email carries it.
  accountFor: (distributorId: string) => string | undefined;
  // Resolves when the server has it; "" clears. Rejects on failure (offline):
  // the caller keeps the typed value and the order send carries it instead.
  setAccountNumber: (distributorId: string, accountNumber: string) => Promise<void>;
}

const DistributorContext = createContext<DistributorContextType | undefined>(undefined);

// Cache-first for the same reason as locations: distributor names/emails are
// what orders group and send by, and an order built on flaky stockroom wifi
// should not degrade to "everything unassigned" because one launch-time fetch
// failed. Keyed by user id so accounts on a shared phone don't inherit each
// other's distributor lists.
const distributorsKey = (userId: string) => `@86d_distributors_${userId}`;
const accountsKey = (locationId: string) => `@86d_distributor_accounts_${locationId}`;

export const DistributorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = user?.id;
  const { currentLocation } = useLocation();
  const locationId = currentLocation?.id;
  const [accounts, setAccounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setDistributors([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(distributorsKey(userId));
        if (raw && !cancelled) {
          // Older caches hold the server's snake_case fields.
          setDistributors(JSON.parse(raw).map((d: any) => ({
            ...d, repName: d.repName ?? d.rep_name, deliveryDays: d.deliveryDays ?? d.delivery_days ?? null,
          })));
        }
      } catch {
        // cache miss/corruption — the server fetch below is the source of truth
      }

      try {
        const fetched = await apiService.getDistributors();
        if (cancelled) return;
        setDistributors(fetched);
        AsyncStorage.setItem(distributorsKey(userId), JSON.stringify(fetched)).catch(() => {});
      } catch (err) {
        // Offline — whatever the cache provided above stays in place
        console.error('[DistributorContext] failed to load distributors:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);

  // Account numbers belong to the selected bar: cache first (an order on bad
  // wifi should still carry it), then the server.
  useEffect(() => {
    if (!isAuthenticated || !locationId) {
      setAccounts({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(accountsKey(locationId));
        if (!cancelled) setAccounts(raw ? JSON.parse(raw) : {});
      } catch {
        if (!cancelled) setAccounts({});
      }
      try {
        const fetched = await apiService.getDistributorAccounts(locationId);
        if (cancelled) return;
        setAccounts(fetched);
        AsyncStorage.setItem(accountsKey(locationId), JSON.stringify(fetched)).catch(() => {});
      } catch (err) {
        console.error('[DistributorContext] failed to load account numbers:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, locationId]);

  const accountFor = useCallback((id: string) => accounts[id], [accounts]);

  const setAccountNumber = useCallback(
    async (distributorId: string, accountNumber: string) => {
      if (!locationId) throw new Error('No bar selected');
      const saved = await apiService.setDistributorAccount(locationId, distributorId, accountNumber.trim());
      setAccounts(prev => {
        const next = { ...prev };
        if (saved) next[distributorId] = saved;
        else delete next[distributorId];
        AsyncStorage.setItem(accountsKey(locationId), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [locationId]
  );

  // Recomputed whenever the list changes — a rename should move the badge with
  // it, and a new distributor that collides has to be resolved against
  // everyone else, not just against itself.
  const initialsMap = useMemo(
    () => buildInitialsMap(distributors.map(d => ({ id: d.id, name: d.name }))),
    [distributors]
  );
  const initialsFor = useCallback((id: string) => initialsMap[id] ?? 'D', [initialsMap]);

  const persist = (next: Distributor[]) => {
    if (userId) AsyncStorage.setItem(distributorsKey(userId), JSON.stringify(next)).catch(() => {});
    return next;
  };

  const addDistributor = async (distributor: Distributor) => {
    const created = await apiService.createDistributor(
      distributor.name,
      distributor.email,
      distributor.phone,
      distributor.repName,
      distributor.deliveryDays
    );
    setDistributors(prev => persist([...prev, created]));
    return created;
  };

  const updateDistributor = async (id: string, updates: Partial<Distributor>) => {
    const previous = distributors;
    setDistributors(prev => persist(prev.map(d => (d.id === id ? { ...d, ...updates } : d))));
    try {
      await apiService.updateDistributor(id, updates);
    } catch (err) {
      setDistributors(persist(previous));
      throw err;
    }
  };

  const removeDistributor = async (id: string) => {
    const previous = distributors;
    setDistributors(prev => persist(prev.filter(d => d.id !== id)));
    try {
      await apiService.deleteDistributor(id);
    } catch (err) {
      setDistributors(persist(previous));
      throw err;
    }
  };

  return (
    <DistributorContext.Provider
      value={{
        distributors, loading, initialsFor, addDistributor, updateDistributor, removeDistributor,
        accountFor, setAccountNumber,
      }}
    >
      {children}
    </DistributorContext.Provider>
  );
};

export const useDistributors = () => {
  const context = useContext(DistributorContext);
  if (!context) {
    throw new Error('useDistributors must be used within DistributorProvider');
  }
  return context;
};
