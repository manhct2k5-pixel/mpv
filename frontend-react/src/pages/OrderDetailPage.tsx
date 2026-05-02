import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import {
  bankTransferInfo,
  buildTransferContent,
  buildVietQrUrl,
  paymentMethodLabels,
  paymentStatusLabels
} from '../constants/payment.ts';

const orderStatusLabels: Record<string, string> = {
  pending: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy'
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const orderId = Number(id);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated
  });

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['store-order', orderId],
    queryFn: () => storeApi.order(orderId),
    enabled: isAuthenticated && Number.isFinite(orderId),
    refetchInterval: 15_000
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isCustomer = role === 'user';
  const isWarehouse = role === 'warehouse';
  const sellerCanManageOrderFlow = role === 'seller' && ['pending', 'processing', 'confirmed'].includes(order?.status?.toLowerCase() ?? '');
  const canManageStatus = role === 'admin' || sellerCanManageOrderFlow || isWarehouse;

  const [editing, setEditing] = useState(false);
  const [reviewForms, setReviewForms] = useState<Record<number, { rating: number; comment: string }>>({});
  const [reviewStatusMessages, setReviewStatusMessages] = useState<Record<number, string>>({});
  const [reviewedItems, setReviewedItems] = useState<Record<number, boolean>>({});
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    ward: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    note: '',
    notes: ''
  });

  useEffect(() => {
    if (!order) return;
    setFormData({
      fullName: order.shippingAddress?.fullName ?? '',
      phone: order.shippingAddress?.phone ?? '',
      addressLine1: order.shippingAddress?.addressLine1 ?? '',
      addressLine2: order.shippingAddress?.addressLine2 ?? '',
      ward: order.shippingAddress?.ward ?? '',
      district: order.shippingAddress?.district ?? '',
      city: order.shippingAddress?.city ?? '',
      province: order.shippingAddress?.province ?? '',
      postalCode: order.shippingAddress?.postalCode ?? '',
      note: order.shippingAddress?.note ?? '',
      notes: order.notes ?? ''
    });
  }, [order]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => storeApi.updateOrderStatus(orderId, status),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-order', orderId], data);
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      setActionMessage({ tone: 'success', text: 'Đã cập nhật trạng thái đơn hàng.' });
    },
    onError: (error: any) => {
      setActionMessage({
        tone: 'error',
        text: error.response?.data?.message ?? 'Không thể cập nhật trạng thái đơn hàng.'
      });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: () => {
      const missingFields = [
        !formData.fullName.trim() ? 'họ và tên' : null,
        !formData.phone.trim() ? 'số điện thoại' : null,
        !formData.addressLine1.trim() ? 'địa chỉ' : null,
        !formData.city.trim() ? 'thành phố' : null
      ].filter(Boolean);
      const validationMessage =
        missingFields.length > 0 ? `Vui lòng nhập đủ ${missingFields.join(', ')} trước khi lưu.` : null;
      if (validationMessage) {
        throw new Error(validationMessage);
      }
      return storeApi.updateOrder(orderId, formData);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['store-order', orderId], data);
      setEditing(false);
      setActionMessage({ tone: 'success', text: 'Đã lưu thông tin giao hàng.' });
    },
    onError: (error: any) => {
      setActionMessage({
        tone: 'error',
        text: error.message || error.response?.data?.message || 'Không thể lưu thông tin giao hàng.'
      });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: () => storeApi.confirmOrderPayment(orderId),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-order', orderId], data);
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      setActionMessage({ tone: 'success', text: 'Đã xác nhận thanh toán cho đơn hàng.' });
    },
    onError: (error: any) => {
      setActionMessage({
        tone: 'error',
        text: error.response?.data?.message ?? 'Không thể xác nhận thanh toán.'
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => storeApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      setActionMessage({ tone: 'success', text: 'Đơn hàng đã được hủy.' });
    },
    onError: (error: any) => {
      setActionMessage({
        tone: 'error',
        text: error.response?.data?.message ?? 'Không thể hủy đơn hàng.'
      });
    }
  });

  const createReviewMutation = useMutation({
    mutationFn: (payload: { orderId: number; orderItemId: number; rating: number; comment: string }) =>
      storeApi.createProductReview(payload),
    onSuccess: (review) => {
      setReviewedItems((prev) => ({ ...prev, [review.orderItemId]: true }));
      setReviewStatusMessages((prev) => ({ ...prev, [review.orderItemId]: 'Đã gửi đánh giá thành công.' }));
      setReviewForms((prev) => ({ ...prev, [review.orderItemId]: { rating: 5, comment: '' } }));
      queryClient.invalidateQueries({ queryKey: ['store-product-reviews', review.productSlug] });
    },
    onError: (error: any, variables) => {
      setReviewStatusMessages((prev) => ({
        ...prev,
        [variables.orderItemId]: error.response?.data?.message ?? 'Không thể gửi đánh giá.'
      }));
    }
  });

  const statusOptions = useMemo(() => {
    if (!order?.status) {
      return [];
    }

    const currentStatus = order.status.toLowerCase();
    const isPaidOrCod =
      order.paymentMethod.toLowerCase() === 'cod' || order.paymentStatus.toLowerCase() === 'paid';
    const options = [currentStatus];

    if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
      return options;
    }

    if (isWarehouse) {
      if (currentStatus === 'confirmed') {
        options.push('packing');
      }
      if (currentStatus === 'packing' && isPaidOrCod) {
        options.push('shipped');
      }
      return Array.from(new Set(options));
    }

    const nextStatus = (() => {
      switch (currentStatus) {
        case 'pending':
          return 'processing';
        case 'processing':
          return 'confirmed';
        case 'confirmed':
          return 'packing';
        case 'packing':
          return isPaidOrCod ? 'shipped' : null;
        case 'shipped':
          return 'delivered';
        default:
          return null;
      }
    })();

    if (nextStatus) {
      options.push(nextStatus);
    }
    if (role !== 'seller' || ['pending', 'processing', 'confirmed'].includes(currentStatus)) {
      options.push('cancelled');
    }
    return Array.from(new Set(options));
  }, [isWarehouse, order, role]);

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';

  const formatDate = (value: string) => new Date(value).toLocaleString('vi-VN');

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng đăng nhập để xem đơn hàng.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải đơn hàng...
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được đơn hàng hoặc bạn không có quyền xem đơn này.</p>
        <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
          Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const normalizedStatus = order.status.toLowerCase();
  const normalizedPaymentMethod = order.paymentMethod.toLowerCase();
  const normalizedPaymentStatus = order.paymentStatus.toLowerCase();
  const isBankTransfer = normalizedPaymentMethod === 'bank_transfer';
  const customerCanEditOrder = isCustomer && ['pending', 'processing', 'confirmed'].includes(normalizedStatus);
  const sellerCanAdjustOrder = role === 'seller' && ['pending', 'processing', 'confirmed'].includes(normalizedStatus);
  const canEditOrder = role === 'admin' || sellerCanAdjustOrder || customerCanEditOrder;
  const canConfirmPayment =
    canManageStatus &&
    !isWarehouse &&
    isBankTransfer &&
    normalizedPaymentStatus === 'unpaid' &&
    normalizedStatus !== 'cancelled';
  const isShippingBlockedByPayment =
    canManageStatus &&
    normalizedStatus === 'packing' &&
    isBankTransfer &&
    normalizedPaymentStatus !== 'paid';
  const canCancelOrder =
    normalizedStatus !== 'cancelled' &&
    normalizedStatus !== 'delivered' &&
    (role === 'admin' || sellerCanAdjustOrder || customerCanEditOrder);
  const canReviewProducts = isCustomer && normalizedStatus === 'delivered';
  const customerSupportTab = normalizedStatus === 'delivered' ? 'returns' : 'tickets';
  const customerSupportLabel =
    normalizedStatus === 'delivered' ? 'Hoàn trả hàng' : 'Liên hệ hỗ trợ đơn hàng';
  const statusLabel = orderStatusLabels[normalizedStatus] ?? order.status;
  const paymentMethodLabel = paymentMethodLabels[normalizedPaymentMethod] ?? order.paymentMethod;
  const paymentStatusLabel = paymentStatusLabels[normalizedPaymentStatus] ?? order.paymentStatus;
  const transferContent = buildTransferContent(order.orderNumber);
  const qrImageUrl = buildVietQrUrl(order.total ?? 0, transferContent);

  return (
    <div className="space-y-6 pb-8">
      <div className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Mã đơn</p>
            <h1 className="font-display text-3xl text-mocha">{order.orderNumber}</h1>
            <p className="text-xs text-cocoa/60">{formatDate(order.createdAt)}</p>
          </div>
          <Link to="/don-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Quay lại danh sách
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-cocoa/65">
        <span className="tag !border-rose-200/80 !bg-white/90">Trạng thái: {statusLabel}</span>
        <span className="tag !border-rose-200/80 !bg-white/90">Thanh toán: {paymentMethodLabel}</span>
        <span className="tag !border-rose-200/80 !bg-white/90">Tình trạng: {paymentStatusLabel}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          <h2 className="text-lg font-semibold text-cocoa">Chi tiết sản phẩm</h2>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="space-y-3 border-b border-rose-200/60 pb-3 text-sm text-cocoa/70"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-cocoa">{item.productName}</p>
                  <p className="text-xs text-cocoa/60">
                    {item.size} · {item.color}
                  </p>
                  {item.productSlug ? (
                    <Link to={`/san-pham/${item.productSlug}`} className="text-xs font-semibold text-mocha underline">
                      Xem sản phẩm
                    </Link>
                  ) : null}
                </div>
                <div className="text-right">
                  <p>
                    {item.quantity} x {formatPrice(item.unitPrice)}
                  </p>
                  <p className="font-semibold text-mocha">{formatPrice(item.lineTotal)}</p>
                </div>
              </div>
              {canReviewProducts ? (
                <div className="rounded-2xl border border-rose-200/70 bg-rose-50/45 p-3">
                  {reviewedItems[item.id] ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      {reviewStatusMessages[item.id] ?? 'Bạn đã đánh giá sản phẩm này.'}
                    </p>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const state = reviewForms[item.id] ?? { rating: 5, comment: '' };
                        createReviewMutation.mutate({
                          orderId,
                          orderItemId: item.id,
                          rating: state.rating,
                          comment: state.comment
                        });
                      }}
                      className="space-y-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-cocoa/65">Đánh giá sản phẩm</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= (reviewForms[item.id]?.rating ?? 5);
                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setReviewForms((prev) => ({
                                    ...prev,
                                    [item.id]: { rating: star, comment: prev[item.id]?.comment ?? '' }
                                  }))
                                }
                                className="p-0.5 transition hover:scale-110"
                                aria-label={`${star} sao`}
                              >
                                <svg
                                  viewBox="0 0 20 20"
                                  className={`h-5 w-5 transition ${active ? 'fill-amber-400 text-amber-400' : 'fill-rose-100 text-rose-200'}`}
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            );
                          })}
                          <span className="ml-1 text-xs font-semibold text-cocoa/70">
                            {reviewForms[item.id]?.rating ?? 5}/5
                          </span>
                        </div>
                        <button
                          type="submit"
                          className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                          disabled={createReviewMutation.isPending}
                        >
                          {createReviewMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </div>
                      <textarea
                        value={reviewForms[item.id]?.comment ?? ''}
                        onChange={(event) =>
                          setReviewForms((prev) => ({
                            ...prev,
                            [item.id]: {
                              rating: prev[item.id]?.rating ?? 5,
                              comment: event.target.value
                            }
                          }))
                        }
                        rows={2}
                        required
                        placeholder="Chia sẻ trải nghiệm sản phẩm..."
                        className="w-full rounded-xl border border-rose-200/80 bg-white/90 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                      />
                      {reviewStatusMessages[item.id] ? (
                        <p className="text-xs text-cocoa/70">{reviewStatusMessages[item.id]}</p>
                      ) : null}
                    </form>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Tổng kết</h2>
            <div className="flex items-center justify-between gap-3">
              <p>Trạng thái: {statusLabel}</p>
              {canManageStatus && (
                <select
                  value={order.status}
                  onChange={(event) => updateStatusMutation.mutate(event.target.value)}
                  className="rounded-xl border border-rose-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-cocoa"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabels[status] ?? status.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p>Thanh toán: {paymentMethodLabel}</p>
            <p>Tình trạng: {paymentStatusLabel}</p>
            {isShippingBlockedByPayment && (
              <p className="text-xs text-amber-700">
                Cần xác nhận chuyển khoản trước khi chuyển trạng thái sang “Đang giao”.
              </p>
            )}
            {isBankTransfer && (
              <div className="grid gap-4 rounded-2xl border border-rose-200/70 bg-rose-50/55 p-4 text-xs text-cocoa/80 md:grid-cols-[0.95fr,1.05fr]">
                <div className="space-y-2">
                  <p className="font-semibold text-cocoa">Quét QR để thanh toán</p>
                  <div className="overflow-hidden rounded-2xl border border-rose-200/70 bg-white p-3 shadow-[0_10px_20px_rgba(148,163,184,0.12)]">
                    <img src={qrImageUrl} alt="QR chuyển khoản cho đơn hàng" className="mx-auto w-full max-w-[220px]" />
                  </div>
                  <p className="text-[11px] text-cocoa/60">
                    QR này đã điền sẵn số tiền và nội dung chuyển khoản theo đơn hàng.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-cocoa">Thông tin chuyển khoản</p>
                  <p className="mt-2">
                    Ngân hàng: <span className="font-semibold">{bankTransferInfo.bankName}</span>
                  </p>
                  <p>
                    Số tài khoản: <span className="font-semibold">{bankTransferInfo.accountNumber}</span>
                  </p>
                  <p>
                    Chủ tài khoản: <span className="font-semibold">{bankTransferInfo.accountName}</span>
                  </p>
                  <p>
                    Chi nhánh: <span className="font-semibold">{bankTransferInfo.branch}</span>
                  </p>
                  <p>
                    Số tiền: <span className="font-semibold">{formatPrice(order.total)}</span>
                  </p>
                  <p className="mt-2">
                    Nội dung chuyển khoản: <span className="font-semibold">{transferContent}</span>
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-rose-200/60 pt-2 text-base font-semibold text-mocha">
              <span>Tổng cộng</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            {actionMessage ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  actionMessage.tone === 'error'
                    ? 'border-rose-200 bg-rose-50/90 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50/90 text-emerald-700'
                }`}
              >
                {actionMessage.text}
              </div>
            ) : null}
            {canConfirmPayment && (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => {
                  setActionMessage(null);
                  confirmPaymentMutation.mutate();
                }}
                disabled={confirmPaymentMutation.isPending}
              >
                {confirmPaymentMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận đã thanh toán'}
              </button>
            )}
            {canCancelOrder && (
              <button
                type="button"
                className="btn-secondary w-full !border-rose-200/80 !bg-white/90"
                onClick={() => {
                  setActionMessage(null);
                  cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
            {isCustomer && (
              <Link
                to={`/ho-tro/yeu-cau?tab=${customerSupportTab}&orderId=${order.id}`}
                className="btn-secondary w-full !border-rose-200/80 !bg-white/90 text-center"
              >
                {customerSupportLabel}
              </Link>
            )}
          </div>

          {order.shippingAddress && (
            <div className="space-y-2 rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cocoa">Địa chỉ giao hàng</h2>
                {canEditOrder ? (
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                    onClick={() => {
                      setActionMessage(null);
                      setEditing(!editing);
                    }}
                  >
                    {editing ? 'Đóng' : 'Chỉnh sửa'}
                  </button>
                ) : null}
              </div>

              {editing ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setActionMessage(null);
                    updateOrderMutation.mutate();
                  }}
                  className="space-y-3"
                >
                  <input
                    value={formData.fullName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Họ và tên"
                    required
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Số điện thoại"
                    required
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <input
                    value={formData.addressLine1}
                    onChange={(event) => setFormData((prev) => ({ ...prev, addressLine1: event.target.value }))}
                    placeholder="Địa chỉ"
                    required
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <input
                    value={formData.addressLine2}
                    onChange={(event) => setFormData((prev) => ({ ...prev, addressLine2: event.target.value }))}
                    placeholder="Địa chỉ bổ sung"
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={formData.ward}
                      onChange={(event) => setFormData((prev) => ({ ...prev, ward: event.target.value }))}
                      placeholder="Phường/Xã"
                      className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                    />
                    <input
                      value={formData.district}
                      onChange={(event) => setFormData((prev) => ({ ...prev, district: event.target.value }))}
                      placeholder="Quận/Huyện"
                      className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={formData.city}
                      onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="Thành phố"
                      required
                      className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                    />
                    <input
                      value={formData.province}
                      onChange={(event) => setFormData((prev) => ({ ...prev, province: event.target.value }))}
                      placeholder="Tỉnh"
                      className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                    />
                  </div>
                  <input
                    value={formData.postalCode}
                    onChange={(event) => setFormData((prev) => ({ ...prev, postalCode: event.target.value }))}
                    placeholder="Mã bưu chính"
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <textarea
                    value={formData.note}
                    onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                    placeholder="Ghi chú giao hàng"
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                    rows={3}
                  />
                  <button type="submit" className="btn-primary w-full" disabled={updateOrderMutation.isPending}>
                    {updateOrderMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </form>
              ) : (
                <>
                  <p>{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.phone}</p>
                  <p>
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
                  </p>
                  <p>
                    {order.shippingAddress.ward ? `${order.shippingAddress.ward}, ` : ''}
                    {order.shippingAddress.district ? `${order.shippingAddress.district}, ` : ''}
                    {order.shippingAddress.city}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
