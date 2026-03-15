import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Heart, LifeBuoy, Search, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { financeApi, storeApi } from '../../services/api.ts';
import { useAuthStore } from '../../store/auth.ts';
import { getRoutePrefetchHandlers } from '../../utils/routePrefetch';
import { useUIStore } from '../../store/ui.ts';
import NotificationDrawer from './NotificationDrawer.tsx';
import type { AppNotification } from '../../types/app.ts';

const navLinks = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Nữ', path: '/nu' },
  { label: 'Nam', path: '/nam' },
  { label: 'Phụ kiện', path: '/phu-kien' },
  { label: 'Sale', path: '/sale' },
  { label: 'Lookbook', path: '/lookbook' },
  { label: 'Về Mộc Mầm', path: '/gioi-thieu' }
];

const StoreLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const setNotifications = useUIStore((state) => state.setNotifications);
  const unreadCount = useUIStore((state) => state.unreadCount);
  const toggleNotificationDrawer = useUIStore((state) => state.toggleNotificationDrawer);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const rawRole = (profile?.role ?? '').toLowerCase();
  const normalizedRole = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isCustomer = normalizedRole === 'user';
  const { data: cart } = useQuery({
    queryKey: ['store-cart'],
    queryFn: storeApi.cart,
    enabled: isAuthenticated && isCustomer
  });
  const { data: customerOrders = [] } = useQuery({
    queryKey: ['store-orders'],
    queryFn: storeApi.orders,
    enabled: isAuthenticated && isCustomer
  });
  const { data: customerTickets = [] } = useQuery({
    queryKey: ['customer-support-tickets'],
    queryFn: () => storeApi.supportTickets(),
    enabled: isAuthenticated && isCustomer
  });
  const { data: customerReturns = [] } = useQuery({
    queryKey: ['customer-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    enabled: isAuthenticated && isCustomer
  });
  const isAdmin = normalizedRole === 'admin';
  const isWarehouse = normalizedRole === 'warehouse';
  const isStoreManager = normalizedRole === 'seller';
  const canManageOrders = isAdmin || isStoreManager || isWarehouse;
  const showCustomerActions = !isAuthenticated || isCustomer;
  const cartCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const homePrefetchHandlers = getRoutePrefetchHandlers('home');

  useEffect(() => {
    if (location.pathname !== '/') return;
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') ?? '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isAuthenticated || !isCustomer || !profile?.id) {
      setNotifications([]);
      return;
    }

    const storageKey = `customer_notifications_read_${profile.id}`;
    const readRaw = localStorage.getItem(storageKey);
    let parsedReadIds: string[] = [];
    if (readRaw) {
      try {
        parsedReadIds = JSON.parse(readRaw);
      } catch {
        parsedReadIds = [];
      }
    }
    const readIds = new Set<string>(parsedReadIds);

    const draft: AppNotification[] = [];
    customerOrders.forEach((order) => {
      draft.push({
        id: `order-created-${order.id}-${order.createdAt}`,
        title: 'Đơn hàng mới',
        message: `Đơn ${order.orderNumber} đã được tạo.`,
        timestamp: order.createdAt,
        type: 'info',
        read: readIds.has(`order-created-${order.id}-${order.createdAt}`)
      });
      if (order.deliveredAt || order.status.toLowerCase() === 'delivered') {
        const deliveredStamp = order.deliveredAt ?? order.updatedAt ?? order.createdAt;
        draft.push({
          id: `order-delivered-${order.id}-${deliveredStamp}`,
          title: 'Đơn hàng đã giao',
          message: `Đơn ${order.orderNumber} đã giao thành công.`,
          timestamp: deliveredStamp,
          type: 'success',
          read: readIds.has(`order-delivered-${order.id}-${deliveredStamp}`)
        });
      }
    });

    customerTickets.forEach((ticket) => {
      draft.push({
        id: `ticket-${ticket.id}-${ticket.updatedAt}`,
        title: 'Ticket hỗ trợ cập nhật',
        message: `${ticket.ticketCode}: ${ticket.status.toUpperCase()}`,
        timestamp: ticket.updatedAt,
        type: ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'info',
        read: readIds.has(`ticket-${ticket.id}-${ticket.updatedAt}`)
      });
    });

    customerReturns.forEach((request) => {
      draft.push({
        id: `return-${request.id}-${request.updatedAt}`,
        title: 'Yêu cầu đổi trả cập nhật',
        message: `${request.requestCode}: ${request.status.toUpperCase()}`,
        timestamp: request.updatedAt,
        type: request.status === 'refunded' ? 'success' : request.status === 'rejected' ? 'warning' : 'info',
        read: readIds.has(`return-${request.id}-${request.updatedAt}`)
      });
    });

    draft.sort(
      (a, b) =>
        new Date(b.timestamp ?? b.createdAt ?? 0).getTime() - new Date(a.timestamp ?? a.createdAt ?? 0).getTime()
    );
    setNotifications(draft.slice(0, 80));
  }, [customerOrders, customerReturns, customerTickets, isAuthenticated, isCustomer, profile?.id, setNotifications]);

  const persistCustomerRead = (ids: Array<string | number>) => {
    if (!profile?.id) {
      return;
    }
    const storageKey = `customer_notifications_read_${profile.id}`;
    const readRaw = localStorage.getItem(storageKey);
    let parsedReadIds: string[] = [];
    if (readRaw) {
      try {
        parsedReadIds = JSON.parse(readRaw);
      } catch {
        parsedReadIds = [];
      }
    }
    const nextSet = new Set<string>(parsedReadIds);
    ids.forEach((id) => nextSet.add(String(id)));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(nextSet)));
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      navigate('/');
      return;
    }
    navigate(`/?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_2%,rgba(241,198,177,0.42),transparent_42%),radial-gradient(circle_at_92%_0%,rgba(147,197,253,0.3),transparent_38%),linear-gradient(180deg,#fffefd_0%,#fff7f2_46%,#fef6ee_100%)] text-cocoa">
      <header className="sticky top-0 z-40">
        <div className="border-b border-rose-200/50 bg-white/75 backdrop-blur-xl">
          <div className="layout-shell flex flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-3" {...homePrefetchHandlers}>
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-white/90 text-mocha shadow-[0_12px_22px_rgba(139,90,60,0.16)]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xl text-mocha">Mộc Mầm</p>
                  <p className="text-xs text-cocoa/60">Softwear Studio</p>
                </div>
              </Link>

              <form onSubmit={handleSearchSubmit} className="hidden flex-1 justify-center lg:flex">
                <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa/70 shadow-[0_10px_24px_rgba(148,163,184,0.16)]">
                  <Search className="h-4 w-4 text-rose-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm váy, áo, phụ kiện..."
                    className="w-full bg-transparent text-sm text-cocoa placeholder:text-cocoa/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-rose-400/90 to-orange-300/90 px-3 py-1 text-[11px] font-semibold text-white transition hover:from-rose-500 hover:to-orange-400"
                  >
                    Tìm
                  </button>
                </div>
              </form>

              <div className="hidden items-center gap-2 rounded-2xl border border-rose-200/70 bg-white/90 px-2 py-2 shadow-[0_10px_24px_rgba(148,163,184,0.14)] lg:flex">
                <Link to={isAuthenticated ? '/tai-khoan' : '/login'} className="nav-pill">
                  <UserRound className="h-4 w-4" />
                  {isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}
                </Link>
                {showCustomerActions ? (
                  <>
                    <Link to="/ho-tro?partner=warehouse" className="nav-pill">
                      <LifeBuoy className="h-4 w-4" />
                      CSKH
                    </Link>
                    <Link to="/yeu-thich" className="nav-pill">
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </Link>
                    <button type="button" className="nav-pill relative" onClick={() => toggleNotificationDrawer()}>
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-mocha px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </button>
                    <Link to="/gio-hang" className="btn-primary btn-primary--sm">
                      <ShoppingBag className="h-4 w-4" />
                      Giỏ hàng ({cartCount})
                    </Link>
                  </>
                ) : (
                  <Link to={isAdmin ? '/admin' : isWarehouse ? '/staff' : '/seller'} className="btn-secondary btn-secondary--sm">
                    {isWarehouse ? 'Kênh nhân viên' : isAdmin ? 'Control Center' : 'Kênh bán hàng'}
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <Link to={isAuthenticated ? '/tai-khoan' : '/login'} className="nav-pill">
                  <UserRound className="h-4 w-4" />
                </Link>
                {showCustomerActions ? (
                  <>
                    <Link to="/ho-tro?partner=warehouse" className="nav-pill">
                      <LifeBuoy className="h-4 w-4" />
                    </Link>
                    <Link to="/yeu-thich" className="nav-pill">
                      <Heart className="h-4 w-4" />
                    </Link>
                    <button type="button" className="nav-pill relative" onClick={() => toggleNotificationDrawer()}>
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-mocha px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </button>
                    <Link to="/gio-hang" className="relative btn-primary btn-primary--icon">
                      <ShoppingBag className="h-4 w-4" />
                      {cartCount > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-mocha px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      ) : null}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-rose-200/70 bg-white/90 px-2 py-2 shadow-[0_10px_24px_rgba(148,163,184,0.12)] lg:w-auto lg:flex-wrap">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/'}
                    {...(link.path === '/' ? homePrefetchHandlers : {})}
                    className={({ isActive }) => `nav-pill ${isActive ? 'nav-pill--active' : ''}`}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="hidden flex-wrap items-center gap-2 lg:flex">
                {canManageOrders && (
                  <Link to={isAdmin ? '/admin' : isWarehouse ? '/staff' : '/seller'} className="btn-secondary btn-secondary--sm">
                    {isWarehouse ? 'Kênh nhân viên' : isAdmin ? 'Control Center' : 'Kênh bán hàng'}
                  </Link>
                )}
              </div>
            </div>

            <div className="hidden flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-cocoa/55 lg:flex">
              <span className="rounded-full border border-rose-200/70 bg-white/85 px-3 py-1">Free ship từ 399k</span>
              <span className="rounded-full border border-rose-200/70 bg-white/85 px-3 py-1">Đổi trả 7 ngày</span>
              <span className="rounded-full border border-rose-200/70 bg-white/85 px-3 py-1">New drops mỗi tuần</span>
            </div>

            <form onSubmit={handleSearchSubmit} className="lg:hidden">
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa/70 shadow-[0_10px_24px_rgba(148,163,184,0.12)]">
                <Search className="h-4 w-4 text-rose-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm váy, áo, phụ kiện..."
                  className="w-full bg-transparent text-sm text-cocoa placeholder:text-cocoa/50 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-rose-400/90 to-orange-300/90 px-3 py-1 text-[11px] font-semibold text-white transition hover:from-rose-500 hover:to-orange-400"
                >
                  Tìm
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute -left-20 top-8 h-40 w-40 rounded-full bg-blush/45 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-32 h-48 w-48 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-orange-100/55 blur-3xl" />
      </div>

      <main className="layout-shell px-3 py-10 sm:px-5 lg:px-6 xl:px-8">
        <Outlet />
      </main>

      <footer className="mt-6 border-t border-rose-200/60 bg-white/70 backdrop-blur">
        <div className="layout-shell grid gap-6 px-3 py-10 sm:px-5 lg:grid-cols-3 lg:px-6 xl:px-8">
          <div className="space-y-3">
            <p className="font-display text-2xl text-mocha">Mộc Mầm</p>
            <p className="text-sm text-cocoa/70">
              Thời trang nâu kem dễ thương cho cả nam và nữ, mềm mại và thoáng nhẹ mỗi ngày.
            </p>
          </div>
          <div className="space-y-2 text-sm text-cocoa/70">
            <p className="font-semibold text-cocoa">Cửa hàng</p>
            <p>Hotline: 0899 888 123</p>
            <p>Open: 9:00 - 21:00 (T2 - CN)</p>
            <p>Địa chỉ: 18 Ngõ Mây, Quận 1, TP.HCM</p>
          </div>
          <div className="space-y-2 text-sm text-cocoa/70">
            <p className="font-semibold text-cocoa">Chính sách</p>
            <p>Đổi trả 7 ngày</p>
            <p>Giao hàng toàn quốc</p>
            <p>Gói quà miễn phí</p>
          </div>
        </div>
      </footer>
      <NotificationDrawer
        theme="customer"
        title="Thông báo của bạn"
        subtitle="Đơn hàng, ticket và đổi trả"
        onMarkAllRead={persistCustomerRead}
      />
    </div>
  );
};

export default StoreLayout;
