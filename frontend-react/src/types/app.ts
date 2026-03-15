export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  role:
    | 'user'
    | 'admin'
    | 'seller'
    | 'styles'
    | 'warehouse'
    | 'USER'
    | 'ADMIN'
    | 'SELLER'
    | 'STYLES'
    | 'WAREHOUSE';
  businessRequestPending?: boolean;
  businessRequestedAt?: string;
  monthlyIncome?: number;
  monthlyExpenseTarget?: number;
  darkModeEnabled?: boolean;
  emailNotificationEnabled?: boolean;
  autoSyncEnabled?: boolean;
}

export interface UserDefaultAddress {
  id?: number;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  ward?: string | null;
  district?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  isDefault?: boolean;
}

export interface UserAddress {
  id: number;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  ward?: string | null;
  district?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface BusinessRequest {
  id: number;
  fullName: string;
  email: string;
  role: string;
  requestedAt?: string;
}

export interface AdminUserInsight {
  id: number;
  email: string;
  fullName: string;
  role: string;
  businessRequestPending?: boolean;
  businessRequestedAt?: string;
  createdAt?: string;
  totalTransactions: number;
  flagged: number;
  budgets: number;
}

export interface AdminOverview {
  totalUsers: number;
  totalCustomers: number;
  totalSellers: number;
  totalAdmins: number;
  totalStaff: number;
  pendingBusinessRequests: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  openOrders: number;
  unpaidOrders: number;
  flaggedTransactions: number;
  grossMerchandiseValue: number;
  paidRevenue: number;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  gender: string;
  description?: string | null;
  imageUrl?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface AdminSystemConfig {
  supportEmail: string;
  supportPhone: string;
  orderAutoCancelHours: number;
  maxRefundDays: number;
  allowManualRefund: boolean;
  maintenanceMode: boolean;
}

export interface AdminDailyReportPoint {
  date: string;
  totalOrders: number;
  paidOrders: number;
  refundedOrders: number;
  grossMerchandiseValue: number;
  paidRevenue: number;
}

export interface AppNotification {
  id: number | string;
  title: string;
  message: string;
  timestamp?: string;
  createdAt?: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}
