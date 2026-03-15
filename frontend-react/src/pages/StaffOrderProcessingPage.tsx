import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import type { Order, OrderSummary } from '../types/store';
import {
  getTargetStatusForPackingFlow,
  normalizeOrderStatus,
  orderStatusLabels
} from '../utils/orderStatus.ts';

type PriorityLevel = 'high' | 'normal' | 'low';
type DateFilter = 'all' | 'today' | '7d' | '30d';

const toPriority = (order: OrderSummary): PriorityLevel => {
  const status = order.status.toLowerCase();
  const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
  if ((status === 'pending' && ageHours >= 24) || order.paymentStatus.toLowerCase() === 'unpaid') return 'high';
  if (status === 'processing' || status === 'confirmed') return 'normal';
  return 'low';
};

const matchDateFilter = (value: string, filter: DateFilter) => {
  if (filter === 'all') return true;
  const created = new Date(value).getTime();
  const now = Date.now();
  const diff = now - created;
  if (filter === 'today') {
    const d1 = new Date(value).toDateString();
    const d2 = new Date().toDateString();
    return d1 === d2;
  }
  if (filter === '7d') return diff <= 7 * 24 * 60 * 60 * 1000;
  if (filter === '30d') return diff <= 30 * 24 * 60 * 60 * 1000;
  return true;
};

const StaffOrderProcessingPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const focusId = Number(searchParams.get('focus') ?? 0);

  const [orderCodeQuery, setOrderCodeQuery] = useState(initialQ);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sellerFilter, setSellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [assignedOrders, setAssignedOrders] = useState<Record<number, string>>({});
  const [postponedOrders, setPostponedOrders] = useState<Record<number, boolean>>({});
  const [internalNotes, setInternalNotes] = useState<Record<number, string>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(focusId || null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const staffId = profile?.id != null ? Number(profile.id) : null;
  const assigneeName = profile?.fullName?.trim() || 'Nhân viên vận hành';

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['staff-orders-processing', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null
  });

  const { data: selectedOrderDetail } = useQuery<Order>({
    queryKey: ['staff-order-detail', selectedOrderId],
    queryFn: () => storeApi.order(selectedOrderId as number),
    enabled: selectedOrderId != null
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) => storeApi.updateOrderStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-orders-processing'] });
      queryClient.invalidateQueries({ queryKey: ['staff-layout-orders'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không cập nhật được trạng thái đơn.');
    }
  });

  useEffect(() => {
    setOrderCodeQuery(initialQ);
  }, [initialQ]);

  const visibleOrders = useMemo(() => {
    const query = orderCodeQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const status = order.status.toLowerCase();
      const priority = toPriority(order);
      const pseudoSeller = `seller-${(order.id % 7) + 1}`;
      const matchesCode = !query || order.orderNumber.toLowerCase().includes(query);
      const matchesDate = matchDateFilter(order.createdAt, dateFilter);
      const matchesSeller = !sellerFilter.trim() || pseudoSeller.includes(sellerFilter.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || priority === priorityFilter;
      return matchesCode && matchesDate && matchesSeller && matchesStatus && matchesPriority;
    });
  }, [dateFilter, orderCodeQuery, orders, priorityFilter, sellerFilter, statusFilter]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedOrderId, visibleOrders]
  );

  const handleAssign = (order: OrderSummary) => {
    setAssignedOrders((prev) => ({ ...prev, [order.id]: assigneeName }));
    setPostponedOrders((prev) => ({ ...prev, [order.id]: false }));
    const normalizedStatus = normalizeOrderStatus(order.status);
    if (isAdmin && normalizedStatus === 'pending') {
      updateStatusMutation.mutate({ id: order.id, status: 'processing' });
      setStatusMessage(`Đã nhận đơn ${order.orderNumber} và cập nhật trạng thái "Đang xử lý nội bộ".`);
    } else {
      setStatusMessage(`Đã nhận đơn ${order.orderNumber} cho ca trực hiện tại.`);
    }
  };

  const handleMoveToPacking = (order: OrderSummary) => {
    setStatusMessage(null);
    const targetStatus = getTargetStatusForPackingFlow(order.status, isAdmin);
    if (!targetStatus) {
      const normalized = normalizeOrderStatus(order.status);
      const label = normalized ? orderStatusLabels[normalized] : order.status;
      setStatusMessage(`Đơn ${order.orderNumber} đang ở trạng thái "${label}", chưa thể chuyển bước tiếp theo.`);
      return;
    }

    updateStatusMutation.mutate(
      { id: order.id, status: targetStatus },
      {
        onSuccess: () => {
          setStatusMessage(`Đơn ${order.orderNumber} đã chuyển sang "${orderStatusLabels[targetStatus]}".`);
        }
      }
    );
  };

  const handlePostpone = (order: OrderSummary) => {
    setPostponedOrders((prev) => ({ ...prev, [order.id]: true }));
    setStatusMessage(`Đã tạm hoãn đơn ${order.orderNumber}.`);
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Xử lý đơn nội bộ</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Tiếp nhận và điều phối đơn mới</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Kiểm tra nhanh thông tin đơn, nhận xử lý, chuyển bước đóng gói và theo dõi chi tiết từng đơn nội bộ.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bộ lọc đơn hàng</h2>
            <p className="admin-section__description">Lọc theo mã đơn, ngày tạo, người bán, trạng thái và mức ưu tiên.</p>
          </div>
        </div>
        <div className="grid gap-2 lg:grid-cols-5">
          <input
            value={orderCodeQuery}
            onChange={(event) => {
              setOrderCodeQuery(event.target.value);
              const next = new URLSearchParams(searchParams);
              if (event.target.value.trim()) next.set('q', event.target.value.trim());
              else next.delete('q');
              setSearchParams(next, { replace: true });
            }}
            className="admin-input"
            placeholder="Mã đơn"
          />
          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="admin-select">
            <option value="all">Mọi thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="30d">30 ngày gần nhất</option>
          </select>
          <input
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
            className="admin-input"
            placeholder="Người bán (seller-1...)"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="admin-select">
            <option value="all">Mọi trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="processing">Đang xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="packing">Đang đóng gói</option>
            <option value="shipped">Đang giao</option>
            <option value="delivered">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as 'all' | PriorityLevel)}
            className="admin-select"
          >
            <option value="all">Mọi mức ưu tiên</option>
            <option value="high">Ưu tiên cao</option>
            <option value="normal">Ưu tiên thường</option>
            <option value="low">Ưu tiên thấp</option>
          </select>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách đơn xử lý nội bộ</h2>
            <p className="admin-section__description">Kết quả: {visibleOrders.length} đơn.</p>
          </div>
        </div>
        {statusMessage ? <p className="mb-3 text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}
        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách đơn...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được danh sách đơn.</p> : null}
        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Tên khách hàng</th>
                  <th>Số sản phẩm</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái hiện tại</th>
                  <th>Người phụ trách</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  (() => {
                    const nextStatus = getTargetStatusForPackingFlow(order.status, isAdmin);
                    const nextStatusLabel = nextStatus ? orderStatusLabels[nextStatus] : null;
                    return (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{`Khách #${order.id}`}</td>
                        <td>{order.itemCount}</td>
                        <td>{order.total.toLocaleString('vi-VN')} đ</td>
                        <td>
                          <span className={`admin-status-badge ${toPriority(order) === 'high' ? 'warning' : ''}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{assignedOrders[order.id] ?? '--'}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="admin-inline-button" onClick={() => handleAssign(order)}>
                              Nhận đơn
                            </button>
                            <button
                              type="button"
                              className="admin-inline-button"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              Xem chi tiết
                            </button>
                            <button
                              type="button"
                              className="admin-action-button success"
                              title={nextStatusLabel ? `Bước tiếp theo: ${nextStatusLabel}` : 'Không có bước kế tiếp hợp lệ'}
                              disabled={updateStatusMutation.isPending || !nextStatus}
                              onClick={() => handleMoveToPacking(order)}
                            >
                              Chuyển bước kế tiếp
                            </button>
                            <button type="button" className="admin-action-button danger" onClick={() => handlePostpone(order)}>
                              Tạm hoãn
                            </button>
                          </div>
                          {postponedOrders[order.id] ? (
                            <p className="mt-1 text-[11px] text-[var(--admin-warning)]">Đơn đang tạm hoãn xử lý.</p>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })()
                ))}
                {visibleOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có đơn phù hợp bộ lọc.
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
            <h2 className="admin-section__title">Chi tiết đơn hàng</h2>
            <p className="admin-section__description">
              {selectedOrder ? `Đơn đang mở: ${selectedOrder.orderNumber}` : 'Chọn một đơn để xem chi tiết.'}
            </p>
          </div>
        </div>

        {selectedOrder && selectedOrderDetail ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin khách hàng</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>{selectedOrderDetail.shippingAddress?.fullName ?? `Khách #${selectedOrder.id}`}</p>
                <p>{selectedOrderDetail.shippingAddress?.phone ?? '--'}</p>
                <p>
                  {selectedOrderDetail.shippingAddress?.addressLine1 ?? '--'}
                  {selectedOrderDetail.shippingAddress?.district
                    ? `, ${selectedOrderDetail.shippingAddress?.district}`
                    : ''}
                  {selectedOrderDetail.shippingAddress?.city ? `, ${selectedOrderDetail.shippingAddress?.city}` : ''}
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin đơn</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>Trạng thái thanh toán: {selectedOrderDetail.paymentStatus}</p>
                <p>Trạng thái đơn: {selectedOrderDetail.status}</p>
                <p>Tổng tiền: {selectedOrderDetail.total.toLocaleString('vi-VN')} đ</p>
                <p>Ghi chú khách: {selectedOrderDetail.shippingAddress?.note ?? '--'}</p>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 lg:col-span-2">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Danh sách sản phẩm</p>
              <div className="mt-2 space-y-2">
                {selectedOrderDetail.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs text-[var(--admin-muted)]"
                  >
                    <p className="font-medium text-[var(--admin-text)]">{item.productName ?? `SP #${item.productId}`}</p>
                    <p>
                      {item.size ?? '--'} / {item.color ?? '--'} • SL: {item.quantity} •{' '}
                      {item.lineTotal.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 lg:col-span-2">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Ghi chú nội bộ</p>
              <textarea
                value={internalNotes[selectedOrder.id] ?? ''}
                onChange={(event) =>
                  setInternalNotes((prev) => ({
                    ...prev,
                    [selectedOrder.id]: event.target.value
                  }))
                }
                className="admin-input mt-2 h-24 resize-y py-2"
                placeholder="Ghi chú cho bước xử lý tiếp theo..."
              />
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chưa có đơn nào được chọn.</p>
        )}
      </section>
    </div>
  );
};

export default StaffOrderProcessingPage;
