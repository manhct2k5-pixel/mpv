import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ListChecks, Settings2, Shield, UserCog, UserPlus } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type {
  AdminCategory,
  AdminDailyReportPoint,
  AdminSystemConfig,
  AdminUserInsight,
  BusinessRequest
} from '../types/app';
import type { OrderSummary } from '../types/store';

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'seller', label: 'Seller' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'admin', label: 'Admin' }
] as const;

const STAFF_ROLE_OPTIONS = [
  { value: 'warehouse', label: 'Warehouse' }
] as const;

const normalizeRoleValue = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const formatRoleLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getRoleOptionsForUser = (currentRole?: string | null) => {
  const normalized = normalizeRoleValue(currentRole);
  if (!normalized || ROLE_OPTIONS.some((option) => option.value === normalized)) {
    return ROLE_OPTIONS;
  }
  return [{ value: normalized, label: `${formatRoleLabel(normalized)} (legacy)` }, ...ROLE_OPTIONS];
};

const GENDER_OPTIONS = [
  { value: 'WOMEN', label: 'Nữ' },
  { value: 'MEN', label: 'Nam' },
  { value: 'UNISEX', label: 'Unisex' }
] as const;

const emptyCategoryForm = {
  name: '',
  slug: '',
  gender: 'WOMEN',
  description: '',
  imageUrl: '',
  active: true
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return candidate.response?.data?.message ?? candidate.response?.data?.error ?? candidate.message ?? fallback;
  }
  return fallback;
};

