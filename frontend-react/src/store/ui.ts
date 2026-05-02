import { create } from 'zustand';
import { AppNotification } from '../types/app';

interface UIState {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  notifications: AppNotification[];
  setNotifications: (items: AppNotification[]) => void;
  unreadCount: number;
  markAllNotificationsRead: () => void;
  isNotificationDrawerOpen: boolean;
  setNotificationDrawerOpen: (open: boolean) => void;
  toggleNotificationDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  notifications: [],
  unreadCount: 0,
  isNotificationDrawerOpen: false,
  setSidebarCollapsed: (value) => set(() => ({ isSidebarCollapsed: value })),
  setNotifications: (items) =>
    set(() => ({
      notifications: items,
      unreadCount: items.filter((item) => !item.read).length
    })),
  markAllNotificationsRead: () =>
    set((state) => {
      const updated = state.notifications.map((item) => ({ ...item, read: true }));
      return { notifications: updated, unreadCount: 0 };
    }),
  setNotificationDrawerOpen: (open) => set(() => ({ isNotificationDrawerOpen: open })),
  toggleNotificationDrawer: () =>
    set((state) => ({ isNotificationDrawerOpen: !state.isNotificationDrawerOpen }))
}));
