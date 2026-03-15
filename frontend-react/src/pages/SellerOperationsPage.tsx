import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock3, ClipboardList, LifeBuoy, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import type { OrderSummary, SupportTicket, SupportTicketStatus } from '../types/store.ts';

type OperationIssue = {
  id: string;
  orderNumber: string;
  title: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
  suggestion: string;
};

const severityClass: Record<OperationIssue['severity'], string> = {
  high: 'border-rose-300 bg-rose-50 text-rose-700',
  medium: 'border-amber-300 bg-amber-50 text-amber-700',
  low: 'border-sky-300 bg-sky-50 text-sky-700'
};

const statusClass: Record<SupportTicketStatus, string> = {
  new: 'border-sky-300 bg-sky-50 text-sky-700',
  processing: 'border-amber-300 bg-amber-50 text-amber-700',
  waiting: 'border-violet-300 bg-violet-50 text-violet-700',
  resolved: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  closed: 'border-zinc-300 bg-zinc-50 text-zinc-700'
};

const statusLabel: Record<SupportTicketStatus, string> = {
  new: 'Mới tạo',
  processing: 'Đang xử lý',
  waiting: 'Chờ phản hồi',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng'
};

const transitionMap: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  new: ['processing', 'waiting', 'closed'],
  processing: ['waiting', 'resolved', 'closed'],
  waiting: ['processing', 'resolved', 'closed'],
  resolved: ['closed'],
  closed: []
};

const getTicketStatusOptions = (status: SupportTicketStatus) => [status, ...transitionMap[status]];

