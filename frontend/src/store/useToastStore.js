import { create } from "zustand";

let toastId = 0;

/**
 * Global toast notification store.
 * Provides a unified, non-intrusive notification system across the entire app.
 * Replaces per-page inline Toast components for new workflows.
 */
export const useToastStore = create((set) => ({
  toasts: [],

  /**
   * Add a toast notification.
   * @param {"success"|"error"|"info"|"warning"} type
   * @param {string} message
   * @param {number} [duration=4000] - auto-dismiss time in ms
   * @returns {number} toast id for manual dismissal
   */
  addToast: (type, message, duration = 4000) => {
    const id = ++toastId;
    // Cap the visible stack to avoid overlapping the floating cart bar
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }].slice(-5),
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  /** Remove a specific toast by id */
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  /** Remove all toasts */
  clearAll: () => set({ toasts: [] }),
}));
