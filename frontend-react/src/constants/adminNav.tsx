import {
  BarChart3,
  ClipboardPlus,
  FileClock,
  HandCoins,
  Home,
  KeyRound,
  Receipt,
  Settings2,
  ShieldCheck,
  UserCog,
  UserRound,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badgeKey?: 'openOrders' | 'totalUsers' | 'pendingBusinessRequests' | 'unpaidOrders';
  sectionId?:
    | 'dashboard'
    | 'users'
    | 'staff'
    | 'permissions'
    | 'catalogConfig'
    | 'orders'
    | 'reports'
    | 'refunds'
    | 'logs'
    | 'account';
}

export const adminNavItems: AdminNavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', path: '/admin', icon: Home, sectionId: 'dashboard' },
  { key: 'users', label: 'Quản lý người dùng', path: '/admin/users', icon: Users, badgeKey: 'totalUsers', sectionId: 'users' },
  { key: 'staff', label: 'Quản lý Staff', path: '/admin/staff', icon: UserCog, sectionId: 'staff' },
  {
    key: 'permissions',
    label: 'Phân quyền',
    path: '/admin/permissions',
    icon: KeyRound,
    badgeKey: 'pendingBusinessRequests',
    sectionId: 'permissions'
  },
  {
    key: 'catalog-config',
    label: 'Danh mục & cấu hình',
    path: '/admin/catalog-config',
    icon: Settings2,
    sectionId: 'catalogConfig'
  },
  { key: 'orders', label: 'Giám sát đơn hàng', path: '/admin/orders', icon: Receipt, badgeKey: 'openOrders', sectionId: 'orders' },
  { key: 'manual-order', label: 'Tạo đơn thủ công', path: '/admin/manual-order', icon: ClipboardPlus },
  { key: 'reports', label: 'Báo cáo', path: '/admin/reports', icon: BarChart3, sectionId: 'reports' },
  {
    key: 'refunds',
    label: 'Hoàn tiền / xử lý đặc biệt',
    path: '/admin/refunds',
    icon: HandCoins,
    badgeKey: 'unpaidOrders',
    sectionId: 'refunds'
  },
  { key: 'logs', label: 'Nhật ký hệ thống', path: '/admin/logs', icon: FileClock, sectionId: 'logs' },
  { key: 'account', label: 'Tài khoản admin', path: '/admin/account', icon: UserRound, sectionId: 'account' }
];

export const adminBrandItem = {
  key: 'admin',
  label: 'Admin Control',
  icon: ShieldCheck
};