const buildIssuesFromOrders = (orders: OrderSummary[]) => {
  const now = Date.now();
  const issues: OperationIssue[] = [];

  orders.forEach((order) => {
    const status = order.status.toLowerCase();
    const paymentStatus = order.paymentStatus.toLowerCase();
    const paymentMethod = order.paymentMethod.toLowerCase();
    const createdAtMs = new Date(order.createdAt).getTime();
    const ageHours = Math.max(0, (now - createdAtMs) / (1000 * 60 * 60));

    if (status === 'cancelled') {
      issues.push({
        id: `cancelled-${order.id}`,
        orderNumber: order.orderNumber,
        title: 'Đơn đã hủy hoặc giao thất bại',
        type: 'Đơn bị hoàn / giao thất bại',
        severity: 'high',
        createdAt: order.createdAt,
        suggestion: 'Kiểm tra lý do hủy và tạo ticket phối hợp vận hành nếu cần xử lý bồi hoàn.'
      });
    }

    if (paymentStatus === 'refunded') {
      issues.push({
        id: `refunded-${order.id}`,
        orderNumber: order.orderNumber,
        title: 'Đơn đã hoàn tiền',
        type: 'Đổi trả / khiếu nại',
        severity: 'medium',
        createdAt: order.createdAt,
        suggestion: 'Đối soát hoàn tiền và cập nhật ghi chú nguyên nhân để tránh lặp lại.'
      });
    }

    if (paymentMethod === 'bank_transfer' && paymentStatus === 'unpaid' && ageHours >= 12) {
      issues.push({
        id: `payment-${order.id}`,
        orderNumber: order.orderNumber,
        title: 'Chuyển khoản chưa xác nhận',
        type: 'Thanh toán lỗi/chậm',
        severity: ageHours >= 24 ? 'high' : 'medium',
        createdAt: order.createdAt,
        suggestion: 'Ưu tiên kiểm tra chứng từ chuyển khoản hoặc liên hệ khách để xác thực thanh toán.'
      });
    }

    if (status === 'pending' && ageHours >= 24) {
      issues.push({
        id: `pending-${order.id}`,
        orderNumber: order.orderNumber,
        title: 'Đơn chờ xác nhận quá lâu',
        type: 'Đơn bị giữ xác minh',
        severity: ageHours >= 48 ? 'high' : 'low',
        createdAt: order.createdAt,
        suggestion: 'Xác nhận đơn hoặc chuyển bộ phận vận hành để tránh vi phạm SLA.'
      });
    }

    if (status === 'shipped' && ageHours >= 96) {
      issues.push({
        id: `shipped-${order.id}`,
        orderNumber: order.orderNumber,
        title: 'Đơn giao kéo dài',
        type: 'Theo dõi giao hàng',
        severity: 'medium',
        createdAt: order.createdAt,
        suggestion: 'Tạo yêu cầu hỗ trợ với vận hành để kiểm tra trạng thái vận chuyển.'
      });
    }
  });

  return issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const SellerOperationsPage = () => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isStaff = role === 'warehouse';
  const canUsePage = isAdmin || isSeller || isStaff;
  const canLoadOrders = isAdmin || isSeller || isStaff;
  const sellerId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['seller-operations-orders', role, sellerId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(sellerId as number)),
    enabled: canLoadOrders && (isAdmin || sellerId != null)
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['seller-operation-tickets'],
    queryFn: () => storeApi.supportTickets(),
    enabled: canUsePage
  });

  const [formData, setFormData] = useState({
    issueType: 'Đơn giao thất bại',
    orderReference: '',
    description: '',
    evidenceLink: '',
    priority: 'medium' as SupportTicket['priority']
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const createTicketMutation = useMutation({
    mutationFn: (payload: {
      orderId?: number;
      issueType: string;
      description: string;
      evidenceUrl?: string;
      priority?: 'high' | 'medium' | 'low';
    }) => storeApi.createSupportTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-operation-tickets'] });
    }
  });

  const updateTicketStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: SupportTicketStatus }) =>
      storeApi.updateSupportTicket(payload.id, { status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-operation-tickets'] });
    }
  });

  const issues = useMemo(() => buildIssuesFromOrders(orders), [orders]);
  const criticalIssues = useMemo(() => issues.filter((item) => item.severity === 'high').length, [issues]);
  const openTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length,
    [tickets]
  );

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.description.trim()) {
      setStatusMessage('Vui lòng nhập nội dung cần hỗ trợ trước khi gửi.');
      return;
    }

    const orderReference = formData.orderReference.trim();
    let orderId: number | undefined = undefined;
    if (orderReference) {
      const exact = orders.find(
        (order) =>
          order.orderNumber.toLowerCase() === orderReference.toLowerCase() || String(order.id) === orderReference
      );
      if (!exact) {
        setStatusMessage('Không tìm thấy đơn theo mã đã nhập. Vui lòng nhập đúng mã đơn hoặc ID đơn.');
        return;
      }
      orderId = exact.id;
    }

    try {
      await createTicketMutation.mutateAsync({
        orderId,
        issueType: formData.issueType,
        description: formData.description.trim(),
        evidenceUrl: formData.evidenceLink.trim() || undefined,
        priority: formData.priority
      });
      setStatusMessage('Đã tạo ticket hỗ trợ thành công.');
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data?.error || 'Không thể tạo ticket.';
      setStatusMessage(message);
      return;
    }

    setFormData({
      issueType: 'Đơn giao thất bại',
      orderReference: '',
      description: '',
      evidenceLink: '',
      priority: 'medium'
    });
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: SupportTicketStatus) => {
    setStatusMessage(null);
    try {
      await updateTicketStatusMutation.mutateAsync({ id: ticketId, status });
      setStatusMessage(`Đã cập nhật trạng thái ticket thành "${statusLabel[status]}".`);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data?.error || 'Không thể cập nhật trạng thái ticket.';
      setStatusMessage(message);
    }
  };

  if (profileLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải quyền vận hành...</div>;
  }

  if (!canUsePage) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Bạn không có quyền truy cập mục vận hành.</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-4 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-caramel/30 bg-white/80 px-3 py-1 text-xs font-semibold text-cocoa/70">
              <LifeBuoy className="h-3.5 w-3.5" />
              Operations Center
            </div>
            <h1 className="font-display text-3xl text-mocha">Vận hành / hỗ trợ</h1>
            <p className="text-sm text-cocoa/70">
              Theo dõi vấn đề phát sinh, tạo yêu cầu hỗ trợ và phối hợp xử lý xuyên suốt vòng đời đơn hàng.
            </p>
          </div>
          {canUsePage && (
            <Link to="/seller/tickets" className="btn-secondary btn-secondary--sm">
              <Send className="h-4 w-4" />
              Mở inbox ticket CSKH
            </Link>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Vấn đề phát sinh</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{issues.length.toLocaleString('vi-VN')}</p>
          </article>
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Mức độ ưu tiên cao</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{criticalIssues.toLocaleString('vi-VN')}</p>
          </article>
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Ticket đang mở</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{openTickets.toLocaleString('vi-VN')}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <article className="sticker-card space-y-3 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <h2 className="text-lg font-semibold text-cocoa">Danh sách vấn đề cần theo dõi</h2>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-cocoa/70">Đang tổng hợp dữ liệu đơn hàng...</p>
          ) : !canLoadOrders ? (
            <p className="text-sm text-cocoa/70">
              Vai trò hiện tại không có dữ liệu đơn hàng trực tiếp. Vui lòng xử lý qua kênh vận hành nội bộ.
            </p>
          ) : issues.length === 0 ? (
            <p className="text-sm text-cocoa/70">Không có cảnh báo vận hành nổi bật trong thời điểm hiện tại.</p>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 10).map((issue) => (
                <div key={issue.id} className="rounded-xl border border-caramel/30 bg-white/80 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-cocoa">{issue.orderNumber}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${severityClass[issue.severity]}`}>
                      {issue.severity === 'high' ? 'Ưu tiên cao' : issue.severity === 'medium' ? 'Ưu tiên vừa' : 'Ưu tiên thấp'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-cocoa">{issue.title}</p>
                  <p className="text-xs text-cocoa/65">{issue.type}</p>
                  <p className="mt-1 text-xs text-cocoa/65">{issue.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="sticker-card space-y-3 p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-amber-700" />
            <h2 className="text-lg font-semibold text-cocoa">Tạo yêu cầu hỗ trợ</h2>
          </div>

          <form className="space-y-3" onSubmit={handleCreateTicket}>
            <label className="text-xs text-cocoa/60">
              Loại vấn đề
              <select
                value={formData.issueType}
                onChange={(event) => setFormData((prev) => ({ ...prev, issueType: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
              >
                <option>Đơn giao thất bại</option>
                <option>Khách yêu cầu đổi trả</option>
                <option>Hàng lỗi / thiếu</option>
                <option>Thanh toán lỗi</option>
                <option>Đơn bị giữ xác minh</option>
              </select>
            </label>
            <label className="text-xs text-cocoa/60">
              Mã đơn (nếu có)
              <input
                value={formData.orderReference}
                onChange={(event) => setFormData((prev) => ({ ...prev, orderReference: event.target.value }))}
                placeholder="VD: DH10234"
                className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
              />
            </label>
            <label className="text-xs text-cocoa/60">
              Nội dung cần hỗ trợ
              <textarea
                rows={3}
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Mô tả ngắn gọn sự cố và hướng cần hỗ trợ..."
                className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
              />
            </label>
            <label className="text-xs text-cocoa/60">
              Link bằng chứng (ảnh/video)
              <input
                value={formData.evidenceLink}
                onChange={(event) => setFormData((prev) => ({ ...prev, evidenceLink: event.target.value }))}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
              />
            </label>
            <label className="text-xs text-cocoa/60">
              Mức ưu tiên
              <select
                value={formData.priority}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, priority: event.target.value as SupportTicket['priority'] }))
                }
                className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
              >
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </label>

            <button type="submit" className="btn-primary w-full">
              <Send className="h-4 w-4" />
              Gửi yêu cầu hỗ trợ
            </button>
            {createTicketMutation.isPending && (
              <p className="text-[11px] text-cocoa/60">Đang tạo ticket hỗ trợ...</p>
            )}
            {statusMessage && <p className="text-xs text-cocoa/70">{statusMessage}</p>}
          </form>
        </article>
      </section>

      <section className="sticker-card space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-amber-700" />
          <h2 className="text-lg font-semibold text-cocoa">Tiến độ ticket hỗ trợ</h2>
        </div>

        {ticketsLoading ? (
          <p className="text-sm text-cocoa/70">Đang tải ticket hỗ trợ...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-cocoa/70">Chưa có ticket nào trong hệ thống.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-caramel/30 bg-white/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-cocoa">{ticket.issueType}</p>
                    <p className="text-xs text-cocoa/65">
                      {ticket.orderNumber ? `Đơn: ${ticket.orderNumber} · ` : ''}
                      {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {isAdmin || isStaff ? (
                    <select
                      value={ticket.status}
                      onChange={(event) =>
                        handleUpdateTicketStatus(ticket.id, event.target.value as SupportTicketStatus)
                      }
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass[ticket.status]}`}
                      disabled={updateTicketStatusMutation.isPending}
                    >
                      {getTicketStatusOptions(ticket.status).map((value) => (
                        <option key={value} value={value}>
                          {statusLabel[value]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass[ticket.status]}`}>
                      {statusLabel[ticket.status]}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-cocoa/80">{ticket.description}</p>
                <p className="mt-1 text-xs text-cocoa/65">
                  Người tạo: {ticket.createdByName ?? '--'} · Người xử lý: {ticket.assigneeName ?? 'Chưa gán'}
                </p>
                {ticket.evidenceUrl ? (
                  <a
                    href={ticket.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-mocha underline-offset-4 hover:underline"
                  >
                    Mở bằng chứng đính kèm
                  </a>
                ) : null}
                {ticket.comments.length > 0 ? (
                  <p className="mt-1 text-xs text-cocoa/65">
                    Cập nhật gần nhất: {ticket.comments[0].message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SellerOperationsPage;
