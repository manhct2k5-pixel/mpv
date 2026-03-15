import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarRange, Download, Printer, TrendingDown, TrendingUp } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import type { Order, OrderSummary, StoreProductSummary } from '../types/store.ts';

type PeriodPreset = 'day' | 'week' | 'month' | 'quarter';

type ProductStat = {
  key: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'week', label: 'Theo tuần' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'quarter', label: 'Theo quý' }
];

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveWindow = (period: PeriodPreset, anchorISO: string) => {
  const anchor = startOfDay(new Date(anchorISO));
  const end = endOfDay(anchor);

  const start = (() => {
    if (period === 'day') return startOfDay(anchor);
    if (period === 'week') return startOfDay(addDays(anchor, -6));
    if (period === 'month') return startOfDay(addDays(anchor, -29));
    return startOfDay(addDays(anchor, -89));
  })();

  const durationDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  const previousEnd = endOfDay(addDays(start, -1));
  const previousStart = startOfDay(addDays(previousEnd, -(durationDays - 1)));

  return {
    start,
    end,
    previousStart,
    previousEnd,
    durationDays
  };
};

const percentageDelta = (current: number, previous: number) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
};

const normalizeRange = (orders: OrderSummary[], start: Date, end: Date) => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return orders.filter((order) => {
    const createdAt = new Date(order.createdAt).getTime();
    return createdAt >= startMs && createdAt <= endMs;
  });
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
    .join('\n');

