import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment.ts';
import { canUseShoppingFlow } from '../utils/access';

const orderStatusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const OrdersPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const canShop = canUseShoppingFlow(profile?.role);

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['store-orders'],
    queryFn: storeApi.orders,
    enabled: isAuthenticated && canShop,
    refetchInterval: 5_000
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'total_desc' | 'total_asc'>('newest');

  const filteredOrders = useMemo(() => {
    let items = [...orders];
    if (statusFilter !== 'all') {
      items = items.filter((order) => order.status.toLowerCase() === statusFilter);
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

  if (profileError || !profile) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được thông tin tài khoản.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void refetchProfile()}>
            Tải lại
          </button>
          <Link to="/login" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Đăng nhập lại
          </Link>
        </div>
      </div>
    );
  }

  if (!canShop) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Danh sách đơn mua dành cho tài khoản khách hàng.
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

  if (isError) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được danh sách đơn hàng.</p>
        <button type="button" className="btn-primary" onClick={() => void refetch()}>
          Tải lại đơn hàng
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Đơn mua</p>
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
              <option value="pending">Chờ xác nhận</option>
              <option value="processing">Đang xử lý</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="packing">Đang đóng gói</option>
              <option value="shipped">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
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
          Đang lọc: {statusFilter === 'all' ? 'Tất cả trạng thái' : orderStatusLabels[statusFilter] ?? statusFilter}
        </span>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          {orders.length === 0 ? 'Bạn chưa có đơn hàng nào.' : 'Không có đơn nào khớp bộ lọc hiện tại.'}
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
                <span className="tag">{orderStatusLabels[order.status.toLowerCase()] ?? order.status}</span>
                <span className="tag">
                  {paymentMethodLabels[order.paymentMethod.toLowerCase()] ?? order.paymentMethod}
                </span>
                <span className="tag">
                  {paymentStatusLabels[order.paymentStatus.toLowerCase()] ?? order.paymentStatus}
                </span>
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
