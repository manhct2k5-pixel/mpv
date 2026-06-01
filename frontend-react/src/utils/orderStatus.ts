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
  'confirmed',
  'packing',
  'shipped',
  'delivered'
];

export const orderStatusLabels: Record<OrderWorkflowStatus, string> = {
  pending: 'Chờ người bán xác nhận',
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận (chờ tạo vận đơn)',
  packing: 'Đang tạo vận đơn',
  shipped: 'Đang vận chuyển',
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
  // COD orders start at 'processing' (parallel to 'pending'); both advance to 'confirmed'.
  if (current === 'processing') return 'confirmed';
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
  // Nhân viên chỉ tạo vận đơn: confirmed → packing (packing → shipped là tự động)
  if (current === 'confirmed') {
    return 'packing';
  }
  return null;
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
  // packing → shipped là tự động; nhân viên kho không được tự chuyển sang "đang giao"
  return [];
};
