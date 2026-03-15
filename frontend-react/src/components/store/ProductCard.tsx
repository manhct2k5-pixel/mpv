import { Heart, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StoreProductSummary } from '../../types/store';
import { getRoutePrefetchHandlers } from '../../utils/routePrefetch';

interface ProductCardProps {
  product: StoreProductSummary;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: number) => void;
}

const ProductCard = ({ product, isWishlisted, onToggleWishlist }: ProductCardProps) => {
  const productDetailPrefetchHandlers = getRoutePrefetchHandlers('productDetail');
  const hasSale = Boolean(product.salePrice && product.salePrice > 0);
  const displayPrice = hasSale ? product.salePrice : product.basePrice;
  const formatPrice = (value: number) => `${value.toLocaleString('vi-VN')} đ`;
  const badgeLabel = hasSale ? 'Sale' : product.featured ? 'Nổi bật' : undefined;
  const handleToggle = () => {
    onToggleWishlist?.(product.id);
  };

  return (
    <div className="group relative overflow-hidden rounded-[30px] border border-rose-200/80 bg-white/90 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.16)] transition hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(148,163,184,0.22)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-rose-200/45 blur-2xl" />
      <div className="relative mb-4 flex h-48 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="absolute left-3 top-3">
          {badgeLabel && <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">{badgeLabel}</span>}
        </div>
        <button
          type="button"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-rose-200/70 bg-white/95 text-rose-500 shadow-[0_6px_14px_rgba(148,163,184,0.18)] transition hover:scale-105"
          aria-label="Yêu thích"
          aria-pressed={Boolean(isWishlisted)}
          onClick={handleToggle}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full rounded-3xl object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <Shirt className="h-16 w-16 text-mocha/80" />
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-500/90">{product.category}</p>
      <h3 className="mt-1 text-lg font-semibold text-cocoa">{product.name}</h3>
      <p className="mt-1 text-sm text-cocoa/65">{hasSale ? 'Ưu đãi giới hạn trong tuần' : 'Bản phối mới tinh tế'}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-col">
          {hasSale && <span className="text-xs text-cocoa/60 line-through">{formatPrice(product.basePrice)}</span>}
          <span className="text-lg font-semibold text-mocha">{formatPrice(displayPrice ?? product.basePrice)}</span>
        </div>
        <Link
          to={`/san-pham/${product.slug}`}
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-rose-400 to-orange-300 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-rose-500 hover:to-orange-400"
          {...productDetailPrefetchHandlers}
        >
          Xem chi tiết
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
