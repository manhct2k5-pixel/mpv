import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../services/api.ts';
import ProductImage from '../components/store/ProductImage';
import type { Order, ReturnRequest, ReturnRequestStatus } from '../types/store.ts';

const statusLabel: Record<ReturnRequestStatus, string> = {
  pending_verification: 'Chờ xác minh',
  approved: 'Đã duyệt',
  collecting: 'Đang thu hồi hàng',
  received: 'Đã nhận hàng hoàn',
  refunded: 'Hoàn trả thành công',
  rejected: 'Từ chối',
  pending_admin: 'Chuyển admin duyệt'
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const isImageEvidence = (value?: string | null) =>
  typeof value === 'string' &&
  (value.startsWith('data:image/') || /\.(avif|gif|jpe?g|png|svg|webp)([?#].*)?$/i.test(value));

const returnTransitions: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
  pending_verification: ['approved', 'rejected', 'pending_admin', 'refunded'],
  pending_admin: ['approved', 'rejected', 'refunded'],
  approved: ['collecting', 'rejected', 'pending_admin', 'refunded'],
  collecting: ['received'],
  received: ['refunded'],
  refunded: [],
  rejected: []
};

const canMoveReturnRequest = (current: ReturnRequestStatus, next: ReturnRequestStatus) =>
  current === next || returnTransitions[current].includes(next);

const isReturnTransitionAvailable = (current: ReturnRequestStatus, next: ReturnRequestStatus) =>
  current !== next && returnTransitions[current].includes(next);

const StaffReturnsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnRequestStatus>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [verdictDraft, setVerdictDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const { data: requests = [], isLoading, isError } = useQuery<ReturnRequest[]>({
    queryKey: ['staff-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    refetchInterval: 15_000
  });

  const visibleRequests = useMemo(
    () => requests.filter((item) => statusFilter === 'all' || item.status === statusFilter),
    [requests, statusFilter]
  );

  const selectedRequest = useMemo(
    () => requests.find((item) => item.id === selectedId) ?? null,
    [selectedId, requests]
  );

  const {
    data: selectedOrderDetail,
    isLoading: selectedOrderLoading,
    isError: selectedOrderError
  } = useQuery<Order>({
    queryKey: ['staff-return-request-order', selectedRequest?.orderId],
    queryFn: () => storeApi.order(selectedRequest!.orderId),
    enabled: selectedRequest != null
  });

  useEffect(() => {
    if (selectedId == null && visibleRequests.length > 0) {
      setSelectedId(visibleRequests[0].id);
    }
  }, [selectedId, visibleRequests]);

  useEffect(() => {
    setVerdictDraft(selectedRequest?.verdict ?? '');
    setNoteDraft(selectedRequest?.note ?? '');
  }, [selectedId, selectedRequest?.verdict, selectedRequest?.note]);

  const canCompleteReturnDirectly =
    selectedRequest != null &&
    ['pending_verification', 'pending_admin', 'approved', 'received'].includes(selectedRequest.status);

  const updateRequestMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      data: {
        status?: ReturnRequestStatus;
        verdict?: string;
        note?: string;
      };
    }) => storeApi.updateReturnRequest(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-return-requests'] });
    }
  });

  const perform = async (
    successMessage: string,
    patch: {
      status?: ReturnRequestStatus;
      verdict?: string;
      note?: string;
    }
  ) => {
    if (!selectedRequest) return;
    if (patch.status && !canMoveReturnRequest(selectedRequest.status, patch.status)) {
      setStatusMessage(`Yêu cầu ${selectedRequest.requestCode} không thể chuyển trực tiếp sang "${statusLabel[patch.status]}".`);
      return;
    }
    setStatusMessage(null);
    try {
      await updateRequestMutation.mutateAsync({
        id: selectedRequest.id,
        data: patch
      });
      setStatusMessage(`${successMessage} cho yêu cầu ${selectedRequest.requestCode}.`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Không cập nhật được yêu cầu đổi trả.'));
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Đổi trả</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Xử lý yêu cầu đổi/trả đơn hàng</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Kiểm tra điều kiện đổi trả, xác minh minh chứng và cập nhật kết quả xử lý theo từng bước.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách yêu cầu đổi trả</h2>
            <p className="admin-section__description">Lọc theo trạng thái để tập trung xử lý các yêu cầu mở.</p>
          </div>
        </div>
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ReturnRequestStatus)}
            className="admin-select"
          >
            <option value="all">Tất cả yêu cầu</option>
            <option value="pending_verification">Chờ xác minh</option>
            <option value="approved">Đã duyệt</option>
            <option value="collecting">Đang thu hồi hàng</option>
            <option value="received">Đã nhận hàng hoàn</option>
            <option value="refunded">Đã hoàn tiền</option>
            <option value="rejected">Từ chối</option>
            <option value="pending_admin">Chuyển admin duyệt</option>
          </select>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải yêu cầu đổi trả...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được dữ liệu yêu cầu đổi trả.</p> : null}

        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Lý do</th>
                  <th>Trạng thái thanh toán</th>
                  <th>Trạng thái giao hàng</th>
                  <th>Trạng thái xử lý</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((item) => (
                  <tr key={item.id} className="cursor-pointer" onClick={() => setSelectedId(item.id)}>
                    <td>{item.requestCode}</td>
                    <td>{item.orderNumber}</td>
                    <td>{item.customerName}</td>
                    <td>{item.reason}</td>
                    <td>{item.paymentStatus}</td>
                    <td>{item.shippingStatus}</td>
                    <td>
                      <span className={`admin-status-badge ${item.status === 'pending_verification' ? 'warning' : ''}`}>
                        {statusLabel[item.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {visibleRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có yêu cầu đổi trả.
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
            <h2 className="admin-section__title">Đánh giá và kết quả xử lý</h2>
            <p className="admin-section__description">
              {selectedRequest
                ? `Đang xử lý ${selectedRequest.requestCode} • trạng thái hiện tại: ${statusLabel[selectedRequest.status]}`
                : 'Chọn yêu cầu để thao tác.'}
            </p>
          </div>
        </div>
        {statusMessage ? <p className="mb-3 text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}

        {selectedRequest ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thông tin yêu cầu</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>Mã yêu cầu: {selectedRequest.requestCode}</p>
                <p>Mã đơn: {selectedRequest.orderNumber}</p>
                <p>Lý do đổi trả: {selectedRequest.reason}</p>
                <p>Khách hàng: {selectedRequest.customerName}</p>
              </div>
              {selectedRequest.evidenceUrl ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Minh chứng khách gửi</p>
                  {isImageEvidence(selectedRequest.evidenceUrl) ? (
                    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white">
                      <img
                        src={selectedRequest.evidenceUrl}
                        alt={`Minh chứng ${selectedRequest.requestCode}`}
                        className="h-56 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                  <a
                    href={selectedRequest.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--admin-accent)] underline"
                  >
                    Mở minh chứng
                  </a>
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Sản phẩm trong đơn</p>
                {selectedOrderLoading ? (
                  <p className="text-xs text-[var(--admin-muted)]">Đang tải ảnh sản phẩm...</p>
                ) : selectedOrderError ? (
                  <p className="text-xs text-rose-600">Không tải được ảnh sản phẩm trong đơn này.</p>
                ) : selectedOrderDetail?.items?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedOrderDetail.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-xl border border-[var(--admin-border)] bg-white p-3 shadow-sm"
                      >
                        <div className="flex gap-3">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.productName ?? 'Sản phẩm'}
                            title={item.productName}
                            subtitle={item.size && item.color ? `${item.size} · ${item.color}` : selectedRequest.orderNumber}
                            className="h-20 w-20 shrink-0 rounded-2xl"
                            compact
                            fit="cover"
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-[var(--admin-text)]">{item.productName ?? 'Sản phẩm trong đơn'}</p>
                            <p className="text-xs text-[var(--admin-muted)]">
                              {item.size ?? '--'} · {item.color ?? '--'}
                            </p>
                            <p className="text-xs text-[var(--admin-muted)]">Số lượng: {item.quantity ?? 0}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--admin-muted)]">Đơn này chưa có dữ liệu ảnh sản phẩm để hiển thị.</p>
                )}
              </div>

              <div className="mt-3 space-y-2 text-sm text-[var(--admin-text)]">
                <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2">
                  Kiểm tra điều kiện đổi trả
                  <input type="checkbox" />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2">
                  Kiểm tra thời hạn
                  <input type="checkbox" />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2">
                  Phân tích lỗi (shop/vận chuyển/khách)
                  <input type="checkbox" />
                </label>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Kết quả xử lý</p>
              <textarea
                value={verdictDraft}
                onChange={(event) => setVerdictDraft(event.target.value)}
                className="admin-input mt-2 h-20 resize-y py-2"
                placeholder="Kết luận: chấp nhận đổi / trả / từ chối..."
              />
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                className="admin-input mt-2 h-20 resize-y py-2"
                placeholder="Ghi chú xử lý..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {canCompleteReturnDirectly ? (
                  <button
                    type="button"
                    className="admin-action-button success"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã duyệt hoàn trả thành công', {
                        status: 'refunded',
                        verdict: verdictDraft || 'Đã duyệt hoàn trả thành công',
                        note: noteDraft
                      })
                    }
                  >
                    Duyệt hoàn trả thành công
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'approved') ? (
                  <button
                    type="button"
                    className="admin-action-button success"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã duyệt yêu cầu', {
                        status: 'approved',
                        verdict: verdictDraft || 'Chấp nhận đổi/trả',
                        note: noteDraft
                      })
                    }
                  >
                    Duyệt yêu cầu
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'rejected') ? (
                  <button
                    type="button"
                    className="admin-action-button danger"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã từ chối yêu cầu', {
                        status: 'rejected',
                        verdict: verdictDraft || 'Từ chối yêu cầu',
                        note: noteDraft
                      })
                    }
                  >
                    Từ chối yêu cầu
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'collecting') ? (
                  <button
                    type="button"
                    className="admin-inline-button"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã tạo lệnh hoàn hàng', {
                        status: 'collecting',
                        verdict: verdictDraft,
                        note: noteDraft
                      })
                    }
                  >
                    Tạo lệnh hoàn hàng
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'received') ? (
                  <button
                    type="button"
                    className="admin-inline-button"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã xác nhận nhận hàng hoàn', {
                        status: 'received',
                        verdict: verdictDraft || 'Đã nhận hàng hoàn tại kho',
                        note: noteDraft
                      })
                    }
                  >
                    Đã nhận hàng hoàn
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'refunded') && !canCompleteReturnDirectly ? (
                  <button
                    type="button"
                    className="admin-inline-button"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã cập nhật hoàn trả thành công', {
                        status: 'refunded',
                        verdict: verdictDraft || 'Đã duyệt hoàn trả thành công',
                        note: noteDraft
                      })
                    }
                  >
                    Cập nhật hoàn trả thành công
                  </button>
                ) : null}
                {isReturnTransitionAvailable(selectedRequest.status, 'pending_admin') ? (
                  <button
                    type="button"
                    className="admin-inline-button"
                    disabled={updateRequestMutation.isPending}
                    onClick={() =>
                      perform('Đã chuyển admin duyệt', {
                        status: 'pending_admin',
                        verdict: verdictDraft,
                        note: noteDraft
                      })
                    }
                  >
                    Chuyển admin duyệt
                  </button>
                ) : null}
              </div>
              {returnTransitions[selectedRequest.status].length === 0 ? (
                <p className="mt-2 text-xs text-[var(--admin-muted)]">Yêu cầu này đã ở trạng thái cuối, không còn bước xử lý tiếp theo.</p>
              ) : null}
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chưa chọn yêu cầu đổi trả.</p>
        )}
      </section>
    </div>
  );
};

export default StaffReturnsPage;
