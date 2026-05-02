import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi, financeApi } from '../services/api.ts';

const SellerProfilePage = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });

  const role = (profile?.role ?? '').toLowerCase();
  const canManage = role === 'admin' || role === 'seller';

  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    storePhone: '',
    storeAddress: '',
    storeLogoUrl: ''
  });
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: ''
  });
  const [notifyForm, setNotifyForm] = useState({
    orderNotifications: true,
    marketingNotifications: false,
    operationAlerts: true
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFormData({
      storeName: profile.storeName ?? '',
      storeDescription: profile.storeDescription ?? '',
      storePhone: profile.storePhone ?? '',
      storeAddress: profile.storeAddress ?? '',
      storeLogoUrl: profile.storeLogoUrl ?? ''
    });
    setBankForm({
      bankName: profile.sellerBankName ?? '',
      accountName: profile.sellerBankAccountName ?? '',
      accountNumber: profile.sellerBankAccountNumber ?? ''
    });
    setNotifyForm({
      orderNotifications: profile.sellerOrderNotificationsEnabled ?? true,
      marketingNotifications: profile.sellerMarketingNotificationsEnabled ?? false,
      operationAlerts: profile.sellerOperationAlertsEnabled ?? true
    });
  }, [
    profile?.id,
    profile?.sellerBankAccountName,
    profile?.sellerBankAccountNumber,
    profile?.sellerBankName,
    profile?.sellerMarketingNotificationsEnabled,
    profile?.sellerOperationAlertsEnabled,
    profile?.sellerOrderNotificationsEnabled,
    profile?.storeAddress,
    profile?.storeDescription,
    profile?.storeLogoUrl,
    profile?.storeName,
    profile?.storePhone
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      storeApi.updateSellerProfile(Number(profile?.id), {
        storeName: formData.storeName.trim() || undefined,
        storeDescription: formData.storeDescription.trim() || undefined,
        storePhone: formData.storePhone.trim() || undefined,
        storeAddress: formData.storeAddress.trim() || undefined,
        storeLogoUrl: formData.storeLogoUrl.trim() || undefined
      }),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], (current: typeof profile | undefined) =>
        current
          ? {
              ...current,
              storeName: updatedProfile.storeName ?? null,
              storeDescription: updatedProfile.storeDescription ?? null,
              storePhone: updatedProfile.storePhone ?? null,
              storeAddress: updatedProfile.storeAddress ?? null,
              storeLogoUrl: updatedProfile.storeLogoUrl ?? null
            }
          : current
      );
      setFormData({
        storeName: updatedProfile.storeName ?? '',
        storeDescription: updatedProfile.storeDescription ?? '',
        storePhone: updatedProfile.storePhone ?? '',
        storeAddress: updatedProfile.storeAddress ?? '',
        storeLogoUrl: updatedProfile.storeLogoUrl ?? ''
      });
      setStatusMessage('Đã cập nhật hồ sơ bán hàng.');
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    }
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      storeApi.updateSellerProfile(Number(profile?.id), {
        sellerBankName: bankForm.bankName.trim() || null,
        sellerBankAccountName: bankForm.accountName.trim() || null,
        sellerBankAccountNumber: bankForm.accountNumber.trim() || null,
        sellerOrderNotificationsEnabled: notifyForm.orderNotifications,
        sellerMarketingNotificationsEnabled: notifyForm.marketingNotifications,
        sellerOperationAlertsEnabled: notifyForm.operationAlerts
      }),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], (current: typeof profile | undefined) =>
        current
          ? {
              ...current,
              sellerBankName: updatedProfile.sellerBankName ?? null,
              sellerBankAccountName: updatedProfile.sellerBankAccountName ?? null,
              sellerBankAccountNumber: updatedProfile.sellerBankAccountNumber ?? null,
              sellerOrderNotificationsEnabled: updatedProfile.sellerOrderNotificationsEnabled ?? true,
              sellerMarketingNotificationsEnabled: updatedProfile.sellerMarketingNotificationsEnabled ?? false,
              sellerOperationAlertsEnabled: updatedProfile.sellerOperationAlertsEnabled ?? true
            }
          : current
      );
      setSettingsMessage('Đã lưu cài đặt thanh toán & thông báo vào database.');
    },
    onError: (error: any) => {
      setSettingsMessage(error?.response?.data?.message || 'Không thể lưu cài đặt seller.');
    }
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      financeApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }),
    onSuccess: () => {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordMessage('Đã cập nhật mật khẩu.');
    },
    onError: (error: any) => {
      setPasswordMessage(error?.response?.data?.message || 'Không thể cập nhật mật khẩu.');
    }
  });

  const handleSaveSettings = (event: FormEvent) => {
    event.preventDefault();
    setSettingsMessage(null);
    settingsMutation.mutate();
  };

  const handleChangePassword = (event: FormEvent) => {
    event.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setPasswordMessage('Mật khẩu mới cần tối thiểu 8 ký tự.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setPasswordMessage(null);
    passwordMutation.mutate();
  };

  if (!canManage) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Bạn không có quyền cập nhật hồ sơ bán hàng.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-2 p-6 sm:p-8">
        <h1 className="font-display text-3xl text-mocha">Hồ sơ gian hàng</h1>
        <p className="text-sm text-cocoa/70">Cập nhật thông tin giới thiệu cho gian hàng của bạn.</p>
        <p className="rounded-2xl border border-caramel/30 bg-white/80 px-4 py-3 text-xs text-cocoa/65">
          Khung hồ sơ này đồng bộ trực tiếp với dữ liệu seller trong backend.
        </p>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setStatusMessage(null);
          mutation.mutate();
        }}
        className="sticker-card space-y-4 p-6"
      >
        <label className="text-sm text-cocoa/70">
          Tên gian hàng
          <input
            value={formData.storeName}
            onChange={(event) => setFormData((prev) => ({ ...prev, storeName: event.target.value }))}
            className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
        </label>
        <label className="text-sm text-cocoa/70">
          Mô tả
          <textarea
            value={formData.storeDescription}
            onChange={(event) => setFormData((prev) => ({ ...prev, storeDescription: event.target.value }))}
            rows={3}
            className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-cocoa/70">
            Số điện thoại
            <input
              value={formData.storePhone}
              onChange={(event) => setFormData((prev) => ({ ...prev, storePhone: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Địa chỉ
            <input
              value={formData.storeAddress}
              onChange={(event) => setFormData((prev) => ({ ...prev, storeAddress: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
        </div>
        <label className="text-sm text-cocoa/70">
          Logo (URL)
          <input
            value={formData.storeLogoUrl}
            onChange={(event) => setFormData((prev) => ({ ...prev, storeLogoUrl: event.target.value }))}
            className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        {statusMessage && (
          <div className="rounded-2xl border border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/70">
            {statusMessage}
          </div>
        )}
      </form>

      <form onSubmit={handleSaveSettings} className="sticker-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-cocoa">Tài khoản ngân hàng nhận tiền</h2>
        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-800">
          Dữ liệu ngân hàng và cài đặt thông báo được đồng bộ qua API seller profile, không còn lưu localStorage.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-cocoa/70">
            Ngân hàng
            <input
              value={bankForm.bankName}
              onChange={(event) => setBankForm((prev) => ({ ...prev, bankName: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              placeholder="Vietcombank"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Chủ tài khoản
            <input
              value={bankForm.accountName}
              onChange={(event) => setBankForm((prev) => ({ ...prev, accountName: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              placeholder="NGUYEN VAN A"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Số tài khoản
            <input
              value={bankForm.accountNumber}
              onChange={(event) => setBankForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              placeholder="0123456789"
            />
          </label>
        </div>

        <h3 className="text-base font-semibold text-cocoa">Cài đặt thông báo</h3>
        <div className="grid gap-2 text-sm text-cocoa/70">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifyForm.orderNotifications}
              onChange={(event) => setNotifyForm((prev) => ({ ...prev, orderNotifications: event.target.checked }))}
              className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            />
            Nhận thông báo đơn hàng mới
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifyForm.operationAlerts}
              onChange={(event) => setNotifyForm((prev) => ({ ...prev, operationAlerts: event.target.checked }))}
              className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            />
            Nhận cảnh báo vận hành / khiếu nại
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifyForm.marketingNotifications}
              onChange={(event) => setNotifyForm((prev) => ({ ...prev, marketingNotifications: event.target.checked }))}
              className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            />
            Nhận thông tin khuyến mãi hệ thống
          </label>
        </div>

        <button type="submit" className="btn-secondary" disabled={settingsMutation.isPending}>
          {settingsMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt thanh toán & thông báo'}
        </button>
        {settingsMessage ? (
          <div className="rounded-2xl border border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/70">
            {settingsMessage}
          </div>
        ) : null}
      </form>

      <form onSubmit={handleChangePassword} className="sticker-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-cocoa">Đổi mật khẩu</h2>
        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-800">
          Luồng đổi mật khẩu gọi API backend và kiểm tra mật khẩu hiện tại trước khi cập nhật.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-cocoa/70">
            Mật khẩu hiện tại
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Xác nhận mật khẩu mới
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
        </div>
        <button type="submit" className="btn-secondary" disabled={passwordMutation.isPending}>
          {passwordMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
        {passwordMessage ? (
          <div className="rounded-2xl border border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/70">
            {passwordMessage}
          </div>
        ) : null}
      </form>
    </div>
  );
};

export default SellerProfilePage;
