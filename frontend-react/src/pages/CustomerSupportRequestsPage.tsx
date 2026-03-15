import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import type { ReturnRequestStatus, SupportTicketPriority, SupportTicketStatus } from '../types/store.ts';

type SupportTab = 'tickets' | 'returns';

const ticketStatusLabel: Record<SupportTicketStatus, string> = {
  new: 'Mới tạo',
  processing: 'Đang xử lý',
  waiting: 'Chờ phản hồi',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng'
};

const returnStatusLabel: Record<ReturnRequestStatus, string> = {
  pending_verification: 'Chờ xác minh',
  pending_admin: 'Chuyển admin duyệt',
  approved: 'Đã duyệt',
  collecting: 'Đang thu hồi',
  received: 'Đã nhận hàng',
  refunded: 'Đã hoàn tiền',
  rejected: 'Từ chối'
};

const priorityLabel: Record<SupportTicketPriority, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp'
};

const parseErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return candidate.response?.data?.message ?? candidate.response?.data?.error ?? candidate.message ?? fallback;
  }
  return fallback;
};

const formatTime = (value: string) => new Date(value).toLocaleString('vi-VN');

const statusClass = (status: string) => {
  if (status === 'rejected' || status === 'closed') return 'text-rose-700 border-rose-200 bg-rose-50/70';
  if (status === 'refunded' || status === 'resolved') return 'text-emerald-700 border-emerald-200 bg-emerald-50/70';
  if (status === 'pending_verification' || status === 'new' || status === 'waiting') {
    return 'text-amber-700 border-amber-200 bg-amber-50/70';
  }
  return 'text-cocoa/80 border-rose-200 bg-white/90';
};

const CustomerSupportRequestsPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const requestedOrderId = Number(searchParams.get('orderId') ?? 0);

  const initialTab: SupportTab = requestedTab === 'returns' ? 'returns' : 'tickets';
  const [activeTab, setActiveTab] = useState<SupportTab>(initialTab);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['store-orders'],
    queryFn: storeApi.orders,
    enabled: isAuthenticated && isCustomer
  });

  const preferredOrderId = useMemo(() => {
    if (orders.length === 0) return '';
    if (Number.isFinite(requestedOrderId) && requestedOrderId > 0) {
      const matched = orders.find((order) => order.id === requestedOrderId);
      if (matched) return String(matched.id);
    }
    return String(orders[0].id);
  }, [orders, requestedOrderId]);

  const [ticketForm, setTicketForm] = useState({
    orderId: '',
    issueType: 'Hỗ trợ đơn hàng',
    description: '',
    priority: 'medium' as SupportTicketPriority,
    evidenceUrl: ''
  });

  const [returnForm, setReturnForm] = useState({
    orderId: '',
    reason: '',
    note: '',
    evidenceUrl: ''
  });

  useEffect(() => {
    if (!preferredOrderId) return;
    setTicketForm((prev) => (prev.orderId ? prev : { ...prev, orderId: preferredOrderId }));
    setReturnForm((prev) => (prev.orderId ? prev : { ...prev, orderId: preferredOrderId }));
  }, [preferredOrderId]);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['customer-support-tickets'],
    queryFn: () => storeApi.supportTickets(),
    enabled: isAuthenticated && isCustomer
  });

  const { data: returnRequests = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['customer-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    enabled: isAuthenticated && isCustomer
  });

  const createTicketMutation = useMutation({
    mutationFn: (payload: {
      orderId: number;
      issueType: string;
      description: string;
      priority: SupportTicketPriority;
      evidenceUrl?: string;
    }) => storeApi.createSupportTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-support-tickets'] });
    }
  });

  const createReturnMutation = useMutation({
    mutationFn: (payload: { orderId: number; reason: string; note?: string; evidenceUrl?: string }) =>
      storeApi.createReturnRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-return-requests'] });
    }
  });

  const updateUrlState = (nextTab: SupportTab, nextOrderId?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', nextTab);
    const orderId = nextOrderId ?? ticketForm.orderId ?? returnForm.orderId;
    if (orderId) {
      params.set('orderId', orderId);
    }
    setSearchParams(params);
  };

  const handleTabChange = (nextTab: SupportTab) => {
    setActiveTab(nextTab);
    updateUrlState(nextTab);
    setStatusMessage(null);
  };

  const handleTicketSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticketForm.orderId) return;
    setStatusMessage(null);
    try {
      await createTicketMutation.mutateAsync({
        orderId: Number(ticketForm.orderId),
        issueType: ticketForm.issueType.trim(),
        description: ticketForm.description.trim(),
        priority: ticketForm.priority,
        evidenceUrl: ticketForm.evidenceUrl.trim() || undefined
      });
      setStatusMessage('Đã tạo ticket hỗ trợ thành công.');
      setTicketForm((prev) => ({ ...prev, description: '', evidenceUrl: '' }));
      updateUrlState('tickets', ticketForm.orderId);
    } catch (error) {
      setStatusMessage(parseErrorMessage(error, 'Không thể tạo ticket hỗ trợ.'));
    }
  };

  const handleReturnSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!returnForm.orderId) return;
    setStatusMessage(null);
    try {
      await createReturnMutation.mutateAsync({
        orderId: Number(returnForm.orderId),
        reason: returnForm.reason.trim(),
        note: returnForm.note.trim() || undefined,
        evidenceUrl: returnForm.evidenceUrl.trim() || undefined
      });
      setStatusMessage('Đã gửi yêu cầu đổi trả thành công.');
      setReturnForm((prev) => ({ ...prev, reason: '', note: '', evidenceUrl: '' }));
      updateUrlState('returns', returnForm.orderId);
    } catch (error) {
      setStatusMessage(parseErrorMessage(error, 'Không thể tạo yêu cầu đổi trả.'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng <Link to="/login" className="text-mocha underline">đăng nhập</Link> để gửi yêu cầu hỗ trợ.
      </div>
    );
  }

  if (profileLoading || ordersLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải dữ liệu hỗ trợ...
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Trang này chỉ dành cho tài khoản khách hàng.
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Bạn chưa có đơn hàng để tạo yêu cầu hỗ trợ hoặc đổi trả.</p>
        <Link to="/" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Mua sắm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Hậu mua</p>
        <h1 className="mt-1 font-display text-3xl text-mocha">Hỗ trợ & đổi trả</h1>
        <p className="text-sm text-cocoa/70">
          Tạo ticket cho đơn hàng hoặc gửi yêu cầu đổi trả ngay trên website.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleTabChange('tickets')}
          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'tickets'
              ? 'border-rose-500 bg-rose-500 text-white'
              : 'border-rose-200/80 bg-white/90 text-cocoa hover:border-rose-400'
          }`}
        >
          Ticket hỗ trợ
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('returns')}
          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'returns'
              ? 'border-rose-500 bg-rose-500 text-white'
              : 'border-rose-200/80 bg-white/90 text-cocoa hover:border-rose-400'
          }`}
        >
          Yêu cầu đổi trả
        </button>
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-caramel/40 bg-white/90 px-4 py-3 text-sm text-cocoa/80">
          {statusMessage}
        </div>
      ) : null}

      {activeTab === 'tickets' ? (
        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <form
            onSubmit={handleTicketSubmit}
            className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]"
          >
            <h2 className="text-lg font-semibold text-cocoa">Tạo ticket hỗ trợ</h2>
            <label className="text-sm text-cocoa/70">
              Chọn đơn hàng
              <select
                value={ticketForm.orderId}
                onChange={(event) => {
                  const value = event.target.value;
                  setTicketForm((prev) => ({ ...prev, orderId: value }));
                  updateUrlState('tickets', value);
                }}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                required
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-cocoa/70">
              Loại vấn đề
              <select
                value={ticketForm.issueType}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, issueType: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                required
              >
                <option value="Hỗ trợ đơn hàng">Hỗ trợ đơn hàng</option>
                <option value="Thanh toán">Thanh toán</option>
                <option value="Giao hàng">Giao hàng</option>
                <option value="Đổi trả">Đổi trả</option>
                <option value="Khác">Khác</option>
              </select>
            </label>
            <label className="text-sm text-cocoa/70">
              Mức ưu tiên
              <select
                value={ticketForm.priority}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, priority: event.target.value as SupportTicketPriority }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </label>
            <label className="text-sm text-cocoa/70">
              Mô tả
              <textarea
                value={ticketForm.description}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                placeholder="Mô tả ngắn gọn vấn đề bạn đang gặp..."
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Link minh chứng (tuỳ chọn)
              <input
                value={ticketForm.evidenceUrl}
                onChange={(event) => setTicketForm((prev) => ({ ...prev, evidenceUrl: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                placeholder="https://..."
              />
            </label>
            <button type="submit" className="btn-primary w-full" disabled={createTicketMutation.isPending}>
              {createTicketMutation.isPending ? 'Đang gửi...' : 'Gửi ticket'}
            </button>
          </form>

          <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Ticket của bạn</h2>
            {ticketsLoading ? <p className="text-sm text-cocoa/70">Đang tải ticket...</p> : null}
            {!ticketsLoading && tickets.length === 0 ? (
              <p className="text-sm text-cocoa/70">Bạn chưa có ticket nào.</p>
            ) : null}
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cocoa/65">
                    <span className="font-semibold text-cocoa">{ticket.ticketCode}</span>
                    <span className={`rounded-full border px-2.5 py-1 ${statusClass(ticket.status)}`}>
                      {ticketStatusLabel[ticket.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cocoa">{ticket.issueType}</p>
                  <p className="text-xs text-cocoa/65">
                    Ưu tiên: {priorityLabel[ticket.priority]} · Đơn: {ticket.orderNumber ?? '--'}
                  </p>
                  <p className="mt-2 text-sm text-cocoa/80">{ticket.description}</p>
                  <p className="mt-2 text-xs text-cocoa/60">{formatTime(ticket.updatedAt)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <form
            onSubmit={handleReturnSubmit}
            className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]"
          >
            <h2 className="text-lg font-semibold text-cocoa">Tạo yêu cầu đổi trả</h2>
            <label className="text-sm text-cocoa/70">
              Chọn đơn hàng
              <select
                value={returnForm.orderId}
                onChange={(event) => {
                  const value = event.target.value;
                  setReturnForm((prev) => ({ ...prev, orderId: value }));
                  updateUrlState('returns', value);
                }}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                required
              >
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-cocoa/70">
              Lý do đổi trả
              <textarea
                value={returnForm.reason}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, reason: event.target.value }))}
                rows={4}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                placeholder="Mô tả lý do bạn muốn đổi/trả sản phẩm..."
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Ghi chú (tuỳ chọn)
              <textarea
                value={returnForm.note}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, note: event.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                placeholder="Thông tin bổ sung cho bộ phận xử lý..."
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Link minh chứng (tuỳ chọn)
              <input
                value={returnForm.evidenceUrl}
                onChange={(event) => setReturnForm((prev) => ({ ...prev, evidenceUrl: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                placeholder="https://..."
              />
            </label>
            <button type="submit" className="btn-primary w-full" disabled={createReturnMutation.isPending}>
              {createReturnMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu đổi trả'}
            </button>
          </form>

          <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Yêu cầu đổi trả của bạn</h2>
            {returnsLoading ? <p className="text-sm text-cocoa/70">Đang tải yêu cầu đổi trả...</p> : null}
            {!returnsLoading && returnRequests.length === 0 ? (
              <p className="text-sm text-cocoa/70">Bạn chưa có yêu cầu đổi trả nào.</p>
            ) : null}
            <div className="space-y-3">
              {returnRequests.map((item) => (
                <article key={item.id} className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cocoa/65">
                    <span className="font-semibold text-cocoa">{item.requestCode}</span>
                    <span className={`rounded-full border px-2.5 py-1 ${statusClass(item.status)}`}>
                      {returnStatusLabel[item.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cocoa">Đơn: {item.orderNumber}</p>
                  <p className="mt-1 text-sm text-cocoa/80">{item.reason}</p>
                  <p className="mt-2 text-xs text-cocoa/60">{formatTime(item.updatedAt)}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default CustomerSupportRequestsPage;
