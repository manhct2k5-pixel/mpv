type RoutePrefetchKey = 'home' | 'productDetail' | 'checkout';

const routeImporters: Record<RoutePrefetchKey, () => Promise<unknown>> = {
  home: () => import('../pages/StorefrontPage.tsx'),
  productDetail: () => import('../pages/ProductDetailPage.tsx'),
  checkout: () => import('../pages/CheckoutPage.tsx')
};

const prefetchedRoutes = new Set<RoutePrefetchKey>();

export const prefetchRoute = (key: RoutePrefetchKey) => {
  if (prefetchedRoutes.has(key)) return;

  prefetchedRoutes.add(key);
  void routeImporters[key]().catch(() => {
    prefetchedRoutes.delete(key);
  });
};

export const getRoutePrefetchHandlers = (key: RoutePrefetchKey) => ({
  onMouseEnter: () => prefetchRoute(key),
  onFocus: () => prefetchRoute(key),
  onTouchStart: () => prefetchRoute(key)
});
