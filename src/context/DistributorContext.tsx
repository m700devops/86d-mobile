import React, { createContext, useContext, useState } from 'react';
import { Distributor } from '../types';

interface DistributorContextType {
  distributors: Distributor[];
  addDistributor: (distributor: Distributor) => void;
  updateDistributor: (id: string, updates: Partial<Distributor>) => void;
  removeDistributor: (id: string) => void;
}

const DistributorContext = createContext<DistributorContextType | undefined>(undefined);

export const DistributorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  const addDistributor = (distributor: Distributor) => {
    setDistributors(prev => [...prev, distributor]);
  };

  const updateDistributor = (id: string, updates: Partial<Distributor>) => {
    setDistributors(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const removeDistributor = (id: string) => {
    setDistributors(prev => prev.filter(d => d.id !== id));
  };

  return (
    <DistributorContext.Provider value={{ distributors, addDistributor, updateDistributor, removeDistributor }}>
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
