import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storeApi } from '../services/api.ts';
import type { ReturnRequest, ReturnRequestStatus } from '../types/store.ts';

const statusLabel: Record<ReturnRequestStatus, string> = {
  pending_verification: 'Chờ staff xác minh',
  approved: 'Đã duyệt',
  collecting: 'Đang thu hồi hàng — chờ bạn nhận',
  received: 'Đã nhận hàng — chờ xác nhận hoàn tiền',
  refunded: 'Hoàn tiền thành công',
  rejected: 'Đã từ chối',
  pending_admin: 'Chờ admin duyệt'
};

const statusBadgeClass: Partial<Record<ReturnRequestStatus, string>> = {
  collecting: 'warning',
  received: 'warning',
  refunded: 'success',
  rejected: 'danger'
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

type FilterTab = 'action' | 'history' | 'all';

const SellerReturnsPage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('action');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { data: requests = [], isLoading, isError } = useQuery<ReturnRequest[]>({
    queryKey: ['seller-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    refetchInterval: 15_000
  });

  const filtered = useMemo(() => {
    if (tab === 'action') return requests.filter((r) => r.status === 'collecting' || r.status === 'received');
    if (tab === 'history') return requests.filter((r) => r.status === 'refunded' || r.status === 'rejected');
    return requests;
  }, [requests, tab]);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; status: ReturnRequestStatus }) =>
      storeApi.updateReturnRequest(payload.id, { status: payload.status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-return-requests'] });
      setPendingId(null);
      setStatusMessage(
        variables.status === 'received'
          ? 'Đã xác nhận nhận hàng hoàn. Tiếp theo hãy xác nhận hoàn tiền khi đã kiểm tra hàng.'
          : 'Đã xác nhận hoàn tiền thành công. Tiền đã được cộng vào ví khách hàng.'
      );
    },
    onError: (error: any) => {
      setPendingId(null);
      setStatusMessage(getErrorMessage(error, 'Không thể cập nhật trạng thái. Vui lòng thử lại.'));
    }
  });

  const handle = (id: number, nextStatus: ReturnRequestStatus) => {
    setPendingId(id);
    setStatusMessage(null);
    updateMutation.mutate({ id, status: nextStatus });
  };

  const actionCount = requests.filter((r) => r.status === 'collecting' || r.status === 'received').length;

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200/70 p-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Hoàn hàng & Hoàn tiền</p>
          <h1 className="text-2xl font-semibold text-cocoa">Xác nhận nhận hàng hoàn và hoàn tiền</h1>
          <p className="text-sm text-cocoa/60">
            Sau khi staff duyệt và tạo lệnh thu hồi, hàng sẽ được chuyển về bạn. Xác nhận nhận hàng rồi xác nhận hoàn tiền để hoàn tất quy trình.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200/60 bg-white/90 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          {(['action', 'history', 'all'] as FilterTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                tab === t ? 'bg-rose-500 text-white' : 'bg-rose-50 text-cocoa hover:bg-rose-100'
              }`}
            >
              {t === 'action' ? `Cần xử lý${actionCount > 0 ? ` (${actionCount})` : ''}` : t === 'history' ? 'Lịch sử' : 'Tất cả'}
            </button>
          ))}
        </div>

        {statusMessage ? (
          <p className={`mb-4 rounded-xl px-3 py-2 text-xs ${updateMutation.isError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {statusMessage}
          </p>
        ) : null}

        {isLoading ? <p className="text-sm text-cocoa/50">Đang tải danh sách hoàn hàng...</p> : null}
        {isError ? <p className="text-sm text-rose-500">Không tải được dữ liệu. Vui lòng thử lại.</p> : null}

        {!isLoading && !isError ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-cocoa/50">
                {tab === 'action' ? 'Không có yêu cầu nào cần xử lý.' : 'Không có dữ liệu.'}
              </p>
            ) : null}
            {filtered.map((r) => {
              const isPending = pendingId === r.id && updateMutation.isPending;
              const badgeExtra = statusBadgeClass[r.status] ?? '';
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-cocoa">{r.requestCode} · Đơn {r.orderNumber}</p>
                    <p className="text-xs text-cocoa/60">Khách: {r.customerName}</p>
                    <p className="text-xs text-cocoa/60">Lý do: {r.reason}</p>
                    <span
                      className={`admin-status-badge inline-block ${badgeExtra}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {statusLabel[r.status]}
                    </span>
                    {r.verdict ? (
                      <p className="text-xs text-cocoa/50">Kết luận staff: {r.verdict}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    {r.status === 'collecting' ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handle(r.id, 'received')}
                        className="btn-primary btn-primary--sm whitespace-nowrap"
                      >
                        {isPending ? 'Đang xử lý...' : 'Đã nhận hàng hoàn về'}
                      </button>
                    ) : null}
                    {r.status === 'received' ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handle(r.id, 'refunded')}
                        className="btn-primary btn-primary--sm whitespace-nowrap"
                      >
                        {isPending ? 'Đang xử lý...' : 'Xác nhận hoàn tiền cho khách'}
                      </button>
                    ) : null}
                    {r.status === 'refunded' ? (
                      <span className="text-xs font-semibold text-emerald-600">Đã hoàn tiền ✓</span>
                    ) : null}
                    {r.status === 'rejected' ? (
                      <span className="text-xs font-semibold text-rose-500">Đã từ chối</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
        <p className="text-xs font-semibold text-cocoa/70">Quy trình hoàn hàng</p>
        <ol className="mt-2 space-y-1 text-xs text-cocoa/60 list-decimal list-inside">
          <li>Khách gửi yêu cầu hoàn hàng</li>
          <li>Staff xác minh và duyệt yêu cầu</li>
          <li>Tạo lệnh thu hồi — hàng được gửi về cửa hàng bạn</li>
          <li><span className="font-semibold text-rose-500">Bạn xác nhận đã nhận hàng về</span></li>
          <li><span className="font-semibold text-rose-500">Bạn xác nhận hoàn tiền → tiền tự động cộng vào ví khách</span></li>
        </ol>
      </section>
    </div>
  );
};

export default SellerReturnsPage;
