import { memo, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { usePosStore } from "../store/usePosStore";

/**
 * FloatingCartBar — persistent bottom-right floating cart indicator.
 * Shows the total number of items across all POS sessions.
 * Clicking navigates to /pos. Hidden when already on the POS page
 * or when the cart is empty.
 */
const FloatingCartBar = memo(function FloatingCartBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const sessions = usePosStore((state) => state.sessions);

  // Total item count across ALL sessions
  const totalItems = useMemo(
    () => sessions.reduce((sum, s) => sum + s.items.length, 0),
    [sessions],
  );

  // Don't render when on POS page or cart is empty
  if (location.pathname === "/pos" || totalItems === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/pos")}
      className="
        fixed bottom-20 right-6 z-[150]
        flex items-center gap-3 px-5 py-3.5
        bg-primary-600/95 backdrop-blur-lg
        text-white font-medium text-sm
        rounded-2xl shadow-glass-lg
        border border-primary-400/30
        hover:bg-primary-700/95 hover:shadow-glass-lg hover:scale-[1.02]
        active:scale-[0.98]
        transition-all duration-200
        animate-slide-up
        group
      "
      aria-label={`Checkout ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
      id="floating-cart-bar"
    >
      {/* Cart icon with subtle bounce on hover */}
      <div className="relative">
        <ShoppingCart
          size={20}
          className="group-hover:animate-cart-wiggle transition-transform"
        />
        {/* Item count badge */}
        <span className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary-700 text-[10px] font-bold shadow-sm ring-2 ring-primary-600/30">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      </div>

      {/* Label text */}
      <span className="hidden sm:inline">
        Checkout ({totalItems} {totalItems === 1 ? "item" : "items"})
      </span>
      <span className="sm:hidden">Checkout ({totalItems})</span>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-primary-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </button>
  );
});

export default FloatingCartBar;
