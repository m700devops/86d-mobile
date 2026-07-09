import React, { createContext, useContext, useState, useEffect } from 'react';
import { Distributor } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface DistributorContextType {
  distributors: Distributor[];
  loading: boolean;
  addDistributor: (distributor: Distributor) => Promise<void>;
  updateDistributor: (id: string, updates: Partial<Distributor>) => void;
  removeDistributor: (id: string) => void;
}

const DistributorContext = createContext<DistributorContextType | undefined>(undefined);

export const DistributorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    (async () => {
      try {
        const fetched = await apiService.getDistributors();
        setDistributors(fetched);
      } catch (err) {
        console.error('[DistributorContext] failed to load distributors:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const addDistributor = async (distributor: Distributor) => {
    const created = await apiService.createDistributor(
      distributor.name,
      distributor.email,
      distributor.phone,
      distributor.repName
    );
    setDistributors(prev => [...prev, created]);
  };

  const updateDistributor = (id: string, updates: Partial<Distributor>) => {
    setDistributors(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const removeDistributor = (id: string) => {
    setDistributors(prev => prev.filter(d => d.id !== id));
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
