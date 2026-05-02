import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { bankTransferInfo, buildVietQrUrl } from '../constants/payment.ts';
import type { UserAddress } from '../types/app';
import { buildMissingDeliveryFieldsMessage } from '../utils/orderForms';
import { canUseShoppingFlow } from '../utils/access';

type SavedAddressPayload = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  ward?: string;
  district?: string;
  city: string;
  province?: string;
  postalCode?: string;
};

const normalizeAddressValue = (value?: string | null) => value?.trim() ?? '';

const savedAddressMatches = (address: UserAddress, payload: SavedAddressPayload) =>
  normalizeAddressValue(address.fullName) === normalizeAddressValue(payload.fullName) &&
  normalizeAddressValue(address.phone) === normalizeAddressValue(payload.phone) &&
  normalizeAddressValue(address.addressLine1) === normalizeAddressValue(payload.addressLine1) &&
  normalizeAddressValue(address.addressLine2) === normalizeAddressValue(payload.addressLine2) &&
  normalizeAddressValue(address.ward) === normalizeAddressValue(payload.ward) &&
  normalizeAddressValue(address.district) === normalizeAddressValue(payload.district) &&
  normalizeAddressValue(address.city) === normalizeAddressValue(payload.city) &&
  normalizeAddressValue(address.province) === normalizeAddressValue(payload.province) &&
  normalizeAddressValue(address.postalCode) === normalizeAddressValue(payload.postalCode);

const CheckoutPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const canShop = canUseShoppingFlow(profile?.role);

  const { data: cart, isLoading: cartLoading, isError: cartError, refetch: refetchCart } = useQuery({
    queryKey: ['store-cart'],
    queryFn: storeApi.cart,
    enabled: isAuthenticated && canShop
  });

  const { data: addresses = [], isFetched: addressesFetched, isError: addressesError, refetch: refetchAddresses } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: financeApi.addresses,
    enabled: isAuthenticated && canShop
  });

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
    paymentMethod: 'COD' as 'COD' | 'BANK_TRANSFER',
    notes: ''
  });
  const [saveForNextPurchase, setSaveForNextPurchase] = useState(false);
  const [hasHydratedAddress, setHasHydratedAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const transferContentSuggestion = formData.phone.trim()
    ? `MOCMAM ${formData.phone.trim()}`
    : 'MOCMAM SO_DIEN_THOAI';

  useEffect(() => {
    if (hasHydratedAddress) {
      return;
    }

    if (canShop && !addressesFetched) {
      return;
    }

    const primaryAddress = addresses.find((item) => item.isDefault) ?? addresses[0];

    if (!profile && !primaryAddress) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fullName: primaryAddress?.fullName ?? profile?.fullName ?? prev.fullName,
      phone: primaryAddress?.phone ?? prev.phone,
      addressLine1: primaryAddress?.addressLine1 ?? prev.addressLine1,
      addressLine2: primaryAddress?.addressLine2 ?? prev.addressLine2,
      ward: primaryAddress?.ward ?? prev.ward,
      district: primaryAddress?.district ?? prev.district,
      city: primaryAddress?.city ?? prev.city,
      province: primaryAddress?.province ?? prev.province,
      postalCode: primaryAddress?.postalCode ?? prev.postalCode
    }));
    if (primaryAddress?.id != null) {
      setSelectedAddressId(String(primaryAddress.id));
    }
    setHasHydratedAddress(true);
  }, [addresses, addressesFetched, canShop, hasHydratedAddress, profile]);

  useEffect(() => {
    if (!selectedAddressId) {
      return;
    }
    const selected = addresses.find((item) => String(item.id) === selectedAddressId);
    if (!selected) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      fullName: selected.fullName ?? prev.fullName,
      phone: selected.phone ?? prev.phone,
      addressLine1: selected.addressLine1 ?? prev.addressLine1,
      addressLine2: selected.addressLine2 ?? '',
      ward: selected.ward ?? '',
      district: selected.district ?? '',
      city: selected.city ?? prev.city,
      province: selected.province ?? '',
      postalCode: selected.postalCode ?? ''
    }));
  }, [addresses, selectedAddressId]);

  const reusableAddressPayload: SavedAddressPayload = {
    fullName: formData.fullName.trim(),
    phone: formData.phone.trim(),
    addressLine1: formData.addressLine1.trim(),
    addressLine2: formData.addressLine2.trim() || undefined,
    ward: formData.ward.trim() || undefined,
    district: formData.district.trim() || undefined,
    city: formData.city.trim(),
    province: formData.province.trim() || undefined,
    postalCode: formData.postalCode.trim() || undefined
  };

  const orderMutation = useMutation({
    mutationFn: () =>
      storeApi.createOrder({
        ...formData,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        ward: formData.ward.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        postalCode: formData.postalCode.trim() || undefined,
        note: formData.note.trim() || undefined,
        notes: formData.notes.trim() || undefined
      }),
    onSuccess: async (order) => {
      queryClient.invalidateQueries({ queryKey: ['store-cart'] });
      if (saveForNextPurchase) {
        try {
          const matchingSavedAddress = addresses.find((address) => savedAddressMatches(address, reusableAddressPayload));
          if (!matchingSavedAddress) {
            await financeApi.createAddress({
              ...reusableAddressPayload,
              isDefault: !addressesError && addresses.length === 0
            });
            queryClient.invalidateQueries({ queryKey: ['user-default-address'] });
            queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
          }
        } catch {
          // Keep order success even if saving the reusable address fails.
        }
      }
      setStatusMessage('Đặt hàng thành công!');
      setTimeout(() => navigate(`/dat-hang-thanh-cong?orderId=${order.id}`), 600);
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || 'Đặt hàng thất bại, vui lòng thử lại.');
    }
  });

  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';
  const subtotalBeforeDiscount = cart?.subtotalBeforeDiscount ?? cart?.subtotal ?? 0;
  const voucherDiscount = cart?.voucherDiscount ?? cart?.discount ?? 0;
  const qrAmount = cart?.total ?? 0;
  const qrImageUrl = buildVietQrUrl(qrAmount, transferContentSuggestion);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationMessage = buildMissingDeliveryFieldsMessage({
      fullName: formData.fullName,
      phone: formData.phone,
      addressLine1: formData.addressLine1,
      ward: formData.ward,
      district: formData.district,
      city: formData.city,
      province: formData.province
    });
    if (validationMessage) {
      setStatusMessage(validationMessage);
      return;
    }
    setStatusMessage(null);
    orderMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng đăng nhập để thanh toán.
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

  if (profileError || !profile) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được thông tin tài khoản để checkout.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => void refetchProfile()}>
            Tải lại
          </button>
          <Link to="/login" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Đăng nhập lại
          </Link>
        </div>
      </div>
    );
  }

  if (!canShop) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Checkout dành cho tài khoản khách hàng.
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải giỏ hàng...
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Không tải được giỏ hàng. Vui lòng thử lại.</p>
        <button type="button" className="btn-primary" onClick={() => void refetchCart()}>
          Tải lại giỏ hàng
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <p>Giỏ hàng đang trống.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/gio-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Quay lại giỏ hàng
          </Link>
          <Link to="/" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Checkout</p>
        <h1 className="mt-1 font-display text-3xl text-mocha">Thanh toán</h1>
        <p className="text-sm text-cocoa/70">Điền thông tin giao hàng để hoàn tất đơn.</p>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/92 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Thông tin nhận hàng</h2>
            {addressesError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                <p>Không tải được sổ địa chỉ đã lưu. Bạn vẫn có thể nhập tay để tiếp tục checkout.</p>
                <button type="button" className="mt-3 btn-secondary btn-secondary--sm !border-amber-200 !bg-white/90" onClick={() => void refetchAddresses()}>
                  Tải lại địa chỉ
                </button>
              </div>
            ) : null}
            {addresses.length > 0 ? (
              <div className="space-y-2 rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
                <label className="text-sm text-cocoa/70">
                  Chọn địa chỉ đã lưu
                  <select
                    value={selectedAddressId}
                    onChange={(event) => setSelectedAddressId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                  >
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.fullName} - {address.phone}
                        {address.isDefault ? ' (Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <Link to="/tai-khoan/dia-chi" className="inline-flex text-xs font-semibold text-mocha underline">
                  Quản lý sổ địa chỉ
                </Link>
              </div>
            ) : (
              <Link to="/tai-khoan/dia-chi" className="inline-flex text-xs font-semibold text-mocha underline">
                Bạn chưa có địa chỉ lưu sẵn. Bấm để tạo trong sổ địa chỉ.
              </Link>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-cocoa/70">
                Họ và tên
                <input
                  name="fullName"
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
              <label className="text-sm text-cocoa/70">
                Số điện thoại
                <input
                  name="phone"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
            </div>
            <label className="text-sm text-cocoa/70">
              Địa chỉ
              <input
                name="addressLine1"
                autoComplete="street-address"
                value={formData.addressLine1}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-cocoa/70">
                Phường/Xã
                <input
                  name="ward"
                  autoComplete="address-level4"
                  value={formData.ward}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
              <label className="text-sm text-cocoa/70">
                Quận/Huyện
                <input
                  name="district"
                  autoComplete="address-level3"
                  value={formData.district}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-cocoa/70">
                Thành phố
                <input
                  name="city"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
              <label className="text-sm text-cocoa/70">
                Tỉnh
                <input
                  name="province"
                  autoComplete="address-level1"
                  value={formData.province}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                />
              </label>
            </div>
            <label className="text-sm text-cocoa/70">
              Ghi chú giao hàng
              <textarea
                name="note"
                autoComplete="off"
                value={formData.note}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                rows={3}
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/50 px-4 py-3 text-sm text-cocoa/75">
              <input
                type="checkbox"
                checked={saveForNextPurchase}
                onChange={(event) => setSaveForNextPurchase(event.target.checked)}
                className="accent-mocha"
              />
              Lưu địa chỉ này vào sổ địa chỉ cho lần mua sau, không ghi đè địa chỉ mặc định hiện có
            </label>
          </div>

          <div className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/92 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <h2 className="text-lg font-semibold text-cocoa">Phương thức thanh toán</h2>
            <label className="flex items-center gap-3 text-sm text-cocoa/70">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={formData.paymentMethod === 'COD'}
                onChange={handleChange}
                className="accent-mocha"
              />
              Thanh toán khi nhận hàng (COD)
            </label>
            <label className="flex items-center gap-3 text-sm text-cocoa/70">
              <input
                type="radio"
                name="paymentMethod"
                value="BANK_TRANSFER"
                checked={formData.paymentMethod === 'BANK_TRANSFER'}
                onChange={handleChange}
                className="accent-mocha"
              />
              Chuyển khoản / quét QR ngân hàng
            </label>
            {formData.paymentMethod === 'BANK_TRANSFER' && (
              <div className="grid gap-4 rounded-2xl border border-caramel/40 bg-white/80 p-4 text-sm text-cocoa/80 md:grid-cols-[0.9fr,1.1fr]">
                <div className="space-y-2">
                  <p className="font-semibold text-cocoa">Thanh toán bằng QR</p>
                  <div className="overflow-hidden rounded-2xl border border-rose-200/70 bg-white p-3 shadow-[0_10px_22px_rgba(148,163,184,0.12)]">
                    <img src={qrImageUrl} alt="QR chuyển khoản ngân hàng" className="mx-auto w-full max-w-[240px]" />
                  </div>
                  <p className="text-xs text-cocoa/60">
                    Quét QR bằng app ngân hàng để thanh toán nhanh theo đúng số tiền đơn hàng.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-cocoa">Thông tin chuyển khoản</p>
                  <p>
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
                  <p className="mt-2">
                    Số tiền: <span className="font-semibold">{formatPrice(qrAmount)}</span>
                  </p>
                  <p>
                    Nội dung chuyển khoản gợi ý:{' '}
                    <span className="font-semibold">{transferContentSuggestion}</span>
                  </p>
                  <p className="mt-2 text-xs text-cocoa/60">
                    Sau khi chuyển khoản hoặc quét QR, đơn sẽ chờ admin hoặc nhân viên xác nhận thanh toán trước khi giao hàng.
                  </p>
                </div>
              </div>
            )}
            <label className="text-sm text-cocoa/70">
              Ghi chú đơn hàng
              <textarea
                name="notes"
                autoComplete="off"
                value={formData.notes}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
                rows={3}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/92 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-lg font-semibold text-cocoa">Tóm tắt đơn hàng</h2>
          <div className="space-y-3 text-sm text-cocoa/70">
            {cart.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>{item.productName}</span>
                <span>x{item.quantity}</span>
              </div>
            ))}
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
          <button type="submit" className="btn-primary w-full" disabled={orderMutation.isPending}>
            {orderMutation.isPending ? 'Đang xử lý...' : 'Đặt hàng ngay'}
          </button>
          {statusMessage && (
            <div className="rounded-2xl border border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/80">
              {statusMessage}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
