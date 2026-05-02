import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Search, Sparkles } from 'lucide-react';
import ProductCard from '../components/store/ProductCard';
import { storeCategories } from '../data/store';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { isCustomerRole } from '../utils/access';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const PAGE_SIZE = 12;

const emptyProducts = {
  items: [],
  total: 0,
  page: 0,
  pageSize: PAGE_SIZE
};

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A - Z' }
];

const sizeOptions = ['', 'S', 'M', 'L', 'XL', 'XXL'];

const catalogHeroMap: Record<
  string,
  {
    eyebrow: string;
    fallbackDescription: string;
    chips: string[];
  }
> = {
  nu: {
    eyebrow: 'Bộ sưu tập',
    fallbackDescription: 'Váy xoè, sơ mi kẹo bông, cardigan mềm mịn.',
    chips: ['Váy xoè', 'Áo croptop', 'Cardigan']
  },
  nam: {
    eyebrow: 'Bộ sưu tập',
    fallbackDescription: 'Áo thun nâu latte, quần ống suông gọn gàng.',
    chips: ['Áo thun', 'Sơ mi', 'Quần ống đứng']
  },
  'phu-kien': {
    eyebrow: 'Bộ sưu tập',
    fallbackDescription: 'Túi mini, khăn cổ và các món phụ kiện dễ phối.',
    chips: ['Túi mini', 'Khăn cổ', 'Phụ kiện']
  },
  sale: {
    eyebrow: 'Ưu đãi tuần này',
    fallbackDescription: 'Các sản phẩm đang giảm giá và nhóm deal nổi bật trong tuần.',
    chips: ['Sale', 'Deal nổi bật', 'Giá tốt']
  }
};

const defaultHeroChips = ['Điểm nhấn vải mềm', 'Size dễ chọn', 'Mới cập nhật'];

