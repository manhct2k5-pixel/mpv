import { useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardPlus,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Package2,
  Plus,
  Shield,
  Star,
  Store,
  Truck,
  UserRound
} from 'lucide-react';
import { financeApi, storeApi } from '../../services/api.ts';
import { useAuthStore } from '../../store/auth.ts';
import type { OrderSummary } from '../../types/store.ts';

type MenuEntry = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const SellerLayout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [quickSearch, setQuickSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';
  const isStaff = isWarehouse;
  const isSeller = role === 'seller';
  const canManageCatalog = isAdmin || isSeller;
  const sellerId = profile?.id != null ? Number(profile.id) : null;

  const menuItems = useMemo<MenuEntry[]>(() => {
    const items: MenuEntry[] = [{ label: 'Tổng quan', path: '/seller', icon: Boxes }];

    if (canManageCatalog) {
      items.push({ label: 'Sản phẩm', path: '/seller/san-pham', icon: Package2 });
    }

    items.push({ label: 'Đơn hàng', path: '/seller/don-hang', icon: Truck });

    if (canManageCatalog) {
      items.push({ label: 'Báo cáo', path: '/seller/bao-cao', icon: BarChart3 });
    }

    items.push({ label: 'Đánh giá & phản hồi', path: '/seller/danh-gia', icon: Star });
    items.push({ label: 'Vận hành / hỗ trợ', path: '/seller/van-hanh', icon: LifeBuoy });
    items.push({ label: 'Inbox ticket', path: '/seller/tickets', icon: MessageSquare });

    if (isAdmin) {
      items.push({ label: 'Tạo đơn thủ công', path: '/admin/manual-order', icon: ClipboardPlus });
    }

    if (canManageCatalog) {
      items.push({ label: 'Tài khoản cửa hàng', path: '/seller/ho-so', icon: Store });
    }

    return items;
  }, [canManageCatalog, isAdmin, isStaff]);

  const { data: orderSignals = [] } = useQuery<OrderSummary[]>({
    queryKey: ['seller-layout-order-signals', role, sellerId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(sellerId as number)),
    enabled: (isAdmin || isSeller) && (isAdmin || sellerId != null),
    refetchInterval: 60_000
  });

  const notificationItems = useMemo(() => {
    if (!(isAdmin || isSeller)) {
      return [
        {
          id: 'staff-mode',
          tone: 'info',
          text: 'Bạn đang ở chế độ vận hành nội bộ. Ưu tiên xử lý đơn đang mở và ticket mới.'
        }
      ];
    }

    const pendingOrders = orderSignals.filter((order) => ['pending', 'processing'].includes(order.status.toLowerCase())).length;
    const unpaidBankTransfer = orderSignals.filter(
      (order) => order.paymentMethod.toLowerCase() === 'bank_transfer' && order.paymentStatus.toLowerCase() === 'unpaid'
    ).length;
    const cancelledOrders = orderSignals.filter((order) => order.status.toLowerCase() === 'cancelled').length;
    const items: Array<{ id: string; tone: 'danger' | 'warning' | 'info' | 'success'; text: string }> = [];

    if (pendingOrders > 0) {
      items.push({
        id: 'pending-orders',
        tone: 'warning',
        text: `${pendingOrders.toLocaleString('vi-VN')} đơn cần xác nhận trong hôm nay.`
      });
    }
    if (unpaidBankTransfer > 0) {
      items.push({
        id: 'unpaid-transfer',
        tone: 'danger',
        text: `${unpaidBankTransfer.toLocaleString('vi-VN')} đơn chuyển khoản chưa xác nhận.`
      });
    }
    if (cancelledOrders > 0) {
      items.push({
        id: 'cancelled-orders',
        tone: 'info',
        text: `${cancelledOrders.toLocaleString('vi-VN')} đơn đã hủy, cần rà soát nguyên nhân.`
      });
    }
    if (items.length === 0) {
      items.push({
        id: 'no-alert',
        tone: 'success',
        text: 'Không có cảnh báo mới. Hệ thống vận hành ổn định.'
      });
    }
    return items;
  }, [isAdmin, isSeller, orderSignals]);

  const unreadCount = useMemo(
    () => notificationItems.filter((item) => item.tone === 'danger' || item.tone === 'warning').length,
    [notificationItems]
  );

  const roleLabel = (() => {
    if (isAdmin) return 'Admin Control';
    if (isStaff) return 'Staff Vận hành';
    return 'Seller Merchant';
  })();

  const title = isStaff ? 'Operations Workspace' : 'Seller Center';
  const subtitle = isStaff
    ? 'Đóng gói, bàn giao vận chuyển, xử lý ticket và cập nhật trạng thái đơn.'
    : 'Quản lý sản phẩm, xử lý đơn hàng và theo dõi hiệu suất bán hàng theo thời gian thực.';
  const storeStatus = isAdmin ? 'System Online' : isStaff ? 'Vận hành nội bộ' : 'Cửa hàng đang hoạt động';
  const avatarLabel = profile?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'S';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = quickSearch.trim();
    navigate(query ? `/seller/san-pham?q=${encodeURIComponent(query)}` : '/seller/san-pham');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_2%,rgba(241,198,177,0.42),transparent_42%),radial-gradient(circle_at_92%_0%,rgba(147,197,253,0.3),transparent_38%),linear-gradient(180deg,#fffefd_0%,#fff7f2_46%,#fef6ee_100%)] text-cocoa">
      <div className="layout-shell grid min-h-screen gap-4 px-3 py-4 lg:grid-cols-[290px,1fr] lg:px-6 xl:px-8">
        <aside className="hidden rounded-[30px] border border-rose-200/70 bg-white/85 p-4 shadow-[0_24px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl lg:flex lg:flex-col">
          <div className="rounded-2xl bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 p-4 text-white">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20">
                {isAdmin ? <Shield className="h-5 w-5" /> : <Store className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-white/80">{roleLabel}</p>
              </div>
            </div>
            <p className="text-xs leading-5 text-white/85">{subtitle}</p>
          </div>

          <nav className="mt-4 flex-1 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/seller'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-rose-50 shadow-[0_10px_24px_rgba(148,163,184,0.24)]'
                        : 'text-cocoa/75 hover:bg-rose-50 hover:text-cocoa'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-sm font-medium text-cocoa transition hover:border-rose-300 hover:bg-rose-100/60"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Trang chủ admin</span>
                  </Link>
                )}
          </nav>

          <div className="rounded-xl border border-rose-200 bg-white/90 p-3 text-xs text-cocoa/70">
            <p className="font-semibold text-cocoa">{profile?.fullName ?? 'Người dùng'}</p>
            <p className="mt-1">Role: {roleLabel}</p>
          </div>

          <button type="button" className="btn-secondary mt-3 w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </aside>

        <div className="min-w-0 space-y-4">
          <header className="rounded-2xl border border-rose-200/70 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(148,163,184,0.12)] backdrop-blur-lg">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form onSubmit={handleQuickSearch} className="flex w-full items-center gap-2 xl:max-w-xl">
                <input
                  value={quickSearch}
                  onChange={(event) => setQuickSearch(event.target.value)}
                  placeholder="Tìm nhanh sản phẩm, đơn hàng, mã đơn..."
                  className="w-full rounded-xl border border-rose-200 bg-white/90 px-3 py-2 text-sm text-cocoa outline-none ring-0 transition focus:border-rose-300"
                />
                <button type="submit" className="btn-secondary btn-secondary--sm whitespace-nowrap">
                  Tìm kiếm
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className="relative rounded-xl border border-rose-200 bg-white/85 p-2 text-cocoa transition hover:bg-rose-50"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    aria-label="Thông báo"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {showNotifications ? (
                    <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-2xl border border-rose-200/70 bg-white p-3 shadow-[0_18px_32px_rgba(148,163,184,0.18)]">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa/70">Thông báo vận hành</p>
                      <div className="space-y-2">
                        {notificationItems.map((item) => (
                          <div key={item.id} className="rounded-xl border border-rose-100 bg-rose-50/40 px-2.5 py-2 text-xs text-cocoa/80">
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cocoa">
                  {storeStatus}
                </span>

                {canManageCatalog ? (
                  <Link to="/seller/san-pham" className="btn-primary btn-primary--sm">
                    <Plus className="h-4 w-4" />
                    Thêm sản phẩm
                  </Link>
                ) : null}

                {isAdmin ? (
                  <Link to="/admin" className="btn-secondary btn-secondary--sm whitespace-nowrap">
                    <Shield className="h-4 w-4" />
                    Trang chủ admin
                  </Link>
                ) : null}

                <Link to="/tai-khoan" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/85 px-2.5 py-2 text-xs font-semibold text-cocoa">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-mocha text-[11px] text-cream">{avatarLabel}</span>
                  <span className="hidden sm:inline">{profile?.fullName ?? 'Tài khoản'}</span>
                  <UserRound className="h-4 w-4 sm:hidden" />
                </Link>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/seller'}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                      isActive ? 'bg-rose-500 text-rose-50' : 'bg-rose-50 text-cocoa'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {isAdmin ? (
                <Link to="/admin" className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-cocoa">
                  Trang chủ admin
                </Link>
              ) : null}
            </div>
          </header>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SellerLayout;
