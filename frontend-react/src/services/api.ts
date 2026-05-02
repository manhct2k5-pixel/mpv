import axios from 'axios';
import { useAuthStore } from '../store/auth.ts';
import {
  ADMIN_DEMO_MODE,
  applyAdminDemoToBusinessRequests,
  applyAdminDemoToCategories,
  applyAdminDemoToOrders,
  applyAdminDemoToProfile,
  applyAdminDemoToSettings,
  applyAdminDemoToUsers,
  approveAdminDemoBusinessRequest,
  buildAdminDemoDailyReports,
  buildAdminDemoOverview,
  confirmAdminDemoOrderPayment,
  createAdminDemoCategory,
  createAdminDemoStaff,
  filterAdminDemoOrders,
  refundAdminDemoOrder,
  toggleAdminDemoCategoryActive,
  updateAdminDemoCategory,
  updateAdminDemoFlag,
  updateAdminDemoOrderStatus,
  updateAdminDemoProfile,
  updateAdminDemoSettings,
  updateAdminDemoUserRole,
  rejectAdminDemoBusinessRequest
} from './adminDemo.ts';
import {
  AdminCategory,
  AdminDailyReportPoint,
  AdminUserInsight,
  AdminSystemConfig,
  AdminOverview,
  UserProfile,
  SellerBusinessRequestPayload,
  UserDefaultAddress,
  UserAddress,
  BusinessRequest
} from '../types/app';
import {
  Cart,
  Order,
  OrderSummary,
  ProductReview,
  ProductReviewList,
  ReturnRequest,
  SupportTicket,
  StoreCategory,
  StorePolicy,
  StoreProductDetail,
  StoreProductSummary,
  StoreSellerSummary,
  StoreMessage,
  StoreMessagePartner,
  Lookbook,
  StylistSummary,
  StylistRequest,
  SellerProfile,
  SellerReview,
  VoucherValidationResult,
  StaffOrderWorkState,
  StaffQcState,
  StaffShippingDraft,
  StaffTimelineLog,
  StaffWaybillState
} from '../types/store';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.PROD ? 'https://wealthwallet-api.onrender.com/api' : '/api');

const PUBLIC_AUTH_ENDPOINTS = ['/login', '/register', '/register/seller'];
const PUBLIC_CLIENT_ROUTES = [
  '/',
  '/san-pham',
  '/nu',
  '/nam',
  '/phu-kien',
  '/sale',
  '/lookbook',
  '/gioi-thieu',
  '/login',
  '/register',
  '/dang-ky-khach-hang',
  '/seller/register',
  '/dang-ky-nguoi-ban'
];

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const isPublicAuthEndpoint = (url?: string) =>
  typeof url === 'string' && PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url === endpoint || url.endsWith(endpoint));

