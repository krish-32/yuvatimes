import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ScanLine, Menu, X, Watch } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inventory', label: 'Inventory & Barcodes', icon: Package },
  { to: '/pos', label: 'POS / Checkout', icon: ScanLine },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-primary-900/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-72 shrink-0 glass-nav rounded-none lg:rounded-r-3xl border-l-0 border-y-0 border-r border-white/40
          transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-full flex-col p-5">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 shadow-glass">
              <Watch className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-primary-800 leading-tight">
                YuvaTimes
              </h1>
              <p className="text-xs text-primary-700/60">Watch POS System</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-primary-500/90 text-white shadow-glass-sm'
                    : 'text-primary-800/70 hover:bg-white/40 hover:text-primary-800'
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="glass-card px-4 py-3 mt-4">
            <p className="text-xs text-primary-700/60">Backend Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-soft" />
              <span className="text-sm font-medium text-primary-800">Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="sticky top-0 z-20 glass-nav rounded-none border-x-0 border-t-0 border-b border-white/40 px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-primary-700 hover:bg-white/40 transition-colors"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="hidden lg:block">
            <h2 className="font-display text-base font-semibold text-primary-800">
              Point of Sale & Inventory
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-3 py-1.5 flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                AD
              </div>
              <span className="text-sm font-medium text-primary-800 hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
