import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type { OrderSummary } from '../types/store';

type RefundViewStatus = 'all' | 'pending' | 'refunded' | 'rejected';

const AdminRefundsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RefundViewStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [rejectedOrderIds, setRejectedOrderIds] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });

  const { data: orders = [], isLoading, isError } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'refunds-view'],
    queryFn: () => financeApi.admin.orders()
  });

  const refundMutation = useMutation({
    mutationFn: (payload: { orderId: number; reason: string }) =>
      financeApi.admin.refundOrder(payload.orderId, payload.reason),
    onSuccess: (updatedOrder) => {
      setStatusMessage(`Đã duyệt hoàn tiền cho đơn ${updatedOrder.orderNumber}.`);
      setReason('');
      setSelectedOrderId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không thể hoàn tiền đơn này.');
    }
  });

  const requestRows = useMemo(() => {
    return orders.map((order) => {
      const paymentStatus = order.paymentStatus.toLowerCase();
      const viewStatus = rejectedOrderIds.includes(order.id)
        ? 'rejected'
        : paymentStatus === 'refunded'
          ? 'refunded'
          : paymentStatus === 'paid'
            ? 'pending'
            : 'pending';
      return {
        requestCode: `RF-${order.id}`,
        order,
        amount: order.total ?? 0,
        viewStatus
      };
    });
  }, [orders, rejectedOrderIds]);

  const visibleRows = useMemo(() => {
    return requestRows.filter((row) => statusFilter === 'all' || row.viewStatus === statusFilter);
  }, [requestRows, statusFilter]);

  const selectedOrder = useMemo(
    () => visibleRows.find((row) => row.order.id === selectedOrderId)?.order ?? null,
    [visibleRows, selectedOrderId]
  );

  const handleReject = (orderId: number) => {
    if (!rejectedOrderIds.includes(orderId)) {
      setRejectedOrderIds((prev) => [...prev, orderId]);
    }
    setStatusMessage(`Đã từ chối yêu cầu hoàn tiền cho đơn #${orderId}.`);
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Hoàn tiền / xử lý đặc biệt</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Duyệt yêu cầu hoàn tiền và ngoại lệ</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Tiếp nhận, xác minh, duyệt hoặc từ chối yêu cầu hoàn tiền. Theo dõi người xử lý và ghi chú quyết định.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách yêu cầu</h2>
            <p className="admin-section__description">Lọc theo trạng thái để ưu tiên xử lý trường hợp khẩn cấp.</p>
          </div>
        </div>

        <div className="mb-4">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RefundViewStatus)} className="admin-select">
            <option value="all">Tất cả yêu cầu</option>
            <option value="pending">Chờ xử lý</option>
            <option value="refunded">Đã hoàn tiền</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải yêu cầu hoàn tiền...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được danh sách yêu cầu.</p> : null}
        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Seller</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                  <th>Người xử lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.requestCode}>
                    <td>{row.requestCode}</td>
                    <td>{row.order.orderNumber}</td>
                    <td>--</td>
                    <td>--</td>
                    <td>{row.amount.toLocaleString('vi-VN')} đ</td>
                    <td>
                      <span className={`admin-status-badge ${row.viewStatus === 'pending' ? 'warning' : ''}`}>
                        {row.viewStatus === 'pending'
                          ? 'Chờ xử lý'
                          : row.viewStatus === 'refunded'
                            ? 'Đã hoàn'
                            : 'Đã từ chối'}
                      </span>
                    </td>
                    <td>{profile?.fullName ?? 'Admin'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="admin-inline-button"
                          onClick={() => {
                            setSelectedOrderId(row.order.id);
                            setStatusMessage(null);
                          }}
                        >
                          <ShieldAlert className="h-4 w-4" />
                          Tiếp nhận
                        </button>
                        <button
                          type="button"
                          className="admin-action-button success"
                          disabled={refundMutation.isPending || row.viewStatus !== 'pending'}
                          onClick={() =>
                            refundMutation.mutate({
                              orderId: row.order.id,
                              reason: reason.trim() || 'Hoàn tiền theo yêu cầu xử lý đặc biệt'
                            })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="admin-action-button danger"
                          disabled={row.viewStatus !== 'pending'}
                          onClick={() => handleReject(row.order.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có yêu cầu hoàn tiền phù hợp.
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
            <h2 className="admin-section__title">Ghi chú xử lý</h2>
            <p className="admin-section__description">
              {selectedOrder ? `Đang xử lý đơn ${selectedOrder.orderNumber}` : 'Chọn một yêu cầu ở bảng trên để thêm ghi chú.'}
            </p>
          </div>
        </div>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="admin-input h-24 resize-y py-2"
          placeholder="Lý do hoàn tiền / từ chối / ghi chú xác minh..."
        />
        {statusMessage ? (
          <p className={`mt-3 text-xs ${refundMutation.isError ? 'text-rose-600' : 'text-emerald-700'}`}>{statusMessage}</p>
        ) : null}
      </section>
    </div>
  );
};

export default AdminRefundsPage;
