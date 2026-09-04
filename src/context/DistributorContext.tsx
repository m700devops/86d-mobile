import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Distributor } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface DistributorContextType {
  distributors: Distributor[];
  loading: boolean;
  // Resolves with the distributor the server created — callers that need to
  // use it straight away (assigning it to a bottle) need its real id, not the
  // throwaway one they passed in.
  addDistributor: (distributor: Distributor) => Promise<Distributor>;
  updateDistributor: (id: string, updates: Partial<Distributor>) => void;
  removeDistributor: (id: string) => void;
}

const DistributorContext = createContext<DistributorContextType | undefined>(undefined);

// Cache-first for the same reason as locations: distributor names/emails are
// what orders group and send by, and an order built on flaky stockroom wifi
// should not degrade to "everything unassigned" because one launch-time fetch
// failed. Keyed by user id so accounts on a shared phone don't inherit each
// other's distributor lists.
const distributorsKey = (userId: string) => `@86d_distributors_${userId}`;

export const DistributorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);
  const userId = user?.id;

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
        if (raw && !cancelled) setDistributors(JSON.parse(raw));
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

  const persist = (next: Distributor[]) => {
    if (userId) AsyncStorage.setItem(distributorsKey(userId), JSON.stringify(next)).catch(() => {});
    return next;
  };

  const addDistributor = async (distributor: Distributor) => {
    const created = await apiService.createDistributor(
      distributor.name,
      distributor.email,
      distributor.phone,
      distributor.repName
    );
    setDistributors(prev => persist([...prev, created]));
    return created;
  };

  const updateDistributor = (id: string, updates: Partial<Distributor>) => {
    setDistributors(prev => persist(prev.map(d => (d.id === id ? { ...d, ...updates } : d))));
  };

  const removeDistributor = (id: string) => {
    setDistributors(prev => persist(prev.filter(d => d.id !== id)));
  };

  return (
    <DistributorContext.Provider value={{ distributors, loading, addDistributor, updateDistributor, removeDistributor }}>
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
