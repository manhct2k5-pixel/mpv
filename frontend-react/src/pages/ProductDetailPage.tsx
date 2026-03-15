import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Minus, Plus, Shirt, ShoppingBag, Star } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: product, isLoading } = useQuery({
    queryKey: ['store-product', slug],
    queryFn: () => storeApi.product(slug ?? ''),
    enabled: Boolean(slug)
  });
  const { data: wishlist = [] } = useQuery({
    queryKey: ['store-wishlist'],
    queryFn: storeApi.wishlist,
    enabled: isAuthenticated && isCustomer
  });
  const { data: reviewBundle, isLoading: reviewsLoading } = useQuery({
    queryKey: ['store-product-reviews', slug],
    queryFn: () => storeApi.productReviews(slug ?? ''),
    enabled: Boolean(slug)
  });

  useEffect(() => {
    if (product?.variants?.length && selectedVariantId == null) {
      setSelectedVariantId(product.variants[0].id);
      setSelectedSize(product.variants[0].size);
      setSelectedColor(product.variants[0].color);
    }
  }, [product, selectedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return product.variants.find((variant) => variant.id === selectedVariantId) ?? product.variants[0];
  }, [product, selectedVariantId]);

  const availableSizes = useMemo(() => {
    if (!product?.variants?.length) return [];
    return Array.from(new Set(product.variants.map((variant) => variant.size)));
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product?.variants?.length) return [];
    if (!selectedSize) {
      return Array.from(new Set(product.variants.map((variant) => variant.color)));
    }
    return Array.from(
      new Set(product.variants.filter((variant) => variant.size === selectedSize).map((variant) => variant.color))
    );
  }, [product, selectedSize]);

  useEffect(() => {
    if (!selectedSize || availableColors.length === 0) return;
    if (!availableColors.includes(selectedColor)) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor, selectedSize]);

  useEffect(() => {
    if (!product?.variants?.length) return;
    const matched = product.variants.find(
      (variant) => variant.size === selectedSize && variant.color === selectedColor
    );
    if (matched) {
      setSelectedVariantId(matched.id);
    }
  }, [product, selectedSize, selectedColor]);

  const images = useMemo(() => {
    if (!product) return [];
    const normalized = product.images?.length ? product.images : (product as any).imageUrls ?? [];
    if (normalized.length > 0) return normalized;
    if (selectedVariant?.imageUrl) return [selectedVariant.imageUrl];
    return [];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (images.length > 0 && selectedImageIndex >= images.length) {
      setSelectedImageIndex(0);
    }
  }, [images, selectedImageIndex]);
  const maxQty = selectedVariant?.stockQty ?? 99;

  useEffect(() => {
    if (selectedVariant && quantity > selectedVariant.stockQty) {
      setQuantity(Math.max(1, selectedVariant.stockQty));
    }
  }, [selectedVariant, quantity]);

  const hasSale = Boolean(product?.salePrice && product.salePrice > 0);
  const displayPrice = hasSale ? product?.salePrice : product?.basePrice;
  const formatPrice = (value?: number | null) =>
    value != null ? `${value.toLocaleString('vi-VN')} đ` : '--';
  const canPurchase = Boolean(selectedVariant && selectedVariant.stockQty > 0);

  const addMutation = useMutation({
    mutationFn: (payload: { variantId: number; quantity: number }) => storeApi.addToCart(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['store-cart'], data);
      setStatusMessage('Đã thêm vào giỏ hàng.');
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.message || 'Không thể thêm sản phẩm.');
    }
  });

  const wishlistMutation = useMutation({
    mutationFn: (payload: { productId: number; remove: boolean }) =>
      payload.remove ? storeApi.removeWishlist(payload.productId) : storeApi.addWishlist(payload.productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-wishlist'] });
    }
  });

  const validatePurchaseAction = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    if (!isCustomer) {
      setStatusMessage('Thêm vào giỏ chỉ dành cho tài khoản khách hàng (Customer).');
      return false;
    }
    if (!selectedVariant) {
      setStatusMessage('Vui lòng chọn size/màu trước khi thêm giỏ.');
      return false;
    }
    if (selectedVariant.stockQty <= 0) {
      setStatusMessage('Biến thể bạn chọn hiện đã hết hàng.');
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validatePurchaseAction() || !selectedVariant) {
      return;
    }
    addMutation.mutate({ variantId: selectedVariant.id, quantity });
  };

  const handleBuyNow = () => {
    if (!validatePurchaseAction() || !selectedVariant) {
      return;
    }
    addMutation.mutate(
      { variantId: selectedVariant.id, quantity },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(['store-cart'], data);
          navigate('/thanh-toan');
        },
        onError: (error: any) => {
          setStatusMessage(error.response?.data?.message || 'Không thể chuyển sang thanh toán.');
        }
      }
    );
  };

  const isWishlisted = product ? wishlist.some((item) => item.id === product.id) : false;

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isCustomer) {
      setStatusMessage('Wishlist chỉ dành cho tài khoản khách hàng (Customer).');
      return;
    }
    wishlistMutation.mutate({ productId: product.id, remove: isWishlisted });
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Không tìm thấy sản phẩm.
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-6">
      <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_14px_30px_rgba(148,163,184,0.16)] sm:p-8">
          {images.length > 0 ? (
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="h-80 w-full rounded-3xl object-cover"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-3xl bg-rose-50/70">
              <Shirt className="h-16 w-16 text-mocha/70" />
            </div>
          )}
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {images.slice(0, 6).map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border transition ${
                    index === selectedImageIndex ? 'border-rose-400' : 'border-transparent'
                  }`}
                >
                  <img src={image} alt={product.name} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-mocha/70">{product.category}</p>
            <h1 className="font-display text-3xl text-mocha">{product.name}</h1>
            <p className="text-sm text-cocoa/70">{product.description ?? 'Thiết kế tinh tế, dễ phối đồ.'}</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/90 px-3 py-1 text-xs text-cocoa/75">
              <Star className="h-4 w-4 text-amber-500" />
              <span>{(reviewBundle?.averageRating ?? product.averageRating ?? 0).toFixed(1)} / 5</span>
              <span>({reviewBundle?.reviewCount ?? product.reviewCount ?? 0} đánh giá)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-2xl font-semibold text-mocha">{formatPrice(displayPrice)}</div>
            {hasSale && (
              <span className="text-sm text-cocoa/60 line-through">{formatPrice(product.basePrice)}</span>
            )}
            {hasSale && <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">Sale</span>}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-cocoa">Chọn size</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isActive = size === selectedSize;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-rose-200/80 bg-white/80 text-cocoa hover:border-rose-400'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-cocoa">Chọn màu</p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => {
                  const isActive = color === selectedColor;
                  const disabled = !product.variants.find(
                    (variant) => variant.size === selectedSize && variant.color === color && variant.stockQty > 0
                  );
                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        isActive
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-rose-200/80 bg-white/80 text-cocoa hover:border-rose-400'
                      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
            {!selectedVariant && (
              <p className="text-xs text-cocoa/60">Vui lòng chọn size và màu phù hợp.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-rose-200/80 bg-rose-50/70 px-3 py-2">
              <button
                type="button"
                className="rounded-full p-1 text-mocha hover:bg-rose-200/45"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[32px] text-center text-sm font-semibold text-cocoa">{quantity}</span>
              <button
                type="button"
                className="rounded-full p-1 text-mocha hover:bg-rose-200/45"
                onClick={() => setQuantity((prev) => Math.min(maxQty, prev + 1))}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-orange-300 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-rose-500 hover:to-orange-400"
              onClick={handleAddToCart}
              disabled={!canPurchase || addMutation.isPending}
            >
              <ShoppingBag className="h-4 w-4" />
              {addMutation.isPending ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </button>
            <button
              type="button"
              className="btn-secondary !border-rose-200/80 !bg-white/90"
              onClick={handleBuyNow}
              disabled={!canPurchase || addMutation.isPending}
            >
              Mua ngay
            </button>
            <Link to="/gio-hang" className="btn-secondary !border-rose-200/80 !bg-white/90">
              Xem giỏ hàng
            </Link>
            <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={handleToggleWishlist}>
              <Heart className="h-4 w-4" />
              {isWishlisted ? 'Đã thích' : 'Yêu thích'}
            </button>
          </div>

          {selectedVariant ? (
            <p className={`text-sm ${selectedVariant.stockQty > 0 ? 'text-cocoa/65' : 'text-rose-600'}`}>
              {selectedVariant.stockQty > 0
                ? `Còn ${selectedVariant.stockQty} sản phẩm khả dụng.`
                : 'Biến thể này đang tạm hết hàng.'}
            </p>
          ) : null}

          {statusMessage && (
            <div className="rounded-[24px] border border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,244,238,0.92))] px-4 py-4 text-sm text-cocoa/85 shadow-[0_12px_24px_rgba(148,163,184,0.12)]">
              <p className="font-medium text-cocoa">{statusMessage}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/thanh-toan"
                  className="btn-primary w-full"
                >
                  Tới thanh toán
                </Link>
                <Link
                  to="/gio-hang"
                  className="btn-secondary w-full !border-rose-200/80 !bg-white/95"
                >
                  Xem giỏ hàng
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            <p>
              <span className="font-semibold text-cocoa">Chất liệu:</span> {product.material ?? 'Cotton/Len mềm'}
            </p>
            <p>
              <span className="font-semibold text-cocoa">Form dáng:</span> {product.fit ?? 'Relaxed fit'}
            </p>
            <p>
              <span className="font-semibold text-cocoa">Thương hiệu:</span> {product.brand ?? 'Mộc Mầm'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <h2 className="text-lg font-semibold text-cocoa">Đánh giá sản phẩm</h2>
        {reviewsLoading ? <p className="mt-2 text-sm text-cocoa/70">Đang tải đánh giá...</p> : null}
        {!reviewsLoading && (reviewBundle?.reviews?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-cocoa/70">Sản phẩm chưa có đánh giá nào.</p>
        ) : null}
        <div className="mt-3 space-y-3">
          {reviewBundle?.reviews?.slice(0, 8).map((review) => (
            <article key={review.id} className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cocoa">{review.userName ?? 'Khách hàng'}</p>
                <p className="text-xs text-cocoa/65">
                  {new Date(review.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <p className="mt-1 text-sm text-cocoa/70">Đánh giá: {review.rating}/5</p>
              <p className="mt-2 text-sm text-cocoa/80">{review.comment}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