const isPublicClientRoute = (pathname: string) =>
  PUBLIC_CLIENT_ROUTES.includes(pathname) ||
  pathname.startsWith('/san-pham/') ||
  pathname.startsWith('/lookbook/');

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  options?: {
    networkMessage?: string;
    validationMessage?: string;
  }
) => {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const responseMessage = error.response?.data?.message ?? error.response?.data?.error;
  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage.trim();
  }

  if (!error.response) {
    return (
      options?.networkMessage ??
      'Không kết nối được tới máy chủ. Hãy kiểm tra backend đã chạy và cổng API đang đúng.'
    );
  }

  if (error.response.status === 400 && options?.validationMessage) {
    return options.validationMessage;
  }

  return fallbackMessage;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? '');
    if (status === 401 && !isPublicAuthEndpoint(requestUrl)) {
      useAuthStore.getState().logout();
      if (!isPublicClientRoute(window.location.pathname) && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const emptyAdminOverview: AdminOverview = {
  totalUsers: 0,
  totalCustomers: 0,
  totalSellers: 0,
  totalAdmins: 0,
  totalStaff: 0,
  pendingBusinessRequests: 0,
  totalProducts: 0,
  activeProducts: 0,
  totalOrders: 0,
  openOrders: 0,
  unpaidOrders: 0,
  flaggedTransactions: 0,
  grossMerchandiseValue: 0,
  paidRevenue: 0
};

const defaultAdminSettings: AdminSystemConfig = {
  supportEmail: 'support@mocmam.local',
  supportPhone: '0899 888 123',
  orderAutoCancelHours: 48,
  maxRefundDays: 7,
  allowManualRefund: true,
  maintenanceMode: false
};

const fetchBusinessRequestsBase = () =>
  api.get<BusinessRequest[]>('/admin/business-requests').then((res) => asArray<BusinessRequest>(res.data));

const fetchUserProfileBase = () => api.get<UserProfile>('/user').then((res) => res.data);

const fetchAdminOverviewBase = () => api.get<AdminOverview>('/admin/overview').then((res) => res.data);

const fetchAdminUsersBase = () => api.get<AdminUserInsight[]>('/admin/users').then((res) => asArray<AdminUserInsight>(res.data));

const fetchAdminOrdersBase = (params?: { status?: string; paymentStatus?: string }) =>
  api.get<OrderSummary[]>('/admin/orders', { params }).then((res) => asArray<OrderSummary>(res.data));

const fetchAdminCategoriesBase = () =>
  api.get<AdminCategory[]>('/admin/categories').then((res) => asArray<AdminCategory>(res.data));

const fetchAdminSettingsBase = () => api.get<AdminSystemConfig>('/admin/settings').then((res) => res.data);

const toDemoBusinessRequestProfile = (
  user: AdminUserInsight | null,
  fallbackId: number,
  fallbackRole: UserProfile['role']
): UserProfile => ({
  id: String(user?.id ?? fallbackId),
  fullName: user?.fullName ?? `Tài khoản ${fallbackId}`,
  email: user?.email ?? `user-${fallbackId}@demo.local`,
  role: (user?.role ?? fallbackRole) as UserProfile['role'],
  businessRequestPending: false
});

export const financeApi = {
  logout: () => api.post<{ message: string }>('/logout').then((res) => res.data),
  me: async () => {
    const profile = await fetchUserProfileBase();
    return ADMIN_DEMO_MODE ? applyAdminDemoToProfile(profile) : profile;
  },
  updateProfile: async (payload: {
    fullName?: string;
    monthlyIncome?: number;
    monthlyExpenseTarget?: number;
    avatarUrl?: string;
    darkModeEnabled?: boolean;
    emailNotificationEnabled?: boolean;
    autoSyncEnabled?: boolean;
  }) => {
    if (!ADMIN_DEMO_MODE) {
      return api.put('/user', payload).then((res) => res.data);
    }
    const profile = await fetchUserProfileBase();
    if ((profile.role ?? '').toLowerCase() !== 'admin') {
      return api.put('/user', payload).then((res) => res.data);
    }
    return updateAdminDemoProfile(profile, {
      fullName: payload.fullName,
      avatarUrl: payload.avatarUrl,
      emailNotificationEnabled: payload.emailNotificationEnabled,
      autoSyncEnabled: payload.autoSyncEnabled
    });
  },
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/user/password', payload).then((res) => res.data),
  defaultAddress: () => api.get<UserDefaultAddress | null>('/user/default-address').then((res) => res.data),
  saveDefaultAddress: (payload: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
  }) => api.put<UserDefaultAddress>('/user/default-address', payload).then((res) => res.data),
  addresses: () => api.get<UserAddress[]>('/user/addresses').then((res) => asArray<UserAddress>(res.data)),
  createAddress: (payload: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
    isDefault?: boolean;
  }) => api.post<UserAddress>('/user/addresses', payload).then((res) => res.data),
  updateAddress: (id: number, payload: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
    isDefault?: boolean;
  }) => api.put<UserAddress>(`/user/addresses/${id}`, payload).then((res) => res.data),
  setDefaultAddress: (id: number) => api.put<UserAddress>(`/user/addresses/${id}/default`).then((res) => res.data),
  deleteAddress: (id: number) => api.delete(`/user/addresses/${id}`).then((res) => res.data),
  requestBusinessAccess: (payload: SellerBusinessRequestPayload) =>
    api.post<UserProfile>('/user/business-request', payload).then((res) => res.data),
  businessRequests: async () => {
    const requests = await fetchBusinessRequestsBase();
    return ADMIN_DEMO_MODE ? applyAdminDemoToBusinessRequests(requests) : requests;
  },
  approveBusinessRequest: async (id: number) => {
    if (!ADMIN_DEMO_MODE) {
      return api.post<UserProfile>(`/admin/business-requests/${id}/approve`).then((res) => res.data);
    }
    const users = await fetchAdminUsersBase();
    return toDemoBusinessRequestProfile(approveAdminDemoBusinessRequest(users, id), id, 'seller');
  },
  rejectBusinessRequest: async (id: number) => {
    if (!ADMIN_DEMO_MODE) {
      return api.post<UserProfile>(`/admin/business-requests/${id}/reject`).then((res) => res.data);
    }
    const users = await fetchAdminUsersBase();
    return toDemoBusinessRequestProfile(rejectAdminDemoBusinessRequest(users, id), id, 'user');
  },
  admin: {
    overview: async () => {
      if (!ADMIN_DEMO_MODE) {
        return fetchAdminOverviewBase();
      }
      const [baseOverview, baseUsers, baseRequests, baseOrders] = await Promise.all([
        fetchAdminOverviewBase().catch(() => emptyAdminOverview),
        fetchAdminUsersBase(),
        fetchBusinessRequestsBase(),
        fetchAdminOrdersBase()
      ]);
      const users = applyAdminDemoToUsers(baseUsers, baseRequests);
      const requests = applyAdminDemoToBusinessRequests(baseRequests);
      const orders = applyAdminDemoToOrders(baseOrders);
      return buildAdminDemoOverview(baseOverview, users, requests, orders);
    },
    users: async () => {
      if (!ADMIN_DEMO_MODE) {
        return fetchAdminUsersBase();
      }
      const [users, requests] = await Promise.all([fetchAdminUsersBase(), fetchBusinessRequestsBase()]);
      return applyAdminDemoToUsers(users, requests);
    },
    createStaffAccount: async (payload: { fullName: string; email: string; password: string; role: string }) => {
      if (!ADMIN_DEMO_MODE) {
        return api.post<AdminUserInsight>('/admin/staff-accounts', payload).then((res) => res.data);
      }
      const users = await fetchAdminUsersBase();
      return createAdminDemoStaff(users, payload);
    },
    updateUserRole: async (id: number, role: string) => {
      if (!ADMIN_DEMO_MODE) {
        return api.put<AdminUserInsight>(`/admin/users/${id}/role`, { role }).then((res) => res.data);
      }
      const users = await fetchAdminUsersBase();
      return updateAdminDemoUserRole(users, id, role);
    },
    flagUser: async (email: string, highlight: boolean) => {
      if (!ADMIN_DEMO_MODE) {
        return api
          .post(`/admin/users/${encodeURIComponent(email)}/flag`, null, { params: { highlight } })
          .then((res) => res.data);
      }
      return updateAdminDemoFlag(email, highlight);
    },
    orders: async (params?: { status?: string; paymentStatus?: string }) => {
      if (!ADMIN_DEMO_MODE) {
        return fetchAdminOrdersBase(params);
      }
      const orders = await fetchAdminOrdersBase();
      return filterAdminDemoOrders(applyAdminDemoToOrders(orders), params);
    },
    updateOrderStatus: async (id: number, status: string) => {
      if (!ADMIN_DEMO_MODE) {
        return api.put<Order>(`/admin/orders/${id}/status`, { status }).then((res) => res.data);
      }
      const orders = await fetchAdminOrdersBase();
      return updateAdminDemoOrderStatus(orders, id, status);
    },
    confirmOrderPayment: async (id: number) => {
      if (!ADMIN_DEMO_MODE) {
        return api.post<Order>(`/admin/orders/${id}/payment/confirm`).then((res) => res.data);
      }
      const orders = await fetchAdminOrdersBase();
      return confirmAdminDemoOrderPayment(orders, id);
    },
    refundOrder: async (id: number, reason: string) => {
      if (!ADMIN_DEMO_MODE) {
        return api.post<Order>(`/admin/orders/${id}/refund`, { reason }).then((res) => res.data);
      }
      const orders = await fetchAdminOrdersBase();
      return refundAdminDemoOrder(orders, id, reason);
    },
    categories: async () => {
      const categories = await fetchAdminCategoriesBase();
      return ADMIN_DEMO_MODE ? applyAdminDemoToCategories(categories) : categories;
    },
    createCategory: async (payload: {
      name: string;
      slug?: string;
      gender: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
    }) => {
      if (!ADMIN_DEMO_MODE) {
        return api.post<AdminCategory>('/admin/categories', payload).then((res) => res.data);
      }
      const categories = await fetchAdminCategoriesBase();
      return createAdminDemoCategory(categories, payload);
    },
    updateCategory: async (id: number, payload: {
      name: string;
      slug?: string;
      gender: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
    }) => {
      if (!ADMIN_DEMO_MODE) {
        return api.put<AdminCategory>(`/admin/categories/${id}`, payload).then((res) => res.data);
      }
      const categories = await fetchAdminCategoriesBase();
      return updateAdminDemoCategory(categories, id, payload);
    },
    toggleCategoryActive: async (id: number, active: boolean) => {
      if (!ADMIN_DEMO_MODE) {
        return api
          .put<AdminCategory>(`/admin/categories/${id}/active`, null, { params: { active } })
          .then((res) => res.data);
      }
      const categories = await fetchAdminCategoriesBase();
      return toggleAdminDemoCategoryActive(categories, id, active);
    },
    settings: async () => {
      const settings = await fetchAdminSettingsBase().catch(() => defaultAdminSettings);
      return ADMIN_DEMO_MODE ? applyAdminDemoToSettings(settings) : settings;
    },
    updateSettings: async (payload: {
      supportEmail?: string;
      supportPhone?: string;
      orderAutoCancelHours?: number;
      maxRefundDays?: number;
      allowManualRefund?: boolean;
      maintenanceMode?: boolean;
    }) => {
      if (!ADMIN_DEMO_MODE) {
        return api.put<AdminSystemConfig>('/admin/settings', payload).then((res) => res.data);
      }
      const settings = await fetchAdminSettingsBase().catch(() => defaultAdminSettings);
      return updateAdminDemoSettings(settings, payload);
    },
    reportsDaily: async (days = 7) => {
      if (!ADMIN_DEMO_MODE) {
        return api.get<AdminDailyReportPoint[]>('/admin/reports/daily', { params: { days } }).then((res) => res.data);
      }
      const orders = await fetchAdminOrdersBase();
      return buildAdminDemoDailyReports(applyAdminDemoToOrders(orders), days);
    }
  }
};

