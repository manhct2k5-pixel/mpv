import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import ProductImage from '../components/store/ProductImage';
import { useAuthStore } from '../store/auth.ts';
import type { Order, ReturnRequestStatus, SupportTicketPriority, SupportTicketStatus } from '../types/store.ts';
import { readFilesAsDataUrls } from '../utils/fileUploads.ts';

type SupportTab = 'tickets' | 'returns';

const DEFAULT_MAX_REFUND_DAYS = 30;

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
  refunded: 'Hoàn trả thành công',
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
const formatDateOnly = (value: string) => new Date(value).toLocaleDateString('vi-VN');
const isImageEvidence = (value?: string | null) =>
  typeof value === 'string' &&
  (value.startsWith('data:image/') || /\.(avif|gif|jpe?g|png|svg|webp)([?#].*)?$/i.test(value));

const normalizeStatus = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const resolveOrderReferenceTime = (order: { deliveredAt?: string | null; updatedAt: string; createdAt: string }) =>
  order.deliveredAt ?? order.updatedAt ?? order.createdAt;

const isWithinReturnWindow = (referenceTime: string, maxRefundDays: number) => {
  const timestamp = new Date(referenceTime).getTime();
  if (Number.isNaN(timestamp)) return false;
  const elapsedMs = Date.now() - timestamp;
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
  return elapsedDays <= maxRefundDays;
};

const statusClass = (status: string) => {
  if (status === 'rejected' || status === 'closed') return 'text-rose-700 border-rose-200 bg-rose-50/70';
  if (status === 'refunded' || status === 'resolved') return 'text-emerald-700 border-emerald-200 bg-emerald-50/70';
  if (status === 'pending_verification' || status === 'new' || status === 'waiting') {
    return 'text-amber-700 border-amber-200 bg-amber-50/70';
  }
  return 'text-cocoa/80 border-rose-200 bg-white/90';
};

const orderStatusLabel = (value?: string | null) => {
  const normalized = normalizeStatus(value);
  if (normalized === 'pending') return 'Chờ xác nhận';
  if (normalized === 'processing') return 'Đang xử lý';
  if (normalized === 'confirmed') return 'Đã xác nhận';
  if (normalized === 'packing') return 'Đang đóng gói';
  if (normalized === 'shipped') return 'Đang giao';
  if (normalized === 'delivered') return 'Đã giao';
  if (normalized === 'cancelled') return 'Đã hủy';
  return value ?? '--';
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

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ['store-orders'],
    queryFn: storeApi.orders,
    enabled: isAuthenticated && isCustomer
  });

  const { data: storePolicy } = useQuery({
    queryKey: ['store-policy'],
    queryFn: storeApi.policy,
    enabled: isAuthenticated,
    retry: 1
  });
  const maxRefundDays = storePolicy?.maxRefundDays ?? DEFAULT_MAX_REFUND_DAYS;

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
  const [returnEvidenceError, setReturnEvidenceError] = useState<string | null>(null);

  const { data: tickets = [], isLoading: ticketsLoading, isError: ticketsError, refetch: refetchTickets } = useQuery({
    queryKey: ['customer-support-tickets'],
    queryFn: () => storeApi.supportTickets(),
    enabled: isAuthenticated && isCustomer
  });

  const { data: returnRequests = [], isLoading: returnsLoading, isError: returnsError, refetch: refetchReturns } = useQuery({
    queryKey: ['customer-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    enabled: isAuthenticated && isCustomer
  });

  const preferredTicketOrderId = useMemo(() => {
    if (orders.length === 0) return '';
    if (Number.isFinite(requestedOrderId) && requestedOrderId > 0) {
      const matched = orders.find((order) => order.id === requestedOrderId);
      if (matched) return String(matched.id);
    }
    return String(orders[0].id);
  }, [orders, requestedOrderId]);

  const existingReturnOrderIds = useMemo(() => new Set(returnRequests.map((request) => request.orderId)), [returnRequests]);

  const eligibleReturnOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (normalizeStatus(order.status) !== 'delivered') {
          return false;
        }
        if (normalizeStatus(order.paymentStatus) === 'refunded') {
          return false;
        }
        if (existingReturnOrderIds.has(order.id)) {
          return false;
        }
        return isWithinReturnWindow(resolveOrderReferenceTime(order), maxRefundDays);
      }),
    [existingReturnOrderIds, maxRefundDays, orders]
  );

  const preferredReturnOrderId = useMemo(() => {
    if (eligibleReturnOrders.length === 0) return '';
    if (Number.isFinite(requestedOrderId) && requestedOrderId > 0) {
      const matched = eligibleReturnOrders.find((order) => order.id === requestedOrderId);
      if (matched) return String(matched.id);
    }
    return String(eligibleReturnOrders[0].id);
  }, [eligibleReturnOrders, requestedOrderId]);

  const selectedReturnOrderId = Number(returnForm.orderId || 0);

  const {
    data: selectedReturnOrderDetail,
    isLoading: selectedReturnOrderLoading,
    isError: selectedReturnOrderError
  } = useQuery<Order>({
    queryKey: ['return-request-order-preview', selectedReturnOrderId],
    queryFn: () => storeApi.order(selectedReturnOrderId),
    enabled: isAuthenticated && isCustomer && activeTab === 'returns' && selectedReturnOrderId > 0,
    retry: 1
  });

  useEffect(() => {
    if (!preferredTicketOrderId) return;
    setTicketForm((prev) => {
      const currentExists = orders.some((order) => String(order.id) === prev.orderId);
      return currentExists ? prev : { ...prev, orderId: preferredTicketOrderId };
    });
  }, [orders, preferredTicketOrderId]);

  useEffect(() => {
    if (!preferredReturnOrderId) {
      setReturnForm((prev) => (prev.orderId ? { ...prev, orderId: '' } : prev));
      return;
    }
    setReturnForm((prev) => {
      const currentExists = eligibleReturnOrders.some((order) => String(order.id) === prev.orderId);
      return currentExists ? prev : { ...prev, orderId: preferredReturnOrderId };
    });
  }, [eligibleReturnOrders, preferredReturnOrderId]);

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
    const fallbackOrderId = nextTab === 'returns' ? returnForm.orderId : ticketForm.orderId;
    const orderId = nextOrderId ?? fallbackOrderId;
    if (orderId) {
      params.set('orderId', orderId);
    } else {
      params.delete('orderId');
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
      const nextReturnOrderId = eligibleReturnOrders.find((order) => order.id !== Number(returnForm.orderId))?.id;
      setStatusMessage('Đã gửi yêu cầu hoàn trả thành công.');
      setReturnForm({
        orderId: nextReturnOrderId ? String(nextReturnOrderId) : '',
        reason: '',
        note: '',
        evidenceUrl: ''
      });
      setReturnEvidenceError(null);
      updateUrlState('returns', nextReturnOrderId ? String(nextReturnOrderId) : '');
    } catch (error) {
      setStatusMessage(parseErrorMessage(error, 'Không thể tạo yêu cầu hoàn trả.'));
    }
  };

  const handleReturnEvidenceChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setReturnForm((prev) => ({ ...prev, evidenceUrl: '' }));
      setReturnEvidenceError(null);
      return;
    }

    try {
      const [evidenceUrl] = await readFilesAsDataUrls(files);
      if (!evidenceUrl) {
        throw new Error('Vui lòng chọn một ảnh minh chứng hợp lệ.');
      }
      setReturnForm((prev) => ({ ...prev, evidenceUrl }));
      setReturnEvidenceError(null);
    } catch (error) {
      setReturnEvidenceError(parseErrorMessage(error, 'Không thể tải ảnh minh chứng lên.'));
    } finally {
      event.target.value = '';
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

  if (profileError || !profile) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được thông tin tài khoản để mở khu vực hỗ trợ.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void refetchProfile()}>
            Tải lại
          </button>
          <Link to="/login" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Đăng nhập lại
          </Link>
        </div>
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

  if (ordersError) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được danh sách đơn hàng để tạo yêu cầu hỗ trợ hoặc đổi trả.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void refetchOrders()}>
            Tải lại đơn hàng
          </button>
          <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Xem đơn hàng
          </Link>
        </div>
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
          Yêu cầu hỗ trợ
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
          Hoàn trả hàng
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
            <h2 className="text-lg font-semibold text-cocoa">Gửi yêu cầu hỗ trợ</h2>
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
                    {`${order.orderNumber} · ${orderStatusLabel(order.status)} · ${formatDateOnly(order.createdAt)}`}
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
              {createTicketMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </form>

          <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Yêu cầu hỗ trợ của bạn</h2>
            {ticketsLoading ? <p className="text-sm text-cocoa/70">Đang tải yêu cầu hỗ trợ...</p> : null}
            {ticketsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                <p>Không tải được danh sách yêu cầu hỗ trợ hiện có.</p>
                <button
                  type="button"
                  className="mt-3 btn-secondary btn-secondary--sm !border-amber-200 !bg-white/90"
                  onClick={() => void refetchTickets()}
                >
                  Tải lại yêu cầu
                </button>
              </div>
            ) : null}
            {!ticketsLoading && !ticketsError && tickets.length === 0 ? (
              <p className="text-sm text-cocoa/70">Bạn chưa có yêu cầu hỗ trợ nào.</p>
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
          {returnsError ? (
            <section className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <h2 className="text-lg font-semibold text-cocoa">Tạo yêu cầu hoàn trả</h2>
              <p className="text-sm text-cocoa/70">Không tải được lịch sử hoàn trả nên chưa thể xác định đơn nào còn hợp lệ để gửi yêu cầu mới.</p>
              <button type="button" className="btn-primary" onClick={() => void refetchReturns()}>
                Tải lại yêu cầu hoàn trả
              </button>
            </section>
          ) : eligibleReturnOrders.length === 0 ? (
            <section className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <h2 className="text-lg font-semibold text-cocoa">Tạo yêu cầu hoàn trả</h2>
              <p className="text-sm text-cocoa/70">Hiện chưa có đơn nào đủ điều kiện hoàn trả.</p>
              <p className="text-sm text-cocoa/60">
                Chỉ các đơn đã giao trong vòng {maxRefundDays} ngày và chưa có yêu cầu hoàn trả trước đó mới hiển thị tại đây.
              </p>
              <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
                Xem đơn hàng
              </Link>
            </section>
          ) : (
            <form
              onSubmit={handleReturnSubmit}
              className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]"
            >
              <h2 className="text-lg font-semibold text-cocoa">Tạo yêu cầu hoàn trả</h2>
              <p className="text-xs text-cocoa/60">Chỉ hiển thị đơn đã giao trong vòng {maxRefundDays} ngày và chưa có yêu cầu trước đó.</p>
              <label className="text-sm text-cocoa/70">
                Chọn đơn hàng
                <select
                  value={returnForm.orderId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setReturnForm((prev) => ({ ...prev, orderId: value, evidenceUrl: '' }));
                    setReturnEvidenceError(null);
                    updateUrlState('returns', value);
                  }}
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                  required
                >
                  {eligibleReturnOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {`${order.orderNumber} · ${orderStatusLabel(order.status)} · ${formatDateOnly(resolveOrderReferenceTime(order))}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-3 rounded-2xl border border-rose-200/70 bg-rose-50/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Sản phẩm trong đơn cần hoàn trả</p>
                    <p className="text-xs text-cocoa/60">
                      Xác nhận đúng sản phẩm trước khi gửi yêu cầu cho nhân viên xử lý.
                    </p>
                  </div>
                  {selectedReturnOrderDetail ? (
                    <span className="rounded-full border border-rose-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold text-cocoa/70">
                      {selectedReturnOrderDetail.orderNumber}
                    </span>
                  ) : null}
                </div>
                {selectedReturnOrderLoading ? (
                  <p className="text-sm text-cocoa/65">Đang tải ảnh sản phẩm trong đơn...</p>
                ) : selectedReturnOrderError ? (
                  <p className="text-sm text-rose-600">Không tải được ảnh sản phẩm của đơn này. Bạn vẫn có thể gửi yêu cầu hoàn trả.</p>
                ) : selectedReturnOrderDetail?.items?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedReturnOrderDetail.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-rose-200/70 bg-white/90 p-3 shadow-[0_10px_20px_rgba(148,163,184,0.08)]"
                      >
                        <div className="flex gap-3">
                          <ProductImage
                            src={item.imageUrl}
                            alt={item.productName ?? 'Sản phẩm'}
                            title={item.productName}
                            subtitle={item.size && item.color ? `${item.size} · ${item.color}` : selectedReturnOrderDetail.orderNumber}
                            className="h-24 w-24 shrink-0 rounded-2xl"
                            compact
                            fit="cover"
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-cocoa">{item.productName ?? 'Sản phẩm trong đơn'}</p>
                            <p className="text-xs text-cocoa/65">
                              {item.size ?? '--'} · {item.color ?? '--'}
                            </p>
                            <p className="text-xs text-cocoa/60">Số lượng: {item.quantity ?? 0}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-cocoa/65">Đơn này chưa có dữ liệu ảnh sản phẩm để hiển thị.</p>
                )}
              </div>
              <label className="text-sm text-cocoa/70">
                Ảnh sản phẩm muốn hoàn trả (tuỳ chọn)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleReturnEvidenceChange(event)}
                  className="mt-2 block w-full rounded-xl border border-dashed border-rose-200/80 bg-white/90 px-4 py-3 text-sm text-cocoa file:mr-3 file:rounded-full file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-rose-700"
                />
                <span className="mt-2 block text-xs text-cocoa/55">
                  Hệ thống sẽ tự nén ảnh trước khi gửi cho nhân viên xử lý.
                </span>
              </label>
              {returnEvidenceError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800">
                  {returnEvidenceError}
                </div>
              ) : null}
              {returnForm.evidenceUrl ? (
                <div className="space-y-3 rounded-2xl border border-rose-200/70 bg-white/95 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-cocoa">Ảnh minh chứng đã chọn</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-600 underline"
                      onClick={() => {
                        setReturnForm((prev) => ({ ...prev, evidenceUrl: '' }));
                        setReturnEvidenceError(null);
                      }}
                    >
                      Xoá ảnh
                    </button>
                  </div>
                  {isImageEvidence(returnForm.evidenceUrl) ? (
                    <div className="overflow-hidden rounded-2xl border border-rose-200/70 bg-rose-50/40">
                      <img
                        src={returnForm.evidenceUrl}
                        alt="Minh chứng hoàn trả"
                        className="h-56 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <a
                      href={returnForm.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-mocha underline"
                    >
                      Mở minh chứng đã tải
                    </a>
                  )}
                </div>
              ) : null}
              <label className="text-sm text-cocoa/70">
                Lý do hoàn trả
                <textarea
                  value={returnForm.reason}
                  onChange={(event) => setReturnForm((prev) => ({ ...prev, reason: event.target.value }))}
                  rows={4}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                  placeholder="Mô tả lý do bạn muốn hoàn trả sản phẩm..."
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
              <button type="submit" className="btn-primary w-full" disabled={createReturnMutation.isPending}>
                {createReturnMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu hoàn trả'}
              </button>
            </form>
          )}

          <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Yêu cầu hoàn trả của bạn</h2>
            {returnsLoading ? <p className="text-sm text-cocoa/70">Đang tải yêu cầu hoàn trả...</p> : null}
            {returnsError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                <p>Không tải được danh sách yêu cầu hoàn trả hiện có.</p>
                <button
                  type="button"
                  className="mt-3 btn-secondary btn-secondary--sm !border-amber-200 !bg-white/90"
                  onClick={() => void refetchReturns()}
                >
                  Tải lại yêu cầu hoàn trả
                </button>
              </div>
            ) : null}
            {!returnsLoading && !returnsError && returnRequests.length === 0 ? (
              <p className="text-sm text-cocoa/70">Bạn chưa có yêu cầu hoàn trả nào.</p>
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
                  {item.evidenceUrl ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cocoa/55">Minh chứng đã gửi</p>
                      {isImageEvidence(item.evidenceUrl) ? (
                        <div className="overflow-hidden rounded-2xl border border-rose-200/70 bg-white/90">
                          <img
                            src={item.evidenceUrl}
                            alt={`Minh chứng ${item.requestCode}`}
                            className="h-40 w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-mocha underline"
                        >
                          Mở minh chứng
                        </a>
                      )}
                    </div>
                  ) : null}
                  {item.verdict ? <p className="mt-2 text-xs text-cocoa/65">Kết quả: {item.verdict}</p> : null}
                  {item.note ? <p className="mt-1 text-xs text-cocoa/60">Ghi chú: {item.note}</p> : null}
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
