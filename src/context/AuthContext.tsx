import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { apiService } from '../services/api';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const validateController = useRef<AbortController | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
    return () => { validateController.current?.abort(); };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await apiService.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Show cached user immediately — no loading flash for returning users
      const cached = await apiService.getUserData();
      if (cached) {
        setUser(cached);
        setIsLoading(false);
      }

      // Validate token in background with a short timeout (8s)
      // If the server is cold-starting, we don't want to block the UI
      validateController.current = new AbortController();
      const timeoutId = setTimeout(() => validateController.current?.abort(), 8000);
      try {
        const userData = await apiService.getCurrentUser();
        setUser(userData);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          // Token is definitively invalid — force re-login
          await apiService.logout();
          setUser(null);
        }
        // Network/timeout/cold-start: keep the cached user, stay logged in
      } finally {
        clearTimeout(timeoutId);
      }

      if (!cached) setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    // Don't touch global isLoading — LoginScreen manages its own spinner
    const response = await apiService.login(data);
    setUser(response.user);
  };

  const register = async (data: RegisterRequest) => {
    const response = await apiService.register(data);
    setUser(response.user);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
