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

  const { data: order, isLoading } = useQuery({
    queryKey: ['store-order', orderId],
    queryFn: () => storeApi.order(orderId),
    enabled: isAuthenticated && Number.isFinite(orderId)
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isCustomer = role === 'user';
  const isWarehouse = role === 'warehouse';
  const canManageStatus = role === 'admin' || role === 'seller' || isWarehouse;

  const [editing, setEditing] = useState(false);
  const [reviewForms, setReviewForms] = useState<Record<number, { rating: number; comment: string }>>({});
  const [reviewStatusMessages, setReviewStatusMessages] = useState<Record<number, string>>({});
  const [reviewedItems, setReviewedItems] = useState<Record<number, boolean>>({});
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
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: () => storeApi.updateOrder(orderId, formData),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-order', orderId], data);
      setEditing(false);
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: () => storeApi.confirmOrderPayment(orderId),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-order', orderId], data);
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => storeApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
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
    options.push('cancelled');
    return Array.from(new Set(options));
  }, [isWarehouse, order]);

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

  if (isLoading || !order) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải đơn hàng...
      </div>
    );
  }

  const normalizedStatus = order.status.toLowerCase();
  const normalizedPaymentMethod = order.paymentMethod.toLowerCase();
  const normalizedPaymentStatus = order.paymentStatus.toLowerCase();
  const isBankTransfer = normalizedPaymentMethod === 'bank_transfer';
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
  const canCancelOrder = !isWarehouse && normalizedStatus !== 'cancelled' && normalizedStatus !== 'delivered';
  const canReviewProducts = isCustomer && normalizedStatus === 'delivered';
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
                        <select
                          value={reviewForms[item.id]?.rating ?? 5}
                          onChange={(event) =>
                            setReviewForms((prev) => ({
                              ...prev,
                              [item.id]: {
                                rating: Number(event.target.value),
                                comment: prev[item.id]?.comment ?? ''
                              }
                            }))
                          }
                          className="rounded-xl border border-rose-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-cocoa"
                        >
                          {[5, 4, 3, 2, 1].map((star) => (
                            <option key={star} value={star}>
                              {star} sao
                            </option>
                          ))}
                        </select>
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
            {canConfirmPayment && (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => confirmPaymentMutation.mutate()}
                disabled={confirmPaymentMutation.isPending}
              >
                {confirmPaymentMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận đã thanh toán'}
              </button>
            )}
            {canCancelOrder && (
              <button
                type="button"
                className="btn-secondary w-full !border-rose-200/80 !bg-white/90"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
            {isCustomer && (
              <Link
                to={`/ho-tro/yeu-cau?tab=returns&orderId=${order.id}`}
                className="btn-secondary w-full !border-rose-200/80 !bg-white/90 text-center"
              >
                Tạo yêu cầu hỗ trợ / đổi trả
              </Link>
            )}
          </div>

          {order.shippingAddress && (
            <div className="space-y-2 rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cocoa">Địa chỉ giao hàng</h2>
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? 'Đóng' : 'Chỉnh sửa'}
                </button>
              </div>

              {editing ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateOrderMutation.mutate();
                  }}
                  className="space-y-3"
                >
                  <input
                    value={formData.fullName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Họ và tên"
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <input
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Số điện thoại"
                    className="w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-3 py-2 text-xs text-cocoa outline-none focus:border-rose-400"
                  />
                  <input
                    value={formData.addressLine1}
                    onChange={(event) => setFormData((prev) => ({ ...prev, addressLine1: event.target.value }))}
                    placeholder="Địa chỉ"
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
