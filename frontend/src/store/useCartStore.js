import { create } from "zustand";

/**
 * Global cart-awareness store.
 * Tracks which barcode serials are currently staged in any POS session cart.
 * Enables optimistic UI: instant Add/Remove toggling on product item rows
 * without waiting for the backend round-trip.
 *
 * This store is the source of truth for "is this serial in the cart?" checks
 * across pages (e.g., Inventory → ProductItems).
 */
export const useCartStore = create((set, get) => ({
  /** @type {Set<string>} serial numbers currently in any cart */
  _cartSerials: new Set(),

  /** Check if a serial is in the cart */
  isInCart: (serial) => get()._cartSerials.has(serial),

  /** Get the total count of items across all carts */
  cartCount: () => get()._cartSerials.size,

  /** Optimistically add a serial to cart tracking */
  addSerial: (serial) =>
    set((state) => {
      const next = new Set(state._cartSerials);
      next.add(serial);
      return { _cartSerials: next };
    }),

  /** Optimistically remove a serial from cart tracking */
  removeSerial: (serial) =>
    set((state) => {
      const next = new Set(state._cartSerials);
      next.delete(serial);
      return { _cartSerials: next };
    }),

  /**
   * Bulk-sync cart serials from all POS sessions.
   * Called after fetching updated session data from backend.
   * @param {string[]} serials
   */
  syncSerials: (serials) =>
    set({ _cartSerials: new Set(serials) }),

  /** Clear all tracked serials */
  clearAll: () => set({ _cartSerials: new Set() }),
}));