const parsePrice = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const AllProductsPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
  const [selectedSize, setSelectedSize] = useState(searchParams.get('size') ?? '');
  const [selectedColor, setSelectedColor] = useState(searchParams.get('color') ?? '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = isCustomerRole(profile?.role);

  const { data: categories = [] } = useQuery({
    queryKey: ['store-categories'],
    queryFn: storeApi.categories
  });

  const appliedFilters = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      categoryId: searchParams.get('categoryId') ?? '',
      size: searchParams.get('size') ?? '',
      color: searchParams.get('color') ?? '',
      minPrice: searchParams.get('minPrice') ?? '',
      maxPrice: searchParams.get('maxPrice') ?? ''
    }),
    [searchParams]
  );
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  useEffect(() => {
    setQuery(appliedFilters.q);
    setCategoryId(appliedFilters.categoryId);
    setSelectedSize(appliedFilters.size);
    setSelectedColor(appliedFilters.color);
    setMinPrice(appliedFilters.minPrice);
    setMaxPrice(appliedFilters.maxPrice);
  }, [appliedFilters]);

  const parsedMinPrice = parsePrice(appliedFilters.minPrice);
  const parsedMaxPrice = parsePrice(appliedFilters.maxPrice);
  const effectiveMinPrice =
    parsedMinPrice != null && parsedMaxPrice != null ? Math.min(parsedMinPrice, parsedMaxPrice) : parsedMinPrice;
  const effectiveMaxPrice =
    parsedMinPrice != null && parsedMaxPrice != null ? Math.max(parsedMinPrice, parsedMaxPrice) : parsedMaxPrice;

  const { data: products = emptyProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: [
      'store-products-all',
      appliedFilters.q,
      appliedFilters.categoryId,
      appliedFilters.size,
      appliedFilters.color.trim().toLowerCase(),
      effectiveMinPrice ?? null,
      effectiveMaxPrice ?? null,
      currentPage
    ],
    queryFn: () =>
      storeApi.products({
        page: currentPage - 1,
        pageSize: PAGE_SIZE,
        q: appliedFilters.q.trim() || undefined,
        categoryId: appliedFilters.categoryId ? Number(appliedFilters.categoryId) : undefined,
        size: appliedFilters.size || undefined,
        color: appliedFilters.color.trim() || undefined,
        minPrice: effectiveMinPrice,
        maxPrice: effectiveMaxPrice
      }),
    placeholderData: emptyProducts
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ['store-wishlist'],
    queryFn: storeApi.wishlist,
    enabled: isAuthenticated && isCustomer
  });

  const toggleWishlist = useMutation({
    mutationFn: (payload: { productId: number; remove: boolean }) =>
      payload.remove ? storeApi.removeWishlist(payload.productId) : storeApi.addWishlist(payload.productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-wishlist'] });
      setWishlistMessage(null);
    }
  });

  const wishlistIds = new Set(wishlist.map((item) => item.id));

  const sortedProducts = useMemo(() => {
    const items = [...products.items];
    const getPrice = (product: (typeof items)[number]) => product.salePrice ?? product.basePrice ?? 0;

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

    return items;
  }, [products.items, sortOption]);

  const hasActiveFilters = Object.values(appliedFilters).some((value) => value.trim().length > 0);
  const totalPages = Math.max(1, Math.ceil((products.total || 0) / (products.pageSize || PAGE_SIZE)));
  const activeCategory = useMemo(() => {
    if (!appliedFilters.categoryId) return null;
    const id = Number(appliedFilters.categoryId);
    return categories.find((category) => category.id === id) ?? null;
  }, [appliedFilters.categoryId, categories]);
  const activeCategoryConfig = activeCategory?.slug ? catalogHeroMap[activeCategory.slug] : null;
  const fallbackCategoryConfig =
    storeCategories.find((category) => category.path === `/${activeCategory?.slug ?? ''}`) ?? null;
  const heroEyebrow = activeCategoryConfig?.eyebrow ?? (hasActiveFilters ? 'Bộ lọc sản phẩm' : 'Catalog Mộc Mầm');
  const heroTitle = activeCategory?.name ?? (appliedFilters.q.trim() ? `Kết quả cho "${appliedFilters.q.trim()}"` : 'Tất cả sản phẩm');
  const heroDescription =
    activeCategory?.description ??
    activeCategoryConfig?.fallbackDescription ??
    fallbackCategoryConfig?.description ??
    'Trang này tải đầy đủ sản phẩm đang bán, không bị giới hạn ở danh mục sale hay nhóm nổi bật trên trang chủ.';
  const heroChips = useMemo(() => {
    const chips: string[] = [];
    if (activeCategory) {
      chips.push(activeCategory.name);
    }
    if (appliedFilters.q.trim()) {
      chips.push(appliedFilters.q.trim());
    }
    if (appliedFilters.size.trim()) {
      chips.push(`Size ${appliedFilters.size.trim().toUpperCase()}`);
    }
    if (appliedFilters.color.trim()) {
      chips.push(`Màu ${appliedFilters.color.trim()}`);
    }
    if (effectiveMaxPrice != null || effectiveMinPrice != null) {
      const min = effectiveMinPrice != null ? effectiveMinPrice.toLocaleString('vi-VN') : '0';
      const max = effectiveMaxPrice != null ? effectiveMaxPrice.toLocaleString('vi-VN') : '...';
      chips.push(`${min} đ - ${max} đ`);
    }
    if (chips.length > 0) {
      return chips.slice(0, 4);
    }
    return activeCategoryConfig?.chips ?? defaultHeroChips;
  }, [
    activeCategory,
    activeCategoryConfig?.chips,
    appliedFilters.color,
    appliedFilters.q,
    appliedFilters.size,
    effectiveMaxPrice,
    effectiveMinPrice
  ]);

  const syncFiltersToUrl = () => {
    const nextParams: Record<string, string> = {};
    if (query.trim()) nextParams.q = query.trim();
    if (categoryId) nextParams.categoryId = categoryId;
    if (selectedSize) nextParams.size = selectedSize;
    if (selectedColor.trim()) nextParams.color = selectedColor.trim();
    if (minPrice.trim()) nextParams.minPrice = minPrice.trim();
    if (maxPrice.trim()) nextParams.maxPrice = maxPrice.trim();
    setSearchParams(nextParams);
  };

  const goToPage = (page: number) => {
    const safePage = Math.max(1, Math.min(totalPages, page));
    const nextParams = new URLSearchParams(searchParams);
    if (safePage === 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(safePage));
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setQuery('');
    setCategoryId('');
    setSelectedSize('');
    setSelectedColor('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
  };

  const handleToggleWishlist = (productId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (profileLoading) {
      setWishlistMessage('Đang tải quyền tài khoản, vui lòng thử lại sau vài giây.');
      return;
    }
    if (!isCustomer) {
      setWishlistMessage('Wishlist chỉ dành cho tài khoản khách hàng.');
      return;
    }
    toggleWishlist.mutate({ productId, remove: wishlistIds.has(productId) });
  };

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    syncFiltersToUrl();
  };

  return (
    <div className="space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-[42px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.9))] p-6 shadow-[0_24px_56px_rgba(148,163,184,0.18)] sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-rose-200/55 blur-3xl" />
        <div className="pointer-events-none absolute bottom-4 left-10 h-28 w-28 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="relative space-y-5">
          <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">
            <Sparkles className="h-3.5 w-3.5" />
            {heroEyebrow}
          </span>
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-4xl leading-tight text-mocha sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="text-base text-cocoa/70">{heroDescription}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-cocoa/70">
            {heroChips.map((chip) => (
              <span key={chip} className="tag !border-rose-200/80 !bg-white/92">
                {chip}
              </span>
            ))}
          </div>

          <form
            onSubmit={handleFilterSubmit}
            className="grid gap-3 rounded-[28px] border border-rose-200/70 bg-white/92 p-4 shadow-[0_12px_26px_rgba(148,163,184,0.14)] xl:grid-cols-[1.5fr,1fr,0.9fr,0.95fr,0.8fr,0.8fr,auto]"
          >
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Từ khoá
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2">
                <Search className="h-4 w-4 text-rose-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Đầm, polo, tote..."
                  className="w-full bg-transparent text-sm normal-case tracking-normal text-cocoa outline-none placeholder:text-cocoa/45"
                />
              </div>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Danh mục
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Size
              <select
                value={selectedSize}
                onChange={(event) => setSelectedSize(event.target.value)}
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none"
              >
                {sizeOptions.map((size) => (
                  <option key={size || 'all'} value={size}>
                    {size ? `Size ${size}` : 'Tất cả size'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Sắp xếp
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Màu
              <input
                value={selectedColor}
                onChange={(event) => setSelectedColor(event.target.value)}
                placeholder="Kem, sage..."
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none placeholder:text-cocoa/45"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Giá từ
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none placeholder:text-cocoa/45"
              />
            </label>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
              Giá đến
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="500000"
                className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-3 py-2 text-sm normal-case tracking-normal text-cocoa outline-none placeholder:text-cocoa/45"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button type="submit" className="btn-primary">
                <Filter className="h-4 w-4" />
                Tìm kiếm
              </button>
              {hasActiveFilters ? (
                <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={clearFilters}>
                  Xoá lọc
                </button>
              ) : null}
            </div>
          </form>
          <p className="text-sm text-cocoa/60">
            {isLoadingProducts
              ? 'Đang tải catalog...'
              : `Trang ${currentPage.toLocaleString('vi-VN')} / ${totalPages.toLocaleString('vi-VN')} - hiển thị ${sortedProducts.length.toLocaleString('vi-VN')} / ${products.total.toLocaleString('vi-VN')} sản phẩm theo bộ lọc hiện tại.`}
          </p>
        </div>
      </section>

      {wishlistMessage ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-[0_12px_24px_rgba(148,163,184,0.08)]">
          {wishlistMessage}
        </div>
      ) : null}

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-mocha">
              {activeCategory ? `Sản phẩm trong ${activeCategory.name}` : 'Catalog đầy đủ'}
            </h2>
            <p className="text-sm text-cocoa/70">
              {isLoadingProducts
                ? 'Đang tải sản phẩm...'
                : `Đang hiển thị page ${currentPage.toLocaleString('vi-VN')} với ${sortedProducts.length.toLocaleString('vi-VN')} sản phẩm.`}
            </p>
          </div>
          <Link to="/" className="btn-secondary">
            Về trang chủ
          </Link>
        </div>

        {isLoadingProducts ? (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Đang tải trang sản phẩm...
          </div>
        ) : sortedProducts.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-rose-200/70 bg-white/90 px-4 py-3 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.1)]">
              <span>
                Trang {currentPage.toLocaleString('vi-VN')} / {totalPages.toLocaleString('vi-VN')}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Trước
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  const start = Math.min(Math.max(1, currentPage - 2), Math.max(1, totalPages - 4));
                  const page = start + index;
                  return (
                    <button
                      key={page}
                      type="button"
                      className={page === currentPage ? 'btn-primary btn-primary--sm' : 'btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90'}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Không tìm thấy sản phẩm phù hợp. Hãy thử xoá bớt bộ lọc nhé.
          </div>
        )}
      </section>
    </div>
  );
};

export default AllProductsPage;
