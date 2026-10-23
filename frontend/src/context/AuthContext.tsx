import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';
import { captureCurrentLocation } from '../utils/geolocation';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  getDashboardRoute: (role: UserRole) => string;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user_data');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If we have both user data and access token in localStorage, hydrate immediately without blocking!
    const savedUser = localStorage.getItem('user_data');
    const savedToken = localStorage.getItem('access_token');
    return !(savedUser && savedToken);
  });

  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && !url.includes('your-project.supabase.co');
  };

  // Restore & validate session on mount or token change (Stale-While-Revalidate)
  const restoreSession = async () => {
    try {
      let activeToken: string | null = localStorage.getItem('access_token');

      // 1. Check Supabase auth session only if no activeToken is already cached
      if (!activeToken && isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            activeToken = session.access_token;
          }
        } catch {
          // Fallback to local token
        }
      }

      if (!activeToken) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        setIsLoading(false);
        return;
      }

      setToken(activeToken);
      localStorage.setItem('access_token', activeToken);

      // Revalidate in background without blocking if user was already cached
      const currentUser = await api.get<User>('/auth/me');
      setUser(currentUser);
      localStorage.setItem('user_data', JSON.stringify(currentUser));
    } catch (err) {
      console.warn('Authentication session validation failed:', err);
      // Only clear if definitely unauthorized
      setUser(null);
      setToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();

    if (!isSupabaseConfigured()) {
      return;
    }

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        localStorage.setItem('access_token', session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      // 1. Capture user geolocation at login (resilient fallback with timeout)
      const loc = await captureCurrentLocation(5000);

      // 2. Authenticate against Backend API with captured location
      const authResult = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email,
        password: password || 'default_password',
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
      });

      const newToken = authResult.access_token;
      const loggedUser = authResult.user;

      setToken(newToken);
      setUser(loggedUser);
      localStorage.setItem('access_token', newToken);
      localStorage.setItem('user_data', JSON.stringify(loggedUser));

      // Attempt Supabase auth sign-in if live instance configured
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signInWithPassword({
            email,
            password: password || 'default_password',
          });
        } catch {
          // Dev mode fallback
        }
      }

      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // 1. Capture user geolocation at logout (resilient fallback with timeout)
      const loc = await captureCurrentLocation(4000);

      try {
        await api.post('/auth/logout', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
      } catch {
        // Ignore network errors on logout
      }
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore Supabase signout errors
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      setIsLoading(false);
    }
  };

  const getDashboardRoute = (role: UserRole): string => {
    switch (role) {
      case 'STUDENT':
        return '/student';
      case 'MENTOR':
        return '/mentor';
      case 'HR':
        return '/hr';
      case 'SUPER_ADMIN':
        return '/admin';
      default:
        return '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getDashboardRoute,
        refreshSession: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
