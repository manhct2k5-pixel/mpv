import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, LayoutGrid, PackagePlus, Plus, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import type { StoreProductDetail, StoreProductSummary } from '../types/store';
import { useSearchParams } from 'react-router-dom';

type VariantInput = {
  id?: number;
  size: string;
  color: string;
  priceOverride: string;
  stockQty: string;
  imageUrl: string;
};

const emptyVariant = (): VariantInput => ({
  size: '',
  color: '',
  priceOverride: '',
  stockQty: '',
  imageUrl: ''
});

const ProductManagementPage = () => {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'featured' | 'sale'>('all');
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    gender: 'WOMEN',
    basePrice: '',
    salePrice: '',
    description: '',
    brand: '',
    material: '',
    fit: '',
    featured: false,
    imageUrls: ''
  });
  const [variants, setVariants] = useState<VariantInput[]>([emptyVariant()]);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['store-categories'],
    queryFn: storeApi.categories
  });
  const { data: sellerProducts = [] } = useQuery({
    queryKey: ['seller-products', profile?.id],
    queryFn: () => storeApi.sellerProducts(Number(profile?.id)),
    enabled: Boolean(profile?.id)
  });
  const { data: allProducts = [] } = useQuery({
    queryKey: ['store-products-admin'],
    queryFn: async () => {
      const payload = await storeApi.products({ page: 0, pageSize: 200 });
      return payload.items;
    },
    enabled: (profile?.role ?? '').toLowerCase() === 'admin'
  });

  const canManage = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase();
    return role === 'admin' || role === 'seller';
  }, [profile?.role]);

  const normalizedRole = (profile?.role ?? '').toLowerCase();
  const isAdmin = normalizedRole === 'admin';
  const workspaceTitle = isAdmin ? 'Quản lý catalog toàn hệ thống' : 'Quản lý catalog gian hàng';
  const workspaceDescription = isAdmin
    ? 'Theo dõi toàn bộ sản phẩm để chuẩn hoá danh mục, ưu tiên sản phẩm nổi bật và kiểm soát giá bán.'
    : 'Cập nhật sản phẩm, biến thể và tồn kho để đồng bộ với vận hành đơn hàng.';
  const workspaceBadge = isAdmin ? 'Admin Catalog' : 'Seller';

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearchTerm(q);
  }, [searchParams]);

  const visibleProducts = useMemo(() => {
    const items = (profile?.role ?? '').toLowerCase() === 'admin' ? allProducts : sellerProducts;
    const normalized = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const passName = !normalized || item.name.toLowerCase().includes(normalized);
      const passCategory = categoryFilter === 'all' || (item.category ?? '') === categoryFilter;
      const isSale = item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice;
      const passStatus =
        statusFilter === 'all' ||
        (statusFilter === 'featured' && Boolean(item.featured)) ||
        (statusFilter === 'sale' && isSale);
      return passName && passCategory && passStatus;
    });
  }, [allProducts, categoryFilter, profile?.role, searchTerm, sellerProducts, statusFilter]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    const source = (profile?.role ?? '').toLowerCase() === 'admin' ? allProducts : sellerProducts;
    source.forEach((item) => {
      if (item.category) values.add(item.category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [allProducts, profile?.role, sellerProducts]);

  const featuredCount = useMemo(
    () => visibleProducts.filter((item) => Boolean(item.featured)).length,
    [visibleProducts]
  );
  const onSaleCount = useMemo(
    () =>
      visibleProducts.filter(
        (item) => item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice
      ).length,
    [visibleProducts]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanVariants = variants
        .filter((variant) => variant.size.trim() && variant.color.trim())
        .map((variant) => ({
          size: variant.size.trim(),
          color: variant.color.trim(),
          priceOverride: variant.priceOverride ? Number(variant.priceOverride) : undefined,
          stockQty: variant.stockQty ? Number(variant.stockQty) : 0,
          imageUrl: variant.imageUrl.trim() || undefined
        }));

      const imageUrls = formData.imageUrls
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (cleanVariants.length === 0) {
        throw new Error('Vui lòng thêm ít nhất một biến thể.');
      }

      if (mode === 'create') {
        return storeApi.createProduct({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          gender: formData.gender as 'MEN' | 'WOMEN' | 'UNISEX',
          categoryId: Number(formData.categoryId),
          brand: formData.brand.trim() || undefined,
          material: formData.material.trim() || undefined,
          fit: formData.fit.trim() || undefined,
          basePrice: Number(formData.basePrice),
          salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
          featured: formData.featured,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          variants: cleanVariants
        });
      }

      if (!selectedProductId) {
        throw new Error('Chưa chọn sản phẩm cần cập nhật.');
      }

      const updatedProduct = await storeApi.updateProduct(selectedProductId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        gender: formData.gender as 'MEN' | 'WOMEN' | 'UNISEX',
        categoryId: Number(formData.categoryId),
        brand: formData.brand.trim() || undefined,
        material: formData.material.trim() || undefined,
        fit: formData.fit.trim() || undefined,
        basePrice: Number(formData.basePrice),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        featured: formData.featured,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      });

      const variantUpdates = variants
        .filter((variant) => variant.id)
        .map((variant) =>
          storeApi.updateVariant(selectedProductId, variant.id as number, {
            size: variant.size.trim() || undefined,
            color: variant.color.trim() || undefined,
            priceOverride: variant.priceOverride ? Number(variant.priceOverride) : undefined,
            stockQty: variant.stockQty ? Number(variant.stockQty) : undefined,
            imageUrl: variant.imageUrl.trim() || undefined
          })
        );
      const variantCreates = variants
        .filter((variant) => !variant.id && variant.size.trim() && variant.color.trim())
        .map((variant) =>
          storeApi.createVariant(selectedProductId, {
            size: variant.size.trim(),
            color: variant.color.trim(),
            priceOverride: variant.priceOverride ? Number(variant.priceOverride) : undefined,
            stockQty: variant.stockQty ? Number(variant.stockQty) : 0,
            imageUrl: variant.imageUrl.trim() || undefined
          })
        );
      if (variantUpdates.length > 0) {
        await Promise.all(variantUpdates);
      }
      if (variantCreates.length > 0) {
        await Promise.all(variantCreates);
      }

      return updatedProduct;
    },
    onSuccess: () => {
      setStatusMessage(mode === 'create' ? 'Đã tạo sản phẩm mới.' : 'Đã cập nhật sản phẩm.');
      setFormData((prev) => ({
        ...prev,
        name: '',
        basePrice: '',
        salePrice: '',
        description: '',
        imageUrls: ''
      }));
      setVariants([emptyVariant()]);
      setMode('create');
      setSelectedProductId(null);
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-featured'] });
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (error: any) => {
      setStatusMessage(error.message || error.response?.data?.message || 'Không thể tạo sản phẩm.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      setStatusMessage('Đã xóa sản phẩm.');
      if (selectedProductId) {
        setMode('create');
        setSelectedProductId(null);
        setVariants([emptyVariant()]);
      }
    }
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (payload: { productId: number; variantId: number }) =>
      storeApi.deleteVariant(payload.productId, payload.variantId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setVariants((prev) => prev.filter((variant) => variant.id !== variables.variantId));
    }
  });

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value
    }));
  };

  const handleVariantChange = (index: number, field: keyof VariantInput, value: string) => {
    setVariants((prev) =>
      prev.map((variant, idx) => (idx === index ? { ...variant, [field]: value } : variant))
    );
  };

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, emptyVariant()]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    mutation.mutate();
  };

  const loadProductForEdit = async (product: StoreProductSummary) => {
    const detail: StoreProductDetail = await storeApi.product(product.slug);
    setMode('edit');
    setSelectedProductId(detail.id);
    setFormData({
      name: detail.name ?? '',
      categoryId: categories.find((cat) => cat.name === detail.category)?.id?.toString() ?? '',
      gender: (detail.gender ?? 'WOMEN').toUpperCase(),
      basePrice: detail.basePrice?.toString() ?? '',
      salePrice: detail.salePrice?.toString() ?? '',
      description: detail.description ?? '',
      brand: detail.brand ?? '',
      material: detail.material ?? '',
      fit: detail.fit ?? '',
      featured: Boolean(detail.featured),
      imageUrls: (detail.images ?? []).join('\n')
    });
    setVariants(
      detail.variants.map((variant) => ({
        id: variant.id,
        size: variant.size,
        color: variant.color,
        priceOverride: variant.price ? String(variant.price) : '',
        stockQty: variant.stockQty ? String(variant.stockQty) : '',
        imageUrl: variant.imageUrl ?? ''
      }))
    );
  };

  if (!canManage) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Bạn không có quyền thêm sản phẩm.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-caramel/30 bg-white/80 text-mocha">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-mocha">{workspaceTitle}</h1>
              <p className="max-w-3xl text-sm text-cocoa/70">{workspaceDescription}</p>
            </div>
          </div>
          <span className="badge">{workspaceBadge}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm trong phạm vi</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{visibleProducts.length.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm nổi bật</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{featuredCount.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm đang sale</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{onSaleCount.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="tag">
            <PackagePlus className="h-3.5 w-3.5" />
            {mode === 'create' ? 'Đang ở chế độ thêm mới' : 'Đang ở chế độ chỉnh sửa'}
          </span>
          <span className="tag">
            <Sparkles className="h-3.5 w-3.5" />
            {isAdmin ? 'Có thể quản trị toàn bộ catalog' : 'Quản lý sản phẩm theo gian hàng'}
          </span>
        </div>
      </section>

      <section className="sticker-card space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-cocoa">Danh sách sản phẩm</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary btn-secondary--sm"
              onClick={() => setStatusMessage('Nhập hàng loạt đang được chuẩn bị, sẽ bật trong bản kế tiếp.')}
            >
              <UploadCloud className="h-4 w-4" />
              Nhập hàng loạt
            </button>
            <button
              type="button"
              className="btn-secondary btn-secondary--sm"
              onClick={() => setStatusMessage('Xuất danh sách sản phẩm đang được chuẩn bị, sẽ bật trong bản kế tiếp.')}
            >
              <Download className="h-4 w-4" />
              Xuất danh sách
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên sản phẩm"
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          >
            <option value="all">Tất cả danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="featured">Đang nổi bật</option>
            <option value="sale">Đang khuyến mãi</option>
          </select>
        </div>
        {visibleProducts.length === 0 ? (
          <div className="text-sm text-cocoa/70">Chưa có sản phẩm.</div>
        ) : (
          <div className="grid gap-3">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-2xl border border-caramel/30 bg-white/80 p-4 sm:flex-row sm:items-center"
              >
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-caramel/25 bg-cream/40">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] text-cocoa/55">No image</div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-cocoa">{product.name}</p>
                  <p className="text-xs text-cocoa/60">
                    SKU: {product.slug} · {product.category || 'Khác'}
                  </p>
                  <p className="text-xs text-cocoa/60">
                    Giá: {product.basePrice.toLocaleString('vi-VN')} đ
                    {product.salePrice ? ` · Sale: ${product.salePrice.toLocaleString('vi-VN')} đ` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm"
                    onClick={() => loadProductForEdit(product)}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm"
                    onClick={() => deleteMutation.mutate(product.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="sticker-card grid gap-4 p-6 sm:grid-cols-2">
          <label className="text-sm text-cocoa/70">
            Tên sản phẩm
            <input
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Danh mục
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleFormChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-cocoa/70">
            Giới tính
            <select
              name="gender"
              value={formData.gender}
              onChange={handleFormChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            >
              <option value="WOMEN">Nữ</option>
              <option value="MEN">Nam</option>
              <option value="UNISEX">Unisex</option>
            </select>
          </label>
          <label className="text-sm text-cocoa/70">
            Giá gốc (đ)
            <input
              name="basePrice"
              type="number"
              min={0}
              value={formData.basePrice}
              onChange={handleFormChange}
              required
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Giá sale (đ)
            <input
              name="salePrice"
              type="number"
              min={0}
              value={formData.salePrice}
              onChange={handleFormChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Thương hiệu
            <input
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Chất liệu
            <input
              name="material"
              value={formData.material}
              onChange={handleFormChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70">
            Form dáng
            <input
              name="fit"
              value={formData.fit}
              onChange={handleFormChange}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70 sm:col-span-2">
            Mô tả
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="text-sm text-cocoa/70 sm:col-span-2">
            Ảnh sản phẩm (mỗi dòng một URL)
            <textarea
              name="imageUrls"
              value={formData.imageUrls}
              onChange={handleFormChange}
              rows={2}
              className="mt-2 w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-cocoa/70">
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleFormChange}
              className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            />
            Đặt làm sản phẩm nổi bật
          </label>
        </div>

        <div className="sticker-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cocoa">Biến thể sản phẩm</h2>
            <button type="button" className="btn-secondary btn-secondary--sm" onClick={handleAddVariant}>
              <Plus className="h-4 w-4" />
              Thêm biến thể
            </button>
          </div>
          {variants.map((variant, index) => (
            <div key={`${variant.id ?? variant.size}-${index}`} className="grid gap-3 sm:grid-cols-5">
              <input
                placeholder="Size"
                value={variant.size}
                onChange={(event) => handleVariantChange(index, 'size', event.target.value)}
                className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              />
              <input
                placeholder="Màu"
                value={variant.color}
                onChange={(event) => handleVariantChange(index, 'color', event.target.value)}
                className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              />
              <input
                placeholder="Giá riêng"
                type="number"
                min={0}
                value={variant.priceOverride}
                onChange={(event) => handleVariantChange(index, 'priceOverride', event.target.value)}
                className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              />
              <input
                placeholder="Tồn kho"
                type="number"
                min={0}
                value={variant.stockQty}
                onChange={(event) => handleVariantChange(index, 'stockQty', event.target.value)}
                className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
              />
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  placeholder="Ảnh biến thể"
                  value={variant.imageUrl}
                  onChange={(event) => handleVariantChange(index, 'imageUrl', event.target.value)}
                  className="w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
                />
                {variants.length > 1 && !variant.id && (
                  <button
                    type="button"
                    className="rounded-2xl border border-caramel/40 p-2 text-mocha hover:bg-caramel/20"
                    onClick={() => handleRemoveVariant(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {mode === 'edit' && variant.id && (
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm sm:col-span-1"
                  onClick={() =>
                    deleteVariantMutation.mutate({
                      productId: selectedProductId as number,
                      variantId: variant.id as number
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa variant
                </button>
              )}
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang xử lý...' : mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
        </button>
        {statusMessage && (
          <div className="sticker-card p-4 text-sm text-cocoa/70">{statusMessage}</div>
        )}
      </form>
    </div>
  );
};

export default ProductManagementPage;
