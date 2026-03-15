import type { AdminOverview, BusinessRequest } from '../types/app';
import type { OrderSummary } from '../types/store';
import type {
  AdminChartPoint,
  AdminDashboardViewModel,
  AdminDonutSegment,
  AdminRangePreset,
  AdminTrafficItem
} from '../types/admin';

const DONUT_COLORS = ['#0002FC', '#1A22D8', '#3634BC', '#0EA5E9', '#16A34A', '#F59E0B'];

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateSafely = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value > 999) return 999;
  if (value < -999) return -999;
  return value;
};

const computeDeltaPercent = (current: number, previous: number) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return clampPercent(((current - previous) / previous) * 100);
};

const buildChartPoints = (
  orders: OrderSummary[],
  selectedDateISO: string,
  range: AdminRangePreset
): AdminChartPoint[] => {
  const selected = parseDateSafely(selectedDateISO) ?? new Date();
  const days = range === '30d' ? 30 : 7;
  const dayBuckets = new Map<string, { total: number; orderCount: number }>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(selected);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    dayBuckets.set(toDateKey(date), { total: 0, orderCount: 0 });
  }

  orders.forEach((order) => {
    const created = parseDateSafely(order.createdAt);
    if (!created) return;
    const key = toDateKey(created);
    const bucket = dayBuckets.get(key);
    if (!bucket) return;
    bucket.total += Number(order.total) || 0;
    bucket.orderCount += 1;
  });

  return Array.from(dayBuckets.entries()).map(([ts, values]) => {
    const date = parseDateSafely(ts);
    const label = date
      ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : ts;
    return {
      ts,
      label,
      total: values.total,
      orderCount: values.orderCount
    };
  });
};

const buildDonutSegments = (orders: OrderSummary[]): AdminDonutSegment[] => {
  const grouped = new Map<string, number>();

  orders.forEach((order) => {
    const key = (order.paymentStatus || 'unknown').toLowerCase();
    const value = Number(order.total) || 0;
    grouped.set(key, (grouped.get(key) ?? 0) + value);
  });

  const entries = Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (entries.length === 0 || total === 0) {
    return [];
  }

  return entries.map(([key, value], index) => ({
    key,
    label:
      key === 'paid'
        ? 'Đã thanh toán'
        : key === 'unpaid'
          ? 'Chưa thanh toán'
          : key === 'refunded'
            ? 'Hoàn tiền'
            : key,
    value,
    percent: Number(((value / total) * 100).toFixed(1)),
    color: DONUT_COLORS[index % DONUT_COLORS.length]
  }));
};

const buildTrafficItems = (orders: OrderSummary[]): AdminTrafficItem[] => {
  const grouped = new Map<string, number>();

  orders.forEach((order) => {
    const key = (order.status || 'unknown').toLowerCase();
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });

  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      label:
        key === 'pending'
          ? 'Chờ xác nhận'
          : key === 'processing'
            ? 'Đang xử lý'
            : key === 'confirmed'
              ? 'Đã xác nhận'
              : key === 'packing'
                ? 'Đang đóng gói'
                : key === 'shipped'
                  ? 'Đang giao'
                  : key === 'delivered'
                    ? 'Đã giao'
                    : key === 'cancelled'
                      ? 'Đã hủy'
                      : key,
      value,
      percent: Number(((value / total) * 100).toFixed(1)),
      tone: key === 'cancelled' ? 'danger' : key === 'pending' ? 'warning' : 'info'
    }));
};

const buildCalendarModel = (
  selectedDateISO: string,
  orders: OrderSummary[],
  requests: BusinessRequest[]
) => {
  const selected = parseDateSafely(selectedDateISO) ?? new Date();
  selected.setHours(0, 0, 0, 0);
  const dayIndex = (selected.getDay() + 6) % 7;
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - dayIndex);

  const eventsPerDay = new Map<string, number>();
  orders.forEach((order) => {
    const date = parseDateSafely(order.createdAt);
    if (!date) return;
    const key = toDateKey(date);
    eventsPerDay.set(key, (eventsPerDay.get(key) ?? 0) + 1);
  });
  requests.forEach((request) => {
    const date = parseDateSafely(request.requestedAt);
    if (!date) return;
    const key = toDateKey(date);
    eventsPerDay.set(key, (eventsPerDay.get(key) ?? 0) + 1);
  });

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = toDateKey(date);
    const eventCount = eventsPerDay.get(key) ?? 0;
    return {
      dateISO: key,
      dayNumber: date.getDate(),
      weekDayLabel: weekDays[index],
      isSelected: key === selectedDateISO,
      hasEvents: eventCount > 0,
      eventCount
    };
  });

  return {
    monthLabel: selected.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }),
    dates
  };
};

const buildKpis = (overview: AdminOverview, chart: AdminChartPoint[]) => {
  const halfway = Math.max(1, Math.floor(chart.length / 2));
  const previous = chart.slice(0, halfway);
  const current = chart.slice(halfway);

  const previousRevenue = previous.reduce((sum, point) => sum + point.total, 0);
  const currentRevenue = current.reduce((sum, point) => sum + point.total, 0);

  const previousOrders = previous.reduce((sum, point) => sum + point.orderCount, 0);
  const currentOrders = current.reduce((sum, point) => sum + point.orderCount, 0);

  return [
    {
      key: 'range_revenue',
      title: 'Doanh thu theo kỳ',
      value: currentRevenue,
      unit: 'currency' as const,
      deltaPercent: computeDeltaPercent(currentRevenue, previousRevenue),
      trend: currentRevenue >= previousRevenue ? ('up' as const) : ('down' as const),
      severity: currentRevenue >= previousRevenue ? ('success' as const) : ('warning' as const),
      periodLabel: 'So với kỳ trước'
    },
    {
      key: 'range_orders',
      title: 'Đơn hàng theo kỳ',
      value: currentOrders,
      unit: 'count' as const,
      deltaPercent: computeDeltaPercent(currentOrders, previousOrders),
      trend: currentOrders >= previousOrders ? ('up' as const) : ('down' as const),
      severity: currentOrders >= previousOrders ? ('info' as const) : ('warning' as const),
      periodLabel: 'So với kỳ trước'
    },
    {
      key: 'unpaid_orders',
      title: 'Đơn chưa thanh toán',
      value: overview.unpaidOrders,
      unit: 'count' as const,
      severity: overview.unpaidOrders > 0 ? ('warning' as const) : ('success' as const),
      periodLabel: 'Tổng quan hệ thống'
    },
    {
      key: 'flagged_transactions',
      title: 'Giao dịch cần lưu ý',
      value: overview.flaggedTransactions,
      unit: 'count' as const,
      severity: overview.flaggedTransactions > 0 ? ('danger' as const) : ('info' as const),
      periodLabel: 'Tổng quan hệ thống'
    }
  ];
};

export const buildAdminDashboardViewModel = ({
  overview,
  orders,
  requests,
  selectedDateISO,
  range
}: {
  overview: AdminOverview;
  orders: OrderSummary[];
  requests: BusinessRequest[];
  selectedDateISO: string;
  range: AdminRangePreset;
}): AdminDashboardViewModel => {
  const chart = buildChartPoints(orders, selectedDateISO, range);
  return {
    kpis: buildKpis(overview, chart),
    chart,
    donut: buildDonutSegments(orders),
    traffic: buildTrafficItems(orders),
    calendar: buildCalendarModel(selectedDateISO, orders, requests)
  };
};

export const shiftDateISOByDays = (dateISO: string, days: number) => {
  const date = parseDateSafely(dateISO) ?? new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};
