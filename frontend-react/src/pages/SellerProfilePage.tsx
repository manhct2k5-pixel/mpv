import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { storeApi, financeApi } from '../services/api.ts';

const SellerProfilePage = () => {
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

  const localSettingsKey = profile?.id != null ? `seller-account-settings-${profile.id}` : 'seller-account-settings-guest';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(localSettingsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        bankForm?: typeof bankForm;
        notifyForm?: typeof notifyForm;
      };
      if (parsed.bankForm) {
        setBankForm(parsed.bankForm);
      }
      if (parsed.notifyForm) {
        setNotifyForm(parsed.notifyForm);
      }
    } catch {
      // ignore local parse errors
    }
  }, [localSettingsKey]);

  useEffect(() => {
    localStorage.setItem(
      localSettingsKey,
      JSON.stringify({
        bankForm,
        notifyForm
      })
    );
  }, [bankForm, localSettingsKey, notifyForm]);

  const mutation = useMutation({
    mutationFn: () =>
      storeApi.updateSellerProfile(Number(profile?.id), {
        storeName: formData.storeName.trim() || undefined,
        storeDescription: formData.storeDescription.trim() || undefined,
        storePhone: formData.storePhone.trim() || undefined,
        storeAddress: formData.storeAddress.trim() || undefined,
        storeLogoUrl: formData.storeLogoUrl.trim() || undefined
      }),
    onSuccess: () => {
      setStatusMessage('Đã cập nhật hồ sơ bán hàng.');
    },
    onError: (error: any) => {
      setStatusMessage(error?.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    }
  });

  const handleSaveLocalSettings = (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsMessage('Đã lưu thông tin nhận tiền và cài đặt thông báo cho cửa hàng.');
  };

  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setPasswordMessage('Mật khẩu mới cần tối thiểu 8 ký tự.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordMessage('Đã cập nhật mật khẩu thành công.');
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

      <form onSubmit={handleSaveLocalSettings} className="sticker-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-cocoa">Tài khoản ngân hàng nhận tiền</h2>
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

        <button type="submit" className="btn-secondary">
          Lưu cài đặt thanh toán & thông báo
        </button>
        {settingsMessage ? (
          <div className="rounded-2xl border border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/70">
            {settingsMessage}
          </div>
        ) : null}
      </form>

      <form onSubmit={handleChangePassword} className="sticker-card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-cocoa">Đổi mật khẩu</h2>
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
        <button type="submit" className="btn-secondary">
          Cập nhật mật khẩu
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
