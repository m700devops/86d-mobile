import React, { createContext, useContext, useState } from 'react';
import { Location } from '../types';

interface LocationContextType {
  currentLocation: Location | null;
  locations: Location[];
  setCurrentLocation: (id: string) => void;
  addLocation: (location: Location) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);

  const setCurrentLocation = (id: string) => {
    const location = locations.find(l => l.id === id);
    if (location) {
      setCurrentLocationState(location);
    }
  };

  const addLocation = (location: Location) => {
    setLocations([...locations, location]);
  };

  return (
    <LocationContext.Provider value={{ currentLocation, locations, setCurrentLocation, addLocation }}>
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
