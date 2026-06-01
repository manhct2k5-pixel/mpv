import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GuestCartItem {
  variantId: number;
  productId?: number | null;
  productName?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
}

interface GuestCartState {
  items: GuestCartItem[];
  addItem: (item: GuestCartItem) => void;
  updateItem: (variantId: number, quantity: number) => void;
  removeItem: (variantId: number) => void;
  clearCart: () => void;
}

const getCartCount = (items: GuestCartItem[]) =>
  items.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);

export const readStoredGuestCartCount = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem('guest-cart');
    if (!raw) {
      return 0;
    }
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.state?.items)
      ? parsed.state.items
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];
    return getCartCount(items);
  } catch {
    return 0;
  }
};

const notifyGuestCartUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('guest-cart-updated'));
  }
};

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          const safeQuantity = Math.max(1, Number(item.quantity) || 1);
          const safeItem = { ...item, quantity: safeQuantity };
          const nextItems = existing
            ? state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: Math.max(1, Number(i.quantity) || 0) + safeQuantity }
                  : i
              )
            : [...state.items, safeItem];

          return { items: nextItems };
        }),

      updateItem: (variantId, quantity) =>
        set((state) => {
          const safeQuantity = Math.max(0, Number(quantity) || 0);
          const nextItems =
            safeQuantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) => (i.variantId === variantId ? { ...i, quantity: safeQuantity } : i));

          return { items: nextItems };
        }),

      removeItem: (variantId) =>
        set((state) => {
          const nextItems = state.items.filter((i) => i.variantId !== variantId);
          return { items: nextItems };
        }),

      clearCart: () => set({ items: [] })
    }),
    {
      name: 'guest-cart',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GuestCartState> | undefined;
        const items = Array.isArray(persisted?.items) ? persisted.items : currentState.items;
        return {
          ...currentState,
          ...persisted,
          items
        };
      }
    }
  )
);

useGuestCartStore.subscribe(notifyGuestCartUpdated);
