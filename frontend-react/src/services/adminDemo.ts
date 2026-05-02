import type {
  AdminCategory,
  AdminDailyReportPoint,
  AdminOverview,
  AdminSystemConfig,
  AdminUserInsight,
  BusinessRequest,
  UserProfile
} from '../types/app';
import type { Order, OrderSummary } from '../types/store';

export const ADMIN_DEMO_MODE = import.meta.env.VITE_ADMIN_DEMO_MODE === 'true';

const STORAGE_KEY = 'mocmam-admin-demo-state-v1';

type BusinessRequestDecision = 'approved' | 'rejected';
type RefundDecision = 'rejected' | 'refunded';

type AdminDemoState = {
  userRoleById: Record<number, string>;
  userFlagByEmail: Record<string, boolean>;
  createdStaff: AdminUserInsight[];
  businessRequestDecisionById: Record<number, BusinessRequestDecision>;
  orderStatusById: Record<number, string>;
  orderPaymentStatusById: Record<number, string>;
  refundDecisionByOrderId: Record<number, RefundDecision>;
  createdCategories: AdminCategory[];
  categoryPatchById: Record<number, Partial<AdminCategory>>;
  settingsOverride?: AdminSystemConfig;
  adminProfileOverride?: Partial<
    Pick<UserProfile, 'fullName' | 'avatarUrl' | 'emailNotificationEnabled' | 'autoSyncEnabled'>
  >;
  nextUserId?: number;
  nextCategoryId?: number;
};

const defaultState = (): AdminDemoState => ({
  userRoleById: {},
  userFlagByEmail: {},
  createdStaff: [],
  businessRequestDecisionById: {},
  orderStatusById: {},
  orderPaymentStatusById: {},
  refundDecisionByOrderId: {},
  createdCategories: [],
  categoryPatchById: {},
  settingsOverride: undefined,
  adminProfileOverride: undefined,
  nextUserId: undefined,
  nextCategoryId: undefined
});

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeRole = (value?: string | null) => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeOrderStatus = (value?: string | null) => (value ?? '').trim().toLowerCase();

const normalizePaymentStatus = (value?: string | null) => (value ?? '').trim().toLowerCase();

const readState = (): AdminDemoState => {
  if (!canUseStorage()) {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    return {
      ...defaultState(),
      ...JSON.parse(raw)
    } as AdminDemoState;
  } catch {
    return defaultState();
  }
};

