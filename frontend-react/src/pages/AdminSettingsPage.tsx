import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type { UserProfile } from '../types/app';

const AdminSettingsPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: '',
    avatarUrl: '',
    emailNotificationEnabled: true,
    autoSyncEnabled: false
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? '',
      avatarUrl: profile.avatarUrl ?? profile.avatar ?? '',
      emailNotificationEnabled: profile.emailNotificationEnabled ?? true,
      autoSyncEnabled: profile.autoSyncEnabled ?? false
    });
  }, [
    profile?.autoSyncEnabled,
    profile?.avatar,
    profile?.avatarUrl,
    profile?.emailNotificationEnabled,
    profile?.fullName,
    profile?.id
  ]);

  const saveMutation = useMutation({
    mutationFn: () =>
      financeApi.updateProfile({
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl.trim() || undefined,
        emailNotificationEnabled: form.emailNotificationEnabled,
        autoSyncEnabled: form.autoSyncEnabled
      }),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      setStatusMessage('Đã lưu cấu hình tài khoản admin vào backend.');
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message || 'Không thể lưu cấu hình admin.');
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <section className="admin-hero-card">
        <p className="admin-badge">Cài đặt</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--admin-text)]">Tài khoản quản trị</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--admin-muted)]">
          Trang settings đã tách khỏi `AdminPage.tsx` và dùng endpoint `/api/user` thật để lưu tên, avatar và tùy chọn thông báo.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="admin-section space-y-5">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Thông tin hiển thị</h2>
            <p className="admin-section__description">Dữ liệu này đồng bộ với profile admin hiện tại.</p>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải hồ sơ admin...</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--admin-muted)]">
            Họ tên
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className="admin-input mt-2"
              placeholder="Admin Mộc Mầm"
              required
            />
          </label>
          <label className="text-sm text-[var(--admin-muted)]">
            Avatar URL
            <input
              value={form.avatarUrl}
              onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))}
              className="admin-input mt-2"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-3 text-sm text-[var(--admin-muted)] md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3">
            <input
              type="checkbox"
              checked={form.emailNotificationEnabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, emailNotificationEnabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-[var(--admin-border)]"
            />
            Nhận thông báo email hệ thống
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3">
            <input
              type="checkbox"
              checked={form.autoSyncEnabled}
              onChange={(event) => setForm((current) => ({ ...current, autoSyncEnabled: event.target.checked }))}
              className="h-4 w-4 rounded border-[var(--admin-border)]"
            />
            Tự đồng bộ dữ liệu dashboard
          </label>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm text-[var(--admin-text)]">
            {statusMessage}
          </div>
        ) : null}

        <button type="submit" className="admin-inline-button admin-focus-ring" disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
