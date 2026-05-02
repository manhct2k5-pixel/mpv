import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, DollarSign, PackageCheck, ShieldAlert, Store, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi } from '../services/api.ts';
import type { AdminOverview } from '../types/app';
import type { OrderSummary } from '../types/store';

const emptyOverview: AdminOverview = {
  totalUsers: 0,
  totalCustomers: 0,
  totalSellers: 0,
  totalAdmins: 0,
  totalStaff: 0,
  pendingBusinessRequests: 0,
  totalProducts: 0,
  activeProducts: 0,
  totalOrders: 0,
  openOrders: 0,
  unpaidOrders: 0,
  flaggedTransactions: 0,
  grossMerchandiseValue: 0,
  paidRevenue: 0
};

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '--');

const statusLabel: Record<string, string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const AdminDashboardPage = () => {
  const { data: overview = emptyOverview, isLoading: overviewLoading } = useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: financeApi.admin.overview
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'dashboard'],
    queryFn: () => financeApi.admin.orders(),
    refetchInterval: 5_000
  });

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const kpis = [
    {
      label: 'Doanh thu đã thanh toán',
      value: formatCurrency(overview.paidRevenue),
      icon: DollarSign,
      tone: 'from-emerald-500 to-teal-400'
    },
    {
      label: 'Tổng đơn hàng',
      value: overview.totalOrders.toLocaleString('vi-VN'),
      icon: Boxes,
      tone: 'from-sky-500 to-cyan-400'
    },
    {
      label: 'Đơn mở',
      value: overview.openOrders.toLocaleString('vi-VN'),
      icon: PackageCheck,
      tone: 'from-amber-500 to-orange-400'
    },
    {
      label: 'Chưa thanh toán',
      value: overview.unpaidOrders.toLocaleString('vi-VN'),
      icon: ShieldAlert,
      tone: 'from-rose-500 to-pink-400'
    }
  ];

  return (
    <div className="space-y-6">
      <section className="admin-hero-card">
        <div>
          <p className="admin-badge">Control Center</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--admin-text)]">Dashboard quản trị</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--admin-muted)]">
            Trang dashboard đã tách khỏi `AdminPage.tsx`, đọc trực tiếp overview và đơn hàng từ backend để demo số liệu thật.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/admin/orders" className="admin-inline-button admin-focus-ring">
            Xem đơn hàng
          </Link>
          <Link to="/admin/users" className="admin-inline-button admin-focus-ring">
            Quản lý user
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="admin-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">
                    {overviewLoading ? '...' : item.value}
                  </p>
                </div>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${item.tone} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="admin-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Việc cần xử lý</h2>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-3 text-sm">
            <Link to="/admin/users" className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-white/5 px-4 py-3 text-[var(--admin-text)]">
              <span>Seller chờ duyệt</span>
              <strong>{overview.pendingBusinessRequests.toLocaleString('vi-VN')}</strong>
            </Link>
            <Link to="/admin/orders" className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-white/5 px-4 py-3 text-[var(--admin-text)]">
              <span>Đơn chưa thanh toán</span>
              <strong>{overview.unpaidOrders.toLocaleString('vi-VN')}</strong>
            </Link>
            <Link to="/admin/reports" className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-white/5 px-4 py-3 text-[var(--admin-text)]">
              <span>Giao dịch bị gắn cờ</span>
              <strong>{overview.flaggedTransactions.toLocaleString('vi-VN')}</strong>
            </Link>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Đơn mới nhất</h2>
              <p className="text-xs text-[var(--admin-muted)]">Tự làm mới mỗi 5 giây.</p>
            </div>
            <Link to="/admin/orders" className="admin-inline-button admin-focus-ring">
              Mở bảng đơn
            </Link>
          </div>
          {ordersLoading ? (
            <div className="p-5 text-sm text-[var(--admin-muted)]">Đang tải đơn hàng...</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-5 text-sm text-[var(--admin-muted)]">Chưa có đơn hàng.</div>
          ) : (
            <div className="divide-y divide-admin-border">
              {recentOrders.map((order) => (
                <Link key={order.id} to="/admin/orders" className="grid gap-2 px-5 py-4 text-sm transition hover:bg-white/5 md:grid-cols-[1fr,130px,130px]">
                  <div>
                    <p className="font-semibold text-[var(--admin-text)]">{order.orderNumber}</p>
                    <p className="text-xs text-[var(--admin-muted)]">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span className="text-[var(--admin-muted)]">{statusLabel[order.status] ?? order.status}</span>
                  <span className="font-semibold text-[var(--admin-text)]">{formatCurrency(order.total ?? 0)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="admin-card p-5">
          <Users className="h-5 w-5 text-[var(--admin-accent)]" />
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Người dùng</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{overview.totalUsers.toLocaleString('vi-VN')}</p>
        </article>
        <article className="admin-card p-5">
          <Store className="h-5 w-5 text-[var(--admin-accent)]" />
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Seller</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{overview.totalSellers.toLocaleString('vi-VN')}</p>
        </article>
        <article className="admin-card p-5">
          <Boxes className="h-5 w-5 text-[var(--admin-accent)]" />
          <p className="mt-3 text-sm text-[var(--admin-muted)]">Sản phẩm active</p>
          <p className="text-2xl font-semibold text-[var(--admin-text)]">{overview.activeProducts.toLocaleString('vi-VN')}</p>
        </article>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