const writeState = (next: AdminDemoState) => {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const updateState = (updater: (state: AdminDemoState) => AdminDemoState) => {
  const next = updater(readState());
  writeState(next);
  return next;
};

const byCreatedAtDesc = <T extends { createdAt?: string | null }>(left: T, right: T) =>
  new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();

const buildPendingRequestIds = (requests: BusinessRequest[], state: AdminDemoState) => {
  const pending = new Set<number>();
  requests.forEach((request) => {
    if (!state.businessRequestDecisionById[request.id]) {
      pending.add(request.id);
    }
  });
  return pending;
};

export const applyAdminDemoToUsers = (
  baseUsers: AdminUserInsight[],
  baseRequests: BusinessRequest[]
): AdminUserInsight[] => {
  const state = readState();
  const pendingRequestIds = buildPendingRequestIds(baseRequests, state);
  const merged = new Map<number, AdminUserInsight>();

  [...baseUsers, ...state.createdStaff].forEach((user) => {
    const role = state.userRoleById[user.id] ?? normalizeRole(user.role);
    const email = normalizeEmail(user.email);
    merged.set(user.id, {
      ...user,
      role,
      flagged: state.userFlagByEmail[email] ? 1 : 0,
      businessRequestPending: pendingRequestIds.has(user.id),
      businessRequestedAt: pendingRequestIds.has(user.id) ? user.businessRequestedAt : undefined
    });
  });

  return [...merged.values()].sort(byCreatedAtDesc);
};

export const applyAdminDemoToBusinessRequests = (baseRequests: BusinessRequest[]): BusinessRequest[] => {
  const state = readState();
  return baseRequests
    .filter((request) => !state.businessRequestDecisionById[request.id])
    .sort((left, right) => new Date(right.requestedAt ?? 0).getTime() - new Date(left.requestedAt ?? 0).getTime());
};

export const applyAdminDemoToOrders = (baseOrders: OrderSummary[]): OrderSummary[] => {
  const state = readState();
  return baseOrders.map((order) => ({
    ...order,
    status: state.orderStatusById[order.id] ?? normalizeOrderStatus(order.status),
    paymentStatus: state.orderPaymentStatusById[order.id] ?? normalizePaymentStatus(order.paymentStatus)
  }));
};

export const filterAdminDemoOrders = (
  orders: OrderSummary[],
  params?: { status?: string; paymentStatus?: string }
) => {
  const statusFilter = normalizeOrderStatus(params?.status);
  const paymentStatusFilter = normalizePaymentStatus(params?.paymentStatus);
  return orders.filter((order) => {
    const matchesStatus = !statusFilter || normalizeOrderStatus(order.status) === statusFilter;
    const matchesPaymentStatus =
      !paymentStatusFilter || normalizePaymentStatus(order.paymentStatus) === paymentStatusFilter;
    return matchesStatus && matchesPaymentStatus;
  });
};

export const buildAdminDemoOverview = (
  baseOverview: AdminOverview,
  users: AdminUserInsight[],
  requests: BusinessRequest[],
  orders: OrderSummary[]
): AdminOverview => {
  const totalUsers = users.length;
  const totalCustomers = users.filter((user) => normalizeRole(user.role) === 'user').length;
  const totalSellers = users.filter((user) => normalizeRole(user.role) === 'seller').length;
  const totalAdmins = users.filter((user) => normalizeRole(user.role) === 'admin').length;
  const totalStaff = users.filter((user) => normalizeRole(user.role) === 'warehouse').length;
  const pendingBusinessRequests = requests.length;
  const totalOrders = orders.length;
  const openOrders = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    return status !== 'cancelled' && status !== 'delivered';
  }).length;
  const unpaidOrders = orders.filter((order) => normalizePaymentStatus(order.paymentStatus) === 'unpaid').length;
  const flaggedTransactions = users.reduce((sum, user) => sum + (user.flagged ?? 0), 0);
  const grossMerchandiseValue = orders
    .filter((order) => normalizeOrderStatus(order.status) !== 'cancelled')
    .reduce((sum, order) => sum + (order.total ?? 0), 0);
  const paidRevenue = orders
    .filter((order) => normalizePaymentStatus(order.paymentStatus) === 'paid')
    .reduce((sum, order) => sum + (order.total ?? 0), 0);

  return {
    ...baseOverview,
    totalUsers,
    totalCustomers,
    totalSellers,
    totalAdmins,
    totalStaff,
    pendingBusinessRequests,
    totalOrders,
    openOrders,
    unpaidOrders,
    flaggedTransactions,
    grossMerchandiseValue,
    paidRevenue
  };
};

export const buildAdminDemoDailyReports = (orders: OrderSummary[], days: number): AdminDailyReportPoint[] => {
  const reportDays = Math.max(1, Math.min(90, days));
  const today = new Date();
  const points: AdminDailyReportPoint[] = [];

  for (let index = reportDays - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter((order) => order.createdAt.slice(0, 10) === key);

    points.push({
      date: key,
      totalOrders: dayOrders.length,
      paidOrders: dayOrders.filter((order) => normalizePaymentStatus(order.paymentStatus) === 'paid').length,
      refundedOrders: dayOrders.filter((order) => normalizePaymentStatus(order.paymentStatus) === 'refunded').length,
      grossMerchandiseValue: dayOrders
        .filter((order) => normalizeOrderStatus(order.status) !== 'cancelled')
        .reduce((sum, order) => sum + (order.total ?? 0), 0),
      paidRevenue: dayOrders
        .filter((order) => normalizePaymentStatus(order.paymentStatus) === 'paid')
        .reduce((sum, order) => sum + (order.total ?? 0), 0)
    });
  }

  return points;
};

