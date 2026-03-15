import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi, storeApi } from '../services/api.ts';
import type { AdminDailyReportPoint, AdminUserInsight } from '../types/app';
import type { OrderSummary, StoreProductSummary } from '../types/store';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Ngày', days: 1 },
  { value: 'week', label: 'Tuần', days: 7 },
  { value: 'month', label: 'Tháng', days: 30 },
  { value: 'quarter', label: 'Quý', days: 90 }
] as const;

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

const AdminReportsPage = () => {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]['value']>('week');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const selectedPeriod = PERIOD_OPTIONS.find((item) => item.value === period) ?? PERIOD_OPTIONS[1];

  const { data: dailyReports = [], isLoading: reportsLoading, isError: reportsError } = useQuery<AdminDailyReportPoint[]>({
    queryKey: ['admin', 'reports-daily', selectedPeriod.days],
    queryFn: () => financeApi.admin.reportsDaily(selectedPeriod.days)
  });

  const { data: users = [] } = useQuery<AdminUserInsight[]>({
    queryKey: ['admin', 'users'],
    queryFn: financeApi.admin.users
  });

  const { data: orders = [] } = useQuery<OrderSummary[]>({
    queryKey: ['admin', 'orders', 'reports'],
    queryFn: () => financeApi.admin.orders()
  });

  const { data: reportProducts = [] } = useQuery<StoreProductSummary[]>({
    queryKey: ['admin', 'reports', 'products'],
    queryFn: async () => {
      const payload = await storeApi.products({ page: 0, pageSize: 200 });
      return payload.items;
    }
  });

  const sellerOptions = useMemo(
    () =>
      users
        .filter((user) => {
          const role = (user.role ?? '').toLowerCase();
          return role === 'seller';
        })
        .map((user) => ({ id: String(user.id), label: user.fullName })),
    [users]
  );

  const categoryOptions = useMemo(() => {
    const values = reportProducts
      .map((product) => product.category?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [reportProducts]);

  const topSellersAll = useMemo(
    () =>
      users
        .filter((user) => (user.role ?? '').toLowerCase() === 'seller')
        .sort((a, b) => (b.totalTransactions ?? 0) - (a.totalTransactions ?? 0))
        .slice(0, 8),
    [users]
  );

  const topSellers = useMemo(() => {
    if (sellerFilter === 'all') return topSellersAll.slice(0, 5);
    return topSellersAll.filter((seller) => String(seller.id) === sellerFilter).slice(0, 5);
  }, [sellerFilter, topSellersAll]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderStatusFilter === 'all' || order.status.toLowerCase() === orderStatusFilter;
      return matchesStatus;
    });
  }, [orderStatusFilter, orders]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return reportProducts;
    return reportProducts.filter((product) => (product.category ?? '').toLowerCase() === categoryFilter.toLowerCase());
  }, [categoryFilter, reportProducts]);

  const topProducts = useMemo(
    () =>
      [...filteredProducts]
        .sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0))
        .slice(0, 5),
    [filteredProducts]
  );

  const topCategories = useMemo(() => {
    const bucket = new Map<string, number>();
    filteredProducts.forEach((product) => {
      const category = product.category?.trim() || 'Khác';
      bucket.set(category, (bucket.get(category) ?? 0) + 1);
    });
    return [...bucket.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredProducts]);

  const maxCategoryCount = useMemo(
    () => Math.max(1, ...topCategories.map((item) => item.count)),
    [topCategories]
  );

  const totalRevenue = useMemo(
    () => dailyReports.reduce((sum, point) => sum + (point.paidRevenue ?? 0), 0),
    [dailyReports]
  );

  const totalOrders = useMemo(
    () => dailyReports.reduce((sum, point) => sum + (point.totalOrders ?? 0), 0),
    [dailyReports]
  );

  const completionRate = useMemo(() => {
    if (filteredOrders.length === 0) return 0;
    const completed = filteredOrders.filter((order) => order.status.toLowerCase() === 'delivered').length;
    return (completed / filteredOrders.length) * 100;
  }, [filteredOrders]);

  const cancelRate = useMemo(() => {
    if (filteredOrders.length === 0) return 0;
    const cancelled = filteredOrders.filter((order) => order.status.toLowerCase() === 'cancelled').length;
    return (cancelled / filteredOrders.length) * 100;
  }, [filteredOrders]);

  const maxRevenue = useMemo(
    () => Math.max(1, ...dailyReports.map((point) => Number(point.paidRevenue) || 0)),
    [dailyReports]
  );

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Báo cáo hệ thống</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Theo dõi hiệu quả vận hành và doanh thu</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Báo cáo tổng hợp theo kỳ, theo seller và danh mục để đánh giá hiệu suất toàn hệ thống.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Bộ lọc báo cáo</h2>
            <p className="admin-section__description">Lọc theo ngày/tuần/tháng/quý, seller, danh mục và trạng thái đơn.</p>
          </div>
        </div>
        <div className="grid gap-2 lg:grid-cols-4">
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="admin-select">
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Theo {option.label}
              </option>
            ))}
          </select>
          <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className="admin-select">
            <option value="all">Tất cả seller</option>
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.label}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="admin-select">
            <option value="all">Tất cả danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="admin-select">
            <option value="all">Mọi trạng thái đơn</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="processing">Đang xử lý</option>
            <option value="shipped">Đang giao</option>
            <option value="delivered">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Doanh thu toàn hệ thống</p>
          <p className="text-xl font-semibold text-[var(--admin-text)]">{formatCurrency(totalRevenue)}</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Tổng đơn hàng</p>
          <p className="text-xl font-semibold text-[var(--admin-text)]">{totalOrders.toLocaleString('vi-VN')}</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Tỷ lệ hoàn tất</p>
          <p className="text-xl font-semibold text-[var(--admin-text)]">{completionRate.toFixed(1)}%</p>
        </article>
        <article className="admin-kpi-card">
          <p className="text-xs text-[var(--admin-muted)]">Tỷ lệ hủy</p>
          <p className="text-xl font-semibold text-[var(--admin-text)]">{cancelRate.toFixed(1)}%</p>
        </article>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Doanh thu theo thời gian</h2>
            <p className="admin-section__description">Biểu đồ dạng cột theo mốc báo cáo gần nhất.</p>
          </div>
        </div>
        {reportsLoading ? <p className="text-sm text-[var(--admin-muted)]">Đang tải dữ liệu báo cáo...</p> : null}
        {reportsError ? <p className="text-sm text-rose-600">Không tải được dữ liệu báo cáo.</p> : null}
        {!reportsLoading && !reportsError ? (
          <div className="space-y-2">
            {dailyReports.map((point) => {
              const widthPercent = Math.max(4, Math.round(((point.paidRevenue ?? 0) / maxRevenue) * 100));
              return (
                <div key={point.date} className="grid items-center gap-2 md:grid-cols-[120px,1fr,180px]">
                  <p className="text-xs text-[var(--admin-muted)]">{new Date(point.date).toLocaleDateString('vi-VN')}</p>
                  <div className="h-3 rounded-full bg-[var(--admin-surface-2)]">
                    <div className="h-3 rounded-full bg-[var(--admin-primary-500)]" style={{ width: `${widthPercent}%` }} />
                  </div>
                  <p className="text-xs font-semibold text-[var(--admin-text)]">{formatCurrency(point.paidRevenue ?? 0)}</p>
                </div>
              );
            })}
            {dailyReports.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">Không có dữ liệu trong kỳ đã chọn.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Top seller hiệu suất cao</h2>
              <p className="admin-section__description">Xếp hạng theo số lượng giao dịch đã ghi nhận.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Email</th>
                  <th>Tổng giao dịch</th>
                  <th>Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td>{seller.fullName}</td>
                    <td>{seller.email}</td>
                    <td>{seller.totalTransactions}</td>
                    <td>{seller.flagged}</td>
                  </tr>
                ))}
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-[var(--admin-muted)]">
                      Chưa có dữ liệu seller phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-section">
          <div className="admin-section__header">
            <div>
              <h2 className="admin-section__title">Top danh mục</h2>
              <p className="admin-section__description">Thống kê số sản phẩm theo danh mục đang lọc.</p>
            </div>
          </div>
          <div className="space-y-2">
            {topCategories.map((item) => {
              const widthPercent = Math.max(8, Math.round((item.count / maxCategoryCount) * 100));
              return (
                <div key={item.name} className="grid items-center gap-2 md:grid-cols-[140px,1fr,56px]">
                  <p className="truncate text-xs text-[var(--admin-muted)]">{item.name}</p>
                  <div className="h-2 rounded-full bg-[var(--admin-surface-2)]">
                    <div className="h-2 rounded-full bg-[var(--admin-primary-500)]" style={{ width: `${widthPercent}%` }} />
                  </div>
                  <p className="text-right text-xs font-semibold text-[var(--admin-text)]">{item.count}</p>
                </div>
              );
            })}
            {topCategories.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">Không có dữ liệu danh mục phù hợp.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">Top sản phẩm</h2>
            <p className="admin-section__description">Danh sách sản phẩm nổi bật theo giá trị và bộ lọc danh mục.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table min-w-full text-sm">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá gốc</th>
                <th>Giá khuyến mãi</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category ?? '--'}</td>
                  <td>{formatCurrency(product.basePrice ?? 0)}</td>
                  <td>{formatCurrency(product.salePrice ?? product.basePrice ?? 0)}</td>
                </tr>
              ))}
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-sm text-[var(--admin-muted)]">
                    Không có sản phẩm phù hợp bộ lọc.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminReportsPage;
