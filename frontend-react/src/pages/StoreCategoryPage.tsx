import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import ProductCard from '../components/store/ProductCard';
import { storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const collectionStyles: Record<
  string,
  { accent: string; highlight: string; chips: string[]; fallbackSubtitle: string }
> = {
  nu: {
    accent: 'bg-blush/20',
    highlight: 'Vải mềm, lên dáng chuẩn',
    chips: ['Váy xoè', 'Áo croptop', 'Cardigan'],
    fallbackSubtitle: 'Nét ngọt ngào pha chút tinh nghịch cho mọi ngày.'
  },
  nam: {
    accent: 'bg-caramel/15',
    highlight: 'Form suông gọn gàng',
    chips: ['Áo thun', 'Sơ mi', 'Quần ống đứng'],
    fallbackSubtitle: 'Tối giản, ấm áp, dễ phối mỗi ngày.'
  },
  'phu-kien': {
    accent: 'bg-latte/30',
    highlight: 'Mix match siêu dễ',
    chips: ['Túi mini', 'Khăn cổ', 'Mũ len'],
    fallbackSubtitle: 'Nâng tầm outfit với những món nhỏ xinh.'
  },
  sale: {
    accent: 'bg-cream/80',
    highlight: 'Giảm đến 35%',
    chips: ['Combo đôi', 'Sale tuần', 'Limited'],
    fallbackSubtitle: 'Những món dễ thương với mức giá mềm nhất.'
  }
};

const emptyProducts = {
  items: [],
  total: 0,
  page: 0,
  pageSize: 24
};

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const sizeOptions = ['', 'S', 'M', 'L', 'XL', 'XXL'];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A - Z' }
];

const sizeGuideRows = [
  { size: 'S', chest: '84-88', waist: '64-68', hip: '88-92' },
  { size: 'M', chest: '88-92', waist: '68-72', hip: '92-96' },
  { size: 'L', chest: '92-96', waist: '72-76', hip: '96-100' },
  { size: 'XL', chest: '96-100', waist: '76-80', hip: '100-104' }
];

interface StoreCategoryPageProps {
  slug?: string;
}

