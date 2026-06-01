import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Eye, Save } from 'lucide-react';
import { financeApi, getApiErrorMessage } from '../services/api.ts';
import { ADMIN_DEMO_MODE } from '../services/adminDemo.ts';
import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment';
import type { AdminUserInsight } from '../types/app';
import type { OrderSummary } from '../types/store';

type OrderMonitorTab = 'all' | 'awaiting_payout' | 'cancelled' | 'refund';

const ORDER_TABS: Array<{ id: OrderMonitorTab; label: string }> = [
  { id: 'all', label: 'Tất cả đơn seller' },
  { id: 'awaiting_payout', label: 'Chờ chuyển tiền người bán' },
  { id: 'cancelled', label: 'Bị hủy' },
  { id: 'refund', label: 'Hoàn tiền' }
];

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang chuẩn bị' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'packing', label: 'Đang đóng gói' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao thành công' },
  { value: 'cancelled', label: 'Đã hủy' }
];

// Các bước chuyển trạng thái hợp lệ, khớp với ensureSequentialStatusTransition ở backend.
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  processing: ['confirmed', 'cancelled'],
  confirmed: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

const getStatusOptionsFor = (current: string) => {
  const normalized = current.toLowerCase();
  const allowed = new Set<string>([normalized, ...(ORDER_STATUS_TRANSITIONS[normalized] ?? [])]);
  return ORDER_STATUS_OPTIONS.filter((option) => allowed.has(option.value));
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('vi-VN');
const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

const shippingStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (['pending', 'processing', 'confirmed', 'packing'].includes(normalized)) return 'Đang chuẩn bị';
  if (normalized === 'shipped') return 'Đang giao';
  if (normalized === 'delivered') return 'Đã giao thành công';
  if (normalized === 'cancelled') return 'Đã hủy';
  return 'Theo dõi';
};

const statusBadgeLabel = (status: string) => {
  const normalized = status.toLowerCase();
  const match = ORDER_STATUS_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? status;
};

const isAwaitingPayout = (order: OrderSummary) =>
  order.status.toLowerCase() === 'delivered' &&
  order.paymentStatus.toLowerCase() !== 'refunded' &&
  !order.sellerPaid;

const isSellerStatisticOrder = (order: OrderSummary) =>
  order.status.toLowerCase() === 'delivered' && order.paymentStatus.toLowerCase() !== 'refunded';

const matchTab = (order: OrderSummary, tab: OrderMonitorTab) => {
  const status = order.status.toLowerCase();
  const paymentStatus = order.paymentStatus.toLowerCase();
  if (tab === 'all') return isSellerStatisticOrder(order);
  if (tab === 'awaiting_payout') return isAwaitingPayout(order);
  if (tab === 'cancelled') return status === 'cancelled';
  if (tab === 'refund') return paymentStatus === 'refunded';
  return true;
};

const getOrderSellerIds = (order: OrderSummary) => {
  const sellerIds = (order.sellerIds ?? []).filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  if (sellerIds.length > 0) return sellerIds;
  return typeof order.sellerId === 'number' && Number.isFinite(order.sellerId) ? [order.sellerId] : [];
};

const getOrderSellerLabel = (order: OrderSummary) => {
  const storeName = order.sellerStoreName?.trim();
  const sellerName = order.sellerName?.trim();
  if (storeName) return storeName;
  if (sellerName) return sellerName;
  const sellerIds = getOrderSellerIds(order);
  return sellerIds.length > 0 ? sellerIds.map((id) => `Seller #${id}`).join(', ') : 'Chưa gán seller';
};

const matchesSellerFilter = (order: OrderSummary, sellerFilter: string) => {
  if (sellerFilter === 'all') return true;
  const sellerId = Number(sellerFilter);
  if (!Number.isFinite(sellerId)) return true;
  return getOrderSellerIds(order).includes(sellerId);
};

const normalizeRole = (value?: string | null) => (value ?? '').trim().toLowerCase();

const getAlertLabel = (order: OrderSummary) => {
  const createdAt = new Date(order.createdAt).getTime();
  const elapsedHours = Math.floor((Date.now() - createdAt) / (1000 * 60 * 60));
  const status = order.status.toLowerCase();
  const paymentStatus = order.paymentStatus.toLowerCase();

  if (status === 'cancelled') return 'Đơn hủy';
  if (paymentStatus === 'unpaid') return 'Chờ thanh toán';
  if (status === 'pending' && elapsedHours > 24) return 'Đơn treo >24h';
  if (paymentStatus === 'refunded') return 'Đang/đã hoàn tiền';
  return 'Bình thường';
};

const AdminOrdersPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OrderMonitorTab>('all');
  const [query, setQuery] = useState('');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});
  const [internalNote, setInternalNote] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'monitor'],
    queryFn: () => financeApi.admin.orders(),
    refetchInterval: 5_000
  });

  const { data: adminUsers = [] } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users', 'seller-filter'],
    queryFn: () => financeApi.admin.users(),
    staleTime: 30_000
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) =>
      financeApi.admin.updateOrderStatus(payload.id, payload.status),
    onSuccess: (updated) => {
      setStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[updated.id];
        return next;
      });
      setActionMessage({ text: 'Đã cập nhật trạng thái đơn.', ok: true });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error) => {
      setActionMessage({ text: getApiErrorMessage(error, 'Không thể cập nhật trạng thái đơn.'), ok: false });
    }
  });

  const releasePaymentMutation = useMutation({
    mutationFn: (id: number) => financeApi.admin.releasePaymentToSeller(id),
    onSuccess: () => {
      setActionMessage({ text: 'Đã chuyển tiền cho người bán.', ok: true });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'monitor'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error) => {
      setActionMessage({ text: getApiErrorMessage(error, 'Không thể chuyển tiền cho người bán.'), ok: false });
    }
  });

  const sellerOptions = useMemo(() => {
    const sellers = new Map<number, string>();
    adminUsers.forEach((user) => {
      if (normalizeRole(user.role) === 'seller') {
        sellers.set(user.id, user.fullName);
      }
    });
    orders.forEach((order) => {
      const ids = getOrderSellerIds(order);
      if (ids.length === 1) {
        sellers.set(ids[0], sellers.get(ids[0]) ?? getOrderSellerLabel(order));
      } else {
        ids.forEach((id) => sellers.set(id, sellers.get(id) ?? `Seller #${id}`));
      }
    });
    return [...sellers.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }, [adminUsers, orders]);

  const sellerFilteredOrders = useMemo(
    () => orders.filter((order) => matchesSellerFilter(order, sellerFilter)),
    [orders, sellerFilter]
  );

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sellerFilteredOrders.filter((order) => {
      if (!matchTab(order, activeTab)) return false;
      if (!normalizedQuery) return true;
      const haystack = `${order.orderNumber} ${order.customerName ?? ''} ${order.status} ${order.paymentStatus} ${order.paymentMethod} ${getOrderSellerLabel(order)}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, query, sellerFilteredOrders]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedOrderId, visibleOrders]
  );

  const timeline = useMemo(() => {
    if (!selectedOrder) return [];
    const base = new Date(selectedOrder.createdAt).getTime();
    const events = [
      { at: new Date(base).toISOString(), action: 'Đơn được tạo', by: 'Hệ thống' },
      { at: new Date(base + 1000 * 60 * 20).toISOString(), action: 'Tiếp nhận đơn', by: 'Admin/Staff' },
      { at: new Date(base + 1000 * 60 * 60).toISOString(), action: `Cập nhật trạng thái: ${statusBadgeLabel(selectedOrder.status)}`, by: 'Admin' }
    ];
    if (selectedOrder.paymentStatus.toLowerCase() === 'paid') {
      events.push({
        at: new Date(base + 1000 * 60 * 65).toISOString(),
        action: 'Xác nhận thanh toán',
        by: 'Hệ thống'
      });
    }
    return events;
  }, [selectedOrder]);

  const counters = useMemo(() => {
    const base = {
      all: 0,
      awaiting_payout: 0,
      cancelled: 0,
      refund: 0
    } satisfies Record<OrderMonitorTab, number>;

    sellerFilteredOrders.forEach((order) => {
      (Object.keys(base) as OrderMonitorTab[]).forEach((tab) => {
        if (matchTab(order, tab)) {
          base[tab] += 1;
        }
      });
    });
    return base;
  }, [sellerFilteredOrders]);

  const settlementStats = useMemo(() => {
    const sellerStatisticOrders = sellerFilteredOrders.filter(isSellerStatisticOrder);
    const awaitingPayoutOrders = sellerFilteredOrders.filter(isAwaitingPayout);
    const cancelledOrders = sellerFilteredOrders.filter((order) => order.status.toLowerCase() === 'cancelled');
    const refundedOrders = sellerFilteredOrders.filter((order) => order.paymentStatus.toLowerCase() === 'refunded');

    return {
      sellerStatisticCount: sellerStatisticOrders.length,
      sellerStatisticTotal: sellerStatisticOrders.reduce((sum, order) => sum + (order.total ?? 0), 0),
      awaitingPayoutCount: awaitingPayoutOrders.length,
      awaitingPayoutTotal: awaitingPayoutOrders.reduce((sum, order) => sum + (order.total ?? 0), 0),
      cancelledCount: cancelledOrders.length,
      refundedCount: refundedOrders.length
    };
  }, [sellerFilteredOrders]);

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Giám sát đơn hàng</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Theo dõi và can thiệp đơn hàng toàn hệ thống</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            {ADMIN_DEMO_MODE
              ? 'Demo mode: thay đổi trạng thái và đối soát chuyển tiền chỉ mô phỏng trên trình duyệt này. Các block khách hàng/timeline bên dưới là dữ liệu minh họa.'
              : 'Giám sát đơn đã giao thành công theo seller, đối soát chuyển tiền người bán và xử lý ngoại lệ hủy/hoàn tiền trên cùng một màn hình.'}
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bộ lọc trạng thái đơn</h2>
            <p className="admin-section__description">
              Thống kê đơn hàng của seller chỉ tính các đơn đã giao thành công; đơn bị hủy và hoàn tiền được tách riêng để đối soát.
            </p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <p className="text-xs text-[var(--admin-muted)]">Tất cả đơn seller</p>
            <p className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{settlementStats.sellerStatisticCount}</p>
            <p className="text-xs text-[var(--admin-muted)]">{formatCurrency(settlementStats.sellerStatisticTotal)}</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <p className="text-xs text-[var(--admin-muted)]">Chờ chuyển tiền người bán</p>
            <p className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{settlementStats.awaitingPayoutCount}</p>
            <p className="text-xs text-[var(--admin-muted)]">{formatCurrency(settlementStats.awaitingPayoutTotal)}</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <p className="text-xs text-[var(--admin-muted)]">Bị hủy</p>
            <p className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{settlementStats.cancelledCount}</p>
            <p className="text-xs text-[var(--admin-muted)]">Không tính doanh thu seller</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
            <p className="text-xs text-[var(--admin-muted)]">Hoàn tiền</p>
            <p className="mt-1 text-xl font-semibold text-[var(--admin-text)]">{settlementStats.refundedCount}</p>
            <p className="text-xs text-[var(--admin-muted)]">Cần đối soát lại ví khách</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-inline-button admin-focus-ring ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              {tab.label} ({counters[tab.id]})
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo mã đơn, seller, trạng thái đơn, trạng thái thanh toán..."
          />
          <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className="admin-select h-10">
            <option value="all">Tất cả seller</option>
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={String(seller.id)}>
                {seller.name}
              </option>
            ))}
          </select>
        </div>

        {actionMessage ? (
          <div
            className={`mb-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
              actionMessage.ok ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {actionMessage.text}
          </div>
        ) : null}

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải dữ liệu đơn hàng...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được danh sách đơn hàng.</p> : null}

        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Seller</th>
                  <th>Số tiền</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái đơn</th>
                  <th>Trạng thái giao hàng</th>
                  <th>Chuyển tiền NB</th>
                  <th>Cảnh báo</th>
                  <th>Thời gian đặt</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const statusDraft = statusDrafts[order.id] ?? order.status.toLowerCase();
                  const isSavingStatus =
                    updateOrderStatusMutation.isPending && updateOrderStatusMutation.variables?.id === order.id;
                  const isSelected = selectedOrderId === order.id;
                  const paymentMethod = paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod;
                  const paymentStatus = paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus;
                  return (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.customerName?.trim() || `Khách #${order.id}`}</td>
                      <td>{getOrderSellerLabel(order)}</td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>
                        <span>{`${paymentMethod} · ${paymentStatus}`}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <select
                            value={statusDraft}
                            onChange={(event) =>
                              setStatusDrafts((prev) => ({
                                ...prev,
                                [order.id]: event.target.value
                              }))
                            }
                            className="admin-select"
                          >
                            {getStatusOptionsFor(order.status).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="admin-inline-button"
                            disabled={isSavingStatus || statusDraft === order.status.toLowerCase()}
                            onClick={() =>
                              updateOrderStatusMutation.mutate({
                                id: order.id,
                                status: statusDraft
                              })
                            }
                          >
                            <Save className="h-4 w-4" />
                            {isSavingStatus ? 'Đang lưu...' : 'Lưu'}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="admin-status-badge">{shippingStatusLabel(order.status)}</span>
                      </td>
                      <td>
                        {order.sellerPaid ? (
                          <span className="admin-status-badge">
                            Đã chuyển{order.sellerPaidAt ? ` ${new Date(order.sellerPaidAt).toLocaleDateString('vi-VN')}` : ''}
                          </span>
                        ) : isAwaitingPayout(order) ? (
                          <button
                            type="button"
                            className="admin-inline-button"
                            disabled={releasePaymentMutation.isPending && releasePaymentMutation.variables === order.id}
                            onClick={() => {
                              if (window.confirm(`Xác nhận chuyển tiền cho người bán — đơn ${order.orderNumber}?\nThao tác này không thể hoàn tác.`)) {
                                releasePaymentMutation.mutate(order.id);
                              }
                            }}
                          >
                            <BadgeDollarSign className="h-4 w-4" />
                            {releasePaymentMutation.isPending && releasePaymentMutation.variables === order.id ? 'Đang xử lý...' : 'Chuyển tiền NB'}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--admin-muted)]">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-status-badge ${getAlertLabel(order) !== 'Bình thường' ? 'warning' : ''}`}>
                          {getAlertLabel(order)}
                        </span>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`admin-inline-button ${isSelected ? 'is-active' : ''}`}
                            onClick={() => setSelectedOrderId((prev) => (prev === order.id ? null : order.id))}
                          >
                            <Eye className="h-4 w-4" />
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có đơn phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Chi tiết đơn và lịch sử xử lý</h2>
            <p className="admin-section__description">
              {selectedOrder ? `Đang xem ${selectedOrder.orderNumber}` : 'Chọn nút "Chi tiết" ở bảng trên để xem thông tin đơn.'}
            </p>
          </div>
        </div>

        {selectedOrder ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin khách hàng</p>
              <p className="text-xs text-[var(--admin-muted)]">{selectedOrder.customerName?.trim() || `Khách #${selectedOrder.id}`}</p>
              <p className="text-xs text-[var(--admin-muted)]">{selectedOrder.customerPhone?.trim() || 'Chưa có số điện thoại'}</p>
              <p className="text-xs text-[var(--admin-muted)]">Xem chi tiết giao hàng ở màn hình xử lý đơn staff nếu cần đối soát.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Tình trạng đơn</p>
              <p className="text-xs text-[var(--admin-muted)]">Mã đơn: {selectedOrder.orderNumber}</p>
              <p className="text-xs text-[var(--admin-muted)]">Seller: {getOrderSellerLabel(selectedOrder)}</p>
              <p className="text-xs text-[var(--admin-muted)]">Tổng tiền: {formatCurrency(selectedOrder.total)}</p>
              <p className="text-xs text-[var(--admin-muted)]">Thanh toán: {paymentStatusLabels[selectedOrder.paymentStatus] ?? selectedOrder.paymentStatus}</p>
              <p className="text-xs text-[var(--admin-muted)]">Vận chuyển: {shippingStatusLabel(selectedOrder.status)}</p>
              <p className="text-xs text-[var(--admin-muted)]">
                Chuyển tiền NB:{' '}
                {selectedOrder.sellerPaid
                  ? `Đã chuyển${selectedOrder.sellerPaidAt ? ` — ${new Date(selectedOrder.sellerPaidAt).toLocaleString('vi-VN')}` : ''}`
                  : isAwaitingPayout(selectedOrder)
                    ? 'Chờ chuyển tiền'
                    : '—'}
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Lịch sử xử lý</p>
              {timeline.map((event, index) => (
                <div key={`${event.at}-${index}`} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2">
                  <p className="text-xs font-medium text-[var(--admin-text)]">{event.action}</p>
                  <p className="text-[11px] text-[var(--admin-muted)]">
                    {formatDateTime(event.at)} • {event.by}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <label className="text-sm text-[var(--admin-muted)]">
            Ghi chú nội bộ / phối hợp vận hành
            <textarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="admin-input mt-1 h-24 resize-y py-2"
              placeholder="Ghi chú cho staff vận hành, lý do từ chối, yêu cầu đổi trả..."
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default AdminOrdersPage;
