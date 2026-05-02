import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Camera,
  Gift,
  Heart,
  RefreshCcw,
  Search,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Truck
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ProductCard from '../components/store/ProductCard';
import { lookbookStories, storeBenefits, storeCategories } from '../data/store';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { isCustomerRole } from '../utils/access';

const heroCards = [
  {
    title: 'Đầm linen vanilla',
    description: 'Cafe sáng với linen sáng màu',
    accent: 'bg-cream',
    icon: Sparkles
  },
  {
    title: 'Polo sage weekend',
    description: 'Nam tính nhẹ, gọn gàng cuối tuần',
    accent: 'bg-latte/70',
    icon: Shirt
  },
  {
    title: 'Tote canvas be',
    description: 'Phụ kiện hợp cả đi học lẫn đi chơi',
    accent: 'bg-caramel/25',
    icon: ShoppingBag
  },
  {
    title: 'Set picnic sage latte',
    description: 'Combo lên hình rất sáng và dịu mắt',
    accent: 'bg-blush/40',
    icon: Heart
  }
];

const categoryIcons = [Sparkles, Shirt, ShoppingBag, Star];
const benefitIcons = [Truck, RefreshCcw, Gift];

const categoryStyleMap: Record<
  string,
  { accent: string; highlight: string; fallbackDescription: string; path: string }
> = {
  nu: {
    accent: 'bg-blush/30',
    highlight: 'Form dáng tôn eo',
    fallbackDescription: 'Váy xoè, sơ mi kẹo bông, cardigan mềm mịn.',
    path: '/nu'
  },
  nam: {
    accent: 'bg-caramel/25',
    highlight: 'Chất liệu thoáng',
    fallbackDescription: 'Áo thun nâu latte, quần ống suông gọn gàng.',
    path: '/nam'
  },
  'phu-kien': {
    accent: 'bg-latte/40',
    highlight: 'Mix dễ dàng',
    fallbackDescription: 'Túi mini, khăn cổ, phụ kiện nhỏ xinh.',
    path: '/phu-kien'
  },
  sale: {
    accent: 'bg-cream/80',
    highlight: 'Giảm đến 35%',
    fallbackDescription: 'Ưu đãi tuần này, số lượng giới hạn.',
    path: '/sale'
  }
};

type QuickFilters = {
  q: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  size: string;
  color: string;
};

const searchSuggestions = [
  'Đầm linen vanilla',
  'Polo sage weekend',
  'Tote canvas be',
  'Set picnic sage latte',
  'Hồng dusty',
  'Xanh sage'
];

const emptyProductsPage = {
  items: [],
  total: 0,
  page: 0,
  pageSize: 0
};

const StorefrontPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['store-featured'],
    queryFn: storeApi.featuredProducts
  });
  const { data: lookbooks = [] } = useQuery({
    queryKey: ['store-lookbooks-home'],
    queryFn: storeApi.lookbooks
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

  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const buildFiltersFromParams = (params: URLSearchParams): QuickFilters => ({
    q: params.get('q') ?? '',
    categoryId: params.get('categoryId') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    size: params.get('size') ?? '',
    color: params.get('color') ?? ''
  });

  const [filters, setFilters] = useState<QuickFilters>(() => buildFiltersFromParams(searchParams));
  const appliedFilters = useMemo(() => buildFiltersFromParams(searchParams), [searchKey]);

  useEffect(() => {
    setFilters(appliedFilters);
  }, [appliedFilters]);

  const hasSearch = Object.values(appliedFilters).some((value) => value.trim().length > 0);
  const parseNumber = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const activeCategory = useMemo(() => {
    if (!appliedFilters.categoryId) return null;
    const id = Number(appliedFilters.categoryId);
    return categories.find((category) => category.id === id) ?? null;
  }, [appliedFilters.categoryId, categories]);

  const { data: quickResults = emptyProductsPage, isLoading: quickLoading } = useQuery({
    queryKey: ['store-quick-search', searchKey],
    queryFn: () =>
      storeApi.products({
        page: 0,
        pageSize: 6,
        q: appliedFilters.q.trim() || undefined,
        categoryId: appliedFilters.categoryId ? Number(appliedFilters.categoryId) : undefined,
        minPrice: parseNumber(appliedFilters.minPrice),
        maxPrice: parseNumber(appliedFilters.maxPrice),
        size: appliedFilters.size.trim() || undefined,
        color: appliedFilters.color.trim() || undefined
      }),
    enabled: hasSearch
  });

  const buildFilterParams = (nextFilters: QuickFilters) => {
    const params = new URLSearchParams();
    if (nextFilters.q.trim()) params.set('q', nextFilters.q.trim());
    if (nextFilters.categoryId) params.set('categoryId', nextFilters.categoryId);
    if (nextFilters.minPrice.trim()) params.set('minPrice', nextFilters.minPrice.trim());
    if (nextFilters.maxPrice.trim()) params.set('maxPrice', nextFilters.maxPrice.trim());
    if (nextFilters.size.trim()) params.set('size', nextFilters.size.trim());
    if (nextFilters.color.trim()) params.set('color', nextFilters.color.trim());
    return params;
  };

  const navigateToCatalog = (nextFilters: QuickFilters) => {
    const params = buildFilterParams(nextFilters).toString();
    navigate(params ? `/san-pham?${params}` : '/san-pham');
  };

  const handleQuickSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToCatalog(filters);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const handleFilterChange = (
    field: keyof QuickFilters,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSuggestion = (value: string) => {
    const nextFilters = { ...filters, q: value };
    setFilters(nextFilters);
    navigateToCatalog(nextFilters);
  };

  const handlePromoClick = () => {
    navigate(isAuthenticated ? '/sale' : '/register');
  };

  const handleShoppingFlowClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (profileLoading) {
      setWishlistMessage('Đang tải quyền tài khoản, vui lòng thử lại sau vài giây.');
      return;
    }
    if (!isCustomer) {
      setWishlistMessage('Giỏ hàng và thanh toán chỉ dành cho tài khoản khách hàng.');
      return;
    }
    navigate('/gio-hang');
  };

  const categoryCards = categories.length
    ? categories.map((category) => {
        const style = categoryStyleMap[category.slug] ?? {
          accent: 'bg-cream/80',
          highlight: 'Vibe mới',
          fallbackDescription: 'Khám phá bộ sưu tập mới.',
          path: `/${category.slug}`
        };
        return {
          title: category.name,
          description: category.description ?? style.fallbackDescription,
          path: style.path,
          accent: style.accent,
          highlight: style.highlight
        };
      })
    : storeCategories;

  const homeLookbooks = useMemo(() => {
    const apiItems = lookbooks
      .filter((item) => item.active !== false)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? 'Khám phá outfit mới từ studio drop tuần này.',
        mood: item.mood ?? 'Lookbook',
        tags: item.tags?.slice(0, 3) ?? [],
        coverImageUrl: item.coverImageUrl ?? null
      }));

    if (apiItems.length > 0) {
      return apiItems;
    }

    return lookbookStories.slice(0, 4).map((story, index) => ({
      id: `fallback-${index}`,
      title: story.title,
      description: story.description,
      mood: story.mood,
      tags: [],
      coverImageUrl: null
    }));
  }, [lookbooks]);

  return (
    <div className="space-y-12 pb-8">
      <section className="relative overflow-hidden rounded-[46px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.9))] p-6 shadow-[0_26px_60px_rgba(148,163,184,0.18)] sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-rose-200/55 blur-3xl" />
        <div className="pointer-events-none absolute bottom-2 left-10 h-36 w-36 rounded-full bg-orange-200/35 blur-2xl" />
        <div className="pointer-events-none absolute bottom-10 right-20 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6 reveal" style={{ animationDelay: '60ms' }}>
            <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">
              <Sparkles className="h-3.5 w-3.5" />
              Studio Drop 2026
            </span>
            <div className="max-w-xl space-y-3">
              <h1 className="font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                Studio drop mới với <span className="text-mocha">linen vanilla</span>, sage weekend và phụ kiện canvas
              </h1>
              <p className="text-base text-cocoa/70 sm:text-lg">
                Hero trang chủ giờ bám đúng các sản phẩm demo mới nhất: đầm linen sáng màu, polo xanh sage, tote canvas
                và set picnic dịu mắt cho những buổi đi chơi cuối tuần.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/nu"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-orange-300 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(251,113,133,0.32)] transition hover:from-rose-500 hover:to-orange-400"
              >
                Khám phá nữ
              </Link>
              <Link to="/nam" className="btn-secondary !border-rose-200/80 !bg-white/90">
                Khám phá nam
              </Link>
              <Link to="/sale" className="btn-secondary !border-rose-200/80 !bg-white/90">
                Ưu đãi hôm nay
              </Link>
              <Link to="/lookbook" className="btn-secondary !border-rose-200/80 !bg-white/90">
                <Camera className="h-4 w-4" />
                Lookbook
              </Link>
              <Link
                to="/ho-tro?partner=styles"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200/80 bg-white/95 px-5 py-2.5 text-sm font-semibold text-mocha shadow-[0_14px_26px_rgba(251,113,133,0.18)] transition hover:border-rose-300 hover:bg-rose-50"
              >
                <Sparkles className="h-4 w-4 text-rose-500" />
                Hỏi AI Stylist
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-cocoa/70">
              <span className="tag !border-rose-200/80 !bg-white/90">Đầm linen vanilla</span>
              <span className="tag !border-rose-200/80 !bg-white/90">Polo sage weekend</span>
              <span className="tag !border-rose-200/80 !bg-white/90">Tote canvas be</span>
              <span className="tag !border-rose-200/80 !bg-white/90">Set picnic sage latte</span>
            </div>
          </div>

          <form
            onSubmit={handleQuickSubmit}
            className="rounded-[30px] border border-rose-200/70 bg-white/95 p-6 shadow-[0_18px_40px_rgba(148,163,184,0.18)] sm:p-7"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/80">
                <Search className="h-5 w-5 text-mocha" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/60">Tìm nhanh</p>
                <h2 className="font-display text-xl text-mocha">Chọn outfit hợp vibe</h2>
                <p className="text-xs text-cocoa/70">
                  Lọc theo tên, danh mục, giá, size hoặc màu sắc.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                Từ khoá
                <input
                  value={filters.q}
                  onChange={(event) => handleFilterChange('q', event.target.value)}
                  placeholder="Ví dụ: linen vanilla, polo sage..."
                  className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                Danh mục
                <select
                  value={filters.categoryId}
                  onChange={(event) => handleFilterChange('categoryId', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                  Giá từ
                  <input
                    type="number"
                    min={0}
                    value={filters.minPrice}
                    onChange={(event) => handleFilterChange('minPrice', event.target.value)}
                    placeholder="0"
                    className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                  />
                </label>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                  Giá đến
                  <input
                    type="number"
                    min={0}
                    value={filters.maxPrice}
                    onChange={(event) => handleFilterChange('maxPrice', event.target.value)}
                    placeholder="500000"
                    className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                  Size
                  <input
                    value={filters.size}
                    onChange={(event) => handleFilterChange('size', event.target.value)}
                    placeholder="S, M, L..."
                    className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                  />
                </label>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-cocoa/50">
                  Màu
                  <input
                    value={filters.color}
                    onChange={(event) => handleFilterChange('color', event.target.value)}
                    placeholder="Kem, latte..."
                    className="mt-2 w-full rounded-xl border border-rose-200/70 bg-rose-50/50 px-4 py-2 text-sm text-cocoa outline-none transition focus:border-rose-400 focus:bg-white"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {searchSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-rose-200/80 bg-rose-50/70 px-3 py-1 text-[11px] font-semibold text-rose-500 transition hover:-translate-y-0.5"
                  onClick={() => handleSuggestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-rose-400 to-orange-300 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-rose-500 hover:to-orange-400"
                disabled={quickLoading}
              >
                {quickLoading ? 'Đang tìm...' : 'Tìm ngay'}
              </button>
              {hasSearch && (
                <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={handleClearFilters}>
                  Xoá lọc
                </button>
              )}
            </div>

            {hasSearch && !quickLoading && (
              <p className="mt-3 text-xs text-cocoa/60">
                Đang hiển thị {quickResults.total} kết quả phù hợp bộ lọc của bạn.
              </p>
            )}
          </form>
        </div>
      </section>

      {wishlistMessage ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-[0_12px_24px_rgba(148,163,184,0.08)]">
          {wishlistMessage}
        </div>
      ) : null}

      {hasSearch && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-mocha">Gợi ý theo bộ lọc</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-cocoa/60">
                {appliedFilters.q && <span className="tag">Từ khoá: {appliedFilters.q}</span>}
                {activeCategory && <span className="tag">Danh mục: {activeCategory.name}</span>}
                {appliedFilters.minPrice && (
                  <span className="tag">
                    Từ {Number(appliedFilters.minPrice).toLocaleString('vi-VN')} đ
                  </span>
                )}
                {appliedFilters.maxPrice && (
                  <span className="tag">
                    Đến {Number(appliedFilters.maxPrice).toLocaleString('vi-VN')} đ
                  </span>
                )}
                {appliedFilters.size && <span className="tag">Size {appliedFilters.size}</span>}
                {appliedFilters.color && <span className="tag">Màu {appliedFilters.color}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={searchKey ? `/san-pham?${searchKey}` : '/san-pham'} className="btn-primary">
                Xem tất cả kết quả
              </Link>
              <button type="button" className="btn-secondary" onClick={handleClearFilters}>
                Xem lại danh mục
              </button>
            </div>
          </div>
          {quickLoading ? (
            <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              Đang tìm sản phẩm phù hợp...
            </div>
          ) : quickResults.items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {quickResults.items.map((product) => (
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
              Không tìm thấy sản phẩm phù hợp. Hãy thử điều chỉnh bộ lọc nhé.
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex items-center gap-3 rounded-3xl border border-rose-200/70 bg-white/90 p-4 shadow-[0_10px_24px_rgba(148,163,184,0.14)] sm:p-5 reveal"
              style={{ animationDelay: `${120 + index * 80}ms` }}
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl border border-rose-200/70 ${card.accent}`}
              >
                <Icon className="h-5 w-5 text-mocha" />
              </div>
              <div>
                <p className="text-sm font-semibold text-cocoa">{card.title}</p>
                <p className="text-xs text-cocoa/60">{card.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-mocha">Danh mục đáng yêu</h2>
            <p className="text-sm text-cocoa/70">Chọn vibe của bạn hôm nay.</p>
          </div>
          <Link to="/sale" className="btn-secondary">
            Ưu đãi tuần này
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {categoryCards.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <Link
                key={category.title}
                to={category.path}
                className="flex flex-col gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(148,163,184,0.2)] reveal"
                style={{ animationDelay: `${80 + index * 70}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl border border-rose-200/70 ${category.accent}`}
                  >
                    <Icon className="h-5 w-5 text-mocha" />
                  </div>
                  <span className="badge">{category.highlight}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-cocoa">{category.title}</p>
                  <p className="text-sm text-cocoa/70">{category.description}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-mocha">
                  Khám phá ngay
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-mocha">Mới về trong tuần</h2>
            <p className="text-sm text-cocoa/70">
              Đầm linen, polo sage, tote canvas và các combo mới đang là nhóm nổi bật nhất trên storefront.
            </p>
          </div>
          <Link to="/san-pham" className="btn-secondary">
            Xem toàn bộ
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              Chưa có sản phẩm nổi bật, vui lòng quay lại sau.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-5 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-8">
          <div>
            <h2 className="font-display text-3xl text-mocha">Lookbook tuần này</h2>
            <p className="text-sm text-cocoa/70">
              Những set mới bám đúng catalog vừa thêm: vanilla linen, sage weekend, tote canvas và picnic latte.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {homeLookbooks.map((story) => {
              const detailPath = typeof story.id === 'number' ? `/lookbook/${story.id}` : '/lookbook';
              return (
                <Link
                  key={String(story.id)}
                  to={detailPath}
                  className="overflow-hidden rounded-2xl border border-rose-200/70 bg-rose-50/45 transition hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(148,163,184,0.16)]"
                >
                  {story.coverImageUrl ? (
                    <div
                      className="h-28 bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg,rgba(56,39,30,0.08),rgba(56,39,30,0.38)), url(${story.coverImageUrl})`
                      }}
                    />
                  ) : (
                    <div className="h-28 bg-[linear-gradient(135deg,rgba(255,244,240,0.95),rgba(255,236,222,0.88))]" />
                  )}
                  <div className="space-y-2 p-4">
                    <p className="text-xs font-semibold uppercase text-mocha/70">{story.mood}</p>
                    <p className="text-sm font-semibold text-cocoa">{story.title}</p>
                    <p className="text-xs text-cocoa/70">{story.description}</p>
                    {story.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-[11px] text-cocoa/70">
                        {story.tags.map((tag) => (
                          <span key={tag} className="tag !border-rose-200/80 !bg-white/90">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
          <Link to="/lookbook" className="btn-primary w-fit">
            <Camera className="h-4 w-4" />
            Xem toàn bộ lookbook
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-8">
            <p className="badge">Vibe đáng yêu</p>
            <h3 className="mt-3 font-display text-2xl text-mocha">Checklist outfit studio drop</h3>
            <p className="mt-2 text-sm text-cocoa/70">
              Ưu tiên linen sáng màu, xanh sage dịu mắt và một phụ kiện canvas hoặc trang sức tối giản để outfit nhìn có chủ ý hơn.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {['Đầm linen vanilla', 'Polo sage weekend', 'Tote canvas be', 'Vòng cổ bạc tối giản'].map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-8">
            <p className="badge">Khách hàng</p>
            <h3 className="font-display text-2xl text-mocha">Quy trình mua hàng</h3>
            <p className="text-sm text-cocoa/70">
              Xem sản phẩm, thêm vào giỏ, thanh toán và theo dõi đơn hàng ngay trong tài khoản của bạn.
            </p>
            <button type="button" className="btn-primary w-fit" onClick={handleShoppingFlowClick}>
              Đi tới giỏ hàng
            </button>
          </div>
          <div className="floaty flex items-center justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <div>
              <p className="text-sm font-semibold text-cocoa">Thành viên Mộc Mầm</p>
              <p className="text-xs text-cocoa/60">Giảm thêm 10% cho đơn đầu tiên.</p>
            </div>
            <button type="button" className="btn-primary" onClick={handlePromoClick}>
              <Star className="h-4 w-4" />
              {isAuthenticated ? 'Xem ưu đãi' : 'Nhận ưu đãi'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {storeBenefits.map((benefit, index) => {
          const Icon = benefitIcons[index % benefitIcons.length];
          return (
            <div key={benefit.title} className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-white/95">
                  <Icon className="h-5 w-5 text-mocha" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cocoa">{benefit.title}</p>
                  <p className="text-xs text-cocoa/70">{benefit.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default StorefrontPage;
