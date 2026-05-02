import { Shirt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../utils/cn';

type ProductImageProps = {
  src?: string | null;
  alt: string;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
  imageClassName?: string;
  fit?: 'contain' | 'cover';
  compact?: boolean;
};

type ImagePalette = {
  start: string;
  end: string;
  glow: string;
  chip: string;
  text: string;
  border: string;
};

const palettes: ImagePalette[] = [
  {
    start: '#fff4ea',
    end: '#f1ddcf',
    glow: 'rgba(222, 171, 132, 0.36)',
    chip: 'rgba(255, 255, 255, 0.78)',
    text: '#5c3f2f',
    border: 'rgba(175, 124, 87, 0.28)'
  },
  {
    start: '#f7f2ea',
    end: '#d9ccb9',
    glow: 'rgba(154, 131, 98, 0.34)',
    chip: 'rgba(255, 250, 244, 0.82)',
    text: '#534536',
    border: 'rgba(140, 117, 85, 0.28)'
  },
  {
    start: '#f7efe8',
    end: '#e4d6cd',
    glow: 'rgba(184, 140, 124, 0.28)',
    chip: 'rgba(255, 255, 255, 0.76)',
    text: '#5a433a',
    border: 'rgba(163, 120, 103, 0.25)'
  },
  {
    start: '#f5f1eb',
    end: '#d8d3c7',
    glow: 'rgba(118, 110, 97, 0.26)',
    chip: 'rgba(255, 255, 255, 0.74)',
    text: '#494137',
    border: 'rgba(123, 112, 92, 0.22)'
  }
];

const hashSeed = (value: string) =>
  Array.from(value).reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);

const pickPalette = (seed: string) => palettes[hashSeed(seed) % palettes.length];

const buildMonogram = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return 'MM';
  }
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const ProductImage = ({
  src,
  alt,
  title,
  subtitle,
  className,
  imageClassName,
  fit = 'contain',
  compact = false
}: ProductImageProps) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const safeTitle = title?.trim() || alt.trim() || 'Mộc Mầm';
  const safeSubtitle = subtitle?.trim() || 'Mộc Mầm Select';
  const palette = useMemo(() => pickPalette(`${safeTitle}-${safeSubtitle}`), [safeSubtitle, safeTitle]);
  const showImage = Boolean(src && !hasError);
  const monogram = useMemo(() => buildMonogram(safeTitle), [safeTitle]);

  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      style={{
        backgroundImage: `linear-gradient(145deg, ${palette.start}, ${palette.end})`
      }}
    >
      <div
        className="pointer-events-none absolute inset-[6%] rounded-[26px] border bg-white/28 backdrop-blur-[2px]"
        style={{ borderColor: palette.border }}
      />
      <div
        className="pointer-events-none absolute -right-8 top-3 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: palette.glow }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full blur-2xl"
        style={{ backgroundColor: palette.glow }}
      />

      {showImage ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.52),transparent_58%)]" />
          <img
            src={src ?? undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className={cn(
              'relative z-10 h-full w-full drop-shadow-[0_18px_28px_rgba(67,49,38,0.18)]',
              fit === 'cover' ? 'object-cover' : 'object-contain p-3 sm:p-4',
              imageClassName
            )}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />
        </>
      ) : compact ? (
        <div className="relative z-10 flex h-full items-center justify-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[18px] border bg-white/55 shadow-[0_10px_20px_rgba(67,49,38,0.08)]"
            style={{ borderColor: palette.border, color: palette.text }}
          >
            <span className="text-sm font-semibold tracking-[0.22em]">{monogram}</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                borderColor: palette.border,
                backgroundColor: palette.chip,
                color: palette.text
              }}
            >
              {safeSubtitle}
            </span>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[18px] border bg-white/50 shadow-[0_10px_18px_rgba(67,49,38,0.08)]"
              style={{ borderColor: palette.border, color: palette.text }}
            >
              <Shirt className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cocoa/55">Moc Mam</p>
            <h3 className="max-w-[85%] text-xl font-semibold leading-tight sm:text-2xl" style={{ color: palette.text }}>
              {safeTitle}
            </h3>
            <p className="max-w-[80%] text-xs leading-relaxed text-cocoa/65">
              Phối màu dịu, bố cục sạch và giữ trọn dáng sản phẩm ngay cả khi ảnh gốc bị lỗi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImage;
