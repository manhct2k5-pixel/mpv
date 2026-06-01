import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, LayoutGrid, PackagePlus, Plus, Sparkles, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import type { StoreProductDetail, StoreProductSummary } from '../types/store';
import { useSearchParams } from 'react-router-dom';
import { readFilesAsDataUrls } from '../utils/fileUploads';

type VariantInput = {
  id?: number;
  size: string;
  color: string;
  priceOverride: string;
  stockQty: string;
  imageUrl: string;
};

type ProductStatusFilter = 'all' | 'pending' | 'approved' | 'featured' | 'sale';

const PRODUCT_FILTER_TABS: Array<{ id: ProductStatusFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'featured', label: 'Nổi bật' },
  { id: 'sale', label: 'Đang sale' }
];

const emptyVariant = (): VariantInput => ({
  size: '',
  color: '',
  priceOverride: '',
  stockQty: '',
  imageUrl: ''
});

const parseImageUrls = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const getProductSellerLabel = (product: Pick<StoreProductSummary, 'sellerId' | 'sellerName' | 'sellerStoreName'>) => {
  const storeName = product.sellerStoreName?.trim();
  const sellerName = product.sellerName?.trim();
  if (storeName) return storeName;
  if (sellerName) return sellerName;
  return product.sellerId ? `Seller #${product.sellerId}` : 'Chưa gán seller';
};

const getProductSearchText = (product: StoreProductSummary) =>
  `${product.name} ${product.slug} ${product.category ?? ''} ${getProductSellerLabel(product)}`.toLowerCase();

