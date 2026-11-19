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
  updateUser: (updatedFields: Partial<User>) => void;
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

      // 1. Check Supabase auth session only if no activeToken is already cached (with 1s timeout guard)
      if (!activeToken && isSupabaseConfigured()) {
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 1000)
          );
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
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
    } catch (err: any) {
      console.warn('Authentication session validation note:', err);
      // Only clear credentials if the server explicitly confirmed the token is unauthorized (401 / 403)
      const status = err?.status ?? err?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
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
      // 1. Get cached geolocation if already available without prompting
      let locLat: number | null = null;
      let locLon: number | null = null;
      let locAcc: number | null = null;
      try {
        const cached = sessionStorage.getItem('netseed_last_known_coords');
        if (cached) {
          const parsed = JSON.parse(cached);
          locLat = parsed.latitude ?? null;
          locLon = parsed.longitude ?? null;
          locAcc = parsed.accuracy ?? null;
        }
      } catch {}

      // 2. Authenticate against Backend API (no location prompt forced)
      const authResult = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email,
        password: password || 'default_password',
        latitude: locLat,
        longitude: locLon,
        accuracy: locAcc,
      });

      const newToken = authResult.access_token;
      const loggedUser = authResult.user;

      setToken(newToken);
      setUser(loggedUser);
      localStorage.setItem('access_token', newToken);
      localStorage.setItem('user_data', JSON.stringify(loggedUser));

      // Attempt Supabase auth sign-in asynchronously in background without blocking UI
      if (isSupabaseConfigured()) {
        supabase.auth.signInWithPassword({
          email,
          password: password || 'default_password',
        }).catch(() => {
          // Dev mode fallback
        });
      }

      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Staff (ADMIN, HR, MENTOR) are never prompted for location
      const isStaff = user?.role && ['SUPER_ADMIN', 'ADMIN', 'HR', 'MENTOR'].includes(user.role.toUpperCase());
      const loc = !isStaff ? await captureCurrentLocation(600) : { latitude: null, longitude: null, accuracy: null };

      try {
        await api.post('/auth/logout', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
      } catch {
        // Ignore network errors on logout
      }
      if (isSupabaseConfigured()) {
        supabase.auth.signOut().catch(() => {});
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

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user_data', JSON.stringify(updated));
      return updated;
    });
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
        updateUser,
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
