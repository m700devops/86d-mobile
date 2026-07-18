import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from './LocationContext';
import { apiService } from '../services/api';

interface StaffContextType {
  staff: string[];
  addStaff: (name: string) => void;
  removeStaff: (name: string) => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

const staffKey = (locationId: string) => `@86d_staff_${locationId}`;

// Names for "who counted this", not accounts — no passwords, no logins.
// Synced to the location server-side so every phone on the account sees the
// same list; AsyncStorage is kept as an offline cache and as the migration
// path for lists created before server sync existed.
export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLocation } = useLocation();
  const [staff, setStaff] = useState<string[]>([]);
  const staffRef = useRef(staff);
  staffRef.current = staff;

  useEffect(() => {
    if (!currentLocation) {
      setStaff([]);
      return;
    }
    let cancelled = false;
    (async () => {
      let cached: string[] = [];
      try {
        const raw = await AsyncStorage.getItem(staffKey(currentLocation.id));
        if (raw) cached = JSON.parse(raw);
      } catch {
        cached = [];
      }
      if (cancelled) return;

      const server = currentLocation.staff_names ?? [];
      if (server.length > 0) {
        setStaff(server);
        AsyncStorage.setItem(staffKey(currentLocation.id), JSON.stringify(server)).catch(() => {});
      } else if (cached.length > 0) {
        // Pre-sync local list — adopt it and push it up so other devices get it
        setStaff(cached);
        apiService.updateLocation(currentLocation.id, { staff_names: cached }).catch(() => {});
      } else {
        setStaff([]);
      }
    })();
    return () => { cancelled = true; };
  }, [currentLocation]);

  // Optimistic local update + cache + best-effort server push. A failed push
  // (offline) still leaves the list usable on this device; the next app
  // launch's adopt-and-push covers eventual sync.
  const persist = (next: string[]) => {
    setStaff(next);
    if (!currentLocation) return;
    AsyncStorage.setItem(staffKey(currentLocation.id), JSON.stringify(next)).catch(() => {});
    apiService.updateLocation(currentLocation.id, { staff_names: next }).catch(() => {});
  };

  const addStaff = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (staffRef.current.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;
    persist([...staffRef.current, trimmed]);
  };

  const removeStaff = (name: string) => {
    persist(staffRef.current.filter(s => s !== name));
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
