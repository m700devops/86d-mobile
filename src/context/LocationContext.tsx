import React, { createContext, useContext, useState, useEffect } from 'react';
import { Location } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  currentLocation: Location | null;
  locations: Location[];
  loading: boolean;
  setCurrentLocation: (id: string) => void;
  addLocation: (name: string, address?: string) => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    (async () => {
      try {
        const fetched = await apiService.getLocations();
        setLocations(fetched);
        if (fetched.length > 0) {
          setCurrentLocationState(fetched[0]);
        }
      } catch (err) {
        console.error('[LocationContext] failed to load locations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const setCurrentLocation = (id: string) => {
    const location = locations.find(l => l.id === id);
    if (location) {
      setCurrentLocationState(location);
    }
  };

  const addLocation = async (name: string, address?: string) => {
    const created = await apiService.createLocation(name, address);
    setLocations(prev => [...prev, created]);
    setCurrentLocationState(created);
  };

  return (
    <LocationContext.Provider value={{ currentLocation, locations, loading, setCurrentLocation, addLocation }}>
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
