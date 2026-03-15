import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type { AdminUserInsight } from '../types/app';

const ROLE_PERMISSION_MATRIX = [
  {
    role: 'admin',
    title: 'Admin/System Admin',
    description: 'Toàn quyền quản trị hệ thống',
    permissions: [
      'Quản lý người dùng',
      'Quản lý staff',
      'Quản lý danh mục',
      'Giám sát đơn hàng',
      'Xử lý hoàn tiền',
      'Xem báo cáo',
      'Xem nhật ký hệ thống'
    ]
  },
  {
    role: 'warehouse',
    title: 'Staff/Vận hành',
    description: 'Xử lý đơn và hỗ trợ vận hành',
    permissions: ['Giám sát đơn hàng', 'Xử lý ticket', 'Xem báo cáo giới hạn']
  },
  {
    role: 'seller',
    title: 'Seller/Merchant',
    description: 'Quản lý cửa hàng và đơn bán',
    permissions: ['Quản lý sản phẩm', 'Xử lý đơn bán', 'Xem báo cáo seller']
  },
  {
    role: 'user',
    title: 'Customer/Buyer',
    description: 'Mua sắm và theo dõi đơn cá nhân',
    permissions: ['Xem sản phẩm', 'Đặt đơn', 'Theo dõi đơn']
  }
];

const normalizeRole = (value?: string | null) => {
  const normalized = (value ?? '').toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const ROLE_OPTIONS = [
  { value: 'user', label: 'Customer' },
  { value: 'seller', label: 'Seller' },
  { value: 'warehouse', label: 'Staff' },
  { value: 'admin', label: 'Admin' }
];

const AdminPermissionsPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: users = [], isLoading, isError } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { id: number; role: string }) => financeApi.admin.updateUserRole(payload.id, payload.role),
    onSuccess: () => {
      setStatusMessage('Đã cập nhật phân quyền tài khoản.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(q));
  }, [searchQuery, users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user) => {
      const role = normalizeRole(user.role);
      counts[role] = (counts[role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Phân quyền</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Ma trận vai trò và quyền truy cập</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Gán quyền theo vai trò, kiểm soát phạm vi truy cập và theo dõi thành viên thuộc từng nhóm quyền.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bảng vai trò & quyền</h2>
            <p className="admin-section__description">Tổng hợp nhóm quyền theo chức năng nghiệp vụ.</p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {ROLE_PERMISSION_MATRIX.map((role) => (
            <article key={role.role} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--admin-text)]">{role.title}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{role.description}</p>
                </div>
                <span className="admin-status-badge">{roleCounts[role.role] ?? 0} người</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span key={permission} className="admin-inline-button is-active">
                    {permission}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Gán quyền theo tài khoản</h2>
            <p className="admin-section__description">Cập nhật role trực tiếp cho admin/staff/seller/customer.</p>
          </div>
        </div>
        <div className="mb-4">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo tên hoặc email..."
          />
        </div>
        {statusMessage ? <p className="mb-3 text-xs text-emerald-700">{statusMessage}</p> : null}
        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải dữ liệu phân quyền...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được danh sách tài khoản.</p> : null}
        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Email</th>
                  <th>Vai trò hiện tại</th>
                  <th>Vai trò mới</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const currentRole = normalizeRole(user.role);
                  const draftRole = normalizeRole(roleDrafts[user.id] ?? user.role);
                  const isUpdating = updateRoleMutation.isPending && updateRoleMutation.variables?.id === user.id;
                  return (
                    <tr key={user.id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="admin-status-badge">{currentRole}</span>
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-action-button success"
                          disabled={isUpdating || draftRole === currentRole}
                          onClick={() => updateRoleMutation.mutate({ id: user.id, role: draftRole })}
                        >
                          {isUpdating ? <ShieldCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                          {isUpdating ? 'Đang lưu...' : 'Lưu phân quyền'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có tài khoản phù hợp.
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

export default AdminPermissionsPage;
