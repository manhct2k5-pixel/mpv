import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/store/ProductCard';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

const WishlistPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });
  const isCustomer = (profile?.role ?? '').toLowerCase() === 'user';

  const { data: wishlist = [], isLoading } = useQuery({
    queryKey: ['store-wishlist'],
    queryFn: storeApi.wishlist,
    enabled: isAuthenticated && isCustomer
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number) => storeApi.removeWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-wishlist'] });
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product: { id: number; slug: string }) => {
      const detail = await storeApi.product(product.slug);
      const variant =
        detail.variants.find((item) => item.stockQty > 0) ?? detail.variants[0];
      if (!variant) {
        throw new Error('Sản phẩm chưa có biến thể.');
      }
      return storeApi.addToCart({ variantId: variant.id, quantity: 1 });
    }
  });

  const [statusByProduct, setStatusByProduct] = useState<Record<number, string>>({});

  const handleToggleWishlist = (productId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    removeMutation.mutate(productId);
  };

  const handleAddToCart = (product: { id: number; slug: string }) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setStatusByProduct((prev) => ({ ...prev, [product.id]: '' }));
    addToCartMutation.mutate(product, {
      onSuccess: () => {
        setStatusByProduct((prev) => ({ ...prev, [product.id]: 'Đã thêm vào giỏ.' }));
        queryClient.invalidateQueries({ queryKey: ['store-cart'] });
      },
      onError: (error: any) => {
        setStatusByProduct((prev) => ({
          ...prev,
          [product.id]: error?.message || error?.response?.data?.message || 'Không thể thêm sản phẩm.'
        }));
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Vui lòng <Link to="/login" className="text-mocha underline">đăng nhập</Link> để xem wishlist.
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
        Wishlist chỉ dành cho tài khoản khách hàng (Customer).
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải wishlist...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Wishlist</p>
            <h1 className="mt-1 font-display text-3xl text-mocha">Sản phẩm yêu thích</h1>
            <p className="text-sm text-cocoa/70">Lưu lại các item bạn muốn mua sau.</p>
          </div>
          <Link to="/" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-xs text-cocoa/65">
        <span className="tag !border-rose-200/80 !bg-white/90">
          Tổng sản phẩm: {wishlist.length.toLocaleString('vi-VN')}
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
          Wishlist đang trống.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.map((product) => (
            <div key={product.id} className="space-y-3">
              <ProductCard
                product={product}
                isWishlisted
                onToggleWishlist={handleToggleWishlist}
              />
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-400 to-orange-300 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-rose-500 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => handleAddToCart(product)}
                disabled={addToCartMutation.isPending}
              >
                {addToCartMutation.isPending ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>
              {statusByProduct[product.id] && (
                <div className="rounded-2xl border border-rose-200/70 bg-white/90 px-4 py-2 text-xs text-cocoa/70">
                  {statusByProduct[product.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
