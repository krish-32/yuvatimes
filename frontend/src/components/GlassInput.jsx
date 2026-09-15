export default function GlassInput({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-primary-800/80 px-1">{label}</label>
      )}
      <input
        className={`glass-input w-full px-4 py-2.5 text-base text-primary-900 bg-white/40 ${error ? 'border-secondary-400 ring-2 ring-secondary-400' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-secondary-600 px-1">{error}</span>}
    </div>
  );
}
