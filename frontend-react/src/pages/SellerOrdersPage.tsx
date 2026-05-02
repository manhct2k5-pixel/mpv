import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Download, Search, ShieldCheck, Store, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment.ts';
import type { OrderSummary } from '../types/store.ts';

type SortOption = 'newest' | 'oldest' | 'total_desc' | 'total_asc';
type RiskFilter = 'all' | 'unpaid_transfer' | 'stuck_pending' | 'any';

const statusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const statusTone: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  processing: 'bg-sky-100 text-sky-700 border-sky-200',
  confirmed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  packing: 'bg-violet-100 text-violet-700 border-violet-200',
  shipped: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200'
};

const STATUS_FILTER_OPTIONS = ['all', 'pending', 'processing', 'confirmed', 'packing', 'shipped', 'delivered', 'cancelled'] as const;

const getOrderAgeHours = (createdAt: string) => {
  const created = new Date(createdAt).getTime();
  const elapsedMs = Number.isFinite(created) ? Date.now() - created : 0;
  return Math.max(0, elapsedMs / (1000 * 60 * 60));
};

const isBankTransferUnpaid = (order: OrderSummary) =>
  order.paymentMethod.toLowerCase() === 'bank_transfer' && order.paymentStatus.toLowerCase() === 'unpaid';

const isStuckPending = (order: OrderSummary) => {
  const status = order.status.toLowerCase();
  return (status === 'pending' || status === 'processing') && getOrderAgeHours(order.createdAt) >= 24;
};

const SellerOrdersPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const isStaff = role === 'warehouse';
  const isSeller = role === 'seller';
  const canManageOrders = isSeller || isAdmin || isStaff;
  const canCreateManualOrder = isAdmin;
  const canViewReports = isAdmin || isSeller;
  const sellerId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['seller-orders', role, sellerId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(sellerId as number)),
    enabled: isAuthenticated && canManageOrders && (isAdmin || sellerId != null),
    refetchInterval: 5_000
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: number) => storeApi.confirmOrderPayment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.setQueryData(['store-order', data.id], data);
    }
  });

  const confirmingOrderId =
    confirmPaymentMutation.isPending && typeof confirmPaymentMutation.variables === 'number'
      ? confirmPaymentMutation.variables
      : null;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      const key = order.status.toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const unpaidOrders = useMemo(
    () => orders.filter((order) => order.paymentStatus?.toLowerCase() === 'unpaid').length,
    [orders]
  );

  const atRiskOrders = useMemo(
    () => orders.filter((order) => isBankTransferUnpaid(order) || isStuckPending(order)).length,
    [orders]
  );

  const openOrdersCount =
    (statusCounts.pending ?? 0) +
    (statusCounts.processing ?? 0) +
    (statusCounts.confirmed ?? 0) +
    (statusCounts.packing ?? 0) +
    (statusCounts.shipped ?? 0);

  const roleSummary = (() => {
    if (isStaff) {
      return {
        title: 'Bảng vận hành kho',
        description:
          'Ưu tiên đơn ở trạng thái “Đã xác nhận” và “Đang đóng gói”, cập nhật nhanh để bàn giao vận chuyển đúng SLA.',
        badge: 'Kho vận',
        icon: Boxes,
        focusLabel: 'Đơn cần thao tác kho',
        focusValue: (statusCounts.confirmed ?? 0) + (statusCounts.packing ?? 0),
        steps: ['1) Nhận đơn đã xác nhận', '2) Đóng gói theo biến thể', '3) Bàn giao vận chuyển (Shipped)']
      };
    }
    if (isAdmin) {
      return {
        title: 'Bảng điều phối admin',
        description:
          'Giám sát toàn bộ đơn hàng, tập trung đơn chưa thanh toán và các điểm nghẽn để phối hợp seller/kho xử lý.',
        badge: 'Điều phối hệ thống',
        icon: ShieldCheck,
        focusLabel: 'Đơn chưa thanh toán',
        focusValue: unpaidOrders,
        steps: ['1) Rà soát đơn pending', '2) Xác nhận CK cho đơn bank transfer', '3) Theo dõi luồng kho đến hoàn tất']
      };
    }
    return {
      title: 'Bảng đơn hàng gian hàng',
      description:
        'Theo dõi đơn có sản phẩm của bạn, xác nhận thanh toán chuyển khoản và phối hợp kho để giao đúng hẹn.',
      badge: 'Seller',
      icon: Store,
      focusLabel: 'Đơn mới cần xác nhận',
      focusValue: (statusCounts.pending ?? 0) + (statusCounts.processing ?? 0),
      steps: ['1) Kiểm tra đơn mới', '2) Xác nhận thanh toán (nếu CK)', '3) Bàn giao kho khi đơn đã confirmed']
    };
  })();

  const filteredOrders = useMemo(() => {
    let items = [...orders];
    if (statusFilter !== 'all') {
      items = items.filter((order) => order.status.toLowerCase() === statusFilter);
    }

    if (riskFilter === 'unpaid_transfer') {
      items = items.filter((order) => isBankTransferUnpaid(order));
    } else if (riskFilter === 'stuck_pending') {
      items = items.filter((order) => isStuckPending(order));
    } else if (riskFilter === 'any') {
      items = items.filter((order) => isBankTransferUnpaid(order) || isStuckPending(order));
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter((order) => {
        const haystack = `${order.orderNumber} ${order.id} ${order.status} ${order.paymentMethod} ${order.paymentStatus}`.toLowerCase();
        return haystack.includes(query);
      });
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
  }, [orders, riskFilter, searchQuery, sortBy, statusFilter]);

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';

  const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

  const exportFilteredOrders = () => {
    if (filteredOrders.length === 0) return;
    const headers = ['Mã đơn', 'Trạng thái', 'Thanh toán', 'Phương thức', 'Giá trị', 'Số sản phẩm', 'Tạo lúc', 'Rủi ro'];
    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      statusLabels[order.status.toLowerCase()] ?? order.status,
      paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus,
      paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod,
      String(order.total ?? 0),
      String(order.itemCount ?? 0),
      formatDate(order.createdAt),
      isStuckPending(order) ? 'Đơn chờ quá 24h' : isBankTransferUnpaid(order) ? 'Chuyển khoản chưa xác nhận' : 'Không'
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `seller-orders-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Vui lòng đăng nhập để quản lý đơn hàng shop.
      </div>
    );
  }

  if (profileLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải thông tin...</div>;
  }

  if (!canManageOrders) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Chỉ tài khoản seller, staff vận hành hoặc admin mới được truy cập mục này.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-caramel/30 bg-white/80 text-mocha">
              <roleSummary.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-mocha">{roleSummary.title}</h1>
              <p className="max-w-3xl text-sm text-cocoa/70">{roleSummary.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{roleSummary.badge}</span>
            <Link to="/seller/van-hanh" className="btn-secondary btn-secondary--sm">
              Vận hành / hỗ trợ
            </Link>
            {canViewReports ? (
              <Link to="/seller/bao-cao" className="btn-secondary btn-secondary--sm">
                Xem báo cáo
              </Link>
            ) : null}
            {canCreateManualOrder ? (
              <Link to="/admin/manual-order" className="btn-secondary btn-secondary--sm">
                Tạo đơn thủ công
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Tổng đơn theo phạm vi</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{(statusCounts.all ?? 0).toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Đơn đang mở</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{openOrdersCount.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">{roleSummary.focusLabel}</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{roleSummary.focusValue.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Đơn đã giao</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{(statusCounts.delivered ?? 0).toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Đơn rủi ro</p>
            <p className="mt-1 text-2xl font-semibold text-rose-700">{atRiskOrders.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-caramel/25 bg-cream/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cocoa/60">Quy trình ưu tiên</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roleSummary.steps.map((step) => (
              <span key={step} className="tag">
                <Truck className="h-3.5 w-3.5" />
                {step}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="sticker-card space-y-4 p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-cocoa">
              Kết quả hiển thị: {filteredOrders.length.toLocaleString('vi-VN')} / {orders.length.toLocaleString('vi-VN')} đơn
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-caramel/40 bg-white/80 px-3 py-2">
              <Search className="h-4 w-4 text-cocoa/60" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm mã đơn / ID / trạng thái..."
                className="w-[220px] bg-transparent text-xs text-cocoa outline-none placeholder:text-cocoa/55"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-caramel/40 bg-white/80 px-3 py-2 text-xs font-semibold text-cocoa"
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
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                className="rounded-xl border border-caramel/40 bg-white/80 px-3 py-2 text-xs font-semibold text-cocoa"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="total_desc">Tổng tiền cao → thấp</option>
                <option value="total_asc">Tổng tiền thấp → cao</option>
              </select>
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                className="rounded-xl border border-caramel/40 bg-white/80 px-3 py-2 text-xs font-semibold text-cocoa"
              >
                <option value="all">Tất cả rủi ro</option>
                <option value="any">Đơn có rủi ro</option>
                <option value="unpaid_transfer">CK chưa xác nhận</option>
                <option value="stuck_pending">Pending quá 24h</option>
              </select>
              <button type="button" onClick={exportFilteredOrders} className="btn-secondary btn-secondary--sm" disabled={filteredOrders.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER_OPTIONS.map((status) => {
              const isActive = statusFilter === status;
              const label = status === 'all' ? 'Tất cả' : statusLabels[status] ?? status;
              return (
                <button
                  key={status}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'border-mocha bg-mocha/10 text-mocha'
                      : 'border-caramel/30 bg-white/70 text-cocoa/70 hover:border-mocha/40'
                  }`}
                  onClick={() => setStatusFilter(status)}
                >
                  {label} ({statusCounts[status] ?? 0})
                </button>
              );
            })}
          </div>
        </div>

        {ordersLoading ? (
          <div className="text-sm text-cocoa/70">Đang tải danh sách đơn...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-sm text-cocoa/70">Chưa có đơn hàng phù hợp bộ lọc.</div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusKey = order.status.toLowerCase();
              const bankTransferUnpaid = isBankTransferUnpaid(order);
              const stuckPending = isStuckPending(order);
              const operationHint = isStaff
                ? statusKey === 'confirmed'
                  ? 'Đơn đã sẵn sàng đóng gói.'
                  : statusKey === 'packing'
                    ? 'Đơn đang đóng gói, có thể bàn giao vận chuyển.'
                    : 'Theo dõi trạng thái để nhận việc tiếp theo.'
                : isAdmin
                  ? bankTransferUnpaid
                    ? 'Đơn chuyển khoản chưa thanh toán, nên xác nhận trước khi giao.'
                    : 'Theo dõi tiến độ và phối hợp seller/kho khi cần.'
                  : statusKey === 'pending' || statusKey === 'processing'
                    ? 'Đơn mới, cần xác nhận để chuyển luồng kho.'
                    : 'Theo dõi trạng thái vận hành của đơn.';
              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-2xl border border-caramel/30 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-cocoa">{order.orderNumber}</p>
                    <p className="text-xs text-cocoa/60">{formatDate(order.createdAt)}</p>
                    <p className="text-xs text-cocoa/60">
                      {paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod} ·{' '}
                      {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
                    </p>
                    {stuckPending || bankTransferUnpaid ? (
                      <p className="inline-flex w-fit items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {stuckPending ? 'Pending quá 24h' : 'CK chưa xác nhận'}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-cocoa/55">{operationHint}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="tag">{order.itemCount} sản phẩm</span>
                    <span
                      className={`rounded-full border px-3 py-1 font-semibold ${
                        statusTone[statusKey] ?? 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {statusLabels[statusKey] ?? order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-mocha">{formatPrice(order.total)}</p>
                    {!isStaff && bankTransferUnpaid && (
                      <button
                        type="button"
                        className="btn-primary btn-primary--sm"
                        onClick={() => confirmPaymentMutation.mutate(order.id)}
                        disabled={confirmPaymentMutation.isPending}
                      >
                        {confirmingOrderId === order.id ? 'Đang xác nhận...' : 'Xác nhận CK'}
                      </button>
                    )}
                    <Link to={`/don-hang/${order.id}`} className="btn-secondary btn-secondary--sm">
                      Xử lý đơn
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default SellerOrdersPage;
