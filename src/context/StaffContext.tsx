import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from './LocationContext';

interface StaffContextType {
  staff: string[];
  addStaff: (name: string) => void;
  removeStaff: (name: string) => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

const staffKey = (locationId: string) => `@86d_staff_${locationId}`;

// Deliberately local-only (AsyncStorage), not a backend table — this is a
// named list for "who counted this", not real per-user accounts. No
// passwords, no server sync; if that ever needs to work across devices for
// the same bar, that's a real backend feature, not this.
export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [staff, setStaff] = useState<string[]>([]);

  useEffect(() => {
    if (!currentLocation) {
      setStaff([]);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(staffKey(currentLocation.id))
      .then(raw => {
        if (cancelled) return;
        setStaff(raw ? JSON.parse(raw) : []);
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      });
    return () => { cancelled = true; };
  }, [currentLocation]);

  const addStaff = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !currentLocation) return;
    setStaff(prev => {
      if (prev.some(s => s.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...prev, trimmed];
      AsyncStorage.setItem(staffKey(currentLocation.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const removeStaff = (name: string) => {
    if (!currentLocation) return;
    setStaff(prev => {
      const next = prev.filter(s => s !== name);
      AsyncStorage.setItem(staffKey(currentLocation.id), JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <StaffContext.Provider value={{ staff, addStaff, removeStaff }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within StaffProvider');
  }
  return context;
};