const SellerReportsPage = () => {
  const today = useMemo(() => formatDateInput(new Date()), []);
  const [period, setPeriod] = useState<PeriodPreset>('week');
  const [anchorDate, setAnchorDate] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const canViewReports = isAdmin || isSeller;
  const sellerId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ['seller-reports-orders', role, sellerId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(sellerId as number)),
    enabled: canViewReports && (isAdmin || sellerId != null)
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<StoreProductSummary[]>({
    queryKey: ['seller-reports-products', role, sellerId],
    queryFn: async () => {
      if (isAdmin) {
        const payload = await storeApi.products({ page: 0, pageSize: 200 });
        return payload.items;
      }
      return storeApi.sellerProducts(sellerId as number);
    },
    enabled: canViewReports && (isAdmin || sellerId != null)
  });

  const windowRange = useMemo(() => resolveWindow(period, anchorDate), [period, anchorDate]);

  const ordersInRange = useMemo(
    () => normalizeRange(orders, windowRange.start, windowRange.end),
    [orders, windowRange.end, windowRange.start]
  );

  const previousOrders = useMemo(
    () => normalizeRange(orders, windowRange.previousStart, windowRange.previousEnd),
    [orders, windowRange.previousEnd, windowRange.previousStart]
  );

  const detailOrderIds = useMemo(() => ordersInRange.map((order) => order.id), [ordersInRange]);

  const { data: detailedOrders = [] } = useQuery<Order[]>({
    queryKey: ['seller-reports-order-details', role, ...detailOrderIds],
    queryFn: () => Promise.all(detailOrderIds.map((orderId) => storeApi.order(orderId))),
    enabled: canViewReports && detailOrderIds.length > 0
  });

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [products]);

  const productQuery = productFilter.trim().toLowerCase();
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const orderById = useMemo(() => new Map(detailedOrders.map((order) => [order.id, order])), [detailedOrders]);

  const filteredOrderIds = useMemo(() => {
    if (categoryFilter === 'all' && !productQuery) {
      return new Set(ordersInRange.map((order) => order.id));
    }

    const ids = new Set<number>();
    ordersInRange.forEach((order) => {
      const detailed = orderById.get(order.id);
      if (!detailed) return;
      const hasMatch = detailed.items.some((item) => {
        const product = item.productId != null ? productById.get(item.productId) : undefined;
        const itemCategory = product?.category ?? '';
        const itemName = (item.productName ?? product?.name ?? '').toLowerCase();
        const passCategory = categoryFilter === 'all' || itemCategory === categoryFilter;
        const passQuery = !productQuery || itemName.includes(productQuery);
        return passCategory && passQuery;
      });
      if (hasMatch) {
        ids.add(order.id);
      }
    });
    return ids;
  }, [categoryFilter, orderById, ordersInRange, productById, productQuery]);

  const filteredOrders = useMemo(
    () => ordersInRange.filter((order) => filteredOrderIds.has(order.id)),
    [filteredOrderIds, ordersInRange]
  );

  const productStats = useMemo(() => {
    const map = new Map<string, ProductStat>();
    detailedOrders.forEach((order) => {
      if (!filteredOrderIds.has(order.id)) return;
      order.items.forEach((item) => {
        const product = item.productId != null ? productById.get(item.productId) : undefined;
        const key = item.productId != null ? `id-${item.productId}` : `name-${item.productName ?? item.id}`;
        const name = item.productName ?? product?.name ?? 'Sản phẩm không xác định';
        const category = product?.category ?? 'Khác';
        const current = map.get(key) ?? {
          key,
          name,
          category,
          quantity: 0,
          revenue: 0
        };
        current.quantity += item.quantity ?? 0;
        current.revenue += (item.unitPrice ?? 0) * (item.quantity ?? 0);
        map.set(key, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [detailedOrders, filteredOrderIds, productById]);

  const topProducts = useMemo(() => productStats.slice(0, 5), [productStats]);

  const slowProducts = useMemo(() => {
    const activeSaleKeys = new Set(topProducts.map((item) => item.name.toLowerCase()));
    return products
      .filter((product) => !activeSaleKeys.has(product.name.toLowerCase()))
      .slice(0, 5);
  }, [products, topProducts]);

  const grossRevenue = useMemo(
    () =>
      filteredOrders
        .filter((order) => order.status.toLowerCase() !== 'cancelled')
        .reduce((sum, order) => sum + (order.total ?? 0), 0),
    [filteredOrders]
  );
  const completedOrders = useMemo(
    () => filteredOrders.filter((order) => order.status.toLowerCase() === 'delivered').length,
    [filteredOrders]
  );
  const cancelledOrders = useMemo(
    () => filteredOrders.filter((order) => order.status.toLowerCase() === 'cancelled').length,
    [filteredOrders]
  );
  const unpaidOrders = useMemo(
    () => filteredOrders.filter((order) => order.paymentStatus.toLowerCase() === 'unpaid').length,
    [filteredOrders]
  );
  const completionRate = filteredOrders.length === 0 ? 0 : (completedOrders / filteredOrders.length) * 100;
  const cancelRate = filteredOrders.length === 0 ? 0 : (cancelledOrders / filteredOrders.length) * 100;
  const averageOrderValue = filteredOrders.length === 0 ? 0 : grossRevenue / filteredOrders.length;

  const previousRevenue = useMemo(
    () =>
      previousOrders
        .filter((order) => order.status.toLowerCase() !== 'cancelled')
        .reduce((sum, order) => sum + (order.total ?? 0), 0),
    [previousOrders]
  );
  const revenueDelta = percentageDelta(grossRevenue, previousRevenue);

  const trend = useMemo(() => {
    const bucketSizeDays = period === 'quarter' ? 7 : 1;
    const rows: Array<{ label: string; revenue: number; orders: number }> = [];

    for (let day = 0; day < windowRange.durationDays; day += bucketSizeDays) {
      const bucketStart = startOfDay(addDays(windowRange.start, day));
      const bucketEnd = endOfDay(
        addDays(windowRange.start, Math.min(windowRange.durationDays - 1, day + bucketSizeDays - 1))
      );
      const bucketOrders = filteredOrders.filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return createdAt >= bucketStart.getTime() && createdAt <= bucketEnd.getTime();
      });
      const revenue = bucketOrders.reduce((sum, order) => sum + (order.total ?? 0), 0);
      const label =
        bucketSizeDays === 1
          ? bucketStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          : `${bucketStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${bucketEnd.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit'
            })}`;
      rows.push({
        label,
        revenue,
        orders: bucketOrders.length
      });
    }

    return rows;
  }, [filteredOrders, period, windowRange.durationDays, windowRange.start]);

  const maxRevenue = useMemo(() => Math.max(1, ...trend.map((item) => item.revenue)), [trend]);

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['Chi so', 'Gia tri'],
      ['Tong don', filteredOrders.length.toString()],
      ['Doanh thu', grossRevenue.toFixed(0)],
      ['Don hoan tat', completedOrders.toString()],
      ['Ty le hoan tat (%)', completionRate.toFixed(2)],
      ['Ty le huy (%)', cancelRate.toFixed(2)],
      ['Don chua thanh toan', unpaidOrders.toString()]
    ];

    rows.push(['', '']);
    rows.push(['Top san pham', '']);
    rows.push(['Ten san pham', 'So luong ban', 'Doanh thu']);
    topProducts.forEach((item) => {
      rows.push([item.name, item.quantity.toString(), item.revenue.toFixed(0)]);
    });

    const content = toCsv(rows);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `seller-report-${anchorDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  if (profileLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải quyền truy cập báo cáo...</div>;
  }

  if (!canViewReports) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Trang báo cáo dành cho tài khoản seller hoặc admin.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-4 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-caramel/30 bg-white/80 px-3 py-1 text-xs font-semibold text-cocoa/70">
              <BarChart3 className="h-3.5 w-3.5" />
              Seller Reports
            </div>
            <h1 className="font-display text-3xl text-mocha">Báo cáo kinh doanh</h1>
            <p className="text-sm text-cocoa/70">
              Theo dõi doanh thu, hiệu suất đơn và xu hướng sản phẩm theo thời gian.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Xuất Excel (CSV)
            </button>
            <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleExportPdf}>
              <Printer className="h-4 w-4" />
              Xuất PDF
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-cocoa/60">
            Chu kỳ
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodPreset)}
              className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cocoa/60">
            Mốc thời gian
            <input
              type="date"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
            />
          </label>
          <label className="text-xs text-cocoa/60">
            Danh mục
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
            >
              <option value="all">Tất cả danh mục</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-cocoa/60">
            Sản phẩm
            <input
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              placeholder="Tìm theo tên sản phẩm"
              className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Doanh thu kỳ này</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{grossRevenue.toLocaleString('vi-VN')} đ</p>
          <p className={`mt-2 inline-flex items-center gap-1 text-xs ${revenueDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {revenueDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            So với kỳ trước: {revenueDelta >= 0 ? '+' : ''}
            {revenueDelta.toFixed(1)}%
          </p>
        </article>
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Số đơn hàng</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{filteredOrders.length.toLocaleString('vi-VN')}</p>
          <p className="mt-2 text-xs text-cocoa/65">Đơn chưa thanh toán: {unpaidOrders.toLocaleString('vi-VN')}</p>
        </article>
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Tỷ lệ hoàn tất / hủy</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{completionRate.toFixed(1)}%</p>
          <p className="mt-2 text-xs text-cocoa/65">Tỷ lệ hủy: {cancelRate.toFixed(1)}%</p>
        </article>
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Giá trị đơn trung bình</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{averageOrderValue.toLocaleString('vi-VN')} đ</p>
        </article>
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Top sản phẩm bán chạy</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{topProducts.length.toLocaleString('vi-VN')}</p>
          <p className="mt-2 text-xs text-cocoa/65">Dựa trên đơn đã chốt trong kỳ</p>
        </article>
        <article className="sticker-card p-5">
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Sản phẩm bán chậm</p>
          <p className="mt-2 text-2xl font-semibold text-mocha">{slowProducts.length.toLocaleString('vi-VN')}</p>
          <p className="mt-2 text-xs text-cocoa/65">Ưu tiên làm khuyến mãi hoặc đổi nội dung</p>
        </article>
      </section>

      <section className="sticker-card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-cocoa">Doanh thu theo thời gian</h2>
          <span className="inline-flex items-center gap-1 text-xs text-cocoa/60">
            <CalendarRange className="h-3.5 w-3.5" />
            {windowRange.start.toLocaleDateString('vi-VN')} - {windowRange.end.toLocaleDateString('vi-VN')}
          </span>
        </div>
        {ordersLoading ? (
          <p className="text-sm text-cocoa/70">Đang tải dữ liệu đơn hàng...</p>
        ) : trend.length === 0 ? (
          <p className="text-sm text-cocoa/70">Chưa có dữ liệu trong khoảng thời gian đã chọn.</p>
        ) : (
          <div className="space-y-2">
            {trend.map((item) => (
              <div key={item.label} className="grid grid-cols-[120px,1fr,120px] items-center gap-3 text-xs">
                <p className="text-cocoa/65">{item.label}</p>
                <div className="h-2.5 overflow-hidden rounded-full bg-caramel/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mocha to-caramel"
                    style={{ width: `${Math.max(4, (item.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
                <p className="text-right text-cocoa/70">
                  {item.revenue.toLocaleString('vi-VN')} đ · {item.orders} đơn
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="sticker-card space-y-3 p-6">
          <h2 className="text-lg font-semibold text-cocoa">Top sản phẩm bán chạy</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-cocoa/70">Chưa có dữ liệu bán chạy trong kỳ này.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((item, index) => (
                <div key={item.key} className="rounded-xl border border-caramel/30 bg-white/80 px-3 py-2 text-sm">
                  <p className="font-semibold text-cocoa">
                    #{index + 1} {item.name}
                  </p>
                  <p className="text-xs text-cocoa/65">
                    {item.category} · {item.quantity.toLocaleString('vi-VN')} sản phẩm ·{' '}
                    {item.revenue.toLocaleString('vi-VN')} đ
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="sticker-card space-y-3 p-6">
          <h2 className="text-lg font-semibold text-cocoa">Sản phẩm bán chậm</h2>
          {productsLoading ? (
            <p className="text-sm text-cocoa/70">Đang tải danh mục sản phẩm...</p>
          ) : slowProducts.length === 0 ? (
            <p className="text-sm text-cocoa/70">Không có sản phẩm bán chậm trong kỳ lọc.</p>
          ) : (
            <div className="space-y-2">
              {slowProducts.map((product) => (
                <div key={product.id} className="rounded-xl border border-caramel/30 bg-white/80 px-3 py-2 text-sm">
                  <p className="font-semibold text-cocoa">{product.name}</p>
                  <p className="text-xs text-cocoa/65">
                    {product.category ?? 'Khác'} · Giá: {product.basePrice.toLocaleString('vi-VN')} đ
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
};

export default SellerReportsPage;
