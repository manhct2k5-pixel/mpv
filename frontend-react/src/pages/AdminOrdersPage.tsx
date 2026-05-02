import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Save, ShieldCheck } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import { ADMIN_DEMO_MODE } from '../services/adminDemo.ts';
import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment';
import type { OrderSummary } from '../types/store';

type OrderMonitorTab = 'all' | 'pending' | 'shipping' | 'completed' | 'cancelled' | 'complaint' | 'refund';

const ORDER_TABS: Array<{ id: OrderMonitorTab; label: string }> = [
  { id: 'all', label: 'Tất cả đơn' },
  { id: 'pending', label: 'Chờ xử lý' },
  { id: 'shipping', label: 'Đang giao' },
  { id: 'completed', label: 'Hoàn thành' },
  { id: 'cancelled', label: 'Bị hủy' },
  { id: 'complaint', label: 'Có khiếu nại' },
  { id: 'refund', label: 'Hoàn tiền' }
];

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'processing', label: 'Đang chuẩn bị' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'packing', label: 'Đang đóng gói' },
  { value: 'shipped', label: 'Đang giao' },
  { value: 'delivered', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' }
];

const formatDateTime = (value: string) => new Date(value).toLocaleString('vi-VN');
const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

const shippingStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (['pending', 'processing', 'confirmed', 'packing'].includes(normalized)) return 'Đang chuẩn bị';
  if (normalized === 'shipped') return 'Đang giao';
  if (normalized === 'delivered') return 'Đã giao';
  if (normalized === 'cancelled') return 'Đã hủy';
  return 'Theo dõi';
};

const statusBadgeLabel = (status: string) => {
  const normalized = status.toLowerCase();
  const match = ORDER_STATUS_OPTIONS.find((option) => option.value === normalized);
  return match?.label ?? status;
};

const matchTab = (order: OrderSummary, tab: OrderMonitorTab) => {
  const status = order.status.toLowerCase();
  const paymentStatus = order.paymentStatus.toLowerCase();
  if (tab === 'all') return true;
  if (tab === 'pending') return ['pending', 'processing', 'confirmed', 'packing'].includes(status);
  if (tab === 'shipping') return status === 'shipped';
  if (tab === 'completed') return status === 'delivered';
  if (tab === 'cancelled') return status === 'cancelled';
  if (tab === 'refund') return paymentStatus === 'refunded';
  if (tab === 'complaint') return status.includes('return') || status.includes('complaint') || paymentStatus === 'refunded';
  return true;
};

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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});
  const [internalNote, setInternalNote] = useState('');

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'monitor'],
    queryFn: () => financeApi.admin.orders(),
    refetchInterval: 5_000
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: number) => financeApi.admin.confirmOrderPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    }
  });

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchTab(order, activeTab)) return false;
      if (!normalizedQuery) return true;
      const haystack = `${order.orderNumber} ${order.status} ${order.paymentStatus} ${order.paymentMethod}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activeTab, orders, query]);

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
      all: orders.length,
      pending: 0,
      shipping: 0,
      completed: 0,
      cancelled: 0,
      complaint: 0,
      refund: 0
    } satisfies Record<OrderMonitorTab, number>;

    orders.forEach((order) => {
      (Object.keys(base) as OrderMonitorTab[]).forEach((tab) => {
        if (tab !== 'all' && matchTab(order, tab)) {
          base[tab] += 1;
        }
      });
    });
    return base;
  }, [orders]);

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Giám sát đơn hàng</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Theo dõi và can thiệp đơn hàng toàn hệ thống</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            {ADMIN_DEMO_MODE
              ? 'Demo mode: thay đổi trạng thái và xác nhận thanh toán chỉ mô phỏng trên trình duyệt này. Các block khách hàng/timeline bên dưới là dữ liệu minh họa.'
              : 'Kiểm soát đơn theo trạng thái vận hành, xác minh thanh toán và xử lý ngoại lệ trực tiếp trên cùng một màn hình.'}
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bộ lọc trạng thái đơn</h2>
            <p className="admin-section__description">Chọn tab để ưu tiên xử lý các nhóm đơn cần can thiệp.</p>
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

        <div className="mb-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo mã đơn, trạng thái đơn, trạng thái thanh toán..."
          />
        </div>

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
                  const isConfirmingPayment =
                    confirmPaymentMutation.isPending && confirmPaymentMutation.variables === order.id;
                  const isSelected = selectedOrderId === order.id;
                  const paymentMethod = paymentMethodLabels[order.paymentMethod] ?? order.paymentMethod;
                  const paymentStatus = paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus;

                  return (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{`Khách demo #${order.id}`}</td>
                      <td>{`Shop demo #${(order.id % 7) + 1}`}</td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>{`${paymentMethod} · ${paymentStatus}`}</td>
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
                            {ORDER_STATUS_OPTIONS.map((option) => (
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
                        <span className={`admin-status-badge ${getAlertLabel(order) !== 'Bình thường' ? 'warning' : ''}`}>
                          {getAlertLabel(order)}
                        </span>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' ? (
                            <button
                              type="button"
                              className="admin-action-button success"
                              disabled={isConfirmingPayment}
                              onClick={() => confirmPaymentMutation.mutate(order.id)}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {isConfirmingPayment ? 'Đang xác nhận...' : 'Xác nhận CK'}
                            </button>
                          ) : null}
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
                    <td colSpan={10} className="text-center text-sm text-[var(--admin-muted)]">
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
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin khách hàng minh họa</p>
              <p className="text-xs text-[var(--admin-muted)]">{`Khách demo #${selectedOrder.id}`}</p>
              <p className="text-xs text-[var(--admin-muted)]">{`SĐT demo: 09${String(10000000 + selectedOrder.id).slice(-8)}`}</p>
              <p className="text-xs text-[var(--admin-muted)]">Địa chỉ demo: 125 Nguyễn Trãi, Quận 1, TP.HCM</p>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Tình trạng đơn</p>
              <p className="text-xs text-[var(--admin-muted)]">Mã đơn: {selectedOrder.orderNumber}</p>
              <p className="text-xs text-[var(--admin-muted)]">Tổng tiền: {formatCurrency(selectedOrder.total)}</p>
              <p className="text-xs text-[var(--admin-muted)]">Thanh toán: {paymentStatusLabels[selectedOrder.paymentStatus] ?? selectedOrder.paymentStatus}</p>
              <p className="text-xs text-[var(--admin-muted)]">Vận chuyển: {shippingStatusLabel(selectedOrder.status)}</p>
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
