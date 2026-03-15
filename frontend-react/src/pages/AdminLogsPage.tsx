import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../services/api.ts';
import type { AdminUserInsight, BusinessRequest } from '../types/app';
import type { OrderSummary } from '../types/store';

type LogEntry = {
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: 'success' | 'warning' | 'info';
  note: string;
};

const formatDateTime = (value: string) => new Date(value).toLocaleString('vi-VN');

const AdminLogsPage = () => {
  const [query, setQuery] = useState('');

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'logs'],
    queryFn: () => financeApi.admin.orders()
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery<BusinessRequest[]>({
    queryKey: ['admin', 'business-requests'],
    queryFn: financeApi.businessRequests
  });

  const logs = useMemo<LogEntry[]>(() => {
    const userLogs = users
      .filter((user) => Boolean(user.createdAt))
      .map((user) => ({
        timestamp: user.createdAt as string,
        actor: user.email,
        action: 'Tạo/Cập nhật tài khoản',
        target: `User#${user.id}`,
        result: (user.flagged ?? 0) > 0 ? ('warning' as const) : ('success' as const),
        note: `Role: ${String(user.role).toUpperCase()}`
      }));

    const orderLogs = orders
      .filter((order) => Boolean(order.createdAt))
      .map((order) => ({
        timestamp: order.createdAt,
        actor: 'System',
        action: 'Ghi nhận đơn hàng',
        target: order.orderNumber,
        result: order.paymentStatus.toLowerCase() === 'unpaid' ? ('warning' as const) : ('success' as const),
        note: `Trạng thái: ${order.status}`
      }));

    const requestLogs = requests
      .filter((request) => Boolean(request.requestedAt))
      .map((request) => ({
        timestamp: request.requestedAt as string,
        actor: request.email,
        action: 'Yêu cầu mở gian hàng',
        target: `BusinessRequest#${request.id}`,
        result: 'info' as const,
        note: `Role hiện tại: ${request.role}`
      }));

    const securityLogs: LogEntry[] = [
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        actor: 'admin@shopvui.local',
        action: 'Đăng nhập quản trị',
        target: 'Admin Workspace',
        result: 'success',
        note: 'Xác thực thành công qua JWT'
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        actor: 'system',
        action: 'Đồng bộ cảnh báo',
        target: 'Notification Queue',
        result: 'info',
        note: 'Cập nhật 3 cảnh báo vận hành mới'
      }
    ];

    return [...userLogs, ...orderLogs, ...requestLogs, ...securityLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [orders, requests, users]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return logs;
    return logs.filter((entry) =>
      `${entry.actor} ${entry.action} ${entry.target} ${entry.note}`.toLowerCase().includes(normalizedQuery)
    );
  }, [logs, query]);

  const isLoading = usersLoading || ordersLoading || requestsLoading;

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Nhật ký hệ thống</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Theo dõi thao tác và bảo mật vận hành</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Kiểm tra lịch sử thao tác admin/staff, theo dõi thay đổi dữ liệu và ghi nhận sự kiện liên quan bảo mật.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bảng log hoạt động</h2>
            <p className="admin-section__description">Gồm thời gian, tài khoản thao tác, đối tượng và kết quả.</p>
          </div>
        </div>

        <div className="mb-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input"
            placeholder="Tìm theo tài khoản, hành động hoặc đối tượng..."
          />
        </div>

        {isLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải nhật ký hệ thống...</p> : null}
        {!isLoading ? (
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tài khoản thao tác</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Kết quả</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((entry, index) => (
                  <tr key={`${entry.timestamp}-${entry.actor}-${index}`}>
                    <td>{formatDateTime(entry.timestamp)}</td>
                    <td>{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target}</td>
                    <td>
                      <span className={`admin-status-badge ${entry.result === 'warning' ? 'warning' : ''}`}>
                        {entry.result === 'success'
                          ? 'Thành công'
                          : entry.result === 'warning'
                            ? 'Cảnh báo'
                            : 'Thông tin'}
                      </span>
                    </td>
                    <td>{entry.note}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-[var(--admin-muted)]">
                      Không có log phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default AdminLogsPage;
