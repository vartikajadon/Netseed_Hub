import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';
import { supabase } from '../lib/supabase';

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && !url.includes('your-project.supabase.co');
  };

  // Restore & validate session on mount or token change
  const restoreSession = async () => {
    setIsLoading(true);
    try {
      let activeToken: string | null = localStorage.getItem('access_token');

      // 1. Check Supabase auth session if valid live URL configured
      if (isSupabaseConfigured()) {
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
        return;
      }

      // 2. Validate token against Backend FastAPI /auth/me endpoint (Zero Client Trust)
      setToken(activeToken);
      localStorage.setItem('access_token', activeToken);

      const currentUser = await api.get<User>('/auth/me');
      setUser(currentUser);
      localStorage.setItem('user_data', JSON.stringify(currentUser));
    } catch (err) {
      console.warn('Authentication session validation failed:', err);
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
      // 1. Authenticate against Backend API
      const authResult = await api.post<{ access_token: string; user: User }>('/auth/login', {
        email,
        password: password || 'default_password',
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
      try {
        await api.post('/auth/logout', {});
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
