import {
  ClipboardCheck,
  LifeBuoy,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Truck,
  UserRound,
  View
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface StaffNavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  badgeKey?: 'pendingOrders' | 'packingOrders' | 'handoverOrders' | 'openTickets' | 'openReturns';
}

export interface StaffOverviewSignal {
  pendingOrders: number;
  packingOrders: number;
  handoverOrders: number;
  openTickets: number;
  openReturns: number;
}

export const staffNavItems: StaffNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/staff', icon: View, badgeKey: 'pendingOrders' },
  { key: 'orders', label: 'Xử lý đơn hàng', path: '/staff/orders', icon: ReceiptText, badgeKey: 'pendingOrders' },
  { key: 'qc', label: 'Đóng gói & QC', path: '/staff/qc-packing', icon: PackageCheck, badgeKey: 'packingOrders' },
  {
    key: 'shipment',
    label: 'Vận đơn & Bàn giao',
    path: '/staff/shipments',
    icon: Truck,
    badgeKey: 'handoverOrders'
  },
  { key: 'tickets', label: 'Ticket hỗ trợ', path: '/staff/tickets', icon: LifeBuoy, badgeKey: 'openTickets' },
  { key: 'returns', label: 'Đổi trả', path: '/staff/returns', icon: RefreshCcw, badgeKey: 'openReturns' },
  { key: 'status', label: 'Cập nhật trạng thái đơn', path: '/staff/status', icon: ClipboardCheck },
  { key: 'profile', label: 'Hồ sơ cá nhân', path: '/staff/profile', icon: UserRound }
];
