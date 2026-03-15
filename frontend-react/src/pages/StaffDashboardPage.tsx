import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import type { OrderSummary, StoreMessagePartner } from '../types/store';

const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

const StaffDashboardPage = () => {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const staffId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['staff-dashboard-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null
  });

  const { data: partners = [] } = useQuery<StoreMessagePartner[]>({
    queryKey: ['staff-dashboard-ticket-partners'],
    queryFn: storeApi.messagePartners
  });

  const stats = useMemo(() => {
    const waiting = orders.filter((order) =>
      ['pending', 'processing', 'confirmed'].includes(order.status.toLowerCase())
    ).length;
    const packing = orders.filter((order) => order.status.toLowerCase() === 'packing').length;
    const handover = orders.filter((order) => order.status.toLowerCase() === 'packing').length;
    const openIssues = orders.filter((order) => {
      const status = order.status.toLowerCase();
      const payment = order.paymentStatus.toLowerCase();
      return status === 'cancelled' || payment === 'refunded';
    }).length;
    return { waiting, packing, handover, openIssues };
  }, [orders]);

  const priorityOrders = useMemo(() => {
    const now = Date.now();
    const weight = (order: OrderSummary) => {
      const ageHours = (now - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      let score = ageHours;
      if (order.status.toLowerCase() === 'pending') score += 12;
      if (order.status.toLowerCase() === 'processing') score += 8;
      if (order.paymentStatus.toLowerCase() === 'unpaid') score += 6;
      if (order.status.toLowerCase() === 'cancelled') score -= 10;
      return score;
    };
    return [...orders].sort((a, b) => weight(b) - weight(a)).slice(0, 8);
  }, [orders]);

  const ticketRows = useMemo(
    () =>
      partners.slice(0, 8).map((partner, index) => ({
        id: `TK-${partner.id}`,
        sender: partner.fullName,
        type: index % 3 === 0 ? 'Chậm giao hàng' : index % 3 === 1 ? 'Sai sản phẩm' : 'Hỗ trợ khác',
        priority: index % 2 === 0 ? 'Cao' : 'Trung bình',
        status: index % 3 === 0 ? 'Mới tạo' : index % 3 === 1 ? 'Đang xử lý' : 'Chờ phản hồi'
      })),
    [partners]
  );

  const chartData = useMemo(() => {
    const days = [...Array(7)].map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      return { key, label, processed: 0, qcFailed: 0, returns: 0 };
    });
    const byKey = new Map(days.map((item) => [item.key, item]));
    orders.forEach((order) => {
      const dayKey = new Date(order.createdAt).toISOString().slice(0, 10);
      const bucket = byKey.get(dayKey);
      if (!bucket) return;
      const status = order.status.toLowerCase();
      const payment = order.paymentStatus.toLowerCase();
      if (status === 'delivered') bucket.processed += 1;
      if (status === 'cancelled') bucket.qcFailed += 1;
      if (payment === 'refunded') bucket.returns += 1;
    });
    return days;
  }, [orders]);

  const chartMax = useMemo(
    () => Math.max(1, ...chartData.map((item) => Math.max(item.processed, item.qcFailed, item.returns))),
    [chartData]
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Dashboard Staff</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">
            Tổng quan công việc vận hành trong ngày
          </h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Ưu tiên xử lý đơn nội bộ, kiểm soát chất lượng, bàn giao vận chuyển và theo dõi ticket/đổi trả.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/staff/orders" className="admin-inline-button admin-focus-ring">
            Xử lý đơn
          </Link>
          <Link to="/staff/qc-packing" className="admin-inline-button admin-focus-ring">
            QC & Đóng gói
          </Link>
          <Link to="/staff/shipments" className="admin-inline-button admin-focus-ring">
            Bàn giao vận chuyển
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Đơn chờ xử lý</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{stats.waiting}</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Đơn đang đóng gói</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{stats.packing}</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Đơn chờ bàn giao</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{stats.handover}</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Ticket / đổi trả mở</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{stats.openIssues + ticketRows.length}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Danh sách đơn ưu tiên</h2>
              <p className="admin-section__description">Nhấn xem chi tiết hoặc nhận xử lý để bắt đầu thao tác.</p>
            </div>
          </div>
          {ordersLoading ? (
            <p className="text-sm text-[var(--admin-muted)]">Đang tải đơn hàng...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Trạng thái</th>
                    <th>Thanh toán</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.status}</td>
                      <td>{order.paymentStatus}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <Link to={`/staff/orders?focus=${order.id}`} className="admin-inline-button">
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {priorityOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-sm text-[var(--admin-muted)]">
                        Chưa có đơn ưu tiên.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Ticket mới</h2>
              <p className="admin-section__description">Theo dõi ticket để phản hồi đúng SLA.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Mã ticket</th>
                  <th>Người gửi</th>
                  <th>Loại ticket</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {ticketRows.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.id}</td>
                    <td>{ticket.sender}</td>
                    <td>{ticket.type}</td>
                    <td>{ticket.priority}</td>
                    <td>{ticket.status}</td>
                  </tr>
                ))}
                {ticketRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-[var(--admin-muted)]">
                      Chưa có ticket mới.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Biểu đồ nhỏ theo ngày (7 ngày gần nhất)</h2>
            <p className="admin-section__description">Theo dõi số đơn đã xử lý, lỗi QC và đổi trả.</p>
          </div>
        </div>
        <div className="space-y-3">
          {chartData.map((row) => (
            <div key={row.key} className="grid items-center gap-2 md:grid-cols-[72px,1fr,1fr,1fr]">
              <p className="text-xs text-[var(--admin-muted)]">{row.label}</p>
              <div className="h-2 rounded-full bg-[var(--admin-surface-2)]">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(6, Math.round((row.processed / chartMax) * 100))}%` }}
                />
              </div>
              <div className="h-2 rounded-full bg-[var(--admin-surface-2)]">
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${Math.max(6, Math.round((row.qcFailed / chartMax) * 100))}%` }}
                />
              </div>
              <div className="h-2 rounded-full bg-[var(--admin-surface-2)]">
                <div
                  className="h-2 rounded-full bg-rose-500"
                  style={{ width: `${Math.max(6, Math.round((row.returns / chartMax) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--admin-muted)]">
          <span className="admin-inline-button">Xanh lá: Đã xử lý</span>
          <span className="admin-inline-button">Cam: Lỗi QC</span>
          <span className="admin-inline-button">Đỏ: Đổi trả</span>
        </div>
      </section>
    </div>
  );
};

export default StaffDashboardPage;
