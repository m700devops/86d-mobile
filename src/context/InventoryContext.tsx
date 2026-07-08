import React, { createContext, useContext, useState } from 'react';
import { Bottle } from '../types';

interface ResolvedScanInfo {
  productId?: string;
  name: string;
  brand: string;
  category: string;
}

interface InventoryContextType {
  bottles: Bottle[];
  addBottle: (bottle: Bottle) => void;
  updateBottle: (id: string, updates: Partial<Bottle>) => void;
  removeBottle: (id: string) => void;
  resolveScan: (id: string, info: ResolvedScanInfo) => void;
  markScanFailed: (id: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bottles, setBottles] = useState<Bottle[]>([]);

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

  return (
    <InventoryContext.Provider
      value={{ bottles, addBottle, updateBottle, removeBottle, resolveScan, markScanFailed }}
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