export const storeApi = {
  policy: () => api.get<StorePolicy>('/store/policy').then((res) => res.data),
  categories: () => api.get<StoreCategory[]>('/store/categories').then((res) => asArray<StoreCategory>(res.data)),
  category: (slug: string) => api.get<StoreCategory>(`/store/categories/${slug}`).then((res) => res.data),
  featuredProducts: () =>
    api.get<StoreProductSummary[]>('/store/products/featured').then((res) => asArray<StoreProductSummary>(res.data)),
  products: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    categoryId?: number;
    gender?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
  }) =>
    api
      .get<PaginatedResponse<StoreProductSummary>>('/store/products', { params })
      .then((res) => res.data),
  product: (slug: string) => api.get<StoreProductDetail>(`/store/products/${slug}`).then((res) => res.data),
  productReviews: (slug: string) =>
    api.get<ProductReviewList>(`/store/products/${slug}/reviews`).then((res) => res.data),
  createProductReview: (payload: {
    orderId: number;
    orderItemId: number;
    rating: number;
    comment: string;
  }) => api.post<ProductReview>('/store/product-reviews', payload).then((res) => res.data),
  updateProduct: (
    id: number,
    payload: {
      name?: string;
      description?: string | null;
      gender?: 'MEN' | 'WOMEN' | 'UNISEX';
      categoryId?: number;
      brand?: string | null;
      material?: string | null;
      fit?: string | null;
      basePrice?: number;
      salePrice?: number | null;
      featured?: boolean;
      active?: boolean;
      imageUrls?: string[];
    }
  ) => api.put<StoreProductDetail>(`/store/products/${id}`, payload).then((res) => res.data),
  deleteProduct: (id: number) => api.delete(`/store/products/${id}`).then((res) => res.data),
  updateVariant: (
    productId: number,
    variantId: number,
    payload: {
      size?: string;
      color?: string;
      priceOverride?: number | null;
      stockQty?: number;
      imageUrl?: string | null;
    }
  ) =>
    api
      .put(`/store/products/${productId}/variants/${variantId}`, payload)
      .then((res) => res.data),
  createVariant: (
    productId: number,
    payload: {
      size: string;
      color: string;
      priceOverride?: number | null;
      stockQty?: number;
      imageUrl?: string | null;
    }
  ) => api.post(`/store/products/${productId}/variants`, payload).then((res) => res.data),
  deleteVariant: (productId: number, variantId: number) =>
    api.delete(`/store/products/${productId}/variants/${variantId}`).then((res) => res.data),
  sellers: () => api.get<StoreSellerSummary[]>('/store/sellers').then((res) => asArray<StoreSellerSummary>(res.data)),
  rateSeller: (sellerId: number, stars: number) =>
    api.post<StoreSellerSummary>(`/store/sellers/${sellerId}/ratings`, { stars }).then((res) => res.data),
  updateSellerProfile: (sellerId: number, payload: {
    storeName?: string | null;
    storeDescription?: string | null;
    storePhone?: string | null;
    storeAddress?: string | null;
    storeLogoUrl?: string | null;
    sellerBankName?: string | null;
    sellerBankAccountName?: string | null;
    sellerBankAccountNumber?: string | null;
    sellerOrderNotificationsEnabled?: boolean;
    sellerMarketingNotificationsEnabled?: boolean;
    sellerOperationAlertsEnabled?: boolean;
  }) => api.put<SellerProfile>(`/store/sellers/${sellerId}`, payload).then((res) => res.data),
  sellerOrders: (sellerId: number) =>
    api.get<OrderSummary[]>(`/store/sellers/${sellerId}/orders`).then((res) => res.data),
  sellerReviews: (sellerId: number) =>
    api.get<SellerReview[]>(`/store/sellers/${sellerId}/reviews`).then((res) => asArray<SellerReview>(res.data)),
  updateSellerReviewState: (
    sellerId: number,
    reviewId: number,
    payload: { note?: string | null; replied?: boolean; flagged?: boolean }
  ) => api.put<SellerReview>(`/store/sellers/${sellerId}/reviews/${reviewId}/state`, payload).then((res) => res.data),
  sellerProducts: (sellerId: number) =>
    api.get<StoreProductSummary[]>(`/store/sellers/${sellerId}/products`).then((res) => res.data),
  messagePartners: () =>
    api.get<StoreMessagePartner[]>('/store/messages/partners').then((res) => asArray<StoreMessagePartner>(res.data)),
  messages: (partnerId: number) =>
    api.get<StoreMessage[]>(`/store/messages/${partnerId}`).then((res) => asArray<StoreMessage>(res.data)),
  sendMessage: (partnerId: number, content: string) =>
    api.post<StoreMessage>(`/store/messages/${partnerId}`, { content }).then((res) => res.data),
  supportTickets: (params?: { status?: string; q?: string }) =>
    api.get<SupportTicket[]>('/store/support-tickets', { params }).then((res) => asArray<SupportTicket>(res.data)),
  supportTicket: (id: number) => api.get<SupportTicket>(`/store/support-tickets/${id}`).then((res) => res.data),
  createSupportTicket: (payload: {
    orderId?: number;
    issueType: string;
    description: string;
    evidenceUrl?: string;
    priority?: 'high' | 'medium' | 'low';
    assigneeId?: number;
    initialNote?: string;
  }) => api.post<SupportTicket>('/store/support-tickets', payload).then((res) => res.data),
  updateSupportTicket: (id: number, payload: {
    status?: 'new' | 'processing' | 'waiting' | 'resolved' | 'closed';
    priority?: 'high' | 'medium' | 'low';
    assigneeId?: number;
    issueType?: string;
    description?: string;
    evidenceUrl?: string;
    resolution?: string;
    note?: string;
  }) => api.put<SupportTicket>(`/store/support-tickets/${id}`, payload).then((res) => res.data),
  commentSupportTicket: (id: number, message: string) =>
    api.post<SupportTicket>(`/store/support-tickets/${id}/comments`, { message }).then((res) => res.data),
  returnRequests: (params?: { status?: string }) =>
    api.get<ReturnRequest[]>('/store/return-requests', { params }).then((res) => asArray<ReturnRequest>(res.data)),
  returnRequest: (id: number) => api.get<ReturnRequest>(`/store/return-requests/${id}`).then((res) => res.data),
  createReturnRequest: (payload: {
    orderId: number;
    reason: string;
    evidenceUrl?: string;
    note?: string;
  }) => api.post<ReturnRequest>('/store/return-requests', payload).then((res) => res.data),
  updateReturnRequest: (id: number, payload: {
    status?: string;
    verdict?: string;
    note?: string;
    evidenceUrl?: string;
  }) => api.put<ReturnRequest>(`/store/return-requests/${id}`, payload).then((res) => res.data),
  lookbooks: () => api.get<Lookbook[]>('/store/lookbooks').then((res) => asArray<Lookbook>(res.data)),
  lookbook: (id: number) => api.get<Lookbook>(`/store/lookbooks/${id}`).then((res) => res.data),
  createLookbook: (payload: {
    title: string;
    description?: string | null;
    mood?: string | null;
    coverImageUrl?: string | null;
    tags?: string[];
  }) => api.post<Lookbook>('/store/lookbooks', payload).then((res) => res.data),
  updateLookbook: (id: number, payload: {
    title?: string;
    description?: string | null;
    mood?: string | null;
    coverImageUrl?: string | null;
    tags?: string[];
    active?: boolean;
  }) => api.put<Lookbook>(`/store/lookbooks/${id}`, payload).then((res) => res.data),
  deleteLookbook: (id: number) => api.delete(`/store/lookbooks/${id}`).then((res) => res.data),
  stylists: () => api.get<StylistSummary[]>('/store/stylists').then((res) => asArray<StylistSummary>(res.data)),
  createStylistRequest: (payload: { stylistId: number; note?: string }) =>
    api.post<StylistRequest>('/store/stylist-requests', payload).then((res) => res.data),
  stylistRequests: () => api.get<StylistRequest[]>('/store/stylist-requests').then((res) => asArray<StylistRequest>(res.data)),
  createProduct: (payload: {
    name: string;
    description?: string | null;
    gender: 'MEN' | 'WOMEN' | 'UNISEX';
    categoryId: number;
    brand?: string | null;
    material?: string | null;
    fit?: string | null;
    basePrice: number;
    salePrice?: number | null;
    featured?: boolean;
    imageUrls?: string[];
    variants: {
      size: string;
      color: string;
      priceOverride?: number | null;
      stockQty?: number;
      imageUrl?: string | null;
    }[];
  }) => api.post<StoreProductDetail>('/store/products', payload).then((res) => res.data),
  createManualOrder: (payload: {
    userEmail: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
    note?: string;
    paymentMethod: 'COD' | 'BANK_TRANSFER';
    notes?: string;
    items: {
      variantId: number;
      quantity: number;
    }[];
  }) => api.post<Order>('/store/orders/manual', payload).then((res) => res.data),
  wishlist: () => api.get<StoreProductSummary[]>('/store/wishlist').then((res) => asArray<StoreProductSummary>(res.data)),
  addWishlist: (productId: number) =>
    api.post<StoreProductSummary>(`/store/wishlist/${productId}`).then((res) => res.data),
  removeWishlist: (productId: number) => api.delete(`/store/wishlist/${productId}`).then((res) => res.data),
  cart: () => api.get<Cart>('/store/cart').then((res) => res.data),
  addToCart: (payload: { variantId: number; quantity: number }) =>
    api.post<Cart>('/store/cart/items', payload).then((res) => res.data),
  updateCartItem: (id: number, quantity: number) =>
    api.put<Cart>(`/store/cart/items/${id}`, { quantity }).then((res) => res.data),
  removeCartItem: (id: number) => api.delete<Cart>(`/store/cart/items/${id}`).then((res) => res.data),
  clearCart: () => api.post<Cart>('/store/cart/clear').then((res) => res.data),
  applyCartVoucher: (code: string) =>
    api.post<Cart>('/store/cart/voucher/apply', { code }).then((res) => res.data),
  removeCartVoucher: () => api.delete<Cart>('/store/cart/voucher').then((res) => res.data),
  validateVoucher: (code: string) =>
    api.get<VoucherValidationResult>('/store/vouchers/validate', { params: { code } }).then((res) => res.data),
  createOrder: (payload: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city: string;
    province?: string;
    postalCode?: string;
    note?: string;
    paymentMethod: 'COD' | 'BANK_TRANSFER';
    notes?: string;
  }) => api.post<Order>('/store/orders', payload).then((res) => res.data),
  updateOrderStatus: (id: number, status: string) =>
    api.put<Order>(`/store/orders/${id}/status`, { status }).then((res) => res.data),
  confirmOrderPayment: (id: number) =>
    api.post<Order>(`/store/orders/${id}/payment/confirm`).then((res) => res.data),
  updateOrder: (id: number, payload: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    ward?: string;
    district?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    note?: string;
    notes?: string;
  }) => api.put<Order>(`/store/orders/${id}`, payload).then((res) => res.data),
  cancelOrder: (id: number) => api.delete(`/store/orders/${id}`).then((res) => res.data),
  orders: () => api.get<OrderSummary[]>('/store/orders').then((res) => asArray<OrderSummary>(res.data)),
  order: (id: number) => api.get<Order>(`/store/orders/${id}`).then((res) => res.data)
};

export const staffApi = {
  orderWorkStates: () =>
    api.get<StaffOrderWorkState[]>('/staff/order-work-states').then((res) => asArray<StaffOrderWorkState>(res.data)),
  orderWorkState: (orderId: number) =>
    api.get<StaffOrderWorkState>(`/staff/order-work-states/${orderId}`).then((res) => res.data),
  updateOrderWorkState: (
    orderId: number,
    payload: {
      assigneeName?: string | null;
      clearAssignee?: boolean;
      postponed?: boolean;
      internalNote?: string | null;
      qc?: Partial<StaffQcState>;
      shippingDraft?: Partial<StaffShippingDraft>;
      waybill?: StaffWaybillState | null;
      clearWaybill?: boolean;
      timelineLog?: StaffTimelineLog;
    }
  ) => api.put<StaffOrderWorkState>(`/staff/order-work-states/${orderId}`, payload).then((res) => res.data)
};
