import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, staffApi, storeApi } from '../services/api.ts';
import type { Order, OrderSummary, StaffOrderWorkState, StaffQcState } from '../types/store';
import { normalizeOrderStatus, orderStatusLabels } from '../utils/orderStatus.ts';

const defaultStaffQcState: StaffQcState = {
  checkQuantity: false,
  checkModel: false,
  checkVisual: false,
  checkAccessories: false,
  issueNote: '',
  packageType: 'Hộp carton tiêu chuẩn',
  weight: '',
  dimensions: '',
  packageNote: '',
  status: 'pending'
};

const statusLabel: Record<StaffQcState['status'], string> = {
  pending: 'Chờ QC',
  passed: 'QC đạt',
  failed: 'QC lỗi',
  packing: 'Đang đóng gói',
  packed: 'Đóng gói hoàn tất'
};

const StaffQCPackingPage = () => {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
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
    queryKey: ['staff-qc-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null
  });

  const { data: workStates = [] } = useQuery({
    queryKey: ['staff-work-states'],
    queryFn: staffApi.orderWorkStates,
    enabled: isAdmin || staffId != null,
    refetchInterval: 5_000
  });

  const qcByOrder = useMemo(() => {
    const next: Record<number, StaffQcState> = {};
    workStates.forEach((state) => {
      next[state.orderId] = state.qc;
    });
    return next;
  }, [workStates]);

  const candidateOrders = useMemo(
    () =>
      orders.filter((order) => {
        const status = normalizeOrderStatus(order.status);
        return status === 'confirmed';
      }),
    [orders]
  );

  const { data: orderDetail } = useQuery<Order>({
    queryKey: ['staff-qc-order-detail', selectedOrderId],
    queryFn: () => storeApi.order(selectedOrderId as number),
    enabled: selectedOrderId != null
  });

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) => storeApi.updateOrderStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-qc-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-layout-orders'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không cập nhật được trạng thái đơn.');
    }
  });

  const updateQcMutation = useMutation({
    mutationFn: (payload: { orderId: number; patch: Partial<StaffQcState> }) =>
      staffApi.updateOrderWorkState(payload.orderId, { qc: payload.patch }),
    onSuccess: (updated) => {
      queryClient.setQueryData<StaffOrderWorkState[]>(['staff-work-states'], (current = []) => {
        const exists = current.some((state) => state.orderId === updated.orderId);
        return exists
          ? current.map((state) => (state.orderId === updated.orderId ? updated : state))
          : [...current, updated];
      });
      queryClient.invalidateQueries({ queryKey: ['staff-work-states'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không lưu được QC vào backend.');
    }
  });

  const selectedOrder = useMemo(
    () => candidateOrders.find((order) => order.id === selectedOrderId) ?? null,
    [candidateOrders, selectedOrderId]
  );

  const currentQc = selectedOrderId != null ? qcByOrder[selectedOrderId] ?? defaultStaffQcState : defaultStaffQcState;
  const isQcPassed = currentQc.checkQuantity && currentQc.checkModel && currentQc.checkVisual && currentQc.checkAccessories;
  const isPackagingReady =
    currentQc.packageType.trim() !== '' && currentQc.weight.trim() !== '' && currentQc.dimensions.trim() !== '';
  const canConfirmPacked =
    selectedOrder != null &&
    normalizeOrderStatus(selectedOrder.status) === 'confirmed' &&
    currentQc.status === 'passed' &&
    isQcPassed &&
    isPackagingReady &&
    !updateStatusMutation.isPending;

  const updateQcState = (patch: Partial<StaffQcState>) => {
    if (selectedOrderId == null) return;
    updateQcMutation.mutate({ orderId: selectedOrderId, patch });
  };

  const markQcPassed = () => {
    if (!isQcPassed) {
      setStatusMessage('Cần hoàn tất đủ 4 checklist QC trước khi xác nhận đạt.');
      return;
    }
    updateQcState({ status: 'passed' });
    setStatusMessage('Đã xác nhận đơn đạt QC.');
  };

  const markQcFailed = () => {
    updateQcState({ status: 'failed' });
    setStatusMessage('Đã ghi nhận lỗi QC. Vui lòng bổ sung mô tả lỗi chi tiết.');
  };

  const markReturnShop = () => {
    updateQcState({ status: 'failed' });
    setStatusMessage('Đã đánh dấu hoàn về shop/kho để xử lý tiếp.');
  };

  const confirmPacked = () => {
    if (selectedOrder == null) return;
    const currentStatus = normalizeOrderStatus(selectedOrder.status);

    if (currentStatus === 'packing') {
      updateQcState({ status: 'packed' });
      setStatusMessage(`Đơn ${selectedOrder.orderNumber} đã ở trạng thái "${orderStatusLabels.packing}".`);
      return;
    }

    if (currentStatus !== 'confirmed') {
      const label = currentStatus ? orderStatusLabels[currentStatus] : selectedOrder.status;
      setStatusMessage(`Đơn ${selectedOrder.orderNumber} đang ở trạng thái "${label}", chưa thể xác nhận đóng gói.`);
      return;
    }

    if (currentQc.status !== 'passed' || !isQcPassed) {
      setStatusMessage(`Đơn ${selectedOrder.orderNumber} chưa hoàn tất bước QC đạt, chưa thể xác nhận đóng gói.`);
      return;
    }

    if (!isPackagingReady) {
      setStatusMessage(`Cần nhập đủ loại bao bì, cân nặng và kích thước trước khi xác nhận đóng gói.`);
      return;
    }

    setStatusMessage(null);
    updateStatusMutation.mutate(
      { id: selectedOrder.id, status: 'packing' },
      {
        onSuccess: () => {
          updateQcState({ status: 'packed' });
          setStatusMessage(`Đã xác nhận đóng gói hoàn tất cho đơn ${selectedOrder.orderNumber}.`);
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Đóng gói & QC</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">
            Kiểm soát chất lượng trước khi bàn giao
          </h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Kiểm số lượng, đúng mẫu, ngoại quan, phụ kiện và hoàn tất thông tin đóng gói để giảm sai sót vận hành.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách đơn chờ QC</h2>
            <p className="admin-section__description">Chọn đơn để thực hiện kiểm tra chất lượng và đóng gói.</p>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách đơn...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được dữ liệu đơn cho QC.</p> : null}
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
              <p className="text-sm text-[var(--admin-muted)]">Không có đơn ở bước chờ QC.</p>
            ) : null}
          </div>
        ) : null}

        {statusMessage ? <p className="text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}

        {selectedOrder && orderDetail ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin đơn</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>Mã đơn: {selectedOrder.orderNumber}</p>
                <p>Số sản phẩm: {selectedOrder.itemCount}</p>
                <p>Kho xuất: Kho trung tâm</p>
                <p>Người bán: Seller-{(selectedOrder.id % 7) + 1}</p>
              </div>
              <div className="mt-3 space-y-2">
                {orderDetail.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs">
                    <p className="font-medium text-[var(--admin-text)]">{item.productName ?? `SP #${item.productId}`}</p>
                    <p className="text-[var(--admin-muted)]">
                      {item.size ?? '--'} / {item.color ?? '--'} • SL {item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Checklist QC</p>
              <div className="mt-2 space-y-2 text-sm text-[var(--admin-text)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentQc.checkQuantity}
                    onChange={(event) => updateQcState({ checkQuantity: event.target.checked })}
                  />
                  Kiểm đủ số lượng
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentQc.checkModel}
                    onChange={(event) => updateQcState({ checkModel: event.target.checked })}
                  />
                  Kiểm đúng mẫu
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentQc.checkVisual}
                    onChange={(event) => updateQcState({ checkVisual: event.target.checked })}
                  />
                  Kiểm ngoại quan
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentQc.checkAccessories}
                    onChange={(event) => updateQcState({ checkAccessories: event.target.checked })}
                  />
                  Kiểm phụ kiện đi kèm
                </label>
              </div>
              <textarea
                value={currentQc.issueNote}
                onChange={(event) => updateQcState({ issueNote: event.target.value })}
                className="admin-input mt-3 h-20 resize-y py-2"
                placeholder="Ghi chú lỗi (nếu có)..."
              />
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Đóng gói</p>
              <div className="mt-2 space-y-2">
                <input
                  value={currentQc.packageType}
                  onChange={(event) => updateQcState({ packageType: event.target.value })}
                  className="admin-input"
                  placeholder="Loại bao bì"
                />
                <input
                  value={currentQc.weight}
                  onChange={(event) => updateQcState({ weight: event.target.value })}
                  className="admin-input"
                  placeholder="Cân nặng (kg)"
                />
                <input
                  value={currentQc.dimensions}
                  onChange={(event) => updateQcState({ dimensions: event.target.value })}
                  className="admin-input"
                  placeholder="Kích thước kiện"
                />
                <textarea
                  value={currentQc.packageNote}
                  onChange={(event) => updateQcState({ packageNote: event.target.value })}
                  className="admin-input h-20 resize-y py-2"
                  placeholder="Ghi chú đóng gói..."
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="admin-action-button success" disabled={!isQcPassed} onClick={markQcPassed}>
                  Xác nhận đạt QC
                </button>
                <button type="button" className="admin-action-button danger" onClick={markQcFailed}>
                  Báo lỗi sản phẩm
                </button>
                <button type="button" className="admin-inline-button" onClick={markReturnShop}>
                  Hoàn về shop/kho
                </button>
                <button
                  type="button"
                  className="admin-inline-button"
                  disabled={!canConfirmPacked}
                  onClick={confirmPacked}
                >
                  Xác nhận đã đóng gói
                </button>
              </div>

              <p className="mt-2 text-xs text-[var(--admin-muted)]">Trạng thái hiện tại: {statusLabel[currentQc.status]}</p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Checklist QC và ghi chú đóng gói được lưu vào database theo mã đơn hàng.
              </p>
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chọn đơn để bắt đầu thao tác QC.</p>
        )}
      </section>
    </div>
  );
};

export default StaffQCPackingPage;
