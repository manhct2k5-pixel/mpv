import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const StaffProfilePage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Hồ sơ nhân viên</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Thông tin tài khoản staff</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Quản lý thông tin cá nhân, tùy chọn nhận thông báo nội bộ và đăng xuất khỏi phiên làm việc.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Thông tin cá nhân</h2>
              <p className="admin-section__description">Dữ liệu đồng bộ theo tài khoản đăng nhập hiện tại.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-[var(--admin-muted)]">
            <p>
              Họ tên: <span className="font-semibold text-[var(--admin-text)]">{profile?.fullName ?? '--'}</span>
            </p>
            <p>
              Email: <span className="font-semibold text-[var(--admin-text)]">{profile?.email ?? '--'}</span>
            </p>
            <p>
              Vai trò: <span className="font-semibold text-[var(--admin-text)]">{String(profile?.role ?? '--')}</span>
            </p>
          </div>
        </article>

        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Đổi mật khẩu (mô phỏng)</h2>
              <p className="admin-section__description">Có thể nối API đổi mật khẩu khi backend sẵn sàng.</p>
            </div>
          </div>
          <div className="space-y-2">
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="admin-input"
              placeholder="Mật khẩu hiện tại"
            />
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="admin-input"
              placeholder="Mật khẩu mới"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="admin-inline-button"
                onClick={() => {
                  setStatusMessage('Đã lưu yêu cầu đổi mật khẩu (demo).');
                  setPasswordForm({ currentPassword: '', newPassword: '' });
                }}
              >
                Lưu thay đổi
              </button>
              <button type="button" className="admin-action-button danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
            {statusMessage ? <p className="text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
};

export default StaffProfilePage;
