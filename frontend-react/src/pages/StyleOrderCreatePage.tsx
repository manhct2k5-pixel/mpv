import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import type { StoreProductDetail, StoreProductVariant } from '../types/store';

type ItemDraft = {
  productSlug: string;
  product?: StoreProductDetail | null;
  variantId: string;
  quantity: string;
  status?: 'idle' | 'loading' | 'error';
  error?: string | null;
  searchTerm?: string;
};

const createItem = (): ItemDraft => ({
  productSlug: '',
  product: null,
  variantId: '',
  quantity: '1',
  status: 'idle',
  error: null,
  searchTerm: ''
});

type ItemRowProps = {
  item: ItemDraft;
  index: number;
  onChange: (index: number, field: keyof ItemDraft, value: string) => void;
  onLoad: (index: number, slugOverride?: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
};

const StyleOrderItemRow = ({ item, index, onChange, onLoad, onRemove, canRemove }: ItemRowProps) => {
  const searchTerm = item.searchTerm ?? '';
  const { data: searchResults = { items: [] } } = useQuery({
    queryKey: ['store-search', index, searchTerm],
    queryFn: () => storeApi.products({ page: 0, pageSize: 6, q: searchTerm }),
    enabled: searchTerm.trim().length > 2
  });

  return (
    <div className="grid gap-3 sm:grid-cols-[1.3fr,1fr,0.8fr,auto]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            placeholder="Tìm sản phẩm"
            value={searchTerm}
            onChange={(event) => onChange(index, 'searchTerm', event.target.value)}
            className="w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
          <button
            type="button"
            className="btn-secondary btn-secondary--sm"
            onClick={() => onLoad(index)}
          >
            <Search className="h-4 w-4" />
            Tải
          </button>
        </div>
        {searchTerm.trim().length > 2 && searchResults.items.length > 0 && (
          <div className="grid gap-2">
            {searchResults.items.map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-2xl border border-caramel/30 bg-white/80 px-3 py-2 text-left text-xs text-cocoa hover:border-mocha/40"
                onClick={() => {
                  onChange(index, 'productSlug', product.slug);
                  onLoad(index, product.slug);
                }}
              >
                {product.name}
              </button>
            ))}
          </div>
        )}
        <input
          placeholder="Slug sản phẩm (vd: ao-len-may-kem)"
          value={item.productSlug}
          onChange={(event) => onChange(index, 'productSlug', event.target.value)}
          className="w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
        />
        {item.error && <p className="text-xs text-rose-500">{item.error}</p>}
        {item.product && (
          <p className="text-xs text-cocoa/60">Sản phẩm: {item.product.name}</p>
        )}
      </div>
      <select
        value={item.variantId}
        onChange={(event) => onChange(index, 'variantId', event.target.value)}
        className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
      >
        <option value="">Chọn biến thể</option>
        {(item.product?.variants ?? []).map((variant: StoreProductVariant) => (
          <option key={variant.id} value={variant.id}>
            {variant.size} · {variant.color} · {variant.price.toLocaleString('vi-VN')} đ
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        value={item.quantity}
        onChange={(event) => onChange(index, 'quantity', event.target.value)}
        className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
        placeholder="Số lượng"
      />
      {canRemove && (
        <button
          type="button"
          className="rounded-2xl border border-caramel/40 p-2 text-mocha hover:bg-caramel/20"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const StyleOrderCreatePage = () => {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });
  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const canCreate = role === 'warehouse' || role === 'admin';

  const [formData, setFormData] = useState({
    userEmail: '',
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
  const [items, setItems] = useState<ItemDraft[]>([createItem()]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const orderItems = items
        .filter((item) => item.variantId && item.quantity)
        .map((item) => ({
          variantId: Number(item.variantId),
          quantity: Number(item.quantity)
        }));

      if (!formData.userEmail.trim()) {
        throw new Error('Vui lòng nhập email người mua.');
      }
      if (orderItems.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 sản phẩm.');
      }

      return storeApi.createManualOrder({
        ...formData,
        userEmail: formData.userEmail.trim(),
        items: orderItems
      });
    },
    onSuccess: () => {
      setStatusMessage('Đã tạo đơn hàng và gửi tới người dùng.');
      setFormData((prev) => ({
        ...prev,
        userEmail: '',
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
      }));
      setItems([createItem()]);
    },
    onError: (error: any) => {
      setStatusMessage(error.message || error.response?.data?.message || 'Không thể tạo đơn hàng.');
    }
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof ItemDraft, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleLoadProduct = async (index: number, slugOverride?: string) => {
    const slug = (slugOverride ?? items[index].productSlug).trim();
    if (!slug) return;
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, status: 'loading', error: null } : item))
    );
    try {
      const product = await storeApi.product(slug);
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? { ...item, product, variantId: product.variants?.[0]?.id?.toString() ?? '', status: 'idle' }
            : item
        )
      );
    } catch (error: any) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                product: null,
                variantId: '',
                status: 'error',
                error: error.response?.data?.message || 'Không tìm thấy sản phẩm.'
              }
            : item
        )
      );
    }
  };

  const handleAddItem = () => setItems((prev) => [...prev, createItem()]);
  const handleRemoveItem = (index: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== index));

  if (profileLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải thông tin...</div>;
  }

  if (!canCreate) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Chỉ tài khoản staff kho hoặc admin mới được tạo đơn hàng.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-2 p-6 sm:p-8">
        <h1 className="font-display text-3xl text-mocha">Tạo đơn hàng cho user</h1>
        <p className="text-sm text-cocoa/70">
          Staff kho hoặc admin tạo đơn hàng thủ công và gửi tới người mua.
        </p>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setStatusMessage(null);
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="sticker-card grid gap-4 p-6 sm:grid-cols-2">
          <label className="text-sm text-cocoa/70">
            Email người mua
            <input
              name="userEmail"
              autoComplete="email"
              value={formData.userEmail}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Họ và tên người nhận
            <input
              name="fullName"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
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
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Phương thức thanh toán
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            >
              <option value="COD">COD</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
            </select>
          </label>
          <label className="text-sm text-cocoa/70 sm:col-span-2">
            Địa chỉ
            <input
              name="addressLine1"
              autoComplete="street-address"
              value={formData.addressLine1}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Phường/Xã
            <input
              name="ward"
              autoComplete="address-level4"
              value={formData.ward}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Quận/Huyện
            <input
              name="district"
              autoComplete="address-level3"
              value={formData.district}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Thành phố
            <input
              name="city"
              autoComplete="address-level2"
              value={formData.city}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Tỉnh
            <input
              name="province"
              autoComplete="address-level1"
              value={formData.province}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70 sm:col-span-2">
            Ghi chú giao hàng
            <textarea
              name="note"
              autoComplete="off"
              value={formData.note}
              onChange={handleChange}
              rows={2}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70 sm:col-span-2">
            Ghi chú đơn hàng
            <textarea
              name="notes"
              autoComplete="off"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
        </div>

        <div className="sticker-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cocoa">Sản phẩm</h2>
            <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4" />
              Thêm dòng
            </button>
          </div>
          {items.map((item, index) => (
            <StyleOrderItemRow
              key={`item-${index}`}
              item={item}
              index={index}
              onChange={handleItemChange}
              onLoad={handleLoadProduct}
              onRemove={handleRemoveItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>

        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang tạo...' : 'Tạo đơn hàng'}
        </button>
        {statusMessage && <div className="sticker-card p-4 text-sm text-cocoa/70">{statusMessage}</div>}
      </form>
    </div>
  );
};

export default StyleOrderCreatePage;
