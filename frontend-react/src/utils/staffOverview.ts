import type { StaffOverviewSignal } from '../constants/staffNav.tsx';
import type { OrderSummary, ReturnRequest, SupportTicket } from '../types/store';
import { normalizeOrderStatus } from './orderStatus.ts';

type StaffOverviewOverrides = {
  openTickets?: number;
  openReturns?: number;
  newReturns?: number;
};

export const countOpenSupportTickets = (tickets: SupportTicket[]) =>
  tickets.filter((ticket) => ticket.status === 'new' || ticket.status === 'processing' || ticket.status === 'waiting').length;

const isActiveReturnRequest = (request: ReturnRequest) =>
  request.status !== 'refunded' && request.status !== 'rejected';

export const countOpenReturnRequests = (requests: ReturnRequest[]) =>
  requests.filter(isActiveReturnRequest).length;

export const countNewReturnRequests = (requests: ReturnRequest[], seenAt?: string | null) => {
  const seenTimestamp = Date.parse(seenAt ?? '');
  if (Number.isNaN(seenTimestamp)) {
    return 0;
  }

  return requests.filter((request) => {
    if (!isActiveReturnRequest(request)) {
      return false;
    }
    const createdAt = Date.parse(request.createdAt);
    return !Number.isNaN(createdAt) && createdAt > seenTimestamp;
  }).length;
};

export const getStaffReturnSeenStorageKey = (staffId: number) => `staff:return-requests:seen-at:${staffId}`;

export const getStaffOverview = (
  orders: OrderSummary[],
  overrides: StaffOverviewOverrides = {}
): StaffOverviewSignal => {
  const pendingOrders = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    return status === 'pending' || status === 'processing';
  }).length;

  const packingOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'confirmed').length;

  const handoverOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'packing').length;

  const fallbackOpenReturns = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    return status === 'cancelled' || order.paymentStatus.toLowerCase() === 'refunded';
  }).length;

  const fallbackOpenTickets = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    if (status === 'cancelled' || order.paymentStatus.toLowerCase() === 'refunded') return true;
    const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    return (status === 'pending' || status === 'processing') && ageHours >= 24;
  }).length;

  const openReturns = overrides.openReturns ?? fallbackOpenReturns;
  const openTickets = overrides.openTickets ?? fallbackOpenTickets;
  const newReturns = overrides.newReturns ?? 0;

  return {
    pendingOrders,
    packingOrders,
    handoverOrders,
    openTickets,
    openReturns,
    newReturns
  };
};
