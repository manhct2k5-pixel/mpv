import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Lock, Save, Unlock, UserPlus } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type { AdminUserInsight } from '../types/app';

const normalizeRole = (value?: string | null) => {
  const normalized = (value ?? '').toLowerCase();
  return normalized === 'styles' ? 'warehouse' : normalized;
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '--');

const AdminStaffPage = () => {
  const queryClient = useQueryClient();
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'warehouse',
    department: 'Vận hành'
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<number, string>>({});

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const createStaffMutation = useMutation({
    mutationFn: (payload: { fullName: string; email: string; password: string; role: string }) =>
      financeApi.admin.createStaffAccount(payload),
    onSuccess: () => {
      setStatusMessage('Đã tạo tài khoản Staff thành công.');
      setStaffForm({
        fullName: '',
        email: '',
        password: '',
        role: 'warehouse',
        department: 'Vận hành'
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không thể tạo Staff.');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { id: number; role: string }) => financeApi.admin.updateUserRole(payload.id, payload.role),
    onSuccess: () => {
      setStatusMessage('Đã cập nhật quyền Staff.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const lockMutation = useMutation({
    mutationFn: (payload: { email: string; highlight: boolean }) =>
      financeApi.admin.flagUser(payload.email, payload.highlight),
    onSuccess: (_saved, payload) => {
      setStatusMessage(payload.highlight ? 'Đã khóa tạm tài khoản Staff.' : 'Đã mở khóa tài khoản Staff.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const staffUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const role = normalizeRole(user.role);
      if (role !== 'warehouse') return false;
      if (!query) return true;
      return `${user.fullName} ${user.email} ${role}`.toLowerCase().includes(query);
    });
  }, [users, searchQuery]);

  const handleCreateStaff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    createStaffMutation.mutate({
      fullName: staffForm.fullName.trim(),
      email: staffForm.email.trim(),
      password: staffForm.password,
      role: staffForm.role
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Quản lý Staff</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Tạo và vận hành tài khoản nhân viên</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Quản lý account staff theo bộ phận, khóa/mở khóa tài khoản và kiểm soát quyền thực thi.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Tạo tài khoản Staff</h2>
            <p className="admin-section__description">Thông tin Staff được tạo bởi Admin với mật khẩu tạm thời.</p>
          </div>
        </div>

        <form onSubmit={handleCreateStaff} className="grid gap-2 lg:grid-cols-6">
          <input
            value={staffForm.fullName}
            onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="admin-input lg:col-span-2"
            placeholder="Họ tên"
          />
          <input
            type="email"
            value={staffForm.email}
            onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
            className="admin-input lg:col-span-2"
            placeholder="Email / username"
          />
          <input
            type="password"
            value={staffForm.password}
            onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
            className="admin-input"
            placeholder="Mật khẩu tạm"
          />
          <select
            value={staffForm.department}
            onChange={(event) => setStaffForm((prev) => ({ ...prev, department: event.target.value }))}
            className="admin-select"
          >
            <option value="Vận hành">Vận hành</option>
            <option value="CSKH">CSKH</option>
            <option value="Kho">Kho</option>
          </select>
          <button
            type="submit"
            className="admin-action-button success lg:col-span-2"
            disabled={
              createStaffMutation.isPending ||
              !staffForm.fullName.trim() ||
              !staffForm.email.trim() ||
              !staffForm.password.trim()
            }
          >
            <UserPlus className="h-4 w-4" />
            {createStaffMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản Staff'}
          </button>
        </form>
        {statusMessage ? <p className="mt-3 text-xs text-emerald-700">{statusMessage}</p> : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách Staff</h2>
            <p className="admin-section__description">Theo dõi quyền hạn, trạng thái hoạt động và thao tác bảo trì tài khoản.</p>
          </div>
        </div>

        <div className="mb-4">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm staff theo tên hoặc email..."
          />
        </div>

        {usersLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách staff...</p> : null}
        {usersError ? <p className="text-sm text-rose-600">Không tải được danh sách staff.</p> : null}
        {!usersLoading && !usersError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã nhân viên</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Bộ phận</th>
                  <th>Quyền hạn</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((user) => {
                  const isLocked = (user.flagged ?? 0) > 0;
                  const draftDepartment = departmentDrafts[user.id] ?? 'Vận hành';
                  const isUpdatingLock =
                    lockMutation.isPending && lockMutation.variables?.email?.toLowerCase() === user.email.toLowerCase();

                  return (
                    <tr key={user.id}>
                      <td>STF-{user.id}</td>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={draftDepartment}
                          onChange={(event) =>
                            setDepartmentDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value
                            }))
                          }
                          className="admin-select"
                        >
                          <option value="Vận hành">Vận hành</option>
                          <option value="CSKH">CSKH</option>
                          <option value="Kho">Kho</option>
                        </select>
                      </td>
                      <td>
                        <span className="admin-status-badge">Staff/Vận hành</span>
                      </td>
                      <td>
                        <span className={`admin-status-badge ${isLocked ? 'warning' : ''}`}>
                          {isLocked ? 'Tạm khóa' : 'Đang hoạt động'}
                        </span>
                        <p className="mt-1 text-[11px] text-[var(--admin-muted)]">{formatDateTime(user.createdAt)}</p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="admin-inline-button"
                            onClick={() => updateRoleMutation.mutate({ id: user.id, role: 'warehouse' })}
                          >
                            <Save className="h-4 w-4" />
                            Gán bộ phận
                          </button>
                          <button
                            type="button"
                            className={`admin-action-button ${isLocked ? 'success' : 'danger'}`}
                            disabled={isUpdatingLock}
                            onClick={() => lockMutation.mutate({ email: user.email, highlight: !isLocked })}
                          >
                            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {isLocked ? 'Mở khóa' : 'Khóa'}
                          </button>
                          <button
                            type="button"
                            className="admin-inline-button"
                            onClick={() => setStatusMessage(`Đã gửi reset mật khẩu cho ${user.email} (demo).`)}
                          >
                            <KeyRound className="h-4 w-4" />
                            Reset mật khẩu
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có Staff phù hợp.
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

export default AdminStaffPage;
