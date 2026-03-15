import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import type { Order, OrderSummary } from '../types/store';

type ShippingDraft = {
  carrier: string;
  service: string;
  fee: string;
  eta: string;
};

type WaybillState = {
  code: string;
  createdAt: string;
  connected: boolean;
};

const defaultDraft: ShippingDraft = {
  carrier: 'GHN',
  service: 'Giao tiêu chuẩn',
  fee: '32000',
  eta: '2-3 ngày'
};

const StaffShipmentPage = () => {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [shippingDraft, setShippingDraft] = useState<ShippingDraft>(defaultDraft);
  const [waybillMap, setWaybillMap] = useState<Record<number, WaybillState>>({});
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

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['staff-shipment-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null
  });

  const candidateOrders = useMemo(
    () => orders.filter((order) => ['packing', 'shipped'].includes(order.status.toLowerCase())),
    [orders]
  );

  const { data: orderDetail } = useQuery<Order>({
    queryKey: ['staff-shipment-order-detail', selectedOrderId],
    queryFn: () => storeApi.order(selectedOrderId as number),
    enabled: selectedOrderId != null
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) => storeApi.updateOrderStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shipment-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-layout-orders'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không thể cập nhật bàn giao vận chuyển.');
    }
  });

  const selectedOrder = useMemo(
    () => candidateOrders.find((order) => order.id === selectedOrderId) ?? null,
    [candidateOrders, selectedOrderId]
  );

  const activeWaybill = selectedOrderId != null ? waybillMap[selectedOrderId] : null;

  const createWaybill = () => {
    if (selectedOrder == null) return;
    const code = `VD-${selectedOrder.id}-${Date.now().toString().slice(-6)}`;
    setWaybillMap((prev) => ({
      ...prev,
      [selectedOrder.id]: {
        code,
        connected: true,
        createdAt: new Date().toISOString()
      }
    }));
    setStatusMessage(`Đã tạo vận đơn ${code} cho đơn ${selectedOrder.orderNumber}.`);
  };

  const confirmHandover = () => {
    if (selectedOrder == null) return;
    setStatusMessage(null);
    updateStatusMutation.mutate(
      { id: selectedOrder.id, status: 'shipped' },
      {
        onSuccess: () => {
          setStatusMessage(`Đã xác nhận bàn giao vận chuyển cho đơn ${selectedOrder.orderNumber}.`);
        }
      }
    );
  };

  const cancelWaybill = () => {
    if (selectedOrder == null) return;
    setWaybillMap((prev) => {
      const next = { ...prev };
      delete next[selectedOrder.id];
      return next;
    });
    setStatusMessage(`Đã hủy vận đơn cho đơn ${selectedOrder.orderNumber}.`);
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Vận đơn & Bàn giao</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">
            Tạo vận đơn và bàn giao cho đơn vị vận chuyển
          </h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Chọn đơn đã đóng gói, tạo mã vận đơn, in phiếu và xác nhận bàn giao để chuyển trạng thái sang đang giao.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách đơn chờ tạo vận đơn</h2>
            <p className="admin-section__description">Ưu tiên các đơn đã đóng gói để bàn giao đúng tiến độ.</p>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách đơn...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được dữ liệu đơn vận chuyển.</p> : null}
        {!isLoading && !isError ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {candidateOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className={`admin-inline-button ${selectedOrderId === order.id ? 'is-active' : ''}`}
              >
                {order.orderNumber}
              </button>
            ))}
            {candidateOrders.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">Không có đơn chờ bàn giao vận chuyển.</p>
            ) : null}
          </div>
        ) : null}

        {statusMessage ? <p className="mb-3 text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}

        {selectedOrder && orderDetail ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin đơn hàng</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>Mã đơn: {selectedOrder.orderNumber}</p>
                <p>Người nhận: {orderDetail.shippingAddress?.fullName ?? `Khách #${selectedOrder.id}`}</p>
                <p>SĐT: {orderDetail.shippingAddress?.phone ?? '--'}</p>
                <p>
                  Địa chỉ: {orderDetail.shippingAddress?.addressLine1 ?? '--'}
                  {orderDetail.shippingAddress?.district ? `, ${orderDetail.shippingAddress?.district}` : ''}
                  {orderDetail.shippingAddress?.city ? `, ${orderDetail.shippingAddress?.city}` : ''}
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin kiện hàng</p>
              <div className="mt-2 space-y-2">
                <input
                  value={shippingDraft.carrier}
                  onChange={(event) => setShippingDraft((prev) => ({ ...prev, carrier: event.target.value }))}
                  className="admin-input"
                  placeholder="Đơn vị vận chuyển"
                />
                <input
                  value={shippingDraft.service}
                  onChange={(event) => setShippingDraft((prev) => ({ ...prev, service: event.target.value }))}
                  className="admin-input"
                  placeholder="Loại giao hàng"
                />
                <input
                  value={shippingDraft.fee}
                  onChange={(event) => setShippingDraft((prev) => ({ ...prev, fee: event.target.value }))}
                  className="admin-input"
                  placeholder="Phí vận chuyển"
                />
                <input
                  value={shippingDraft.eta}
                  onChange={(event) => setShippingDraft((prev) => ({ ...prev, eta: event.target.value }))}
                  className="admin-input"
                  placeholder="Dự kiến giao"
                />
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Kết quả vận đơn</p>
              {activeWaybill ? (
                <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                  <p>Mã vận đơn: {activeWaybill.code}</p>
                  <p>Kết nối hãng: {activeWaybill.connected ? 'Thành công' : 'Lỗi kết nối'}</p>
                  <p>Thời gian tạo: {new Date(activeWaybill.createdAt).toLocaleString('vi-VN')}</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--admin-muted)]">Chưa tạo vận đơn cho đơn này.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="admin-action-button success" onClick={createWaybill}>
                  Tạo vận đơn
                </button>
                <button
                  type="button"
                  className="admin-inline-button"
                  onClick={() => setStatusMessage('Đã gửi lệnh in phiếu giao hàng.')}
                >
                  <Printer className="h-4 w-4" />
                  In phiếu
                </button>
                <button
                  type="button"
                  className="admin-inline-button"
                  disabled={updateStatusMutation.isPending}
                  onClick={confirmHandover}
                >
                  Xác nhận bàn giao
                </button>
                <button type="button" className="admin-action-button danger" onClick={cancelWaybill}>
                  Hủy vận đơn
                </button>
              </div>
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chọn đơn để tạo vận đơn và bàn giao.</p>
        )}
      </section>
    </div>
  );
};

export default StaffShipmentPage;
