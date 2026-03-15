import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save } from 'lucide-react';
import { financeApi } from '../services/api.ts';
import type { AdminCategory, AdminSystemConfig } from '../types/app';

const emptyCategoryForm = {
  name: '',
  slug: '',
  gender: 'WOMEN',
  description: '',
  imageUrl: '',
  active: true
};

const AdminCatalogConfigPage = () => {
  const queryClient = useQueryClient();
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);

  const [configForm, setConfigForm] = useState({
    supportEmail: '',
    supportPhone: '',
    orderAutoCancelHours: '48',
    maxRefundDays: '7',
    allowManualRefund: true,
    maintenanceMode: false
  });
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery<AdminCategory[]>({
    queryKey: ['admin', 'categories'],
    queryFn: financeApi.admin.categories
  });

  const { data: systemConfig } = useQuery<AdminSystemConfig>({
    queryKey: ['admin', 'settings'],
    queryFn: financeApi.admin.settings
  });

  useEffect(() => {
    if (!systemConfig) return;
    setConfigForm({
      supportEmail: systemConfig.supportEmail ?? '',
      supportPhone: systemConfig.supportPhone ?? '',
      orderAutoCancelHours: String(systemConfig.orderAutoCancelHours ?? 48),
      maxRefundDays: String(systemConfig.maxRefundDays ?? 7),
      allowManualRefund: Boolean(systemConfig.allowManualRefund),
      maintenanceMode: Boolean(systemConfig.maintenanceMode)
    });
  }, [systemConfig]);

  const createCategoryMutation = useMutation({
    mutationFn: (payload: typeof categoryForm) =>
      financeApi.admin.createCategory({
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        gender: payload.gender,
        description: payload.description.trim() || undefined,
        imageUrl: payload.imageUrl.trim() || undefined,
        active: payload.active
      }),
    onSuccess: () => {
      setCategoryMessage('Đã tạo danh mục mới.');
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; form: typeof categoryForm }) =>
      financeApi.admin.updateCategory(payload.id, {
        name: payload.form.name.trim(),
        slug: payload.form.slug.trim() || undefined,
        gender: payload.form.gender,
        description: payload.form.description.trim() || undefined,
        imageUrl: payload.form.imageUrl.trim() || undefined,
        active: payload.form.active
      }),
    onSuccess: () => {
      setCategoryMessage('Đã cập nhật danh mục.');
      setEditingCategoryId(null);
      setCategoryForm(emptyCategoryForm);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    }
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; active: boolean }) =>
      financeApi.admin.toggleCategoryActive(payload.id, payload.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: () =>
      financeApi.admin.updateSettings({
        supportEmail: configForm.supportEmail.trim(),
        supportPhone: configForm.supportPhone.trim(),
        orderAutoCancelHours: Number(configForm.orderAutoCancelHours),
        maxRefundDays: Number(configForm.maxRefundDays),
        allowManualRefund: configForm.allowManualRefund,
        maintenanceMode: configForm.maintenanceMode
      }),
    onSuccess: () => {
      setConfigMessage('Đã lưu cấu hình hệ thống.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: (error: any) => {
      setConfigMessage(error.response?.data?.message || error.response?.data?.error || 'Không thể lưu cấu hình.');
    }
  });

  const handleSubmitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryMessage(null);
    if (editingCategoryId == null) {
      createCategoryMutation.mutate(categoryForm);
      return;
    }
    updateCategoryMutation.mutate({ id: editingCategoryId, form: categoryForm });
  };

  const handleSaveConfig = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfigMessage(null);
    updateConfigMutation.mutate();
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="admin-hero-card">
        <div className="space-y-2">
          <p className="admin-badge">Danh mục & cấu hình</p>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)] sm:text-3xl">Quản trị dữ liệu nền hệ thống</h1>
          <p className="max-w-3xl text-sm text-[var(--admin-muted)]">
            Quản lý danh mục hiển thị và cấu hình vận hành: thanh toán, hoàn tiền, bảo trì và thông tin hỗ trợ.
          </p>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">A. Danh mục sản phẩm</h2>
            <p className="admin-section__description">Tạo/sửa danh mục, bật tắt hiển thị và quản lý metadata.</p>
          </div>
        </div>

        <form onSubmit={handleSubmitCategory} className="grid gap-2 lg:grid-cols-6">
          <input
            value={categoryForm.name}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
            className="admin-input lg:col-span-2"
            placeholder="Tên danh mục"
            required
          />
          <input
            value={categoryForm.slug}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            className="admin-input"
            placeholder="Slug (tuỳ chọn)"
          />
          <select
            value={categoryForm.gender}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, gender: event.target.value }))}
            className="admin-select"
          >
            <option value="WOMEN">Nữ</option>
            <option value="MEN">Nam</option>
            <option value="UNISEX">Unisex</option>
          </select>
          <input
            value={categoryForm.imageUrl}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            className="admin-input lg:col-span-2"
            placeholder="Ảnh đại diện danh mục"
          />
          <input
            value={categoryForm.description}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            className="admin-input lg:col-span-4"
            placeholder="Mô tả ngắn"
          />
          <label className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 text-sm text-[var(--admin-text)]">
            <input
              type="checkbox"
              checked={categoryForm.active}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Đang hiển thị
          </label>
          <button
            type="submit"
            className="admin-action-button success"
            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          >
            {editingCategoryId == null ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {editingCategoryId == null ? 'Thêm danh mục' : 'Lưu chỉnh sửa'}
          </button>
        </form>

        {categoryMessage ? <p className="mt-3 text-xs text-emerald-700">{categoryMessage}</p> : null}
        {categoriesLoading ? <p className="mt-3 text-sm text-[var(--admin-muted)]">Đang tải danh mục...</p> : null}
        {categoriesError ? <p className="mt-3 text-sm text-rose-600">Không tải được danh mục.</p> : null}
        {!categoriesLoading && !categoriesError ? (
          <div className="admin-table-wrap mt-4">
            <table className="admin-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Tên danh mục</th>
                  <th>Slug</th>
                  <th>Phân nhóm</th>
                  <th>Trạng thái</th>
                  <th>Thứ tự</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.gender}</td>
                    <td>
                      <span className={`admin-status-badge ${category.active ? '' : 'warning'}`}>
                        {category.active ? 'Đang hiển thị' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td>{index + 1}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="admin-inline-button"
                          onClick={() => {
                            setEditingCategoryId(category.id);
                            setCategoryForm({
                              name: category.name ?? '',
                              slug: category.slug ?? '',
                              gender: category.gender ?? 'WOMEN',
                              description: category.description ?? '',
                              imageUrl: category.imageUrl ?? '',
                              active: category.active
                            });
                          }}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          className={`admin-action-button ${category.active ? 'danger' : 'success'}`}
                          disabled={toggleCategoryMutation.isPending}
                          onClick={() =>
                            toggleCategoryMutation.mutate({
                              id: category.id,
                              active: !category.active
                            })
                          }
                        >
                          {category.active ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-[var(--admin-muted)]">
                      Chưa có danh mục.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title">B. Cấu hình hệ thống</h2>
            <p className="admin-section__description">Thiết lập thanh toán, trạng thái đơn, hoàn tiền và vận hành.</p>
          </div>
        </div>
        <form onSubmit={handleSaveConfig} className="grid gap-3 lg:grid-cols-2">
          <label className="text-sm text-[var(--admin-muted)]">
            Email hỗ trợ
            <input
              value={configForm.supportEmail}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, supportEmail: event.target.value }))}
              className="admin-input mt-1"
            />
          </label>
          <label className="text-sm text-[var(--admin-muted)]">
            Hotline hỗ trợ
            <input
              value={configForm.supportPhone}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, supportPhone: event.target.value }))}
              className="admin-input mt-1"
            />
          </label>
          <label className="text-sm text-[var(--admin-muted)]">
            Tự huỷ đơn sau (giờ)
            <input
              type="number"
              min={1}
              value={configForm.orderAutoCancelHours}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, orderAutoCancelHours: event.target.value }))}
              className="admin-input mt-1"
            />
          </label>
          <label className="text-sm text-[var(--admin-muted)]">
            Giới hạn ngày hoàn tiền
            <input
              type="number"
              min={1}
              value={configForm.maxRefundDays}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, maxRefundDays: event.target.value }))}
              className="admin-input mt-1"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]">
            Bật hoàn tiền thủ công
            <input
              type="checkbox"
              checked={configForm.allowManualRefund}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, allowManualRefund: event.target.checked }))}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-sm text-[var(--admin-text)]">
            Chế độ bảo trì hệ thống
            <input
              type="checkbox"
              checked={configForm.maintenanceMode}
              onChange={(event) => setConfigForm((prev) => ({ ...prev, maintenanceMode: event.target.checked }))}
            />
          </label>
          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
            {configMessage ? <p className="text-xs text-emerald-700">{configMessage}</p> : <span />}
            <button type="submit" className="admin-action-button success" disabled={updateConfigMutation.isPending}>
              <Save className="h-4 w-4" />
              {updateConfigMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-4">
          <p className="text-sm font-semibold text-[var(--admin-text)]">Cấu hình trạng thái và phương thức chuẩn</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {['COD', 'Bank transfer', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].map(
              (item) => (
                <span key={item} className="admin-inline-button is-active">
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminCatalogConfigPage;
