import { useEffect, useState } from 'react';
import { Crown, Headphones, LogOut, MapPin, ShieldCheck, ShoppingBag, Store, Truck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { toBusinessRoleLabel } from '../constants/roles';
import {
  getSellerBusinessRequestValidationMessage,
  normalizeSellerBusinessRequestPayload
} from '../utils/sellerApplication.ts';

const AccountPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [businessRequestMessage, setBusinessRequestMessage] = useState<string | null>(null);
  const [hydratedBusinessRequestProfileId, setHydratedBusinessRequestProfileId] = useState<string | null>(null);
  const [businessRequestForm, setBusinessRequestForm] = useState({
    storeName: '',
    storePhone: '',
    storeAddress: '',
    storeDescription: ''
  });

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isCustomer = role === 'user';
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isWarehouse = role === 'warehouse';
  const isStaff = isWarehouse;

  const roleLabel = toBusinessRoleLabel(role);
  const businessRequestPending = Boolean(profile?.businessRequestPending);

  useEffect(() => {
    if (!profile || hydratedBusinessRequestProfileId === profile.id) {
      return;
    }
    setBusinessRequestForm({
      storeName: profile.storeName ?? '',
      storePhone: profile.storePhone ?? '',
      storeAddress: profile.storeAddress ?? '',
      storeDescription: profile.storeDescription ?? ''
    });
    setHydratedBusinessRequestProfileId(profile.id);
  }, [profile, hydratedBusinessRequestProfileId]);

  const requestBusinessAccessMutation = useMutation({
    mutationFn: financeApi.requestBusinessAccess,
    onSuccess: () => {
      setBusinessRequestMessage(
        businessRequestPending
          ? 'Đã cập nhật hồ sơ seller đang chờ duyệt. Admin sẽ xem thông tin mới của bạn.'
          : 'Đã gửi yêu cầu trở thành người bán. Admin sẽ duyệt tài khoản của bạn sớm.'
      );
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      setBusinessRequestMessage(error.response?.data?.message ?? 'Không thể gửi yêu cầu mở gian hàng.');
    }
  });

  const businessRequestValidationMessage = getSellerBusinessRequestValidationMessage(businessRequestForm);

  const handleLogout = async () => {
    try {
      await financeApi.logout();
    } catch {
      // JWT stateless logout still works on client side
    }
    logout();
    navigate('/');
  };

  const handleBusinessRequestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setBusinessRequestMessage(null);

    if (businessRequestValidationMessage) {
      setBusinessRequestMessage(businessRequestValidationMessage);
      return;
    }

    requestBusinessAccessMutation.mutate(normalizeSellerBusinessRequestPayload(businessRequestForm));
  };

  const primaryWorkspace = isAdmin
    ? { to: '/admin', label: 'Trang chủ admin', icon: ShieldCheck }
    : isStaff
      ? { to: '/staff', label: 'Trang chủ nhân viên', icon: Truck }
      : { to: '/seller', label: 'Trang chủ seller', icon: Store };
  const secondaryWorkspaceLinks = isAdmin ? [{ to: '/seller', label: 'Trang chủ seller', icon: Store }] : [];
  const PrimaryWorkspaceIcon = primaryWorkspace.icon;

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-8 text-center text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-8 text-center text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được thông tin tài khoản. Phiên đăng nhập có thể đã hết hạn hoặc backend chưa chạy.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn-secondary !border-rose-200/80 !bg-white/90"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
          <button type="button" className="btn-primary" onClick={handleLogout}>
            Đăng nhập lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10 sm:space-y-7">
      <section className="grid gap-5 rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:grid-cols-[96px,1fr] sm:items-center sm:gap-6 sm:p-7 lg:p-8">
        <div className="grid h-24 w-24 place-items-center rounded-[26px] border border-rose-200/80 bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.16)]">
          <UserRound className="h-10 w-10 text-mocha" />
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Tài khoản</p>
            <h1 className="font-display text-2xl leading-tight text-mocha sm:text-3xl">{profile.fullName}</h1>
            <p className="text-sm text-cocoa/70">{profile.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">Vai trò: {roleLabel}</span>
            {isCustomer && <span className="tag !border-rose-200/80 !bg-white/90">Khách mua hàng</span>}
            {isSeller && <span className="tag !border-rose-200/80 !bg-white/90">Seller/Merchant</span>}
            {isStaff && <span className="tag !border-rose-200/80 !bg-white/90">Staff/Vận hành</span>}
            {isAdmin && <span className="tag !border-rose-200/80 !bg-white/90">Admin</span>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex min-h-[220px] flex-col justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/92 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-6">
          {isCustomer ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    <ShoppingBag className="h-5 w-5 text-mocha" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Chức năng khách hàng</p>
                    <p className="text-xs text-cocoa/60">
                      Xem/tìm sản phẩm, quản lý giỏ hàng và theo dõi đơn hàng cá nhân.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Mua sắm
                  </Link>
                  <Link
                    to="/ho-tro?partner=warehouse"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  >
                    CSKH
                  </Link>
                  <Link
                    to="/ho-tro/yeu-cau"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  >
                    Hỗ trợ & đổi trả
                  </Link>
                  <Link to="/gio-hang" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Giỏ hàng
                  </Link>
                  <Link to="/tai-khoan/dia-chi" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Sổ địa chỉ
                  </Link>
                  <Link to="/don-hang" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Đơn hàng
                  </Link>
                  <Link to="/yeu-thich" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Yêu thích
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary !border-rose-200/80 !bg-white/90"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    <Store className="h-5 w-5 text-mocha" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Khu vực vận hành</p>
                    <p className="text-xs text-cocoa/60">
                      Vai trò hiện tại thuộc nhóm quản trị/vận hành. Vui lòng vào workspace tương ứng để xử lý nghiệp vụ.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary !border-rose-200/80 !bg-white/90"
                onClick={() => navigate(primaryWorkspace.to)}
              >
                <PrimaryWorkspaceIcon className="h-4 w-4" />
                {primaryWorkspace.label}
              </button>
              {secondaryWorkspaceLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {secondaryWorkspaceLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex min-h-[220px] flex-col justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/92 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-6">
          {isCustomer ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    <Headphones className="h-5 w-5 text-mocha" />
                  </div>
                  <p className="text-sm font-semibold text-cocoa">Tiện ích tài khoản</p>
                </div>
                <p className="text-xs text-cocoa/60">
                  Lưu địa chỉ giao hàng, theo dõi hậu mãi và quay lại những mục bạn đã lưu nhanh hơn.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['Đơn hàng', 'Sổ địa chỉ', 'Hỗ trợ sau mua', 'Yêu thích'].map((item) => (
                    <span key={item} className="tag !border-rose-200/80 !bg-white/90">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/don-hang" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                  Theo dõi đơn hàng
                </Link>
                <Link to="/ho-tro/yeu-cau" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                  Hỗ trợ sau mua
                </Link>
              </div>
              <div className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-white/90">
                    <Store className="h-5 w-5 text-mocha" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Mở gian hàng bán hàng</p>
                    <p className="text-xs text-cocoa/60">
                      Điền đủ hồ sơ gian hàng để gửi yêu cầu seller ngay từ tài khoản hiện tại.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {businessRequestPending ? (
                    <span className="tag !border-amber-200 !bg-white/90 text-amber-700">Yêu cầu đang chờ duyệt</span>
                  ) : null}
                  <span className="text-[11px] text-cocoa/55">
                    {businessRequestPending
                      ? 'Bạn vẫn có thể cập nhật thêm thông tin trong lúc chờ duyệt.'
                      : 'Thiếu một mục là chưa gửi yêu cầu được.'}
                  </span>
                </div>
                <form onSubmit={handleBusinessRequestSubmit} className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-cocoa">
                      Tên cửa hàng
                      <input
                        value={businessRequestForm.storeName}
                        onChange={(event) =>
                          setBusinessRequestForm((prev) => ({ ...prev, storeName: event.target.value }))
                        }
                        required
                        className="mt-1.5 w-full rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-2.5 text-sm text-cocoa"
                        placeholder="Mộc Mầm Boutique"
                      />
                    </label>
                    <label className="text-xs font-medium text-cocoa">
                      Số điện thoại cửa hàng
                      <input
                        value={businessRequestForm.storePhone}
                        onChange={(event) =>
                          setBusinessRequestForm((prev) => ({ ...prev, storePhone: event.target.value }))
                        }
                        required
                        className="mt-1.5 w-full rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-2.5 text-sm text-cocoa"
                        placeholder="0901234567"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-cocoa">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-mocha/70" />
                      Địa chỉ lấy hàng
                    </span>
                    <input
                      value={businessRequestForm.storeAddress}
                      onChange={(event) =>
                        setBusinessRequestForm((prev) => ({ ...prev, storeAddress: event.target.value }))
                      }
                      required
                      className="mt-1.5 w-full rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-2.5 text-sm text-cocoa"
                      placeholder="12 Nguyễn Huệ, Quận 1, TP.HCM"
                    />
                  </label>
                  <label className="block text-xs font-medium text-cocoa">
                    Mô tả cửa hàng
                    <textarea
                      rows={3}
                      value={businessRequestForm.storeDescription}
                      onChange={(event) =>
                        setBusinessRequestForm((prev) => ({ ...prev, storeDescription: event.target.value }))
                      }
                      required
                      className="mt-1.5 w-full rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-3 text-sm text-cocoa"
                      placeholder="Bán thời trang công sở, casual hoặc phụ kiện chủ lực của gian hàng."
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                    disabled={requestBusinessAccessMutation.isPending}
                  >
                    <Store className="h-4 w-4" />
                    {requestBusinessAccessMutation.isPending
                      ? 'Đang gửi...'
                      : businessRequestPending
                        ? 'Cập nhật hồ sơ seller'
                        : 'Đăng ký thành người bán'}
                  </button>
                </form>
                {businessRequestMessage ? (
                  <p className="mt-3 text-xs text-cocoa/70">{businessRequestMessage}</p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    {isAdmin ? <ShieldCheck className="h-5 w-5 text-mocha" /> : <Crown className="h-5 w-5 text-mocha" />}
                  </div>
                  <p className="text-sm font-semibold text-cocoa">Tài khoản nội bộ</p>
                </div>
                <p className="text-xs text-cocoa/60">
                  Bạn đang dùng tài khoản vận hành. Hãy đăng xuất khi dùng chung thiết bị và tiếp tục xử lý nghiệp vụ trong workspace tương ứng.
                </p>
              </div>
              <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
