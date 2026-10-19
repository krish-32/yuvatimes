import { useEffect } from "react";
import { X } from "lucide-react";

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}) {
  // Escape key listener
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const sizeMap = { lg: "max-w-2xl", sm: "max-w-md", md: "max-w-lg" };
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 border-0 bg-primary-900/20 backdrop-blur-sm p-0"
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        className={`relative glass-card w-full ${sizeClass} max-h-[90vh] overflow-y-auto animate-scale-in`}
        aria-label={title || "Dialog"}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
          <h2 className="text-lg font-display font-semibold text-primary-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-primary-700 hover:bg-white/40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/30">
            {footer}
          </div>
        )}
      </dialog>
    </div>
  );
}
