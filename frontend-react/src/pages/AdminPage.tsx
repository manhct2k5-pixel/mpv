import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  DollarSign,
  PackageCheck,
  ShieldAlert,
  Ticket,
  UserPlus,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminCalendarStrip from '../components/admin/AdminCalendarStrip';
import AdminDataCard from '../components/admin/AdminDataCard';
import AdminDonutCard from '../components/admin/AdminDonutCard';
import AdminKpiCard from '../components/admin/AdminKpiCard';
import AdminPerformanceChart from '../components/admin/AdminPerformanceChart';
import AdminSection from '../components/admin/AdminSection';
import AdminTrafficList from '../components/admin/AdminTrafficList';
import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment';
import { financeApi, storeApi } from '../services/api.ts';
import type { AdminRangePreset } from '../types/admin';
import type { AdminOverview, AdminUserInsight, BusinessRequest, UserProfile } from '../types/app';
import type { OrderSummary, StoreMessage, StoreMessagePartner, StoreProductSummary } from '../types/store';
import { buildAdminDashboardViewModel, shiftDateISOByDays } from './adminMappers';

const emptyOverview: AdminOverview = {
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

const roleOptions = [
  { value: 'user', label: 'Customer/Buyer' },
  { value: 'seller', label: 'Seller/Merchant' },
  { value: 'warehouse', label: 'Staff/Vận hành' },
  { value: 'admin', label: 'Admin/System Admin' }
];

const orderStatusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'packing', label: 'Đang đóng gói' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' }
];

