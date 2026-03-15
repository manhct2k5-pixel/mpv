import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { getRoutePrefetchHandlers } from '../utils/routePrefetch';

const CartPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);
  const homePrefetchHandlers = getRoutePrefetchHandlers('home');
  const productDetailPrefetchHandlers = getRoutePrefetchHandlers('productDetail');
  const checkoutPrefetchHandlers = getRoutePrefetchHandlers('checkout');
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: cart, isLoading } = useQuery({
    queryKey: ['store-cart'],
    queryFn: storeApi.cart,
    enabled: isAuthenticated && isCustomer
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; quantity: number }) =>
      storeApi.updateCartItem(payload.id, payload.quantity),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => storeApi.removeCartItem(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
    }
  });

  const clearMutation = useMutation({
    mutationFn: () => storeApi.clearCart(),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
    }
  });

  const applyVoucherMutation = useMutation({
    mutationFn: (code: string) => storeApi.applyCartVoucher(code),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
      queryClient.invalidateQueries({ queryKey: ['store-cart'] });
      setVoucherMessage(`Đã áp dụng voucher ${data.appliedVoucherCode ?? voucherCode.trim().toUpperCase()}.`);
      setVoucherCode('');
    },
    onError: (error: any) => {
      setVoucherMessage(error.response?.data?.message ?? 'Không thể áp dụng voucher.');
    }
  });

  const removeVoucherMutation = useMutation({
    mutationFn: () => storeApi.removeCartVoucher(),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
      queryClient.invalidateQueries({ queryKey: ['store-cart'] });
      setVoucherMessage('Đã bỏ voucher khỏi giỏ hàng.');
    },
    onError: (error: any) => {
      setVoucherMessage(error.response?.data?.message ?? 'Không thể bỏ voucher.');
    }
  });

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';
  const subtotalBeforeDiscount = cart?.subtotalBeforeDiscount ?? cart?.subtotal ?? 0;
  const voucherDiscount = cart?.voucherDiscount ?? cart?.discount ?? 0;

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng <Link to="/login" className="text-mocha underline">đăng nhập</Link> để xem giỏ hàng.
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải quyền truy cập...
      </div>
    );
  }

  if (!isCustomer) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Chức năng giỏ hàng chỉ dành cho tài khoản khách hàng (Customer).
      </div>
    );
  }

  if (isLoading || !cart) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải giỏ hàng...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Cart</p>
            <h1 className="mt-1 font-display text-3xl text-mocha">Giỏ hàng</h1>
            <p className="text-sm text-cocoa/70">Kiểm tra lại item trước khi thanh toán.</p>
          </div>
          <button
            type="button"
            className="btn-secondary !border-rose-200/80 !bg-white/90"
            onClick={() => navigate('/')}
            {...homePrefetchHandlers}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </section>

      {cart.items.length === 0 ? (
        <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          <p>Giỏ hàng đang trống.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="btn-secondary !border-rose-200/80 !bg-white/90" {...homePrefetchHandlers}>
              Quay lại mua sắm
            </Link>
            <Link to="/lookbook" className="btn-secondary !border-rose-200/80 !bg-white/90">
              Xem lookbook
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-4 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:flex-row sm:items-center"
              >
                <div className="h-20 w-20 rounded-2xl bg-rose-50/70">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName ?? 'Product'} className="h-full w-full rounded-2xl object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 space-y-1">
                  <Link
                    to={item.productSlug ? `/san-pham/${item.productSlug}` : '/'}
                    className="text-sm font-semibold text-cocoa hover:text-mocha"
                    {...(item.productSlug ? productDetailPrefetchHandlers : homePrefetchHandlers)}
                  >
                    {item.productName ?? 'Sản phẩm'}
                  </Link>
                  <p className="text-xs text-cocoa/60">
                    {item.size} · {item.color}
                  </p>
                  <p className="text-sm font-semibold text-mocha">{formatPrice(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-rose-200/70 bg-rose-50/70 px-2 py-1">
                    <button
                      type="button"
                      className="rounded-full p-1 text-mocha hover:bg-rose-200/45"
                      onClick={() => updateMutation.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[28px] text-center text-sm font-semibold text-cocoa">{item.quantity}</span>
                    <button
                      type="button"
                      className="rounded-full p-1 text-mocha hover:bg-rose-200/45"
                      onClick={() => updateMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-mocha">{formatPrice(item.lineTotal)}</p>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200/80 p-2 text-mocha hover:bg-rose-100/70"
                    onClick={() => removeMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Tóm tắt đơn</h2>
            <div className="space-y-2 rounded-2xl border border-rose-200/70 bg-rose-50/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cocoa/60">Voucher</p>
              <div className="flex gap-2">
                <input
                  value={voucherCode}
                  onChange={(event) => setVoucherCode(event.target.value)}
                  placeholder="Nhập mã voucher"
                  className="w-full rounded-xl border border-rose-200/80 bg-white/90 px-3 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  onClick={() => applyVoucherMutation.mutate(voucherCode.trim())}
                  disabled={applyVoucherMutation.isPending || voucherCode.trim().length === 0}
                >
                  Áp dụng
                </button>
              </div>
              {cart.appliedVoucherCode ? (
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  onClick={() => removeVoucherMutation.mutate()}
                  disabled={removeVoucherMutation.isPending}
                >
                  {removeVoucherMutation.isPending ? 'Đang bỏ...' : `Bỏ mã ${cart.appliedVoucherCode}`}
                </button>
              ) : null}
              {voucherMessage ? <p className="text-xs text-cocoa/70">{voucherMessage}</p> : null}
            </div>
            <div className="flex items-center justify-between text-sm text-cocoa/70">
              <span>Tạm tính trước giảm</span>
              <span>{formatPrice(subtotalBeforeDiscount)}</span>
            </div>
            {cart.appliedVoucherCode ? (
              <div className="flex items-center justify-between text-sm text-cocoa/70">
                <span>Voucher ({cart.appliedVoucherCode})</span>
                <span>-{formatPrice(voucherDiscount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm text-cocoa/70">
              <span>Tạm tính sau giảm</span>
              <span>{formatPrice(subtotalBeforeDiscount - voucherDiscount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-cocoa/70">
              <span>Phí vận chuyển</span>
              <span>{formatPrice(cart.shippingFee)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-caramel/30 pt-3 text-base font-semibold text-mocha">
              <span>Tổng cộng</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <Link to="/thanh-toan" className="btn-primary w-full" {...checkoutPrefetchHandlers}>
              Tiến hành thanh toán
            </Link>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Đang xóa...' : 'Xóa toàn bộ giỏ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
