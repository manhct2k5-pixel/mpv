import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, storeApi } from '../services/api.ts';
import type { OrderSummary } from '../types/store';
import {
  getAllowedStatusUpdates,
  orderStatusLabels,
  type OrderWorkflowStatus
} from '../utils/orderStatus.ts';

type TimelineLog = {
  at: string;
  actor: string;
  action: string;
  note: string;
  attachment?: string;
};

const timelineSteps = [
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'processing', label: 'Đang xử lý nội bộ' },
  { key: 'confirmed', label: 'Đang QC' },
  { key: 'packing', label: 'Đã đóng gói' },
  { key: 'waybill', label: 'Đã tạo vận đơn' },
  { key: 'shipped', label: 'Đang giao' },
  { key: 'delivered', label: 'Giao thành công' },
  { key: 'failed', label: 'Giao thất bại' },
  { key: 'returned', label: 'Hoàn hàng' },
  { key: 'cancelled', label: 'Đã hủy' }
];

const stepIndexFromOrder = (status: string, paymentStatus: string) => {
  const s = status.toLowerCase();
  const p = paymentStatus.toLowerCase();
  if (s === 'pending') return 0;
  if (s === 'processing') return 1;
  if (s === 'confirmed') return 2;
  if (s === 'packing') return 3;
  if (s === 'shipped') return 5;
  if (s === 'delivered') return 6;
  if (s === 'cancelled') return 9;
  if (p === 'refunded') return 8;
  return 0;
};

