import axios from 'axios';
import { useAuthStore } from '../store/auth.ts';
import {
  AdminCategory,
  AdminDailyReportPoint,
  AdminUserInsight,
  AdminSystemConfig,
  AdminOverview,
  UserProfile,
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
  StoreProductDetail,
  StoreProductSummary,
  StoreSellerSummary,
  StoreMessage,
  StoreMessagePartner,
  Lookbook,
  StylistSummary,
  StylistRequest,
  SellerProfile,
  VoucherValidationResult
} from '../types/store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

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
    if (status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
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

export const financeApi = {
  logout: () => api.post<{ message: string }>('/logout').then((res) => res.data),
  me: () => api.get<UserProfile>('/user').then((res) => res.data),
  updateProfile: (payload: {
    fullName?: string;
    monthlyIncome?: number;
    monthlyExpenseTarget?: number;
    avatarUrl?: string;
    darkModeEnabled?: boolean;
    emailNotificationEnabled?: boolean;
    autoSyncEnabled?: boolean;
  }) => api.put('/user', payload).then((res) => res.data),
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
  addresses: () => api.get<UserAddress[]>('/user/addresses').then((res) => res.data),
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
  requestBusinessAccess: () => api.post<UserProfile>('/user/business-request').then((res) => res.data),
  businessRequests: () => api.get<BusinessRequest[]>('/admin/business-requests').then((res) => res.data),
  approveBusinessRequest: (id: number) =>
    api.post<UserProfile>(`/admin/business-requests/${id}/approve`).then((res) => res.data),
  rejectBusinessRequest: (id: number) =>
    api.post<UserProfile>(`/admin/business-requests/${id}/reject`).then((res) => res.data),
  admin: {
    overview: () => api.get<AdminOverview>('/admin/overview').then((res) => res.data),
    users: () => api.get<AdminUserInsight[]>('/admin/users').then((res) => res.data),
    createStaffAccount: (payload: { fullName: string; email: string; password: string; role: string }) =>
      api.post<AdminUserInsight>('/admin/staff-accounts', payload).then((res) => res.data),
    updateUserRole: (id: number, role: string) =>
      api.put<AdminUserInsight>(`/admin/users/${id}/role`, { role }).then((res) => res.data),
    flagUser: (email: string, highlight: boolean) =>
      api
        .post(`/admin/users/${encodeURIComponent(email)}/flag`, null, { params: { highlight } })
        .then((res) => res.data),
    orders: (params?: { status?: string; paymentStatus?: string }) =>
      api.get<OrderSummary[]>('/admin/orders', { params }).then((res) => res.data),
    updateOrderStatus: (id: number, status: string) =>
      api.put<Order>(`/admin/orders/${id}/status`, { status }).then((res) => res.data),
    confirmOrderPayment: (id: number) =>
      api.post<Order>(`/admin/orders/${id}/payment/confirm`).then((res) => res.data),
    refundOrder: (id: number, reason: string) =>
      api.post<Order>(`/admin/orders/${id}/refund`, { reason }).then((res) => res.data),
    categories: () => api.get<AdminCategory[]>('/admin/categories').then((res) => res.data),
    createCategory: (payload: {
      name: string;
      slug?: string;
      gender: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
    }) => api.post<AdminCategory>('/admin/categories', payload).then((res) => res.data),
    updateCategory: (id: number, payload: {
      name: string;
      slug?: string;
      gender: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
    }) => api.put<AdminCategory>(`/admin/categories/${id}`, payload).then((res) => res.data),
    toggleCategoryActive: (id: number, active: boolean) =>
      api.put<AdminCategory>(`/admin/categories/${id}/active`, null, { params: { active } }).then((res) => res.data),
    settings: () => api.get<AdminSystemConfig>('/admin/settings').then((res) => res.data),
    updateSettings: (payload: {
      supportEmail?: string;
      supportPhone?: string;
      orderAutoCancelHours?: number;
      maxRefundDays?: number;
      allowManualRefund?: boolean;
      maintenanceMode?: boolean;
    }) => api.put<AdminSystemConfig>('/admin/settings', payload).then((res) => res.data),
    reportsDaily: (days = 7) =>
      api.get<AdminDailyReportPoint[]>('/admin/reports/daily', { params: { days } }).then((res) => res.data)
  }
};

export const storeApi = {
  categories: () => api.get<StoreCategory[]>('/store/categories').then((res) => res.data),
  category: (slug: string) => api.get<StoreCategory>(`/store/categories/${slug}`).then((res) => res.data),
  featuredProducts: () =>
    api.get<StoreProductSummary[]>('/store/products/featured').then((res) => res.data),
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
  sellers: () => api.get<StoreSellerSummary[]>('/store/sellers').then((res) => res.data),
  rateSeller: (sellerId: number, stars: number) =>
    api.post<StoreSellerSummary>(`/store/sellers/${sellerId}/ratings`, { stars }).then((res) => res.data),
  updateSellerProfile: (sellerId: number, payload: {
    storeName?: string | null;
    storeDescription?: string | null;
    storePhone?: string | null;
    storeAddress?: string | null;
    storeLogoUrl?: string | null;
  }) => api.put<SellerProfile>(`/store/sellers/${sellerId}`, payload).then((res) => res.data),
  sellerOrders: (sellerId: number) =>
    api.get<OrderSummary[]>(`/store/sellers/${sellerId}/orders`).then((res) => res.data),
  sellerProducts: (sellerId: number) =>
    api.get<StoreProductSummary[]>(`/store/sellers/${sellerId}/products`).then((res) => res.data),
  messagePartners: () => api.get<StoreMessagePartner[]>('/store/messages/partners').then((res) => res.data),
  messages: (partnerId: number) => api.get<StoreMessage[]>(`/store/messages/${partnerId}`).then((res) => res.data),
  sendMessage: (partnerId: number, content: string) =>
    api.post<StoreMessage>(`/store/messages/${partnerId}`, { content }).then((res) => res.data),
  supportTickets: (params?: { status?: string; q?: string }) =>
    api.get<SupportTicket[]>('/store/support-tickets', { params }).then((res) => res.data),
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
    api.get<ReturnRequest[]>('/store/return-requests', { params }).then((res) => res.data),
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
  lookbooks: () => api.get<Lookbook[]>('/store/lookbooks').then((res) => res.data),
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
  stylists: () => api.get<StylistSummary[]>('/store/stylists').then((res) => res.data),
  createStylistRequest: (payload: { stylistId: number; note?: string }) =>
    api.post<StylistRequest>('/store/stylist-requests', payload).then((res) => res.data),
  stylistRequests: () => api.get<StylistRequest[]>('/store/stylist-requests').then((res) => res.data),
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
  wishlist: () => api.get<StoreProductSummary[]>('/store/wishlist').then((res) => res.data),
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
  orders: () => api.get<OrderSummary[]>('/store/orders').then((res) => res.data),
  order: (id: number) => api.get<Order>(`/store/orders/${id}`).then((res) => res.data)
};