const StoreCategoryPage = ({ slug: slugOverride }: StoreCategoryPageProps) => {
  const { slug } = useParams();
  const safeSlug = slugOverride ?? slug ?? '';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const { data: category, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['store-category', safeSlug],
    queryFn: () => storeApi.category(safeSlug),
    enabled: Boolean(safeSlug)
  });

  const parsedMinPrice = minPrice.trim() ? Number(minPrice.trim()) : undefined;
  const parsedMaxPrice = maxPrice.trim() ? Number(maxPrice.trim()) : undefined;
  const normalizedMinPrice = Number.isFinite(parsedMinPrice ?? NaN) ? parsedMinPrice : undefined;
  const normalizedMaxPrice = Number.isFinite(parsedMaxPrice ?? NaN) ? parsedMaxPrice : undefined;
  const effectiveMinPrice =
    normalizedMinPrice != null && normalizedMaxPrice != null
      ? Math.min(normalizedMinPrice, normalizedMaxPrice)
      : normalizedMinPrice;
  const effectiveMaxPrice =
    normalizedMinPrice != null && normalizedMaxPrice != null
      ? Math.max(normalizedMinPrice, normalizedMaxPrice)
      : normalizedMaxPrice;

  const { data: products = emptyProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: [
      'store-products',
      safeSlug,
      category?.id,
      selectedSize,
      selectedColor.trim().toLowerCase(),
      effectiveMinPrice ?? null,
      effectiveMaxPrice ?? null
    ],
    queryFn: () =>
      storeApi.products({
        categoryId: category?.id,
        page: 0,
        pageSize: 24,
        size: selectedSize || undefined,
        color: selectedColor.trim() || undefined,
        minPrice: effectiveMinPrice,
        maxPrice: effectiveMaxPrice
      }),
    enabled: Boolean(category?.id),
    placeholderData: emptyProducts
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ['store-wishlist'],
    queryFn: storeApi.wishlist,
    enabled: isAuthenticated
  });

  const toggleWishlist = useMutation({
    mutationFn: (payload: { productId: number; remove: boolean }) =>
      payload.remove ? storeApi.removeWishlist(payload.productId) : storeApi.addWishlist(payload.productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-wishlist'] });
    }
  });

  const wishlistIds = new Set(wishlist.map((item) => item.id));

  const handleToggleWishlist = (productId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    toggleWishlist.mutate({ productId, remove: wishlistIds.has(productId) });
  };

  const style = useMemo(() => {
    return (
      collectionStyles[safeSlug] ?? {
        accent: 'bg-cream/80',
        highlight: 'Bộ sưu tập mới',
        chips: ['Item mới', 'Mix dễ'],
        fallbackSubtitle: 'Khám phá bộ sưu tập mới nhất.'
      }
    );
  }, [safeSlug]);

  const hasActiveFilters = Boolean(
    selectedSize ||
      selectedColor.trim() ||
      (normalizedMinPrice != null && normalizedMinPrice >= 0) ||
      (normalizedMaxPrice != null && normalizedMaxPrice >= 0)
  );

  const clearFilters = () => {
    setSelectedSize('');
    setSelectedColor('');
    setMinPrice('');
    setMaxPrice('');
  };

  const sortedProducts = useMemo(() => {
    const items = [...products.items];
    const getPrice = (product: typeof items[number]) =>
      product.salePrice ?? product.basePrice ?? 0;

    switch (sortOption) {
      case 'price_asc':
        items.sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case 'price_desc':
        items.sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case 'name_asc':
        items.sort((a, b) => a.name.localeCompare(b.name, 'vi-VN'));
        break;
      case 'newest':
      default:
        break;
    }

    return { ...products, items };
  }, [products, sortOption]);

  if (isLoadingCategory && !category) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải bộ sưu tập...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Không tìm thấy bộ sưu tập này.
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-6">
      <section
        className={`relative overflow-hidden rounded-[38px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.9))] p-6 shadow-[0_20px_42px_rgba(148,163,184,0.18)] sm:p-10 ${style.accent}`}
      >
        <div className="pointer-events-none absolute -right-6 top-2 h-24 w-24 rounded-full bg-rose-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="space-y-4">
          <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">
            <Sparkles className="h-3.5 w-3.5" />
            Bộ sưu tập
          </span>
          <h1 className="font-display text-4xl text-mocha sm:text-5xl">{category.name}</h1>
          <p className="text-base text-cocoa/70">{category.description ?? style.fallbackSubtitle}</p>
          <div className="flex flex-wrap gap-2">
            {style.chips.map((chip) => (
              <span key={chip} className="tag !border-rose-200/80 !bg-white/90">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200/70 bg-white/92 px-4 py-3 shadow-[0_8px_20px_rgba(148,163,184,0.14)]">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
              <Sparkles className="h-4 w-4 text-mocha" />
            </div>
            <div>
              <p className="text-xs uppercase text-cocoa/60">Điểm nhấn</p>
              <p className="text-sm font-semibold text-cocoa">{style.highlight}</p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cocoa shadow-[0_8px_18px_rgba(148,163,184,0.12)] sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">Size</span>
            <select
              value={selectedSize}
              onChange={(event) => setSelectedSize(event.target.value)}
              className="bg-transparent text-xs font-semibold text-cocoa outline-none sm:text-sm"
            >
              {sizeOptions.map((size) => (
                <option key={size || 'all'} value={size}>
                  {size ? `Size ${size}` : 'Tất cả size'}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cocoa shadow-[0_8px_18px_rgba(148,163,184,0.12)] sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">Sắp xếp</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="bg-transparent text-xs font-semibold text-cocoa outline-none sm:text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cocoa shadow-[0_8px_18px_rgba(148,163,184,0.12)] sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">Màu</span>
            <input
              value={selectedColor}
              onChange={(event) => setSelectedColor(event.target.value)}
              placeholder="Kem, nâu..."
              className="w-24 bg-transparent text-xs font-semibold text-cocoa outline-none sm:w-28 sm:text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cocoa shadow-[0_8px_18px_rgba(148,163,184,0.12)] sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">Giá từ</span>
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="0"
              className="w-20 bg-transparent text-xs font-semibold text-cocoa outline-none sm:w-24 sm:text-sm"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-cocoa shadow-[0_8px_18px_rgba(148,163,184,0.12)] sm:text-sm">
            <span className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">Đến</span>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="500000"
              className="w-20 bg-transparent text-xs font-semibold text-cocoa outline-none sm:w-24 sm:text-sm"
            />
          </label>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
              onClick={clearFilters}
            >
              Xoá lọc
            </button>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-mocha">Sản phẩm nổi bật</h2>
            <p className="text-sm text-cocoa/70">Chọn ngay item hợp vibe của bạn.</p>
            {hasActiveFilters ? (
              <p className="text-xs text-cocoa/60">Đang áp dụng bộ lọc giá/màu/size.</p>
            ) : null}
          </div>
          <button type="button" className="btn-primary" onClick={() => setIsSizeGuideOpen((prev) => !prev)}>
            {isSizeGuideOpen ? 'Đóng bảng size' : 'Xem bảng size'}
          </button>
        </div>
        {isSizeGuideOpen && (
          <div className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Bảng size tham khảo (cm)</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="text-cocoa/60">
                    <th className="pb-2 pr-4 font-semibold">Size</th>
                    <th className="pb-2 pr-4 font-semibold">Ngực</th>
                    <th className="pb-2 pr-4 font-semibold">Eo</th>
                    <th className="pb-2 pr-4 font-semibold">Hông</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeGuideRows.map((row) => (
                    <tr key={row.size} className="border-t border-rose-200/60">
                      <td className="py-2 pr-4 font-semibold text-cocoa">{row.size}</td>
                      <td className="py-2 pr-4">{row.chest}</td>
                      <td className="py-2 pr-4">{row.waist}</td>
                      <td className="py-2 pr-4">{row.hip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {isLoadingProducts ? (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Đang tải sản phẩm...
          </div>
        ) : sortedProducts.items.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Chưa có sản phẩm trong bộ sưu tập này.
          </div>
        )}
      </section>
    </div>
  );
};

export default StoreCategoryPage;