const paymentStatusOptions = [
  { value: 'all', label: 'Mọi trạng thái thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'refunded', label: 'Đã hoàn tiền' }
];

export type AdminSectionId = 'dashboard' | 'orders' | 'catalog' | 'users' | 'tickets' | 'settings';

interface AdminPageProps {
  section: AdminSectionId;
}

const todayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const kpiIcons = {
  range_revenue: DollarSign,
  range_orders: Boxes,
  unpaid_orders: ShieldAlert,
  flagged_transactions: AlertTriangle
};

const formatRoleLabel = (value?: string | null) => {
  const normalized = (value ?? '').toLowerCase();
  if (!normalized) return '--';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeRoleValue = (value?: string | null) => {
  const normalized = (value ?? '').toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const getRoleOptionsForUser = (currentRole?: string | null) => {
  const normalized = normalizeRoleValue(currentRole);
  if (!normalized || roleOptions.some((option) => option.value === normalized)) {
    return roleOptions;
  }
  return [{ value: normalized, label: `${formatRoleLabel(normalized)} (legacy)` }, ...roleOptions];
};

const AdminPage = ({ section }: AdminPageProps) => {
  const queryClient = useQueryClient();
  const [userQuery, setUserQuery] = useState('');
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'warehouse'
  });
  const [staffStatusMessage, setStaffStatusMessage] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<number, string>>({});
  const [rangePreset, setRangePreset] = useState<AdminRangePreset>('7d');
  const [selectedDateISO, setSelectedDateISO] = useState(todayISO());
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogFeaturedFilter, setCatalogFeaturedFilter] = useState<'all' | 'featured' | 'normal'>('all');
  const [catalogSaleFilter, setCatalogSaleFilter] = useState<'all' | 'sale' | 'regular'>('all');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedTicketPartnerId, setSelectedTicketPartnerId] = useState<number | null>(null);
  const [ticketPartnerQuery, setTicketPartnerQuery] = useState('');
  const [ticketPartnerPage, setTicketPartnerPage] = useState(1);
  const [ticketDraft, setTicketDraft] = useState('');
  const [ticketMessageQuery, setTicketMessageQuery] = useState('');
  const [ticketSenderFilter, setTicketSenderFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [ticketStatusMessage, setTicketStatusMessage] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    fullName: '',
    avatarUrl: '',
    emailNotificationEnabled: true,
    autoSyncEnabled: false
  });
  const [settingsStatusMessage, setSettingsStatusMessage] = useState<string | null>(null);

  const orderStatusParam = orderStatusFilter === 'all' ? undefined : orderStatusFilter;
  const paymentStatusParam = paymentStatusFilter === 'all' ? undefined : paymentStatusFilter;

  const { data: overview = emptyOverview, isLoading: overviewLoading, isError: overviewError } =
    useQuery<AdminOverview>({
      queryKey: ['admin', 'overview'],
      queryFn: financeApi.admin.overview
    });

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const {
    data: businessRequests = [],
    isLoading: requestsLoading,
    isError: requestsError
  } = useQuery<BusinessRequest[]>({
    queryKey: ['admin', 'business-requests'],
    queryFn: financeApi.businessRequests
  });

  const {
    data: analyticsOrders = [],
    isLoading: analyticsOrdersLoading,
    isError: analyticsOrdersError
  } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'analytics'],
    queryFn: () => financeApi.admin.orders()
  });

  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', orderStatusParam ?? 'all', paymentStatusParam ?? 'all'],
    queryFn: () =>
      financeApi.admin.orders({
        status: orderStatusParam,
        paymentStatus: paymentStatusParam
      })
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });

  const {
    data: catalogProducts = [],
    isLoading: catalogLoading,
    isError: catalogError
  } = useQuery<StoreProductSummary[]>({
    queryKey: ['admin', 'catalog-products'],
    queryFn: async () => {
      const payload = await storeApi.products({ page: 0, pageSize: 200 });
      return payload.items;
    }
  });

  const {
    data: ticketPartners = [],
    isLoading: ticketPartnersLoading,
    isError: ticketPartnersError
  } = useQuery<StoreMessagePartner[]>({
    queryKey: ['admin', 'ticket-partners'],
    queryFn: storeApi.messagePartners,
    refetchInterval: 30_000
  });

  const {
    data: ticketMessages = [],
    isLoading: ticketMessagesLoading,
    isError: ticketMessagesError
  } = useQuery<StoreMessage[]>({
    queryKey: ['admin', 'ticket-messages', selectedTicketPartnerId ?? 'none'],
    queryFn: () => storeApi.messages(selectedTicketPartnerId as number),
    enabled: selectedTicketPartnerId != null,
    refetchInterval: selectedTicketPartnerId != null ? 5_000 : false
  });

  const flagMutation = useMutation({
    mutationFn: (payload: { email: string; highlight: boolean }) =>
      financeApi.admin.flagUser(payload.email, payload.highlight),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const roleMutation = useMutation({
    mutationFn: (payload: { id: number; role: string }) => financeApi.admin.updateUserRole(payload.id, payload.role),
    onSuccess: (updated) => {
      setRoleDrafts((prev) => {
        if (!(updated.id in prev)) return prev;
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: { fullName: string; email: string; password: string; role: string }) =>
      financeApi.admin.createStaffAccount(payload),
    onSuccess: (created) => {
      setStaffStatusMessage(`Đã tạo tài khoản staff: ${created.email}`);
      setStaffForm({
        fullName: '',
        email: '',
        password: '',
        role: 'warehouse'
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error: any) => {
      setStaffStatusMessage(
        error.response?.data?.message || error.response?.data?.error || 'Không thể tạo tài khoản staff.'
      );
    }
  });

  const approveRequestMutation = useMutation({
    mutationFn: (id: number) => financeApi.approveBusinessRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (id: number) => financeApi.rejectBusinessRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) =>
      financeApi.admin.updateOrderStatus(payload.id, payload.status),
    onSuccess: (order) => {
      setOrderStatusDrafts((prev) => {
        if (!(order.id in prev)) return prev;
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'analytics'] });
      queryClient.setQueryData(['store-order', order.id], order);
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: number) => financeApi.admin.confirmOrderPayment(id),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'analytics'] });
      queryClient.setQueryData(['store-order', order.id], order);
    }
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: (payload: { id: number; featured: boolean }) =>
      storeApi.updateProduct(payload.id, { featured: payload.featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalog-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-featured'] });
    }
  });

  const sendTicketReplyMutation = useMutation({
    mutationFn: (payload: { partnerId: number; content: string }) =>
      storeApi.sendMessage(payload.partnerId, payload.content),
    onSuccess: (_saved, variables) => {
      setTicketDraft('');
      setTicketStatusMessage('Đã gửi phản hồi ticket.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-messages', variables.partnerId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-partners'] });
    },
    onError: (error: any) => {
      setTicketStatusMessage(
        error.response?.data?.message || error.response?.data?.error || 'Không thể gửi phản hồi ticket.'
      );
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      financeApi.updateProfile({
        fullName: settingsForm.fullName.trim(),
        avatarUrl: settingsForm.avatarUrl.trim() || undefined,
        emailNotificationEnabled: settingsForm.emailNotificationEnabled,
        autoSyncEnabled: settingsForm.autoSyncEnabled
      }),
    onSuccess: (updated) => {
      setSettingsStatusMessage('Đã lưu cài đặt admin.');
      queryClient.setQueryData(['profile'], updated);
    },
    onError: (error: any) => {
      setSettingsStatusMessage(
        error.response?.data?.message || error.response?.data?.error || 'Không thể lưu cài đặt admin.'
      );
    }
  });

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const haystack = `${user.email} ${user.fullName} ${user.role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, userQuery]);

  const catalogCategories = useMemo(() => {
    const all = catalogProducts
      .map((product) => product.category?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [catalogProducts]);

  const filteredCatalogProducts = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return catalogProducts.filter((product) => {
      const haystack = `${product.name} ${product.slug} ${product.category ?? ''}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const isFeatured = Boolean(product.featured);
      const isSale =
        typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.basePrice;
      const matchesFeatured =
        catalogFeaturedFilter === 'all' ||
        (catalogFeaturedFilter === 'featured' && isFeatured) ||
        (catalogFeaturedFilter === 'normal' && !isFeatured);
      const matchesSale =
        catalogSaleFilter === 'all' ||
        (catalogSaleFilter === 'sale' && isSale) ||
        (catalogSaleFilter === 'regular' && !isSale);
      const matchesCategory = catalogCategoryFilter === 'all' || (product.category ?? '') === catalogCategoryFilter;

      return matchesQuery && matchesFeatured && matchesSale && matchesCategory;
    });
  }, [catalogProducts, catalogQuery, catalogFeaturedFilter, catalogSaleFilter, catalogCategoryFilter]);

  const featuredProductCount = useMemo(
    () => catalogProducts.filter((product) => Boolean(product.featured)).length,
    [catalogProducts]
  );

  const saleProductCount = useMemo(
    () =>
      catalogProducts.filter(
        (product) =>
          typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.basePrice
      ).length,
    [catalogProducts]
  );

  const catalogPageSize = 10;
  const catalogTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCatalogProducts.length / catalogPageSize)),
    [filteredCatalogProducts.length]
  );
  const paginatedCatalogProducts = useMemo(() => {
    const page = Math.min(catalogPage, catalogTotalPages);
    const start = (page - 1) * catalogPageSize;
    return filteredCatalogProducts.slice(start, start + catalogPageSize);
  }, [filteredCatalogProducts, catalogPage, catalogTotalPages]);

  const filteredTicketPartners = useMemo(() => {
    const query = ticketPartnerQuery.trim().toLowerCase();
    if (!query) return ticketPartners;
    return ticketPartners.filter((partner) => {
      const haystack = `${partner.fullName} ${partner.role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [ticketPartners, ticketPartnerQuery]);

  const ticketPartnerPageSize = 8;
  const ticketPartnerTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTicketPartners.length / ticketPartnerPageSize)),
    [filteredTicketPartners.length]
  );
  const paginatedTicketPartners = useMemo(() => {
    const page = Math.min(ticketPartnerPage, ticketPartnerTotalPages);
    const start = (page - 1) * ticketPartnerPageSize;
    return filteredTicketPartners.slice(start, start + ticketPartnerPageSize);
  }, [filteredTicketPartners, ticketPartnerPage, ticketPartnerTotalPages]);

  const selectedTicketPartner = useMemo(
    () => ticketPartners.find((partner) => partner.id === selectedTicketPartnerId) ?? null,
    [ticketPartners, selectedTicketPartnerId]
  );

  const filteredTicketMessages = useMemo(() => {
    const query = ticketMessageQuery.trim().toLowerCase();
    return ticketMessages.filter((msg) => {
      const matchesSender =
        ticketSenderFilter === 'all' ||
        (ticketSenderFilter === 'admin' && msg.fromMe) ||
        (ticketSenderFilter === 'customer' && !msg.fromMe);
      const matchesQuery = !query || msg.content.toLowerCase().includes(query);
      return matchesSender && matchesQuery;
    });
  }, [ticketMessages, ticketMessageQuery, ticketSenderFilter]);

  const handleStaffFieldChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setStaffForm((prev) => ({
      ...prev,
      [name]: name === 'role' ? normalizeRoleValue(value) : value
    }));
  };

  const viewModel = useMemo(
    () =>
      buildAdminDashboardViewModel({
        overview,
        orders: analyticsOrders,
        requests: businessRequests,
        selectedDateISO,
        range: rangePreset
      }),
    [overview, analyticsOrders, businessRequests, selectedDateISO, rangePreset]
  );

  const updatingOrderId =
    updateOrderStatusMutation.isPending && typeof updateOrderStatusMutation.variables?.id === 'number'
      ? updateOrderStatusMutation.variables.id
      : null;
  const confirmingOrderId =
    confirmPaymentMutation.isPending && typeof confirmPaymentMutation.variables === 'number'
      ? confirmPaymentMutation.variables
      : null;
  const approvingRequestId =
    approveRequestMutation.isPending && typeof approveRequestMutation.variables === 'number'
      ? approveRequestMutation.variables
      : null;
  const rejectingRequestId =
    rejectRequestMutation.isPending && typeof rejectRequestMutation.variables === 'number'
      ? rejectRequestMutation.variables
      : null;
  const togglingFeaturedId =
    toggleFeaturedMutation.isPending && typeof toggleFeaturedMutation.variables?.id === 'number'
      ? toggleFeaturedMutation.variables.id
      : null;

  const formatPrice = (value?: number | null) => (value != null ? `${value.toLocaleString('vi-VN')} đ` : '--');
  const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '--');
  const controlSignals = useMemo(
    () => [
      {
        key: 'pipeline',
        label: 'PIPELINE OPEN',
        value: overview.openOrders.toLocaleString('vi-VN'),
        hint: 'Đơn chưa hoàn tất trong hệ thống'
      },
      {
        key: 'unpaid',
        label: 'UNPAID RISK',
        value: overview.unpaidOrders.toLocaleString('vi-VN'),
        hint: 'Đơn chưa ghi nhận thanh toán'
      },
      {
        key: 'flagged',
        label: 'FRAUD FLAG',
        value: overview.flaggedTransactions.toLocaleString('vi-VN'),
        hint: 'Giao dịch cần kiểm soát bổ sung'
      },
      {
        key: 'gmv',
        label: 'GMV LIVE',
        value: formatPrice(overview.grossMerchandiseValue),
        hint: 'Tổng giá trị đơn đã phát sinh'
      }
    ],
    [overview]
  );

  const alertQueue = useMemo(() => {
    const alerts: Array<{ title: string; detail: string; tone: 'danger' | 'warning' | 'info' | 'ok' }> = [];
    if (overview.pendingBusinessRequests > 0) {
      alerts.push({
        title: 'Yêu cầu seller chờ duyệt',
        detail: `${overview.pendingBusinessRequests.toLocaleString('vi-VN')} tài khoản đang chờ admin duyệt quyền bán.`,
        tone: 'info'
      });
    }
    if (overview.unpaidOrders > 0) {
      alerts.push({
        title: 'Chưa thanh toán tăng',
        detail: `${overview.unpaidOrders.toLocaleString('vi-VN')} đơn cần đối soát ngay.`,
        tone: 'warning'
      });
    }
    if (overview.flaggedTransactions > 0) {
      alerts.push({
        title: 'Phát hiện giao dịch nghi vấn',
        detail: `${overview.flaggedTransactions.toLocaleString('vi-VN')} giao dịch đã bị gắn cờ.`,
        tone: 'danger'
      });
    }
    if (overview.openOrders > 200) {
      alerts.push({
        title: 'Tải vận hành cao',
        detail: 'Open orders vượt ngưỡng 200, cần cân đối nhân sự theo ca.',
        tone: 'info'
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        title: 'Hệ thống ổn định',
        detail: 'Chưa có cảnh báo nghiêm trọng trong phiên hiện tại.',
        tone: 'ok'
      });
    }
    return alerts.slice(0, 4);
  }, [overview]);

  useEffect(() => {
    if (ticketPartners.length === 0) {
      setSelectedTicketPartnerId(null);
      return;
    }
    const hasSelectedPartner = ticketPartners.some((partner) => partner.id === selectedTicketPartnerId);
    if (!hasSelectedPartner) {
      setSelectedTicketPartnerId(ticketPartners[0].id);
    }
  }, [ticketPartners, selectedTicketPartnerId]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogQuery, catalogFeaturedFilter, catalogSaleFilter, catalogCategoryFilter]);

  useEffect(() => {
    if (catalogPage > catalogTotalPages) {
      setCatalogPage(catalogTotalPages);
    }
  }, [catalogPage, catalogTotalPages]);

  useEffect(() => {
    setTicketPartnerPage(1);
  }, [ticketPartnerQuery]);

  useEffect(() => {
    if (ticketPartnerPage > ticketPartnerTotalPages) {
      setTicketPartnerPage(ticketPartnerTotalPages);
    }
  }, [ticketPartnerPage, ticketPartnerTotalPages]);

  useEffect(() => {
    if (!profile) return;
    setSettingsForm({
      fullName: profile.fullName ?? '',
      avatarUrl: profile.avatarUrl ?? profile.avatar ?? '',
      emailNotificationEnabled: profile.emailNotificationEnabled ?? true,
      autoSyncEnabled: profile.autoSyncEnabled ?? false
    });
  }, [profile]);

  const activeSection = section;

  return (
    <div className="space-y-6 pb-8">
      {activeSection === 'dashboard' ? (
        <>
      <section id="dashboard" className="admin-hero-card scroll-mt-24">
        <div className="space-y-2">
          <p className="admin-badge">Admin Workspace</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Bảng điều phối hệ thống</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Giao diện điều hành tập trung theo phong cách dashboard hiện đại, theo dõi user, đơn hàng và cảnh báo trong
            cùng một màn hình.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/orders" className="admin-inline-button admin-focus-ring">
            <Boxes className="h-4 w-4" />
            Giám sát đơn hàng
          </Link>
          <Link to="/admin/catalog-config" className="admin-inline-button admin-focus-ring">
            <PackageCheck className="h-4 w-4" />
            Danh mục & cấu hình
          </Link>
          <Link to="/admin/refunds" className="admin-inline-button admin-focus-ring">
            <Ticket className="h-4 w-4" />
            Hoàn tiền / xử lý đặc biệt
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {viewModel.kpis.map((kpi) => {
          const Icon = kpiIcons[kpi.key as keyof typeof kpiIcons] ?? Boxes;
          return <AdminKpiCard key={kpi.key} item={kpi} icon={Icon} />;
        })}
      </section>

      <section className="admin-dashboard-grid">
        <div className="space-y-6">
          <AdminSection
            title="Hiệu suất vận hành"
            description="Theo dõi doanh thu, số đơn và nhịp độ hệ thống theo thời gian"
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`admin-inline-button admin-focus-ring ${rangePreset === '7d' ? 'is-active' : ''}`}
                  onClick={() => setRangePreset('7d')}
                >
                  7 ngày
                </button>
                <button
                  type="button"
                  className={`admin-inline-button admin-focus-ring ${rangePreset === '30d' ? 'is-active' : ''}`}
                  onClick={() => setRangePreset('30d')}
                >
                  30 ngày
                </button>
              </div>
            }
          >
            {analyticsOrdersError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Không tải được dữ liệu biểu đồ dashboard.
              </p>
            ) : null}
            <AdminPerformanceChart data={viewModel.chart} loading={analyticsOrdersLoading} />
            <div className="mt-4">
              <AdminCalendarStrip
                calendar={viewModel.calendar}
                onSelectDate={setSelectedDateISO}
                onPrevWeek={() => setSelectedDateISO((prev) => shiftDateISOByDays(prev, -7))}
                onNextWeek={() => setSelectedDateISO((prev) => shiftDateISOByDays(prev, 7))}
              />
            </div>
          </AdminSection>

          <AdminSection title="Traffic Source" description="Áp lực pipeline theo trạng thái đơn">
            <AdminTrafficList items={viewModel.traffic} loading={analyticsOrdersLoading} />
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminDataCard title="Trung tâm tín hiệu" caption="Chỉ số vận hành quan trọng trong phiên">
            <div className="grid gap-2 sm:grid-cols-2">
              {controlSignals.map((signal) => (
                <article key={signal.key} className="admin-signal-card">
                  <p className="admin-signal-card__label">{signal.label}</p>
                  <p className="admin-signal-card__value">{signal.value}</p>
                  <p className="admin-signal-card__hint">{signal.hint}</p>
                </article>
              ))}
            </div>
          </AdminDataCard>

          <AdminSection title="Cấu trúc thanh toán" description="Tỷ trọng doanh thu theo trạng thái thanh toán">
            <AdminDonutCard segments={viewModel.donut} loading={analyticsOrdersLoading} />
          </AdminSection>

          <AdminDataCard title="Alert Queue" caption="Danh sách ưu tiên cần xử lý">
            <div className="space-y-2">
              {alertQueue.map((alert, index) => (
                <article key={`${alert.title}-${index}`} className={`admin-alert-item ${alert.tone}`}>
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1 text-xs">{alert.detail}</p>
                </article>
              ))}
            </div>
          </AdminDataCard>

          <AdminDataCard title="Sức khỏe hệ thống" caption="Số liệu tổng hợp theo thời gian thực">
            {overviewLoading ? <div className="admin-skeleton h-24 w-full rounded-xl" /> : null}
            {overviewError ? (
              <p className="text-sm text-rose-600">Không tải được số liệu tổng quan admin.</p>
            ) : (
              <div className="grid gap-2 text-xs text-[var(--admin-muted)]">
                <p>
                  Tổng user: <span className="font-semibold text-[var(--admin-text)]">{overview.totalUsers}</span>
                </p>
                <p>
                  Staff vận hành:{' '}
                  <span className="font-semibold text-[var(--admin-text)]">{overview.totalStaff}</span>
                </p>
                <p>
                  Đơn đang mở: <span className="font-semibold text-[var(--admin-text)]">{overview.openOrders}</span>
                </p>
                <p>
                  GMV: <span className="font-semibold text-[var(--admin-text)]">{formatPrice(overview.grossMerchandiseValue)}</span>
                </p>
              </div>
            )}
          </AdminDataCard>
        </div>
      </section>
        </>
      ) : null}

      {activeSection === 'users' ? (
        <div id="users" className="scroll-mt-24 space-y-6">
        <AdminSection title="Yêu cầu mở gian hàng" description="Duyệt quyền seller cho user đang chờ admin xác nhận">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs text-[var(--admin-muted)]">
            <Clock3 className="h-4 w-4 text-[var(--admin-primary-600)]" />
            Đang chờ duyệt: <span className="font-semibold text-[var(--admin-text)]">{businessRequests.length}</span>
          </div>

          {requestsLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải yêu cầu...</p> : null}
          {requestsError ? <p className="text-sm text-rose-600">Không tải được danh sách yêu cầu.</p> : null}

          {!requestsLoading && !requestsError ? (
            businessRequests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm text-[var(--admin-muted)]">
                Không có yêu cầu mở gian hàng mới.
              </div>
            ) : (
              <div className="grid gap-3">
                {businessRequests.map((request) => (
                  <article
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--admin-text)]">{request.fullName}</p>
                      <p className="text-xs text-[var(--admin-muted)]">{request.email}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        Gửi lúc:{' '}
                        {request.requestedAt ? new Date(request.requestedAt).toLocaleString('vi-VN') : 'Không rõ thời gian'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="admin-action-button success"
                        onClick={() => approveRequestMutation.mutate(request.id)}
                        disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {approvingRequestId === request.id ? 'Đang duyệt...' : 'Duyệt'}
                      </button>
                      <button
                        type="button"
                        className="admin-action-button danger"
                        onClick={() => rejectRequestMutation.mutate(request.id)}
                        disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        {rejectingRequestId === request.id ? 'Đang từ chối...' : 'Từ chối'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : null}
        </AdminSection>

        <AdminSection title="Người dùng & Phân quyền" description="Admin quản trị vòng đời tài khoản theo actor">
          <div className="mb-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--admin-primary-600)]" />
              <p className="text-sm font-semibold text-[var(--admin-text)]">Tạo tài khoản Staff/Vận hành</p>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <input
                name="fullName"
                value={staffForm.fullName}
                onChange={handleStaffFieldChange}
                className="admin-input"
                placeholder="Họ tên nhân viên"
              />
              <input
                name="email"
                type="email"
                value={staffForm.email}
                onChange={handleStaffFieldChange}
                className="admin-input"
                placeholder="Email đăng nhập"
              />
              <input
                name="password"
                type="password"
                value={staffForm.password}
                onChange={handleStaffFieldChange}
                className="admin-input"
                placeholder="Mật khẩu tạm"
              />
              <select name="role" value={staffForm.role} onChange={handleStaffFieldChange} className="admin-select">
                <option value="warehouse">Staff/Vận hành</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="admin-action-button success"
                disabled={
                  createStaffMutation.isPending ||
                  !staffForm.fullName.trim() ||
                  !staffForm.email.trim() ||
                  !staffForm.password.trim()
                }
                onClick={() => {
                  setStaffStatusMessage(null);
                  createStaffMutation.mutate({
                    ...staffForm,
                    role: normalizeRoleValue(staffForm.role)
                  });
                }}
              >
                {createStaffMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản staff'}
              </button>
              <p className="text-xs text-[var(--admin-muted)]">
                Staff là tài khoản nội bộ. Bạn có thể tạo role `warehouse`.
              </p>
            </div>
            {staffStatusMessage ? (
              <p className={`mt-3 text-xs ${createStaffMutation.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                {staffStatusMessage}
              </p>
            ) : null}
          </div>

          <div className="mb-4">
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Tìm theo email, tên, role..."
              className="admin-input"
            />
          </div>

          {usersLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải...</p> : null}
          {usersError ? <p className="text-sm text-rose-600">Không tải được danh sách người dùng.</p> : null}
          {!usersLoading && !usersError ? (
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Họ tên</th>
                    <th>Vai trò</th>
                    <th>Giao dịch</th>
                    <th>Cảnh báo</th>
                    <th>Ngân sách</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isFlagged = (user.flagged ?? 0) > 0;
                    const draftRole = normalizeRoleValue(roleDrafts[user.id] ?? user.role);
                    const currentRole = normalizeRoleValue(user.role);
                    const roleChanged = draftRole !== currentRole;
                    const isUpdatingRole = roleMutation.isPending && roleMutation.variables?.id === user.id;
                    const scopedRoleOptions = getRoleOptionsForUser(user.role);

                    return (
                      <tr key={user.email}>
                        <td>{user.email}</td>
                        <td>{user.fullName}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <select
                              value={draftRole}
                              onChange={(event) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [user.id]: normalizeRoleValue(event.target.value)
                                }))
                              }
                              className="admin-select"
                            >
                              {scopedRoleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!roleChanged || roleMutation.isPending}
                              onClick={() =>
                                roleMutation.mutate({
                                  id: user.id,
                                  role: draftRole
                                })
                              }
                              className="admin-inline-button"
                            >
                              {isUpdatingRole ? 'Đang lưu...' : 'Lưu role'}
                            </button>
                          </div>
                        </td>
                        <td>{user.totalTransactions}</td>
                        <td>{user.flagged}</td>
                        <td>{user.budgets}</td>
                        <td>
                          <button
                            type="button"
                            disabled={flagMutation.isPending}
                            onClick={() => flagMutation.mutate({ email: user.email, highlight: !isFlagged })}
                            className={`admin-action-button ${isFlagged ? 'danger' : 'success'}`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                            {isFlagged ? 'Bỏ cảnh báo' : 'Gắn cảnh báo'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-sm text-[var(--admin-muted)]">
                        Không có user phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminSection>
        </div>
      ) : null}

      {activeSection === 'orders' ? (
        <div id="orders" className="scroll-mt-24">
        <AdminSection title="Đơn hàng toàn hệ thống" description="Theo dõi trạng thái, thanh toán và xử lý nghiệp vụ đặc biệt">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="admin-select">
              {orderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} className="admin-select">
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--admin-muted)]">
              Kết quả: <span className="font-semibold text-[var(--admin-text)]">{orders.length}</span>
            </p>
          </div>

          {ordersLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải đơn hàng...</p> : null}
          {ordersError ? <p className="text-sm text-rose-600">Không tải được danh sách đơn hàng.</p> : null}
          {!ordersLoading && !ordersError ? (
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Thời gian</th>
                    <th>Thanh toán</th>
                    <th>Tổng tiền</th>
                    <th>Cập nhật trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusDraft = orderStatusDrafts[order.id] ?? order.status;
                    const statusChanged = statusDraft !== order.status;
                    return (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>
                          {paymentMethodLabels[order.paymentMethod] ?? formatRoleLabel(order.paymentMethod)} ·{' '}
                          {paymentStatusLabels[order.paymentStatus] ?? formatRoleLabel(order.paymentStatus)}
                        </td>
                        <td>{formatPrice(order.total)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <select
                              value={statusDraft}
                              onChange={(event) =>
                                setOrderStatusDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: event.target.value
                                }))
                              }
                              className="admin-select"
                            >
                              {orderStatusOptions
                                .filter((option) => option.value !== 'all')
                                .map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!statusChanged || updateOrderStatusMutation.isPending}
                              onClick={() =>
                                updateOrderStatusMutation.mutate({
                                  id: order.id,
                                  status: statusDraft
                                })
                              }
                              className="admin-inline-button"
                            >
                              {updatingOrderId === order.id ? 'Đang cập nhật...' : 'Lưu'}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' ? (
                              <button
                                type="button"
                                className="admin-action-button success"
                                onClick={() => confirmPaymentMutation.mutate(order.id)}
                                disabled={confirmPaymentMutation.isPending}
                              >
                                {confirmingOrderId === order.id ? 'Đang xác nhận...' : 'Xác nhận CK'}
                              </button>
                            ) : null}
                            <Link to={`/don-hang/${order.id}`} className="admin-inline-button">
                              Chi tiết
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-sm text-[var(--admin-muted)]">
                        Không có đơn phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminSection>
        </div>
      ) : null}

      {activeSection === 'catalog' ? (
        <div id="catalog" className="scroll-mt-24">
        <AdminSection
          title="Catalog toàn hệ thống"
          description="Giám sát danh mục, giá bán và sản phẩm nổi bật"
          actions={
            <Link to="/seller/san-pham" className="admin-inline-button admin-focus-ring">
              Mở workspace catalog đầy đủ
            </Link>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2">
              <p className="text-xs text-[var(--admin-muted)]">Tổng sản phẩm</p>
              <p className="text-base font-semibold text-[var(--admin-text)]">{catalogProducts.length.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2">
              <p className="text-xs text-[var(--admin-muted)]">Sản phẩm nổi bật</p>
              <p className="text-base font-semibold text-[var(--admin-text)]">{featuredProductCount.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2">
              <p className="text-xs text-[var(--admin-muted)]">Sản phẩm đang sale</p>
              <p className="text-base font-semibold text-[var(--admin-text)]">{saleProductCount.toLocaleString('vi-VN')}</p>
            </div>
          </div>

          <div className="mb-4">
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Tìm sản phẩm theo tên, slug, danh mục..."
              className="admin-input"
            />
          </div>

          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <select
              value={catalogCategoryFilter}
              onChange={(event) => setCatalogCategoryFilter(event.target.value)}
              className="admin-select"
            >
              <option value="all">Mọi danh mục</option>
              {catalogCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={catalogFeaturedFilter}
              onChange={(event) =>
                setCatalogFeaturedFilter(event.target.value as 'all' | 'featured' | 'normal')
              }
              className="admin-select"
            >
              <option value="all">Mọi trạng thái nổi bật</option>
              <option value="featured">Chỉ sản phẩm nổi bật</option>
              <option value="normal">Chỉ sản phẩm thường</option>
            </select>
            <select
              value={catalogSaleFilter}
              onChange={(event) => setCatalogSaleFilter(event.target.value as 'all' | 'sale' | 'regular')}
              className="admin-select"
            >
              <option value="all">Mọi trạng thái sale</option>
              <option value="sale">Chỉ sản phẩm đang sale</option>
              <option value="regular">Chỉ sản phẩm không sale</option>
            </select>
          </div>

          {catalogLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải catalog...</p> : null}
          {catalogError ? <p className="text-sm text-rose-600">Không tải được dữ liệu catalog.</p> : null}
          {!catalogLoading && !catalogError ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--admin-muted)]">
                <p>
                  Kết quả lọc: <span className="font-semibold text-[var(--admin-text)]">{filteredCatalogProducts.length}</span>
                </p>
                <p>
                  Trang <span className="font-semibold text-[var(--admin-text)]">{catalogPage}</span> / {catalogTotalPages}
                </p>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table min-w-full text-sm">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Danh mục</th>
                      <th>Giá gốc</th>
                      <th>Giá sale</th>
                      <th>Nổi bật</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCatalogProducts.map((product) => {
                      const featured = Boolean(product.featured);
                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--admin-text)]">{product.name}</p>
                              <p className="text-xs text-[var(--admin-muted)]">{product.slug}</p>
                            </div>
                          </td>
                          <td>{product.category ?? '--'}</td>
                          <td>{formatPrice(product.basePrice)}</td>
                          <td>{formatPrice(product.salePrice)}</td>
                          <td>{featured ? 'Có' : 'Không'}</td>
                          <td>
                            <button
                              type="button"
                              className={`admin-action-button ${featured ? 'danger' : 'success'}`}
                              disabled={toggleFeaturedMutation.isPending}
                              onClick={() =>
                                toggleFeaturedMutation.mutate({
                                  id: product.id,
                                  featured: !featured
                                })
                              }
                            >
                              {togglingFeaturedId === product.id
                                ? 'Đang cập nhật...'
                                : featured
                                  ? 'Bỏ nổi bật'
                                  : 'Đánh dấu nổi bật'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredCatalogProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-sm text-[var(--admin-muted)]">
                          Không có sản phẩm phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="admin-inline-button"
                  disabled={catalogPage <= 1}
                  onClick={() => setCatalogPage((prev) => Math.max(1, prev - 1))}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className="admin-inline-button"
                  disabled={catalogPage >= catalogTotalPages}
                  onClick={() => setCatalogPage((prev) => Math.min(catalogTotalPages, prev + 1))}
                >
                  Trang sau
                </button>
              </div>
            </div>
          ) : null}
        </AdminSection>
        </div>
      ) : null}

      {activeSection === 'tickets' ? (
        <div id="tickets" className="scroll-mt-24">
        <AdminSection
          title="Ticket vận hành"
          description="Xử lý hội thoại hỗ trợ với khách hàng ngay trong admin workspace"
          actions={
            <Link to="/seller/tickets" className="admin-inline-button admin-focus-ring">
              Mở inbox đầy đủ
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Hội thoại</p>
              <input
                value={ticketPartnerQuery}
                onChange={(event) => setTicketPartnerQuery(event.target.value)}
                className="admin-input mb-2"
                placeholder="Tìm khách hàng..."
              />
              {ticketPartnersLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải hội thoại...</p> : null}
              {ticketPartnersError ? <p className="text-sm text-rose-600">Không tải được ticket.</p> : null}
              {!ticketPartnersLoading && !ticketPartnersError ? (
                ticketPartners.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)]">Chưa có ticket cần xử lý.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-[var(--admin-muted)]">
                      Kết quả: <span className="font-semibold text-[var(--admin-text)]">{filteredTicketPartners.length}</span>
                    </div>
                    {paginatedTicketPartners.map((partner) => (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => {
                          setSelectedTicketPartnerId(partner.id);
                          setTicketStatusMessage(null);
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selectedTicketPartnerId === partner.id
                            ? 'border-[var(--admin-primary-500)] bg-[var(--admin-primary-100)] text-[var(--admin-primary-700)]'
                            : 'border-[var(--admin-border)] bg-white text-[var(--admin-text)]'
                        }`}
                      >
                        <p className="font-medium">{partner.fullName}</p>
                        <p className="text-xs text-[var(--admin-muted)]">Khách hàng</p>
                      </button>
                    ))}
                    {filteredTicketPartners.length === 0 ? (
                      <p className="text-sm text-[var(--admin-muted)]">Không tìm thấy hội thoại phù hợp.</p>
                    ) : (
                      <div className="flex items-center justify-between pt-1 text-xs text-[var(--admin-muted)]">
                        <span>
                          Trang {ticketPartnerPage}/{ticketPartnerTotalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="admin-inline-button"
                            disabled={ticketPartnerPage <= 1}
                            onClick={() => setTicketPartnerPage((prev) => Math.max(1, prev - 1))}
                          >
                            Trước
                          </button>
                          <button
                            type="button"
                            className="admin-inline-button"
                            disabled={ticketPartnerPage >= ticketPartnerTotalPages}
                            onClick={() =>
                              setTicketPartnerPage((prev) => Math.min(ticketPartnerTotalPages, prev + 1))
                            }
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : null}
            </div>

            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3">
              <div className="mb-3 border-b border-[var(--admin-border)] pb-2">
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  {selectedTicketPartner ? `Hỗ trợ: ${selectedTicketPartner.fullName}` : 'Chọn hội thoại để xử lý'}
                </p>
              </div>

              {selectedTicketPartnerId == null ? (
                <p className="text-sm text-[var(--admin-muted)]">Chọn hội thoại ở cột trái để xem nội dung.</p>
              ) : (
                <>
                  <div className="mb-2 grid gap-2 md:grid-cols-[1fr,220px]">
                    <input
                      value={ticketMessageQuery}
                      onChange={(event) => setTicketMessageQuery(event.target.value)}
                      className="admin-input"
                      placeholder="Lọc nội dung tin nhắn..."
                    />
                    <select
                      value={ticketSenderFilter}
                      onChange={(event) =>
                        setTicketSenderFilter(event.target.value as 'all' | 'customer' | 'admin')
                      }
                      className="admin-select"
                    >
                      <option value="all">Mọi người gửi</option>
                      <option value="customer">Chỉ khách hàng</option>
                      <option value="admin">Chỉ admin/staff</option>
                    </select>
                  </div>
                  <p className="mb-2 text-xs text-[var(--admin-muted)]">
                    Tin nhắn hiển thị: <span className="font-semibold text-[var(--admin-text)]">{filteredTicketMessages.length}</span>
                  </p>
                  <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3">
                    {ticketMessagesLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải tin nhắn...</p> : null}
                    {ticketMessagesError ? <p className="text-sm text-rose-600">Không tải được nội dung ticket.</p> : null}
                    {!ticketMessagesLoading && !ticketMessagesError ? (
                      filteredTicketMessages.length === 0 ? (
                        <p className="text-sm text-[var(--admin-muted)]">Chưa có tin nhắn trong hội thoại này.</p>
                      ) : (
                        filteredTicketMessages.map((msg) => (
                          <article
                            key={msg.id}
                            className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                              msg.fromMe
                                ? 'ml-auto border-[var(--admin-primary-500)] bg-[var(--admin-primary-100)] text-[var(--admin-primary-700)]'
                                : 'mr-auto border-[var(--admin-border)] bg-white text-[var(--admin-text)]'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className="mt-1 text-[11px] opacity-75">{formatDateTime(msg.createdAt)}</p>
                          </article>
                        ))
                      )
                    ) : null}
                  </div>

                  <textarea
                    value={ticketDraft}
                    onChange={(event) => setTicketDraft(event.target.value)}
                    className="admin-input h-24 resize-y py-2"
                    placeholder="Nhập phản hồi ticket..."
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {ticketStatusMessage ? (
                      <p className={`text-xs ${sendTicketReplyMutation.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {ticketStatusMessage}
                      </p>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      className="admin-action-button success"
                      disabled={sendTicketReplyMutation.isPending || !ticketDraft.trim()}
                      onClick={() => {
                        if (selectedTicketPartnerId == null) return;
                        const content = ticketDraft.trim();
                        if (!content) return;
                        setTicketStatusMessage(null);
                        sendTicketReplyMutation.mutate({
                          partnerId: selectedTicketPartnerId,
                          content
                        });
                      }}
                    >
                      {sendTicketReplyMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </AdminSection>
        </div>
      ) : null}

      {activeSection === 'settings' ? (
        <div id="settings" className="scroll-mt-24">
        <AdminSection title="Cài đặt admin" description="Quản trị hồ sơ admin và tuỳ chọn hệ thống cơ bản">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[var(--admin-muted)]">
              Họ và tên admin
              <input
                value={settingsForm.fullName}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    fullName: event.target.value
                  }))
                }
                className="admin-input mt-1"
              />
            </label>
            <label className="text-sm text-[var(--admin-muted)]">
              Email đăng nhập
              <input value={profile?.email ?? '--'} disabled className="admin-input mt-1 opacity-70" />
            </label>
            <label className="text-sm text-[var(--admin-muted)] md:col-span-2">
              Avatar URL
              <input
                value={settingsForm.avatarUrl}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    avatarUrl: event.target.value
                  }))
                }
                placeholder="https://..."
                className="admin-input mt-1"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]">
              Nhận thông báo email
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--admin-primary-600)]"
                checked={settingsForm.emailNotificationEnabled}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    emailNotificationEnabled: event.target.checked
                  }))
                }
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]">
              Tự động đồng bộ dữ liệu
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--admin-primary-600)]"
                checked={settingsForm.autoSyncEnabled}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    autoSyncEnabled: event.target.checked
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {settingsStatusMessage ? (
              <p className={`text-xs ${saveSettingsMutation.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                {settingsStatusMessage}
              </p>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="admin-action-button success"
              disabled={saveSettingsMutation.isPending || !settingsForm.fullName.trim()}
              onClick={() => {
                setSettingsStatusMessage(null);
                saveSettingsMutation.mutate();
              }}
            >
              {saveSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </AdminSection>
        </div>
      ) : null}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-xs text-slate-600">
        <p>
          Luồng dư thừa đã được loại khỏi giao diện admin/seller: không còn entry công khai cho chat/tư vấn ở luồng mua
          hàng, và staff được tạo nội bộ bởi admin theo actor matrix.
        </p>
      </section>
    </div>
  );
};

export default AdminPage;
