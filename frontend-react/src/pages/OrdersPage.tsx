import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const OrdersPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['store-orders'],
    queryFn: storeApi.orders,
    enabled: isAuthenticated && isCustomer
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'total_desc' | 'total_asc'>('newest');

  const filteredOrders = useMemo(() => {
    let items = [...orders];
    if (statusFilter !== 'all') {
      items = items.filter((order) => order.status === statusFilter);
    }
    switch (sortBy) {
      case 'oldest':
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'total_desc':
        items.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
        break;
      case 'total_asc':
        items.sort((a, b) => (a.total ?? 0) - (b.total ?? 0));
        break;
      case 'newest':
      default:
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return items;
  }, [orders, statusFilter, sortBy]);

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';

  const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng đăng nhập để xem đơn hàng.
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải quyền truy cập...
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Danh sách đơn mua chỉ dành cho tài khoản khách hàng (Customer).
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải đơn hàng...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">My Orders</p>
            <h1 className="mt-1 font-display text-3xl text-mocha">Đơn hàng của bạn</h1>
            <p className="text-sm text-cocoa/70">Theo dõi trạng thái và chi tiết từng đơn.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-rose-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-cocoa"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">PENDING</option>
              <option value="processing">PROCESSING</option>
              <option value="confirmed">CONFIRMED</option>
              <option value="packing">PACKING</option>
              <option value="shipped">SHIPPED</option>
              <option value="delivered">DELIVERED</option>
              <option value="cancelled">CANCELLED</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="rounded-xl border border-rose-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-cocoa"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="total_desc">Tổng tiền cao → thấp</option>
              <option value="total_asc">Tổng tiền thấp → cao</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-xs text-cocoa/65">
        <span className="tag !border-rose-200/80 !bg-white/90">Tổng đơn: {orders.length.toLocaleString('vi-VN')}</span>
        <span className="tag !border-rose-200/80 !bg-white/90">
          Đang lọc: {statusFilter === 'all' ? 'Tất cả trạng thái' : statusFilter.toUpperCase()}
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          Bạn chưa có đơn hàng nào.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-cocoa/60">Mã đơn</p>
                <p className="text-lg font-semibold text-mocha">{order.orderNumber}</p>
                <p className="text-xs text-cocoa/60">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-cocoa/70">
                <span className="tag">{order.status}</span>
                <span className="tag">{order.paymentMethod}</span>
                <span className="tag">{order.paymentStatus}</span>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-base font-semibold text-mocha">{formatPrice(order.total)}</p>
                <Link to={`/don-hang/${order.id}`} className="btn-secondary">
                  Xem chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
