export type AdminTrend = 'up' | 'down' | 'flat';
export type AdminSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface AdminKpiTile {
  key: string;
  title: string;
  value: number;
  unit: 'currency' | 'count' | 'percent';
  deltaPercent?: number;
  trend?: AdminTrend;
  severity?: AdminSeverity;
  periodLabel?: string;
}

export interface AdminChartPoint {
  ts: string;
  label: string;
  total: number;
  orderCount: number;
}

export interface AdminDonutSegment {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface AdminTrafficItem {
  key: string;
  label: string;
  value: number;
  percent: number;
  tone?: AdminSeverity;
}

export interface AdminCalendarDate {
  dateISO: string;
  dayNumber: number;
  weekDayLabel: string;
  isSelected: boolean;
  hasEvents: boolean;
  eventCount: number;
}

export interface AdminCalendarModel {
  monthLabel: string;
  dates: AdminCalendarDate[];
}

export type AdminRangePreset = '7d' | '30d';

export interface AdminDashboardViewModel {
  kpis: AdminKpiTile[];
  chart: AdminChartPoint[];
  donut: AdminDonutSegment[];
  traffic: AdminTrafficItem[];
  calendar: AdminCalendarModel;
}