export const applyAdminDemoToCategories = (baseCategories: AdminCategory[]): AdminCategory[] => {
  const state = readState();
  const merged = new Map<number, AdminCategory>();

  baseCategories.forEach((category) => {
    merged.set(category.id, {
      ...category,
      ...state.categoryPatchById[category.id]
    });
  });

  state.createdCategories.forEach((category) => {
    merged.set(category.id, category);
  });

  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, 'vi'));
};

export const applyAdminDemoToSettings = (baseSettings: AdminSystemConfig): AdminSystemConfig => {
  const state = readState();
  return state.settingsOverride ? { ...baseSettings, ...state.settingsOverride } : baseSettings;
};

export const applyAdminDemoToProfile = (baseProfile: UserProfile): UserProfile => {
  if (normalizeRole(baseProfile.role) !== 'admin') {
    return baseProfile;
  }
  const state = readState();
  return state.adminProfileOverride ? { ...baseProfile, ...state.adminProfileOverride } : baseProfile;
};

export const createAdminDemoStaff = (
  baseUsers: AdminUserInsight[],
  payload: { fullName: string; email: string; password: string; role: string }
): AdminUserInsight => {
  const state = readState();
  const nextId = Math.max(
    state.nextUserId ?? 0,
    ...baseUsers.map((user) => user.id),
    ...state.createdStaff.map((user) => user.id)
  ) + 1;

  const created: AdminUserInsight = {
    id: nextId,
    email: normalizeEmail(payload.email),
    fullName: payload.fullName.trim(),
    role: normalizeRole(payload.role) || 'warehouse',
    businessRequestPending: false,
    businessRequestedAt: undefined,
    createdAt: new Date().toISOString(),
    totalTransactions: 0,
    flagged: 0,
    budgets: 0
  };

  updateState((current) => ({
    ...current,
    createdStaff: [created, ...current.createdStaff.filter((user) => user.id !== created.id)],
    nextUserId: nextId
  }));

  return created;
};

export const updateAdminDemoUserRole = (
  baseUsers: AdminUserInsight[],
  id: number,
  role: string
): AdminUserInsight => {
  const normalizedRole = normalizeRole(role);
  updateState((current) => ({
    ...current,
    userRoleById: {
      ...current.userRoleById,
      [id]: normalizedRole
    },
    businessRequestDecisionById: {
      ...current.businessRequestDecisionById,
      [id]: normalizedRole === 'seller' ? 'approved' : 'rejected'
    }
  }));

  const allUsers = applyAdminDemoToUsers(baseUsers, []);
  return allUsers.find((user) => user.id === id) ?? {
    id,
    email: `user-${id}@demo.local`,
    fullName: `User ${id}`,
    role: normalizedRole,
    totalTransactions: 0,
    flagged: 0,
    budgets: 0
  };
};

export const updateAdminDemoFlag = (email: string, highlight: boolean) => {
  const normalizedEmail = normalizeEmail(email);
  updateState((current) => ({
    ...current,
    userFlagByEmail: {
      ...current.userFlagByEmail,
      [normalizedEmail]: highlight
    }
  }));
  return { email: normalizedEmail, highlighted: highlight };
};

export const approveAdminDemoBusinessRequest = (
  baseUsers: AdminUserInsight[],
  id: number
) => {
  updateState((current) => ({
    ...current,
    businessRequestDecisionById: {
      ...current.businessRequestDecisionById,
      [id]: 'approved'
    },
    userRoleById: {
      ...current.userRoleById,
      [id]: 'seller'
    }
  }));

  return applyAdminDemoToUsers(baseUsers, []).find((user) => user.id === id) ?? null;
};

