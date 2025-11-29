// Main Layout Component
// Provides sidebar navigation with User/Admin mode toggle

import { Link, useLocation } from 'react-router';
import { clsx } from 'clsx';
import {
  BarChart3,
  Bot,
  History,
  Settings,
  Menu,
  X,
  Server,
  FileQuestion,
  Tags,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface LayoutProps {
  children: React.ReactNode;
}

const userNavItems = [
  { path: '/', label: 'Rankings', icon: BarChart3 },
  { path: '/runs', label: 'Run History', icon: History },
];

const adminNavItems = [
  { path: '/admin/providers', label: 'Providers', icon: Server },
  { path: '/admin/models', label: 'Models', icon: Bot },
  { path: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { path: '/admin/question-types', label: 'Question Types', icon: Tags },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { sidebarOpen, adminMode, toggleSidebar, toggleAdminMode } = useUIStore();

  const navItems = adminMode ? adminNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-200 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <Link to="/" className="text-xl font-bold text-blue-400 hover:text-blue-300">
            SABE
          </Link>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={toggleAdminMode}
            className={clsx(
              'w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors',
              adminMode
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <div className="flex items-center gap-2">
              <Shield size={18} />
              <span>{adminMode ? 'Admin Mode' : 'User Mode'}</span>
            </div>
            <ChevronRight
              size={16}
              className={clsx('transition-transform', adminMode && 'rotate-90')}
            />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {adminMode && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
              Administration
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? adminMode
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-gray-800">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-700 rounded"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {adminMode && (
              <span className="text-xs px-2 py-1 bg-amber-600/20 text-amber-400 rounded">
                ADMIN
              </span>
            )}
            <span className="text-sm text-gray-400">LLM Benchmark Dashboard</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}
