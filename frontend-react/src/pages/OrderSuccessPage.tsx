import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

const OrderSuccessPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchParams] = useSearchParams();
  const orderId = Number(searchParams.get('orderId') ?? 0);

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const canShop = canUseShoppingFlow(profile?.role);

  const { data: order, isLoading, isError: orderError } = useQuery({
    queryKey: ['store-order', orderId],
    queryFn: () => storeApi.order(orderId),
    enabled: isAuthenticated && canShop && Number.isFinite(orderId) && orderId > 0,
    refetchInterval: 15_000
  });

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng đăng nhập để xem trạng thái đơn hàng.
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được thông tin tài khoản.</p>
        <Link to="/login" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Đăng nhập lại
        </Link>
      </div>
    );
  }

  if (!canShop) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Trang này dành cho tài khoản khách hàng.
      </div>
    );
  }

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tìm thấy đơn hàng cần hiển thị.</p>
        <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Xem danh sách đơn hàng
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải chi tiết đơn hàng...
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được chi tiết đơn hàng hoặc đơn không còn tồn tại.</p>
        <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Xem danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const paymentMethodLabel = paymentMethodLabels[order.paymentMethod.toLowerCase()] ?? order.paymentMethod;
  const paymentStatusLabel = paymentStatusLabels[order.paymentStatus.toLowerCase()] ?? order.paymentStatus;
  const statusLabel = orderStatusLabels[order.status.toLowerCase()] ?? order.status;

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Checkout Completed</p>
        <h1 className="mt-1 font-display text-3xl text-mocha">Đặt hàng thành công</h1>
        <p className="text-sm text-cocoa/70">
          Cảm ơn bạn đã mua sắm. Đơn hàng đã được ghi nhận trên hệ thống.
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/75 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <div className="flex items-center justify-between">
          <span>Mã đơn hàng</span>
          <span className="font-semibold text-mocha">{order.orderNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tổng tiền</span>
          <span className="font-semibold text-mocha">{formatPrice(order.total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Phương thức thanh toán</span>
          <span className="font-semibold text-mocha">{paymentMethodLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Trạng thái đơn</span>
          <span className="font-semibold text-mocha">{statusLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Trạng thái thanh toán</span>
          <span className="font-semibold text-mocha">{paymentStatusLabel}</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to={`/don-hang/${order.id}`} className="btn-primary">
          Theo dõi đơn
        </Link>
        <Link to="/" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