const ProductManagementPage = () => {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<StoreProductDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerQuery, setSellerQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
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
    active: true,
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
  const canManage = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase();
    return role === 'admin' || role === 'seller' || role === 'warehouse' || role === 'styles';
  }, [profile?.role]);

  const normalizedRole = (profile?.role ?? '').toLowerCase();
  const isAdmin = normalizedRole === 'admin';
  const isStaff = normalizedRole === 'warehouse' || normalizedRole === 'styles';
  const workspaceTitle = isAdmin
    ? 'Quản lý catalog toàn hệ thống'
    : isStaff
      ? 'Duyệt sản phẩm seller'
      : 'Quản lý catalog gian hàng';
  const workspaceDescription = isAdmin
    ? 'Theo dõi toàn bộ sản phẩm để chuẩn hoá danh mục, ưu tiên sản phẩm nổi bật và kiểm soát giá bán.'
    : isStaff
      ? 'Kiểm tra sản phẩm seller mới đăng, bật hiển thị khi nội dung và tồn kho đã đạt yêu cầu.'
      : 'Cập nhật sản phẩm, biến thể và tồn kho để đồng bộ với vận hành đơn hàng.';
  const workspaceBadge = isAdmin ? 'Admin Catalog' : isStaff ? 'Staff duyệt SP' : 'Seller';

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearchTerm(q);
  }, [searchParams]);

  const sellerOptions = useMemo(() => {
    const sellers = new Map<number, string>();
    sellerProducts.forEach((item) => {
      if (item.sellerId != null) {
        sellers.set(item.sellerId, getProductSellerLabel(item));
      }
    });
    return [...sellers.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  }, [sellerProducts]);

  const sellerScopedProducts = useMemo(() => {
    const normalizedSeller = sellerQuery.trim().toLowerCase();
    if (!normalizedSeller) return sellerProducts;
    return sellerProducts.filter((item) => getProductSellerLabel(item).toLowerCase().includes(normalizedSeller));
  }, [sellerProducts, sellerQuery]);

  const visibleProducts = useMemo(() => {
    const items = sellerScopedProducts;
    const normalized = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const passName = !normalized || getProductSearchText(item).includes(normalized);
      const passCategory = categoryFilter === 'all' || (item.category ?? '') === categoryFilter;
      const isSale = item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice;
      const passStatus =
        statusFilter === 'all' ||
        (statusFilter === 'featured' && Boolean(item.featured)) ||
        (statusFilter === 'sale' && isSale) ||
        (statusFilter === 'pending' && item.active === false) ||
        (statusFilter === 'approved' && item.active !== false);
      return passName && passCategory && passStatus;
    });
  }, [categoryFilter, searchTerm, sellerScopedProducts, statusFilter]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    const source = sellerScopedProducts;
    source.forEach((item) => {
      if (item.category) values.add(item.category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [sellerScopedProducts]);

  const featuredCount = useMemo(
    () => sellerScopedProducts.filter((item) => Boolean(item.featured)).length,
    [sellerScopedProducts]
  );
  const onSaleCount = useMemo(
    () =>
      sellerScopedProducts.filter(
        (item) => item.salePrice != null && item.salePrice > 0 && item.salePrice < item.basePrice
      ).length,
    [sellerScopedProducts]
  );
  const pendingCount = useMemo(
    () => sellerScopedProducts.filter((item) => item.active === false).length,
    [sellerScopedProducts]
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanVariants = variants
        .filter((variant) => variant.size.trim() && variant.color.trim())
        .map((variant) => ({
          size: variant.size.trim(),
          color: variant.color.trim(),
          priceOverride: variant.priceOverride.trim() ? Number(variant.priceOverride) : undefined,
          stockQty: variant.stockQty.trim() ? Number(variant.stockQty) : 0,
          imageUrl: variant.imageUrl.trim() || undefined
        }));

      const imageUrls = parseImageUrls(formData.imageUrls);

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
        active: formData.active,
        imageUrls
      });

      const variantUpdates = variants
        .filter((variant) => variant.id)
        .map((variant) =>
          storeApi.updateVariant(selectedProductId, variant.id as number, {
            size: variant.size.trim() || undefined,
            color: variant.color.trim() || undefined,
            priceOverride: variant.priceOverride.trim() ? Number(variant.priceOverride) : null,
            stockQty: variant.stockQty.trim() ? Number(variant.stockQty) : 0,
            imageUrl: variant.imageUrl.trim() || null
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
        imageUrls: '',
        active: true
      }));
      setVariants([emptyVariant()]);
      setMode('create');
      setSelectedProductId(null);
      setSelectedProductDetail(null);
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
        setSelectedProductDetail(null);
        setVariants([emptyVariant()]);
      }
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không xóa được sản phẩm.');
    }
  });

  const approvalMutation = useMutation({
    mutationFn: (payload: { product: StoreProductSummary | StoreProductDetail; active: boolean }) =>
      storeApi.updateProduct(payload.product.id, { active: payload.active }),
    onSuccess: (updated, variables) => {
      setSelectedProductDetail(updated);
      setSelectedProductId(updated.id);
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-products'] });
      queryClient.invalidateQueries({ queryKey: ['store-featured'] });
      setStatusMessage(
        variables.active
          ? `Đã xác nhận duyệt sản phẩm "${updated.name}".`
          : `Đã hủy duyệt sản phẩm "${updated.name}".`
      );
    },
    onError: (error: any) => {
      setStatusMessage(error.message || error.response?.data?.message || 'Không cập nhật được trạng thái duyệt sản phẩm.');
    }
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (payload: { productId: number; variantId: number }) =>
      storeApi.deleteVariant(payload.productId, payload.variantId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setVariants((prev) => prev.filter((variant) => variant.id !== variables.variantId));
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || error.response?.data?.error || 'Không xóa được biến thể.');
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

  const productImageUrls = useMemo(() => parseImageUrls(formData.imageUrls), [formData.imageUrls]);

  const setProductImageUrls = (imageUrls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: imageUrls.join('\n')
    }));
  };

  const handleProductImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    try {
      const uploadedImages = await readFilesAsDataUrls(files);
      if (uploadedImages.length === 0) {
        throw new Error('Vui lòng chọn file ảnh hợp lệ.');
      }
      setProductImageUrls([...productImageUrls, ...uploadedImages]);
      setStatusMessage(`Đã thêm ${uploadedImages.length} ảnh từ máy tính.`);
    } catch (error: any) {
      setStatusMessage(error.message || 'Không thể đọc ảnh từ máy tính.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    setProductImageUrls(productImageUrls.filter((_, index) => index !== indexToRemove));
  };

  const handleVariantImageUpload = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    try {
      const uploadedImages = await readFilesAsDataUrls(files);
      if (uploadedImages.length === 0) {
        throw new Error('Vui lòng chọn file ảnh hợp lệ.');
      }
      handleVariantChange(index, 'imageUrl', uploadedImages[0]);
      setStatusMessage('Đã cập nhật ảnh biến thể từ máy tính.');
    } catch (error: any) {
      setStatusMessage(error.message || 'Không thể đọc ảnh biến thể.');
    } finally {
      event.target.value = '';
    }
  };

  const loadProductForEdit = async (product: StoreProductSummary) => {
    const detail: StoreProductDetail = await storeApi.managedProduct(product.id);
    setMode('edit');
    setSelectedProductId(detail.id);
    setSelectedProductDetail(detail);
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
      active: detail.active !== false,
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

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm trong phạm vi</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{sellerScopedProducts.length.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm nổi bật</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{featuredCount.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Sản phẩm đang sale</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{onSaleCount.toLocaleString('vi-VN')}</p>
          </div>
          <div className="rounded-2xl border border-caramel/30 bg-white/75 p-4">
            <p className="text-xs text-cocoa/60">Chờ duyệt</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{pendingCount.toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="tag">
            <PackagePlus className="h-3.5 w-3.5" />
            {isStaff ? 'Đang ở chế độ duyệt sản phẩm' : mode === 'create' ? 'Đang ở chế độ thêm mới' : 'Đang ở chế độ chỉnh sửa'}
          </span>
          <span className="tag">
            <Sparkles className="h-3.5 w-3.5" />
            {isAdmin ? 'Có thể quản trị toàn bộ catalog' : isStaff ? 'Theo dõi sản phẩm theo seller' : 'Quản lý sản phẩm theo gian hàng'}
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

        <div className="flex flex-wrap gap-2">
          {PRODUCT_FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'border-mocha bg-mocha text-white'
                  : 'border-caramel/30 bg-white/80 text-cocoa hover:border-mocha/50'
              }`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm tên sản phẩm / SKU"
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
          <input
            value={sellerQuery}
            onChange={(event) => setSellerQuery(event.target.value)}
            list="product-seller-options"
            placeholder="Tìm người bán / gian hàng"
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
          />
          <datalist id="product-seller-options">
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={seller.label} />
            ))}
          </datalist>
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
          <button
            type="button"
            className="rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm font-semibold text-cocoa outline-none hover:border-mocha"
            onClick={() => {
              setSearchTerm('');
              setSellerQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
          >
            Xóa lọc
          </button>
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
                  <p className="text-xs text-cocoa/60">Seller: {getProductSellerLabel(product)}</p>
                  <p className="text-xs text-cocoa/60">
                    Giá: {product.basePrice.toLocaleString('vi-VN')} đ
                    {product.salePrice ? ` · Sale: ${product.salePrice.toLocaleString('vi-VN')} đ` : ''}
                  </p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    product.active === false
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }`}>
                    {product.active === false ? 'Chờ staff duyệt' : 'Đang hiển thị'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm"
                    onClick={() => loadProductForEdit(product)}
                  >
                    {isStaff ? 'Xem chi tiết' : 'Chỉnh sửa'}
                  </button>
                  {isStaff ? (
                    <>
                      <button
                        type="button"
                        className="btn-secondary btn-secondary--sm"
                        onClick={() => approvalMutation.mutate({ product, active: true })}
                        disabled={approvalMutation.isPending || product.active !== false}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-secondary--sm"
                        onClick={() => approvalMutation.mutate({ product, active: false })}
                        disabled={approvalMutation.isPending || product.active === false}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary btn-secondary--sm"
                      onClick={() => deleteMutation.mutate(product.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isStaff && statusMessage ? (
        <div className="sticker-card p-4 text-sm text-cocoa/70">{statusMessage}</div>
      ) : null}

      {isStaff ? (
        <section className="sticker-card space-y-4 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-cocoa">Thông tin chi tiết sản phẩm</h2>
              <p className="text-sm text-cocoa/65">
                Chọn một sản phẩm để kiểm tra nội dung, ảnh, biến thể và xác nhận hoặc hủy duyệt.
              </p>
            </div>
            {selectedProductDetail ? (
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                selectedProductDetail.active === false
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                {selectedProductDetail.active === false ? 'Chờ staff duyệt' : 'Đang hiển thị'}
              </span>
            ) : null}
          </div>

          {selectedProductDetail ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="space-y-3 rounded-2xl border border-caramel/30 bg-white/80 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cocoa/55">Tên sản phẩm</p>
                  <p className="text-lg font-semibold text-mocha">{selectedProductDetail.name}</p>
                  <p className="text-sm text-cocoa/65">Seller: {getProductSellerLabel(selectedProductDetail)}</p>
                </div>
                <div className="grid gap-2 text-sm text-cocoa/70 sm:grid-cols-2">
                  <p>Danh mục: {selectedProductDetail.category ?? '--'}</p>
                  <p>SKU: {selectedProductDetail.slug}</p>
                  <p>Giá gốc: {selectedProductDetail.basePrice.toLocaleString('vi-VN')} đ</p>
                  <p>
                    Giá sale:{' '}
                    {selectedProductDetail.salePrice
                      ? `${selectedProductDetail.salePrice.toLocaleString('vi-VN')} đ`
                      : '--'}
                  </p>
                  <p>Thương hiệu: {selectedProductDetail.brand ?? '--'}</p>
                  <p>Chất liệu: {selectedProductDetail.material ?? '--'}</p>
                  <p>Form dáng: {selectedProductDetail.fit ?? '--'}</p>
                  <p>Tồn kho: {(selectedProductDetail.totalStockQty ?? selectedProductDetail.variants.reduce((sum, item) => sum + (item.stockQty ?? 0), 0)).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-cocoa/55">Mô tả</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-cocoa/75">
                    {selectedProductDetail.description || 'Chưa có mô tả.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={approvalMutation.isPending || selectedProductDetail.active !== false}
                    onClick={() => approvalMutation.mutate({ product: selectedProductDetail, active: true })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Xác nhận duyệt
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={approvalMutation.isPending || selectedProductDetail.active === false}
                    onClick={() => approvalMutation.mutate({ product: selectedProductDetail, active: false })}
                  >
                    <XCircle className="h-4 w-4" />
                    Hủy duyệt
                  </button>
                </div>
              </article>

              <article className="space-y-4 rounded-2xl border border-caramel/30 bg-white/80 p-4">
                <div>
                  <p className="text-sm font-semibold text-cocoa">Ảnh sản phẩm</p>
                  {selectedProductDetail.images?.length ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {selectedProductDetail.images.map((image, index) => (
                        <img
                          key={`${image.slice(0, 32)}-${index}`}
                          src={image}
                          alt={`${selectedProductDetail.name} ${index + 1}`}
                          className="h-32 w-full rounded-2xl object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-cocoa/60">Chưa có ảnh sản phẩm.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-cocoa">Biến thể</p>
                  <div className="mt-2 space-y-2">
                    {selectedProductDetail.variants.map((variant) => (
                      <div key={variant.id} className="rounded-xl border border-caramel/25 bg-cream/30 px-3 py-2 text-sm text-cocoa/75">
                        <p className="font-semibold text-cocoa">{variant.size} / {variant.color}</p>
                        <p>
                          Giá: {variant.price.toLocaleString('vi-VN')} đ · Tồn: {variant.stockQty.toLocaleString('vi-VN')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <p className="text-sm text-cocoa/65">Chưa chọn sản phẩm chờ duyệt.</p>
          )}
        </section>
      ) : (
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="btn-secondary btn-secondary--sm cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                Thêm ảnh từ máy tính
                <input type="file" accept="image/*" multiple className="sr-only" onChange={handleProductImagesUpload} />
              </label>
              <span className="text-xs text-cocoa/60">
                Ảnh local sẽ được lưu trực tiếp vào sản phẩm để demo hiển thị đúng ngay trên web.
              </span>
            </div>
            {productImageUrls.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {productImageUrls.map((image, index) => (
                  <div key={`${index}-${image.slice(0, 24)}`} className="overflow-hidden rounded-2xl border border-caramel/25 bg-white/80">
                    <img src={image} alt={`Ảnh sản phẩm ${index + 1}`} className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      className="w-full border-t border-caramel/20 px-3 py-2 text-xs font-semibold text-cocoa/75 hover:bg-caramel/10"
                      onClick={() => handleRemoveProductImage(index)}
                    >
                      Xóa ảnh này
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
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
          <label className="flex items-center gap-3 text-sm text-cocoa/70">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleFormChange}
              className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            />
            Hiển thị trên web chính
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
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Ảnh biến thể"
                    value={variant.imageUrl}
                    onChange={(event) => handleVariantChange(index, 'imageUrl', event.target.value)}
                    className="w-full rounded-2xl border-2 border-caramel/30 bg-white/80 px-4 py-2 text-sm text-cocoa outline-none focus:border-mocha"
                  />
                  <label className="btn-secondary btn-secondary--sm cursor-pointer whitespace-nowrap">
                    Từ máy
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => void handleVariantImageUpload(index, event)}
                    />
                  </label>
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
                {variant.imageUrl ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-caramel/20 bg-white/70 p-2">
                    <img src={variant.imageUrl} alt={`Ảnh biến thể ${variant.size || index + 1}`} className="h-16 w-16 rounded-xl object-cover" />
                    <button
                      type="button"
                      className="text-xs font-semibold text-cocoa/70 underline"
                      onClick={() => handleVariantChange(index, 'imageUrl', '')}
                    >
                      Xóa ảnh biến thể
                    </button>
                  </div>
                ) : null}
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
      )}
    </div>
  );
};

export default ProductManagementPage;