const SellerControlCenterPage = () => {
  const queryClient = useQueryClient();

  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'warehouse'
  });
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});

  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState({
    supportEmail: '',
    supportPhone: '',
    orderAutoCancelHours: '48',
    maxRefundDays: '7',
    allowManualRefund: true,
    maintenanceMode: false
  });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const [reportDays, setReportDays] = useState(7);
  const [refundForm, setRefundForm] = useState({
    orderId: '',
    reason: ''
  });
  const [refundMessage, setRefundMessage] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const isAdmin = (profile?.role ?? '').toLowerCase() === 'admin';

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: financeApi.admin.overview,
    enabled: isAdmin
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users,
    enabled: isAdmin
  });

  const { data: businessRequests = [], isLoading: requestsLoading } = useQuery<BusinessRequest[]>({
    queryKey: ['admin', 'business-requests'],
    queryFn: financeApi.businessRequests,
    enabled: isAdmin
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<AdminCategory[]>({
    queryKey: ['admin', 'categories'],
    queryFn: financeApi.admin.categories,
    enabled: isAdmin
  });

  const { data: settings } = useQuery<AdminSystemConfig>({
    queryKey: ['admin', 'settings'],
    queryFn: financeApi.admin.settings,
    enabled: isAdmin
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<AdminDailyReportPoint[]>({
    queryKey: ['admin', 'reports-daily', reportDays],
    queryFn: () => financeApi.admin.reportsDaily(reportDays),
    enabled: isAdmin
  });

  const { data: paidOrders = [] } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'paid-only'],
    queryFn: () => financeApi.admin.orders({ paymentStatus: 'paid' }),
    enabled: isAdmin
  });

  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      supportEmail: settings.supportEmail ?? '',
      supportPhone: settings.supportPhone ?? '',
      orderAutoCancelHours: String(settings.orderAutoCancelHours ?? 48),
      maxRefundDays: String(settings.maxRefundDays ?? 7),
      allowManualRefund: Boolean(settings.allowManualRefund),
      maintenanceMode: Boolean(settings.maintenanceMode)
    });
  }, [settings]);

  const createStaffMutation = useMutation({
    mutationFn: (payload: { fullName: string; email: string; password: string; role: string }) =>
      financeApi.admin.createStaffAccount(payload),
    onSuccess: (created) => {
      setStaffMessage(`Đã tạo tài khoản ${created.email}`);
      setStaffForm({ fullName: '', email: '', password: '', role: 'warehouse' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error) => {
      setStaffMessage(resolveErrorMessage(error, 'Không thể tạo tài khoản staff.'));
    }
  });

  const updateRoleMutation = useMutation({
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

  const createCategoryMutation = useMutation({
    mutationFn: (payload: typeof categoryForm) =>
      financeApi.admin.createCategory({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        gender: payload.gender,
        description: payload.description.trim() || undefined,
        imageUrl: payload.imageUrl.trim() || undefined,
        active: payload.active
      }),
    onSuccess: () => {
      setCategoryMessage('Đã tạo danh mục mới.');
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    },
    onError: (error) => {
      setCategoryMessage(resolveErrorMessage(error, 'Không thể tạo danh mục.'));
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; body: typeof categoryForm }) =>
      financeApi.admin.updateCategory(payload.id, {
        name: payload.body.name.trim(),
        slug: payload.body.slug.trim() || undefined,
        gender: payload.body.gender,
        description: payload.body.description.trim() || undefined,
        imageUrl: payload.body.imageUrl.trim() || undefined,
        active: payload.body.active
      }),
    onSuccess: () => {
      setCategoryMessage('Đã cập nhật danh mục.');
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    },
    onError: (error) => {
      setCategoryMessage(resolveErrorMessage(error, 'Không thể cập nhật danh mục.'));
    }
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; active: boolean }) =>
      financeApi.admin.toggleCategoryActive(payload.id, payload.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      financeApi.admin.updateSettings({
        supportEmail: settingsForm.supportEmail.trim(),
        supportPhone: settingsForm.supportPhone.trim(),
        orderAutoCancelHours: Number(settingsForm.orderAutoCancelHours),
        maxRefundDays: Number(settingsForm.maxRefundDays),
        allowManualRefund: settingsForm.allowManualRefund,
        maintenanceMode: settingsForm.maintenanceMode
      }),
    onSuccess: () => {
      setSettingsMessage('Đã lưu cấu hình hệ thống.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (error) => {
      setSettingsMessage(resolveErrorMessage(error, 'Không thể lưu cấu hình hệ thống.'));
    }
  });

  const refundMutation = useMutation({
    mutationFn: (payload: { orderId: number; reason: string }) => financeApi.admin.refundOrder(payload.orderId, payload.reason),
    onSuccess: (updatedOrder) => {
      setRefundMessage(`Đã hoàn tiền đơn ${updatedOrder.orderNumber}.`);
      setRefundForm({ orderId: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports-daily'] });
    },
    onError: (error) => {
      setRefundMessage(resolveErrorMessage(error, 'Không thể hoàn tiền đơn này.'));
    }
  });

  const visibleUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => `${user.fullName} ${user.email}`.toLowerCase().includes(q));
  }, [users, userSearch]);

  const latestPaidOrders = useMemo(() => paidOrders.slice(0, 8), [paidOrders]);

  const handleCreateStaff = (event: React.FormEvent) => {
    event.preventDefault();
    setStaffMessage(null);
    createStaffMutation.mutate({
      fullName: staffForm.fullName.trim(),
      email: staffForm.email.trim(),
      password: staffForm.password,
      role: normalizeRoleValue(staffForm.role)
    });
  };

  const handleSubmitCategory = (event: React.FormEvent) => {
    event.preventDefault();
    setCategoryMessage(null);
    if (editingCategoryId == null) {
      createCategoryMutation.mutate(categoryForm);
      return;
    }
    updateCategoryMutation.mutate({ id: editingCategoryId, body: categoryForm });
  };

  const handleSaveRole = (user: AdminUserInsight) => {
    const nextRole = normalizeRoleValue(roleDrafts[user.id] ?? user.role);
    const currentRole = normalizeRoleValue(user.role);
    if (nextRole === currentRole) return;
    updateRoleMutation.mutate({ id: user.id, role: nextRole });
  };

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsMessage(null);
    updateSettingsMutation.mutate();
  };

  const handleSubmitRefund = (event: React.FormEvent) => {
    event.preventDefault();
    setRefundMessage(null);
    refundMutation.mutate({
      orderId: Number(refundForm.orderId),
      reason: refundForm.reason.trim()
    });
  };

  if (profileLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải quyền truy cập...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Chỉ admin mới được truy cập Control Center.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-[30px] border border-amber-200/60 bg-gradient-to-br from-[#6f3a1d] via-[#8e4a24] to-[#c56c2e] p-6 text-white shadow-[0_24px_70px_rgba(146,64,14,0.28)] sm:p-8">
        <p className="inline-flex rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
          Control Center
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">Trung tâm quản trị hệ thống</h1>
        <p className="mt-2 max-w-3xl text-sm text-amber-50/95">
          Quản lý quyền nhân sự, danh mục/cấu hình, giám sát đơn hàng-báo cáo và xử lý nghiệp vụ hoàn tiền đặc biệt.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-[0_10px_24px_rgba(146,64,14,0.12)]">
          <p className="text-xs text-amber-900/65">Tổng người dùng</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{overviewLoading ? '...' : overview?.totalUsers ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-[0_10px_24px_rgba(146,64,14,0.12)]">
          <p className="text-xs text-amber-900/65">Tổng đơn hàng</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{overviewLoading ? '...' : overview?.totalOrders ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-[0_10px_24px_rgba(146,64,14,0.12)]">
          <p className="text-xs text-amber-900/65">Đơn chưa thanh toán</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{overviewLoading ? '...' : overview?.unpaidOrders ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-4 shadow-[0_10px_24px_rgba(146,64,14,0.12)]">
          <p className="text-xs text-amber-900/65">Doanh thu đã thu</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">
            {overviewLoading ? '...' : `${(overview?.paidRevenue ?? 0).toLocaleString('vi-VN')} đ`}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="sticker-card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Tạo tài khoản staff</h2>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateStaff}>
            <input
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Họ tên"
              value={staffForm.fullName}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
            <input
              type="email"
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Email"
              value={staffForm.email}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              type="password"
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Mật khẩu"
              value={staffForm.password}
              onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <select
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              value={staffForm.role}
              onChange={(event) =>
                setStaffForm((prev) => ({ ...prev, role: normalizeRoleValue(event.target.value) }))
              }
            >
              {STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-primary sm:col-span-2"
              disabled={createStaffMutation.isPending}
            >
              {createStaffMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>
          {staffMessage ? <p className="text-xs text-amber-900/80">{staffMessage}</p> : null}
        </article>

        <article className="sticker-card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Yêu cầu lên seller</h2>
          </div>
          {requestsLoading ? (
            <p className="text-sm text-amber-900/70">Đang tải yêu cầu...</p>
          ) : businessRequests.length === 0 ? (
            <p className="text-sm text-amber-900/70">Không có yêu cầu chờ duyệt.</p>
          ) : (
            <div className="space-y-2">
              {businessRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-sm">
                  <p className="font-semibold text-amber-950">{request.fullName}</p>
                  <p className="text-xs text-amber-900/70">{request.email}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary btn-primary--sm"
                      onClick={() => approveRequestMutation.mutate(request.id)}
                      disabled={approveRequestMutation.isPending}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm"
                      onClick={() => rejectRequestMutation.mutate(request.id)}
                      disabled={rejectRequestMutation.isPending}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="sticker-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Phân quyền tài khoản</h2>
          </div>
          <input
            className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
            placeholder="Tìm theo tên hoặc email"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
        </div>
        {usersLoading ? (
          <p className="text-sm text-amber-900/70">Đang tải danh sách user...</p>
        ) : (
          <div className="space-y-2">
            {visibleUsers.slice(0, 20).map((user) => {
              const selectedRole = normalizeRoleValue(roleDrafts[user.id] ?? user.role);
              const currentRole = normalizeRoleValue(user.role);
              const scopedRoleOptions = getRoleOptionsForUser(user.role);
              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-amber-950">{user.fullName}</p>
                    <p className="text-xs text-amber-900/70">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs"
                      value={selectedRole}
                      onChange={(event) =>
                        setRoleDrafts((prev) => ({
                          ...prev,
                          [user.id]: normalizeRoleValue(event.target.value)
                        }))
                      }
                    >
                      {scopedRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm"
                      onClick={() => handleSaveRole(user)}
                      disabled={updateRoleMutation.isPending || selectedRole === currentRole}
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <article className="sticker-card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Quản lý danh mục</h2>
          </div>

          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmitCategory}>
            <input
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Tên danh mục"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Slug (tùy chọn)"
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <select
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              value={categoryForm.gender}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, gender: event.target.value }))}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Ảnh đại diện (URL)"
              value={categoryForm.imageUrl}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            />
            <textarea
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm sm:col-span-2"
              placeholder="Mô tả"
              rows={2}
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <label className="inline-flex items-center gap-2 text-sm text-amber-900 sm:col-span-2">
              <input
                type="checkbox"
                checked={categoryForm.active}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Danh mục đang hoạt động
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                className="btn-primary"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {editingCategoryId == null ? 'Tạo danh mục' : 'Lưu cập nhật'}
              </button>
              {editingCategoryId != null ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingCategoryId(null);
                    setCategoryForm(emptyCategoryForm);
                  }}
                >
                  Hủy chỉnh sửa
                </button>
              ) : null}
            </div>
          </form>

          {categoryMessage ? <p className="text-xs text-amber-900/80">{categoryMessage}</p> : null}

          {categoriesLoading ? (
            <p className="text-sm text-amber-900/70">Đang tải danh mục...</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-amber-950">{category.name}</p>
                    <p className="text-xs text-amber-900/70">
                      {category.slug} · {category.gender.toUpperCase()} · {category.active ? 'active' : 'inactive'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm"
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setCategoryForm({
                          name: category.name,
                          slug: category.slug,
                          gender: category.gender.toUpperCase(),
                          description: category.description ?? '',
                          imageUrl: category.imageUrl ?? '',
                          active: Boolean(category.active)
                        });
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm"
                      onClick={() =>
                        toggleCategoryMutation.mutate({
                          id: category.id,
                          active: !category.active
                        })
                      }
                      disabled={toggleCategoryMutation.isPending}
                    >
                      {category.active ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="sticker-card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Cấu hình hệ thống</h2>
          </div>

          <form className="space-y-3" onSubmit={handleSaveSettings}>
            <input
              type="email"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Email CSKH"
              value={settingsForm.supportEmail}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, supportEmail: event.target.value }))}
            />
            <input
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Số hotline"
              value={settingsForm.supportPhone}
              onChange={(event) => setSettingsForm((prev) => ({ ...prev, supportPhone: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min={1}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Tự hủy đơn sau (giờ)"
                value={settingsForm.orderAutoCancelHours}
                onChange={(event) =>
                  setSettingsForm((prev) => ({ ...prev, orderAutoCancelHours: event.target.value }))
                }
              />
              <input
                type="number"
                min={1}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Giới hạn hoàn tiền (ngày)"
                value={settingsForm.maxRefundDays}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, maxRefundDays: event.target.value }))}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={settingsForm.allowManualRefund}
                onChange={(event) =>
                  setSettingsForm((prev) => ({ ...prev, allowManualRefund: event.target.checked }))
                }
              />
              Cho phép hoàn tiền thủ công
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-amber-900">
              <input
                type="checkbox"
                checked={settingsForm.maintenanceMode}
                onChange={(event) =>
                  setSettingsForm((prev) => ({ ...prev, maintenanceMode: event.target.checked }))
                }
              />
              Chế độ bảo trì (maintenance)
            </label>
            <button type="submit" className="btn-primary" disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </form>
          {settingsMessage ? <p className="text-xs text-amber-900/80">{settingsMessage}</p> : null}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <article className="sticker-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-800" />
              <h2 className="text-lg font-semibold text-amber-950">Báo cáo ngày</h2>
            </div>
            <select
              className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs"
              value={reportDays}
              onChange={(event) => setReportDays(Number(event.target.value))}
            >
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
            </select>
          </div>
          {reportsLoading ? (
            <p className="text-sm text-amber-900/70">Đang tải báo cáo...</p>
          ) : (
            <div className="space-y-2">
              {reports.map((point) => (
                <div
                  key={point.date}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs sm:grid-cols-5"
                >
                  <span className="font-semibold text-amber-950">{new Date(point.date).toLocaleDateString('vi-VN')}</span>
                  <span className="text-amber-900/75">Đơn: {point.totalOrders}</span>
                  <span className="text-amber-900/75">Đã thanh toán: {point.paidOrders}</span>
                  <span className="text-amber-900/75">Hoàn tiền: {point.refundedOrders}</span>
                  <span className="text-amber-950">{point.paidRevenue.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="sticker-card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-800" />
            <h2 className="text-lg font-semibold text-amber-950">Hoàn tiền đặc biệt</h2>
          </div>
          <p className="text-xs text-amber-900/70">
            Chính sách hiện tại: {settings?.allowManualRefund ? 'cho phép' : 'không cho phép'} hoàn tiền thủ công,
            giới hạn {settings?.maxRefundDays ?? '--'} ngày.
          </p>
          <form className="space-y-3" onSubmit={handleSubmitRefund}>
            <input
              type="number"
              min={1}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Mã đơn (ID)"
              value={refundForm.orderId}
              onChange={(event) => setRefundForm((prev) => ({ ...prev, orderId: event.target.value }))}
              required
            />
            <textarea
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              placeholder="Lý do hoàn tiền"
              rows={3}
              value={refundForm.reason}
              onChange={(event) => setRefundForm((prev) => ({ ...prev, reason: event.target.value }))}
              required
            />
            <button type="submit" className="btn-primary" disabled={refundMutation.isPending}>
              {refundMutation.isPending ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
            </button>
          </form>
          {refundMessage ? <p className="text-xs text-amber-900/80">{refundMessage}</p> : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-3">
            <p className="text-xs font-semibold text-amber-950">Đơn đã thanh toán gần đây</p>
            <div className="mt-2 space-y-1">
              {latestPaidOrders.length === 0 ? (
                <p className="text-xs text-amber-900/70">Không có đơn paid.</p>
              ) : (
                latestPaidOrders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-white px-2 py-1 text-left text-xs text-amber-900"
                    onClick={() => setRefundForm((prev) => ({ ...prev, orderId: String(order.id) }))}
                  >
                    <span>{order.orderNumber}</span>
                    <span>{order.total.toLocaleString('vi-VN')} đ</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default SellerControlCenterPage;