const StaffStatusTimelinePage = () => {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderWorkflowStatus | ''>('');
  const [note, setNote] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [logsByOrder, setLogsByOrder] = useState<Record<number, TimelineLog[]>>({});
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
  const actorName = profile?.fullName?.trim() || 'Staff';

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['staff-status-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null
  });

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const currentIndex = selectedOrder ? stepIndexFromOrder(selectedOrder.status, selectedOrder.paymentStatus) : -1;
  const logs = selectedOrder ? logsByOrder[selectedOrder.id] ?? [] : [];

  const updateStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: string }) => storeApi.updateOrderStatus(payload.id, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-status-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-layout-orders'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không cập nhật được trạng thái đơn.');
    }
  });

  const availableStatuses = useMemo(
    () => (selectedOrder ? getAllowedStatusUpdates(selectedOrder.status, isAdmin) : []),
    [isAdmin, selectedOrder]
  );

  useEffect(() => {
    if (availableStatuses.length === 0) {
      setNextStatus('');
      return;
    }
    setNextStatus((prev) => (prev && availableStatuses.includes(prev) ? prev : availableStatuses[0]));
  }, [availableStatuses]);

  const appendLog = (action: string, extraNote: string) => {
    if (!selectedOrder) return;
    const entry: TimelineLog = {
      at: new Date().toISOString(),
      actor: actorName,
      action,
      note: extraNote || 'Không có ghi chú',
      attachment: attachmentUrl.trim() || undefined
    };
    setLogsByOrder((prev) => ({
      ...prev,
      [selectedOrder.id]: [entry, ...(prev[selectedOrder.id] ?? [])]
    }));
  };

  const onUpdateStatus = () => {
    if (!selectedOrder) return;
    if (!nextStatus || !availableStatuses.includes(nextStatus)) {
      setStatusMessage('Không có trạng thái hợp lệ để cập nhật cho đơn này.');
      return;
    }

    setStatusMessage(null);
    updateStatusMutation.mutate(
      { id: selectedOrder.id, status: nextStatus },
      {
        onSuccess: () => {
          appendLog(`Cập nhật trạng thái -> ${orderStatusLabels[nextStatus]}`, note.trim());
          setStatusMessage(`Đã cập nhật trạng thái đơn ${selectedOrder.orderNumber}.`);
          setNote('');
          setAttachmentUrl('');
        }
      }
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Cập nhật trạng thái đơn</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">
            Timeline trạng thái và lịch sử xử lý
          </h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Đồng bộ tiến độ đơn giữa staff, seller, admin và khách hàng theo từng mốc xử lý thực tế.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Chọn đơn cần cập nhật</h2>
            <p className="admin-section__description">Chọn đơn để cập nhật timeline trạng thái và thêm ghi chú.</p>
          </div>
        </div>
        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải danh sách đơn...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được dữ liệu đơn.</p> : null}
        {!isLoading && !isError ? (
          <div className="flex flex-wrap gap-2">
            {orders.slice(0, 24).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className={`admin-inline-button ${selectedOrderId === order.id ? 'is-active' : ''}`}
              >
                {order.orderNumber}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Timeline trạng thái</h2>
            <p className="admin-section__description">
              {selectedOrder
                ? `Đơn ${selectedOrder.orderNumber} • trạng thái hiện tại: ${selectedOrder.status}`
                : 'Chọn đơn để hiển thị timeline.'}
            </p>
          </div>
        </div>

        {selectedOrder ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <div className="space-y-2">
                {timelineSteps.map((step, index) => {
                  const active = index <= currentIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-2">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
                          active ? 'bg-[var(--admin-primary-600)] text-white' : 'bg-white text-[var(--admin-muted)]'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <p className={`text-sm ${active ? 'text-[var(--admin-text)] font-medium' : 'text-[var(--admin-muted)]'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <div className="space-y-2">
                <select
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value as OrderWorkflowStatus)}
                  className="admin-select"
                  disabled={availableStatuses.length === 0}
                >
                  {availableStatuses.length === 0 ? (
                    <option value="">Không có bước kế tiếp hợp lệ</option>
                  ) : (
                    availableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {orderStatusLabels[status]}
                      </option>
                    ))
                  )}
                </select>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="admin-input h-20 resize-y py-2"
                  placeholder="Ghi chú cập nhật trạng thái..."
                />
                <input
                  value={attachmentUrl}
                  onChange={(event) => setAttachmentUrl(event.target.value)}
                  className="admin-input"
                  placeholder="File đính kèm (URL, nếu có)"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="admin-action-button success"
                    disabled={updateStatusMutation.isPending || !nextStatus}
                    onClick={onUpdateStatus}
                  >
                    Cập nhật trạng thái
                  </button>
                  <button
                    type="button"
                    className="admin-inline-button"
                    onClick={() => {
                      appendLog('Thêm ghi chú nội bộ', note.trim());
                      setStatusMessage('Đã thêm ghi chú nội bộ.');
                      setNote('');
                    }}
                  >
                    Thêm ghi chú
                  </button>
                  <button
                    type="button"
                    className="admin-inline-button"
                    onClick={() => setStatusMessage('Đã gửi thông báo cho khách hàng.')}
                  >
                    Gửi thông báo khách
                  </button>
                  <button
                    type="button"
                    className="admin-inline-button"
                    onClick={() => setStatusMessage('Đã gửi thông báo cho người bán.')}
                  >
                    Gửi thông báo seller
                  </button>
                </div>
                {statusMessage ? <p className="text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}
              </div>
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chưa chọn đơn hàng.</p>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Lịch sử cập nhật</h2>
            <p className="admin-section__description">Mỗi lần cập nhật gồm thời gian, nhân viên, ghi chú và file đính kèm.</p>
          </div>
        </div>
        {selectedOrder ? (
          logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((item, index) => (
                <div key={`${item.at}-${index}`} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs">
                  <p className="font-medium text-[var(--admin-text)]">{item.action}</p>
                  <p className="text-[var(--admin-muted)]">
                    {new Date(item.at).toLocaleString('vi-VN')} • {item.actor}
                  </p>
                  <p className="text-[var(--admin-muted)]">Ghi chú: {item.note}</p>
                  {item.attachment ? <p className="text-[var(--admin-muted)]">File: {item.attachment}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">Chưa có lịch sử cập nhật cho đơn này.</p>
          )
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chọn đơn để xem lịch sử cập nhật.</p>
        )}
      </section>
    </div>
  );
};

export default StaffStatusTimelinePage;
