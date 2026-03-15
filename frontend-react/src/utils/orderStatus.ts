export type OrderWorkflowStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

const workflowOrder: OrderWorkflowStatus[] = [
  'pending',
  'processing',
  'confirmed',
  'packing',
  'shipped',
  'delivered'
];

export const orderStatusLabels: Record<OrderWorkflowStatus, string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý nội bộ',
  confirmed: 'Đã xác nhận / chờ QC',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  delivered: 'Giao thành công',
  cancelled: 'Đã hủy'
};

export const normalizeOrderStatus = (value: string | null | undefined): OrderWorkflowStatus | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (normalized === 'processing') return 'processing';
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'packing') return 'packing';
  if (normalized === 'shipped') return 'shipped';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'cancelled') return 'cancelled';
  return null;
};

export const getNextSequentialStatus = (currentStatus: string | null | undefined): OrderWorkflowStatus | null => {
  const current = normalizeOrderStatus(currentStatus);
  if (!current) return null;
  const index = workflowOrder.indexOf(current);
  if (index < 0 || index >= workflowOrder.length - 1) return null;
  return workflowOrder[index + 1];
};

export const getTargetStatusForPackingFlow = (
  currentStatus: string | null | undefined,
  isAdmin: boolean
): OrderWorkflowStatus | null => {
  const current = normalizeOrderStatus(currentStatus);
  if (!current) return null;
  if (isAdmin) {
    if (current === 'pending' || current === 'processing' || current === 'confirmed') {
      return getNextSequentialStatus(current);
    }
    return null;
  }
  return current === 'confirmed' ? 'packing' : null;
};

export const getAllowedStatusUpdates = (
  currentStatus: string | null | undefined,
  isAdmin: boolean
): OrderWorkflowStatus[] => {
  const current = normalizeOrderStatus(currentStatus);
  if (!current || current === 'cancelled' || current === 'delivered') return [];

  if (isAdmin) {
    const next = getNextSequentialStatus(current);
    if (!next) return ['cancelled'];
    return [next, 'cancelled'];
  }

  if (current === 'confirmed') return ['packing'];
  if (current === 'packing') return ['shipped'];
  return [];
};
