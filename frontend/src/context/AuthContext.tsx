import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/auth.service';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = storage.getToken();
    const savedUser = storage.getUser();
    
    if (token && savedUser) {
      setUser(savedUser);
      // Optionally verify token with backend
      authService.getCurrentUser()
        .then((currentUser) => {
          setUser(currentUser);
          storage.setUser(currentUser);
        })
        .catch(() => {
          storage.clear();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    storage.setToken(response.access_token);
    if (response.user) {
      setUser(response.user);
      storage.setUser(response.user);
    }
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    storage.setToken(response.access_token);
    if (response.user) {
      setUser(response.user);
      storage.setUser(response.user);
    }
  };

  const logout = () => {
    authService.logout();
    storage.clear();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

