import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { NotificationItem, NotificationType, NotificationCreatePayload } from '../types';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  toasts: ToastItem[];
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  triggerNotification: (payload: NotificationCreatePayload) => Promise<void>;
  showToast: (title: string, message: string, type?: NotificationType) => void;
  addToast: (toast: { title: string; message: string; type?: any }) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get<NotificationItem[]>('/notifications?limit=50');
      const list = res || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch {
      // Silently fail if unauthorized or server reloading
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 20 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = useCallback((title: string, message: string, type: NotificationType = 'GENERAL') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = { id, title, message, type };
    setToasts((prev) => [newToast, ...prev].slice(0, 4));

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const triggerNotification = async (payload: NotificationCreatePayload) => {
    try {
      await api.post('/notifications', payload);
      showToast(payload.title, payload.message, payload.notification_type || 'GENERAL');
      await fetchNotifications();
    } catch (err: any) {
      console.error('Failed to trigger notification:', err);
      // Still show local toast even if backend error
      showToast(payload.title, payload.message, payload.notification_type || 'GENERAL');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const addToast = useCallback((toast: { title: string; message: string; type?: any }) => {
    showToast(toast.title, toast.message, toast.type || 'GENERAL');
  }, [showToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        toasts,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        triggerNotification,
        showToast,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
