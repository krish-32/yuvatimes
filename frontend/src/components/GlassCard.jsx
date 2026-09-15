export default function GlassCard({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 ${hover ? 'transition-all duration-200 hover:shadow-glass-lg hover:bg-white/40 cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