export const rejectAdminDemoBusinessRequest = (
  baseUsers: AdminUserInsight[],
  id: number
) => {
  updateState((current) => ({
    ...current,
    businessRequestDecisionById: {
      ...current.businessRequestDecisionById,
      [id]: 'rejected'
    },
    userRoleById: {
      ...current.userRoleById,
      [id]: 'user'
    }
  }));

  return applyAdminDemoToUsers(baseUsers, []).find((user) => user.id === id) ?? null;
};

const toOrderPayload = (summary: OrderSummary, notes?: string): Order => ({
  id: summary.id,
  orderNumber: summary.orderNumber,
  status: normalizeOrderStatus(summary.status),
  paymentMethod: summary.paymentMethod,
  paymentStatus: normalizePaymentStatus(summary.paymentStatus),
  subtotal: summary.total ?? 0,
  shippingFee: 0,
  discount: 0,
  total: summary.total ?? 0,
  notes: notes ?? null,
  createdAt: summary.createdAt,
  updatedAt: new Date().toISOString(),
  deliveredAt: summary.deliveredAt ?? null,
  items: [],
  shippingAddress: null
});

export const updateAdminDemoOrderStatus = (
  baseOrders: OrderSummary[],
  id: number,
  status: string
): Order => {
  const normalizedStatus = normalizeOrderStatus(status);
  const current = applyAdminDemoToOrders(baseOrders).find((order) => order.id === id);
  const currentPaymentStatus = normalizePaymentStatus(current?.paymentStatus);
  const currentPaymentMethod = current?.paymentMethod?.toLowerCase();

  updateState((state) => {
    const nextPaymentStatusById = { ...state.orderPaymentStatusById };
    if (normalizedStatus === 'delivered' && currentPaymentMethod === 'cod' && currentPaymentStatus === 'unpaid') {
      nextPaymentStatusById[id] = 'paid';
    }
    if (normalizedStatus === 'cancelled' && currentPaymentStatus === 'paid') {
      nextPaymentStatusById[id] = 'refunded';
    }

    return {
      ...state,
      orderStatusById: {
        ...state.orderStatusById,
        [id]: normalizedStatus
      },
      orderPaymentStatusById: nextPaymentStatusById
    };
  });

  const updated = applyAdminDemoToOrders(baseOrders).find((order) => order.id === id) ?? current;
  return toOrderPayload(updated ?? current ?? {
    id,
    orderNumber: `WW-DEMO-${id}`,
    status: normalizedStatus,
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    total: 0,
    itemCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export const confirmAdminDemoOrderPayment = (baseOrders: OrderSummary[], id: number): Order => {
  updateState((state) => ({
    ...state,
    orderPaymentStatusById: {
      ...state.orderPaymentStatusById,
      [id]: 'paid'
    }
  }));

  const updated = applyAdminDemoToOrders(baseOrders).find((order) => order.id === id);
  return toOrderPayload(
    updated ?? {
      id,
      orderNumber: `WW-DEMO-${id}`,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      total: 0,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );
};

export const refundAdminDemoOrder = (baseOrders: OrderSummary[], id: number, reason: string): Order => {
  updateState((state) => ({
    ...state,
    orderPaymentStatusById: {
      ...state.orderPaymentStatusById,
      [id]: 'refunded'
    },
    refundDecisionByOrderId: {
      ...state.refundDecisionByOrderId,
      [id]: 'refunded'
    }
  }));

  const updated = applyAdminDemoToOrders(baseOrders).find((order) => order.id === id);
  return toOrderPayload(
    updated ?? {
      id,
      orderNumber: `WW-DEMO-${id}`,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'refunded',
      total: 0,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    reason
  );
};

export const createAdminDemoCategory = (
  baseCategories: AdminCategory[],
  payload: {
    name: string;
    slug?: string;
    gender: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
  }
): AdminCategory => {
  const state = readState();
  const nextId = Math.max(
    state.nextCategoryId ?? 0,
    ...baseCategories.map((category) => category.id),
    ...state.createdCategories.map((category) => category.id)
  ) + 1;

  const created: AdminCategory = {
    id: nextId,
    name: payload.name.trim(),
    slug: (payload.slug?.trim() || payload.name.trim().toLowerCase().replace(/\s+/g, '-')).replace(/[^a-z0-9-]/g, '-'),
    gender: payload.gender.toLowerCase(),
    description: payload.description?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    active: payload.active ?? true,
    createdAt: new Date().toISOString()
  };

  updateState((current) => ({
    ...current,
    createdCategories: [created, ...current.createdCategories.filter((category) => category.id !== created.id)],
    nextCategoryId: nextId
  }));

  return created;
};

export const updateAdminDemoCategory = (
  baseCategories: AdminCategory[],
  id: number,
  payload: {
    name: string;
    slug?: string;
    gender: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
  }
): AdminCategory => {
  updateState((current) => {
    const createdCategories = current.createdCategories.map((category) =>
      category.id === id
        ? {
            ...category,
            ...payload,
            slug: payload.slug?.trim() || category.slug
          }
        : category
    );

    return {
      ...current,
      createdCategories,
      categoryPatchById: {
        ...current.categoryPatchById,
        [id]: {
          ...current.categoryPatchById[id],
          ...payload,
          gender: payload.gender.toLowerCase()
        }
      }
    };
  });

  return applyAdminDemoToCategories(baseCategories).find((category) => category.id === id) ?? {
    id,
    name: payload.name.trim(),
    slug: payload.slug?.trim() || `demo-category-${id}`,
    gender: payload.gender.toLowerCase(),
    description: payload.description?.trim() || null,
    imageUrl: payload.imageUrl?.trim() || null,
    active: payload.active ?? true,
    createdAt: new Date().toISOString()
  };
};

export const toggleAdminDemoCategoryActive = (
  baseCategories: AdminCategory[],
  id: number,
  active: boolean
): AdminCategory => {
  updateState((current) => ({
    ...current,
    createdCategories: current.createdCategories.map((category) =>
      category.id === id ? { ...category, active } : category
    ),
    categoryPatchById: {
      ...current.categoryPatchById,
      [id]: {
        ...current.categoryPatchById[id],
        active
      }
    }
  }));

  return applyAdminDemoToCategories(baseCategories).find((category) => category.id === id) ?? {
    id,
    name: `Danh muc ${id}`,
    slug: `danh-muc-${id}`,
    gender: 'women',
    active
  };
};

export const updateAdminDemoSettings = (
  baseSettings: AdminSystemConfig,
  payload: Partial<AdminSystemConfig>
): AdminSystemConfig => {
  const next = {
    ...baseSettings,
    ...payload
  };
  updateState((current) => ({
    ...current,
    settingsOverride: next
  }));
  return next;
};

export const updateAdminDemoProfile = (
  baseProfile: UserProfile,
  payload: Partial<Pick<UserProfile, 'fullName' | 'avatarUrl' | 'emailNotificationEnabled' | 'autoSyncEnabled'>>
): UserProfile => {
  updateState((current) => ({
    ...current,
    adminProfileOverride: {
      ...(current.adminProfileOverride ?? {}),
      ...payload
    }
  }));
  return applyAdminDemoToProfile({
    ...baseProfile,
    ...payload
  });
};

export const getAdminDemoRefundDecision = (orderId: number): RefundDecision | null =>
  readState().refundDecisionByOrderId[orderId] ?? null;

export const rejectAdminDemoRefund = (orderId: number) => {
  updateState((current) => ({
    ...current,
    refundDecisionByOrderId: {
      ...current.refundDecisionByOrderId,
      [orderId]: 'rejected'
    }
  }));
};
