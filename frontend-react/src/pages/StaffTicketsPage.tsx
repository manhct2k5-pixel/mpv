import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, storeApi } from '../services/api.ts';
import type { SupportTicket, SupportTicketPriority, SupportTicketStatus } from '../types/store.ts';

const statusLabel: Record<SupportTicketStatus, string> = {
  new: 'Mới tạo',
  processing: 'Đang xử lý',
  waiting: 'Chờ phản hồi',
  resolved: 'Đã giải quyết',
  closed: 'Đã đóng'
};

const priorityLabel: Record<SupportTicketPriority, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp'
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

const StaffTicketsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [query, setQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const { data: tickets = [], isLoading, isError } = useQuery<SupportTicket[]>({
    queryKey: ['staff-support-tickets'],
    queryFn: () => storeApi.supportTickets()
  });

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const haystack = `${ticket.ticketCode} ${ticket.orderNumber ?? ''} ${ticket.issueType} ${ticket.createdByName ?? ''}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets]
  );

  useEffect(() => {
    if (selectedTicketId == null && visibleTickets.length > 0) {
      setSelectedTicketId(visibleTickets[0].id);
    }
  }, [selectedTicketId, visibleTickets]);

  useEffect(() => {
    setResolutionDraft(selectedTicket?.resolution ?? '');
    setReplyDraft('');
  }, [selectedTicketId, selectedTicket?.resolution]);

  const updateTicketMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      data: {
        status?: SupportTicketStatus;
        assigneeId?: number;
        resolution?: string;
        note?: string;
      };
    }) => storeApi.updateSupportTicket(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-support-tickets'] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { id: number; message: string }) => storeApi.commentSupportTicket(payload.id, payload.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-support-tickets'] });
    }
  });

  const isBusy = updateTicketMutation.isPending || commentMutation.isPending;
  const actorId = profile?.id != null ? Number(profile.id) : undefined;

  const runStatusUpdate = async (
    id: number,
    data: { status?: SupportTicketStatus; assigneeId?: number; resolution?: string; note?: string },
    successMessage: string
  ) => {
    setStatusMessage(null);
    try {
      await updateTicketMutation.mutateAsync({ id, data });
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Không thể cập nhật ticket.'));
    }
  };

  const handleReceive = async () => {
    if (!selectedTicket) return;
    await runStatusUpdate(
      selectedTicket.id,
      {
        status: 'processing',
        assigneeId: actorId
      },
      `Đã nhận ticket ${selectedTicket.ticketCode}.`
    );
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyDraft.trim()) return;
    setStatusMessage(null);
    try {
      await commentMutation.mutateAsync({ id: selectedTicket.id, message: replyDraft.trim() });
      await updateTicketMutation.mutateAsync({
        id: selectedTicket.id,
        data: { status: 'waiting' }
      });
      setReplyDraft('');
      setStatusMessage('Đã phản hồi ticket và chuyển sang trạng thái chờ phản hồi.');
    } catch (error) {
      setStatusMessage(getErrorMessage(error, 'Không thể gửi phản hồi ticket.'));
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicket) return;
    await runStatusUpdate(
      selectedTicket.id,
      {
        status: 'waiting',
        note: 'Chuyển cấp trên xử lý.'
      },
      'Đã chuyển ticket cho cấp trên.'
    );
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    const resolution = resolutionDraft.trim() || 'Đã xử lý xong theo quy trình vận hành.';
    await runStatusUpdate(
      selectedTicket.id,
      {
        status: 'resolved',
        resolution,
        note: 'Đánh dấu ticket đã giải quyết.'
      },
      'Ticket đã được đánh dấu giải quyết.'
    );
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    await runStatusUpdate(
      selectedTicket.id,
      {
        status: 'closed',
        note: 'Đóng ticket.'
      },
      'Đã đóng ticket.'
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Ticket hỗ trợ</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Xử lý CSKH nội bộ theo ticket</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Tiếp nhận, phản hồi, chuyển cấp trên và đóng ticket theo mức ưu tiên để đảm bảo phản hồi kịp thời.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Danh sách ticket</h2>
            <p className="admin-section__description">Lọc theo trạng thái và tìm kiếm nhanh theo mã ticket/mã đơn.</p>
          </div>
        </div>
        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr,220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo mã ticket, mã đơn, người gửi..."
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | SupportTicketStatus)}
            className="admin-select"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="new">Mới tạo</option>
            <option value="processing">Đang xử lý</option>
            <option value="waiting">Chờ phản hồi</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải ticket...</p> : null}
        {isError ? <p className="text-sm text-rose-600">Không tải được danh sách ticket.</p> : null}

        {!isLoading && !isError ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã ticket</th>
                  <th>Mã đơn</th>
                  <th>Người gửi</th>
                  <th>Loại ticket</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th>Người xử lý</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="cursor-pointer">
                    <td>{ticket.ticketCode}</td>
                    <td>{ticket.orderNumber ?? '--'}</td>
                    <td>{ticket.createdByName ?? '--'}</td>
                    <td>{ticket.issueType}</td>
                    <td>{priorityLabel[ticket.priority]}</td>
                    <td>
                      <span className={`admin-status-badge ${ticket.status === 'new' || ticket.status === 'waiting' ? 'warning' : ''}`}>
                        {statusLabel[ticket.status]}
                      </span>
                    </td>
                    <td>{ticket.assigneeName ?? '--'}</td>
                  </tr>
                ))}
                {visibleTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có ticket phù hợp.
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
            <h2 className="admin-section__title">Chi tiết ticket</h2>
            <p className="admin-section__description">
              {selectedTicket ? `Đang xem ${selectedTicket.ticketCode}` : 'Chọn ticket từ bảng phía trên.'}
            </p>
          </div>
        </div>
        {statusMessage ? <p className="mb-3 text-xs text-[var(--admin-info)]">{statusMessage}</p> : null}

        {selectedTicket ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Nội dung phản ánh</p>
              <div className="mt-2 space-y-1 text-xs text-[var(--admin-muted)]">
                <p>Loại: {selectedTicket.issueType}</p>
                <p>Mức độ ưu tiên: {priorityLabel[selectedTicket.priority]}</p>
                <p>{selectedTicket.description}</p>
                <p>Ảnh/video đính kèm: {selectedTicket.evidenceUrl || '--'}</p>
                <textarea
                  value={resolutionDraft}
                  onChange={(event) => setResolutionDraft(event.target.value)}
                  className="admin-input mt-2 h-20 resize-y py-2"
                  placeholder="Kết luận / hướng xử lý..."
                />
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Lịch sử trao đổi</p>
              <div className="mt-2 max-h-[220px] space-y-2 overflow-y-auto">
                {selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs">
                      <p className="font-medium text-[var(--admin-text)]">{item.actorName ?? 'Ẩn danh'}</p>
                      <p className="text-[var(--admin-muted)]">{item.message}</p>
                      <p className="text-[11px] text-[var(--admin-muted)]">{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--admin-muted)]">Chưa có phản hồi.</p>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4 xl:col-span-2">
              <p className="text-sm font-semibold text-[var(--admin-text)]">Thao tác xử lý</p>
              <textarea
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                className="admin-input mt-2 h-20 resize-y py-2"
                placeholder="Nhập phản hồi ticket..."
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="admin-action-button success" disabled={isBusy} onClick={handleReceive}>
                  Nhận ticket
                </button>
                <button type="button" className="admin-inline-button" disabled={isBusy || !replyDraft.trim()} onClick={handleReply}>
                  Phản hồi
                </button>
                <button type="button" className="admin-inline-button" disabled={isBusy} onClick={handleEscalate}>
                  Chuyển cấp trên
                </button>
                <button type="button" className="admin-inline-button" disabled={isBusy} onClick={handleResolve}>
                  Đã giải quyết
                </button>
                <button type="button" className="admin-action-button danger" disabled={isBusy} onClick={handleClose}>
                  Đóng ticket
                </button>
              </div>
            </article>
          </div>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">Chưa chọn ticket.</p>
        )}
      </section>
    </div>
  );
};

export default StaffTicketsPage;
