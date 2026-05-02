import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, KeyRound, Lock, Plus, Save, Store, Unlock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, getApiErrorMessage } from '../services/api.ts';
import type { AdminUserInsight, BusinessRequest } from '../types/app';

const ROLE_OPTIONS = [
  { value: 'user', label: 'Customer' },
  { value: 'seller', label: 'Seller' },
  { value: 'warehouse', label: 'Staff' },
  { value: 'admin', label: 'Admin' }
];

const normalizeRole = (value?: string | null) => {
  const normalized = (value ?? '').toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '--');

const textOrDash = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '--';
};

const AdminUsersPage = () => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const { data: businessRequests = [], isLoading: requestsLoading, isError: requestsError } = useQuery<BusinessRequest[]>({
    queryKey: ['admin', 'business-requests'],
    queryFn: financeApi.businessRequests
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { id: number; role: string }) => financeApi.admin.updateUserRole(payload.id, payload.role),
    onSuccess: () => {
      setStatusMessage('Đã cập nhật vai trò tài khoản.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const lockMutation = useMutation({
    mutationFn: (payload: { email: string; highlight: boolean }) =>
      financeApi.admin.flagUser(payload.email, payload.highlight),
    onSuccess: (_saved, payload) => {
      setStatusMessage(payload.highlight ? 'Đã khóa tạm tài khoản (flagged).' : 'Đã mở khóa tài khoản.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const approveBusinessRequestMutation = useMutation({
    mutationFn: (id: number) => financeApi.approveBusinessRequest(id),
    onSuccess: (updated) => {
      setStatusMessage(`Đã duyệt ${updated.fullName ?? 'tài khoản'} thành seller.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error) => {
      setStatusMessage(getApiErrorMessage(error, 'Không thể duyệt yêu cầu seller.'));
    }
  });

  const rejectBusinessRequestMutation = useMutation({
    mutationFn: (id: number) => financeApi.rejectBusinessRequest(id),
    onSuccess: (updated) => {
      setStatusMessage(`Đã từ chối yêu cầu seller của ${updated.fullName ?? 'tài khoản'}.`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error) => {
      setStatusMessage(getApiErrorMessage(error, 'Không thể từ chối yêu cầu seller.'));
    }
  });

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const normalizedRole = normalizeRole(user.role);
      const matchesQuery =
        !normalizedQuery ||
        `${user.fullName} ${user.email} ${normalizedRole}`.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === 'all' || normalizedRole === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [query, roleFilter, users]);

  const pendingRequestEmails = useMemo(() => new Set(businessRequests.map((item) => item.email.toLowerCase())), [businessRequests]);
  const requestByEmail = useMemo(
    () => new Map(businessRequests.map((item) => [item.email.toLowerCase(), item])),
    [businessRequests]
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Quản lý người dùng</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Kiểm soát tài khoản hệ thống</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Theo dõi customer/seller, tìm kiếm nhanh, chỉnh vai trò, khóa/mở khóa và kiểm tra chi tiết hoạt động.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/staff" className="admin-inline-button admin-focus-ring">
            <Plus className="h-4 w-4" />
            Thêm tài khoản Staff
          </Link>
          <Link to="/admin/permissions" className="admin-inline-button admin-focus-ring">
            <KeyRound className="h-4 w-4" />
            Mở trang phân quyền
          </Link>
        </div>
      </section>

      {statusMessage ? <p className="text-xs text-emerald-700">{statusMessage}</p> : null}

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Yêu cầu mở gian hàng</h2>
            <p className="admin-section__description">
              Xem thông tin user và hồ sơ cửa hàng trước khi duyệt thành seller.
            </p>
          </div>
        </div>

        {requestsLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải yêu cầu seller...</p> : null}
        {requestsError ? <p className="text-sm text-rose-600">Không tải được danh sách yêu cầu seller.</p> : null}

        {!requestsLoading && !requestsError ? (
          businessRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm text-[var(--admin-muted)]">
              Không có yêu cầu mở gian hàng mới.
            </div>
          ) : (
            <div className="grid gap-3">
              {businessRequests.map((request) => {
                const isApproving =
                  approveBusinessRequestMutation.isPending && approveBusinessRequestMutation.variables === request.id;
                const isRejecting =
                  rejectBusinessRequestMutation.isPending && rejectBusinessRequestMutation.variables === request.id;
                const isBusy = approveBusinessRequestMutation.isPending || rejectBusinessRequestMutation.isPending;

                return (
                  <article
                    key={request.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                            <Store className="h-4 w-4 text-[var(--admin-primary-600)]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--admin-text)]">{request.fullName}</p>
                            <p className="text-xs text-[var(--admin-muted)]">{request.email}</p>
                            <p className="mt-1 text-xs text-[var(--admin-muted)]">
                              Role hiện tại: {normalizeRole(request.role) || '--'} · Gửi lúc: {formatDateTime(request.requestedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 text-xs text-[var(--admin-muted)] md:grid-cols-2">
                          <p>
                            <span className="font-semibold text-[var(--admin-text)]">Tên cửa hàng: </span>
                            {textOrDash(request.storeName)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--admin-text)]">SĐT cửa hàng: </span>
                            {textOrDash(request.storePhone)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--admin-text)]">Địa chỉ lấy hàng: </span>
                            {textOrDash(request.storeAddress)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--admin-text)]">Ngày tạo user: </span>
                            {formatDateTime(request.createdAt)}
                          </p>
                          <p className="md:col-span-2">
                            <span className="font-semibold text-[var(--admin-text)]">Mô tả cửa hàng: </span>
                            {textOrDash(request.storeDescription)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          className="admin-action-button success"
                          disabled={isBusy}
                          onClick={() => approveBusinessRequestMutation.mutate(request.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isApproving ? 'Đang duyệt...' : 'Duyệt seller'}
                        </button>
                        <button
                          type="button"
                          className="admin-action-button danger"
                          disabled={isBusy}
                          onClick={() => rejectBusinessRequestMutation.mutate(request.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          {isRejecting ? 'Đang từ chối...' : 'Từ chối'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách tài khoản</h2>
            <p className="admin-section__description">
              Chờ duyệt seller: <strong>{businessRequests.length}</strong> tài khoản.
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-[1fr,220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo tên, email, vai trò..."
          />
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="admin-select">
            <option value="all">Mọi vai trò</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {usersLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách người dùng...</p> : null}
        {usersError ? <p className="text-sm text-rose-600">Không tải được danh sách người dùng.</p> : null}

        {!usersLoading && !usersError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã tài khoản</th>
                  <th>Họ tên / Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const normalizedRole = normalizeRole(user.role);
                  const draftRole = normalizeRole(roleDrafts[user.id] ?? user.role);
                  const isLocked = (user.flagged ?? 0) > 0;
                  const isUpdatingRole =
                    updateRoleMutation.isPending && updateRoleMutation.variables?.id === user.id;
                  const isUpdatingLock =
                    lockMutation.isPending && lockMutation.variables?.email?.toLowerCase() === user.email.toLowerCase();
                  const pendingRequest = requestByEmail.get(user.email.toLowerCase());

                  return (
                    <tr key={user.id}>
                      <td>USR-{user.id}</td>
                      <td>
                        <div className="space-y-1">
                          <p className="font-medium text-[var(--admin-text)]">{user.fullName}</p>
                          <p className="text-xs text-[var(--admin-muted)]">{user.email}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <select
                            value={draftRole}
                            onChange={(event) =>
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [user.id]: normalizeRole(event.target.value)
                              }))
                            }
                            className="admin-select"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="admin-inline-button"
                            disabled={isUpdatingRole || draftRole === normalizedRole}
                            onClick={() => updateRoleMutation.mutate({ id: user.id, role: draftRole })}
                          >
                            <Save className="h-4 w-4" />
                            {isUpdatingRole ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-badge ${isLocked ? 'warning' : ''}`}>
                          {isLocked ? 'Tạm khóa' : 'Hoạt động'}
                        </span>
                        {pendingRequestEmails.has(user.email.toLowerCase()) ? (
                          <p className="mt-1 text-[11px] text-amber-700">Đang chờ duyệt seller</p>
                        ) : null}
                      </td>
                      <td>{formatDateTime(user.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="admin-action-button success"
                            onClick={() => setExpandedUserId((prev) => (prev === user.id ? null : user.id))}
                          >
                            <Eye className="h-4 w-4" />
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className={`admin-action-button ${isLocked ? 'success' : 'danger'}`}
                            disabled={isUpdatingLock}
                            onClick={() => lockMutation.mutate({ email: user.email, highlight: !isLocked })}
                          >
                            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {isUpdatingLock ? 'Đang cập nhật...' : isLocked ? 'Mở khóa' : 'Khóa'}
                          </button>
                          <button
                            type="button"
                            className="admin-inline-button"
                            onClick={() => setStatusMessage(`Đã gửi yêu cầu reset mật khẩu cho ${user.email} (demo).`)}
                          >
                            <KeyRound className="h-4 w-4" />
                            Reset mật khẩu
                          </button>
                        </div>
                        {expandedUserId === user.id ? (
                          <div className="mt-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs text-[var(--admin-muted)]">
                            <p>Tổng giao dịch: {user.totalTransactions}</p>
                            <p>Ngân sách đang có: {user.budgets}</p>
                            <p>Số lần bị cảnh báo: {user.flagged}</p>
                            {pendingRequest ? (
                              <>
                                <p className="mt-2 font-semibold text-[var(--admin-text)]">Hồ sơ seller đang chờ duyệt</p>
                                <p>Cửa hàng: {textOrDash(pendingRequest.storeName)}</p>
                                <p>SĐT: {textOrDash(pendingRequest.storePhone)}</p>
                                <p>Địa chỉ lấy hàng: {textOrDash(pendingRequest.storeAddress)}</p>
                                <p>Mô tả: {textOrDash(pendingRequest.storeDescription)}</p>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}

                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có tài khoản phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AdminUsersPage;
