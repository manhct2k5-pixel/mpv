import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { voucherApi, getApiErrorMessage } from '../services/api.ts';
import type { VoucherItem, VoucherUpsertPayload } from '../types/store.ts';

const emptyForm: VoucherUpsertPayload & { expireAtStr: string } = {
  code: '',
  type: 'PERCENT',
  value: 0,
  minOrder: 0,
  expireAt: null,
  expireAtStr: '',
  active: true
};

const SellerVouchersPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: vouchers = [], isLoading } = useQuery<VoucherItem[]>({
    queryKey: ['seller', 'vouchers'],
    queryFn: voucherApi.sellerList
  });

  const notify = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const buildPayload = (): VoucherUpsertPayload => ({
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number(form.value),
    minOrder: Number(form.minOrder ?? 0),
    expireAt: form.expireAtStr ? `${form.expireAtStr}T23:59:59` : null,
    active: form.active
  });

  const createMutation = useMutation({
    mutationFn: voucherApi.sellerCreate,
    onSuccess: () => {
      notify('Đã tạo voucher mới.');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['seller', 'vouchers'] });
    },
    onError: (err) => notify(getApiErrorMessage(err, 'Tạo voucher thất bại'), false)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: VoucherUpsertPayload }) =>
      voucherApi.sellerUpdate(id, payload),
    onSuccess: () => {
      notify('Đã cập nhật voucher.');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['seller', 'vouchers'] });
    },
    onError: (err) => notify(getApiErrorMessage(err, 'Cập nhật thất bại'), false)
  });

  const deleteMutation = useMutation({
    mutationFn: voucherApi.sellerDelete,
    onSuccess: () => {
      notify('Đã xóa voucher.');
      setDeleteConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ['seller', 'vouchers'] });
    },
    onError: (err) => notify(getApiErrorMessage(err, 'Xóa thất bại'), false)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (editingId != null) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (v: VoucherItem) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      type: v.type === 'percent' ? 'PERCENT' : 'FIXED',
      value: v.value,
      minOrder: v.minOrder,
      expireAt: v.expireAt,
      expireAtStr: v.expireAt ? v.expireAt.slice(0, 10) : '',
      active: v.active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_30px_rgba(148,163,184,0.10)]">
        <h2 className="mb-1 text-base font-semibold text-cocoa">
          {editingId != null ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}
        </h2>
        <p className="mb-4 text-xs text-cocoa/55">Voucher áp dụng cho toàn bộ đơn hàng khi khách nhập mã ở giỏ hàng.</p>

        {message && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-medium ${
              message.ok ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-cocoa/70">Mã voucher *</label>
            <input
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-rose-400"
              placeholder="VD: SUMMER20"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-cocoa/70">Loại giảm *</label>
            <select
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PERCENT' | 'FIXED' }))}
            >
              <option value="PERCENT">Phần trăm (%)</option>
              <option value="FIXED">Số tiền cố định (đ)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-cocoa/70">
              Giá trị * {form.type === 'PERCENT' ? '(%)' : '(đ)'}
            </label>
            <input
              type="number"
              min={0}
              max={form.type === 'PERCENT' ? 100 : undefined}
              step={form.type === 'PERCENT' ? 1 : 1000}
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-cocoa/70">Đơn tối thiểu (đ)</label>
            <input
              type="number"
              min={0}
              step={1000}
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
              value={form.minOrder ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, minOrder: Number(e.target.value) }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-cocoa/70">Ngày hết hạn</label>
            <input
              type="date"
              className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
              value={form.expireAtStr}
              onChange={(e) => setForm((f) => ({ ...f, expireAtStr: e.target.value }))}
            />
          </div>

          <div className="flex items-end gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-cocoa">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-rose-500"
                checked={form.active ?? true}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Kích hoạt ngay
            </label>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" disabled={isBusy} className="btn-primary btn-primary--sm">
              <Plus className="h-4 w-4" />
              {editingId != null ? 'Lưu thay đổi' : 'Tạo voucher'}
            </button>
            {editingId != null && (
              <button type="button" onClick={resetForm} className="btn-secondary btn-secondary--sm">
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_30px_rgba(148,163,184,0.10)]">
        <h2 className="mb-4 text-base font-semibold text-cocoa">Voucher của bạn</h2>

        {isLoading ? (
          <p className="text-sm text-cocoa/50">Đang tải...</p>
        ) : vouchers.length === 0 ? (
          <p className="text-sm text-cocoa/50">Bạn chưa tạo voucher nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 text-xs font-semibold uppercase tracking-wide text-cocoa/60">
                  <th className="pb-2 text-left">Mã</th>
                  <th className="pb-2 text-left">Loại</th>
                  <th className="pb-2 text-right">Giá trị</th>
                  <th className="pb-2 text-right">Đơn tối thiểu</th>
                  <th className="pb-2 text-left">Hết hạn</th>
                  <th className="pb-2 text-center">Trạng thái</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-rose-50/40">
                    <td className="py-2.5 font-mono font-semibold text-cocoa">{v.code}</td>
                    <td className="py-2.5 text-cocoa/70">
                      {v.type === 'percent' ? 'Phần trăm' : 'Cố định'}
                    </td>
                    <td className="py-2.5 text-right font-medium text-cocoa">
                      {v.type === 'percent'
                        ? `${v.value}%`
                        : v.value.toLocaleString('vi-VN') + ' đ'}
                    </td>
                    <td className="py-2.5 text-right text-cocoa/70">
                      {v.minOrder > 0 ? v.minOrder.toLocaleString('vi-VN') + ' đ' : '—'}
                    </td>
                    <td className="py-2.5 text-cocoa/70">
                      {v.expireAt ? v.expireAt.slice(0, 10) : '—'}
                    </td>
                    <td className="py-2.5 text-center">
                      {(() => {
                        const expired = v.expireAt && new Date(v.expireAt) < new Date();
                        if (expired) return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">Hết hạn</span>;
                        if (v.active) return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700">Đang hoạt động</span>;
                        return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-600">Tắt</span>;
                      })()}
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(v)}
                          className="rounded-lg p-1.5 text-cocoa/60 hover:bg-rose-100 hover:text-cocoa"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deleteConfirmId === v.id ? (
                          <>
                            <button
                              onClick={() => deleteMutation.mutate(v.id)}
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="rounded-lg px-2 py-1 text-xs text-cocoa/50 hover:bg-rose-50"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(v.id)}
                            className="rounded-lg p-1.5 text-cocoa/40 hover:bg-rose-100 hover:text-rose-600"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerVouchersPage;
