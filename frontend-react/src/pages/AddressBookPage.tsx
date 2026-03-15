import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

type AddressFormState = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  ward: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

const emptyForm: AddressFormState = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  ward: '',
  district: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false
};

const AddressBookPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormState>(emptyForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['user-addresses'],
    queryFn: financeApi.addresses,
    enabled: isAuthenticated && isCustomer
  });

  const createMutation = useMutation({
    mutationFn: () =>
      financeApi.createAddress({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        ward: formData.ward.trim() || undefined,
        district: formData.district.trim() || undefined,
        city: formData.city.trim(),
        province: formData.province.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        isDefault: formData.isDefault
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      queryClient.invalidateQueries({ queryKey: ['user-default-address'] });
      setStatusMessage('Đã thêm địa chỉ mới.');
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message ?? 'Không thể thêm địa chỉ.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      financeApi.updateAddress(editingId as number, {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        ward: formData.ward.trim() || undefined,
        district: formData.district.trim() || undefined,
        city: formData.city.trim(),
        province: formData.province.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        isDefault: formData.isDefault
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      queryClient.invalidateQueries({ queryKey: ['user-default-address'] });
      setStatusMessage('Đã cập nhật địa chỉ.');
      setEditingId(null);
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message ?? 'Không thể cập nhật địa chỉ.');
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => financeApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      queryClient.invalidateQueries({ queryKey: ['user-default-address'] });
      setStatusMessage('Đã đặt địa chỉ mặc định.');
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message ?? 'Không thể đặt mặc định.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-addresses'] });
      queryClient.invalidateQueries({ queryKey: ['user-default-address'] });
      setStatusMessage('Đã xoá địa chỉ.');
      if (editingId != null) {
        setEditingId(null);
        setFormData(emptyForm);
      }
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message ?? 'Không thể xoá địa chỉ.');
    }
  });

  const isMutating =
    createMutation.isPending || updateMutation.isPending || setDefaultMutation.isPending || deleteMutation.isPending;

  const orderedAddresses = useMemo(
    () => [...addresses].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))),
    [addresses]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    if (editingId != null) {
      updateMutation.mutate();
      return;
    }
    createMutation.mutate();
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng <Link to="/login" className="text-mocha underline">đăng nhập</Link> để quản lý địa chỉ.
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
        Trang sổ địa chỉ chỉ dành cho tài khoản khách hàng.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Address Book</p>
        <h1 className="mt-1 font-display text-3xl text-mocha">Sổ địa chỉ</h1>
        <p className="text-sm text-cocoa/70">Lưu địa chỉ giao hàng để checkout nhanh hơn cho lần mua tiếp theo.</p>
      </section>

      {statusMessage ? (
        <div className="rounded-2xl border border-caramel/40 bg-white/90 px-4 py-3 text-sm text-cocoa/80">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <section className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          <h2 className="text-lg font-semibold text-cocoa">Địa chỉ đã lưu</h2>
          {isLoading ? <p className="text-sm text-cocoa/70">Đang tải địa chỉ...</p> : null}
          {!isLoading && orderedAddresses.length === 0 ? (
            <p className="text-sm text-cocoa/70">Bạn chưa có địa chỉ nào.</p>
          ) : null}
          <div className="space-y-3">
            {orderedAddresses.map((address) => (
              <article key={address.id} className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-cocoa">{address.fullName}</p>
                  {address.isDefault ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      Mặc định
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-cocoa/80">{address.phone}</p>
                <p className="mt-1 text-sm text-cocoa/75">
                  {address.addressLine1}
                  {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                  {address.ward ? `, ${address.ward}` : ''}
                  {address.district ? `, ${address.district}` : ''}
                  {address.city ? `, ${address.city}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!address.isDefault ? (
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                      onClick={() => setDefaultMutation.mutate(address.id)}
                      disabled={isMutating}
                    >
                      Đặt mặc định
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                    onClick={() => {
                      setEditingId(address.id);
                      setFormData({
                        fullName: address.fullName,
                        phone: address.phone,
                        addressLine1: address.addressLine1,
                        addressLine2: address.addressLine2 ?? '',
                        ward: address.ward ?? '',
                        district: address.district ?? '',
                        city: address.city,
                        province: address.province ?? '',
                        postalCode: address.postalCode ?? '',
                        isDefault: address.isDefault
                      });
                    }}
                    disabled={isMutating}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                    onClick={() => deleteMutation.mutate(address.id)}
                    disabled={isMutating}
                  >
                    Xoá
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]"
        >
          <h2 className="text-lg font-semibold text-cocoa">
            {editingId != null ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-cocoa/70">
              Họ và tên
              <input
                value={formData.fullName}
                onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Số điện thoại
              <input
                value={formData.phone}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
          </div>
          <label className="text-sm text-cocoa/70">
            Địa chỉ
            <input
              value={formData.addressLine1}
              onChange={(event) => setFormData((prev) => ({ ...prev, addressLine1: event.target.value }))}
              required
              className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-cocoa/70">
              Địa chỉ bổ sung
              <input
                value={formData.addressLine2}
                onChange={(event) => setFormData((prev) => ({ ...prev, addressLine2: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Thành phố
              <input
                value={formData.city}
                onChange={(event) => setFormData((prev) => ({ ...prev, city: event.target.value }))}
                required
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-cocoa/70">
              Phường/Xã
              <input
                value={formData.ward}
                onChange={(event) => setFormData((prev) => ({ ...prev, ward: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
            <label className="text-sm text-cocoa/70">
              Quận/Huyện
              <input
                value={formData.district}
                onChange={(event) => setFormData((prev) => ({ ...prev, district: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-sm text-cocoa outline-none focus:border-rose-400"
              />
            </label>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 px-4 py-3 text-sm text-cocoa/75">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(event) => setFormData((prev) => ({ ...prev, isDefault: event.target.checked }))}
              className="accent-mocha"
            />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={isMutating}>
              {editingId != null ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </button>
            {editingId != null ? (
              <button
                type="button"
                className="btn-secondary !border-rose-200/80 !bg-white/90"
                onClick={() => {
                  setEditingId(null);
                  setFormData(emptyForm);
                }}
              >
                Hủy chỉnh sửa
              </button>
            ) : null}
            <Link to="/thanh-toan" className="btn-secondary !border-rose-200/80 !bg-white/90">
              Tới checkout
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressBookPage;
