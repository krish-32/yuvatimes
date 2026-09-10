export default function GlassButton({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const variantClass =
    variant === 'secondary'
      ? 'glass-button-secondary'
      : variant === 'danger'
        ? 'glass-button-danger'
        : 'glass-button';

  return (
    <button
      className={`${variantClass} px-5 py-2.5 text-sm flex items-center justify-center gap-2 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
