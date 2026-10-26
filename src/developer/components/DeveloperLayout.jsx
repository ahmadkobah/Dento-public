import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Boxes,
  Flag,
  Settings,
  Key,
  Webhook,
  FileText,
  Database,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Search,
  Command,
  Bell,
  User,
  Menu,
  X,
  Terminal,
  Activity,
  Shield,
  Zap,
  Building2,
  MonitorDot,
  Rocket,
  CreditCard,
  Globe,
  Headphones,
  BarChart3,
  Workflow,
  Palette,
  FormInput,
  Archive,
  PanelTop,
  Navigation,
  Eye,
  History,
  LayoutTemplate,
  Sparkles,
  Code2,
  FileSearch
} from 'lucide-react';
import clsx from 'clsx';
import { useDevAuth } from '../contexts/DevAuthContext';
import { useTenantContext } from '../contexts/TenantContext';
import CommandPalette from './CommandPalette';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    type: 'divider',
    label: 'SaaS Management'
  },
  { 
    name: 'Tenants', 
    href: '/tenants', 
    icon: Building2,
    badge: 'New'
  },
  { 
    name: 'Monitoring', 
    href: '/monitoring', 
    icon: MonitorDot 
  },
  { 
    name: 'Deployments', 
    href: '/deployments', 
    icon: Rocket 
  },
  { 
    name: 'Subscriptions', 
    href: '/subscriptions', 
    icon: CreditCard 
  },
  { 
    name: 'Revenue', 
    href: '/revenue', 
    icon: BarChart3 
  },
  { 
    name: 'Domains', 
    href: '/domains', 
    icon: Globe 
  },
  { 
    name: 'Support Sessions', 
    href: '/support', 
    icon: Headphones 
  },
  { 
    type: 'divider',
    label: 'Platform'
  },
  { 
    name: 'Modules', 
    href: '/modules', 
    icon: Boxes,
    badge: 'Pro'
  },
  { 
    name: 'Feature Flags', 
    href: '/feature-flags', 
    icon: Flag 
  },
  { 
    name: 'Custom Fields', 
    href: '/custom-fields', 
    icon: FormInput,
    badge: 'New'
  },
  { 
    name: 'Workflows', 
    href: '/workflows', 
    icon: Workflow,
    badge: 'New'
  },
  { 
    type: 'divider',
    label: 'Configuration'
  },
  { 
    name: 'System Settings', 
    href: '/settings', 
    icon: Settings 
  },
  { 
    name: 'Database', 
    href: '/settings/database', 
    icon: Database 
  },
  { 
    name: 'Storage', 
    href: '/settings/storage', 
    icon: HardDrive 
  },
  { 
    name: 'White-Label', 
    href: '/settings/branding', 
    icon: Palette,
    badge: 'New'
  },
  { 
    name: 'Backups', 
    href: '/settings/backups', 
    icon: Archive,
    badge: 'New'
  },
  { 
    type: 'divider',
    label: 'API & Integrations'
  },
  { 
    name: 'API Keys', 
    href: '/api-keys', 
    icon: Key 
  },
  { 
    name: 'Webhooks', 
    href: '/webhooks', 
    icon: Webhook 
  },
  { 
    type: 'divider',
    label: 'Logs'
  },
  { 
    name: 'Audit Logs', 
    href: '/logs/audit', 
    icon: Shield 
  },
  { 
    name: 'System Logs', 
    href: '/logs/system', 
    icon: Terminal 
  },
];

const DeveloperLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useDevAuth();
  const { tenants, selectedTenant, selectTenant, loading: tenantsLoading } = useTenantContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default to dark for developer portal
  const [searchOpen, setSearchOpen] = useState(false);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={clsx('min-h-screen transition-colors duration-200', darkMode ? 'dark bg-gray-950' : 'bg-gray-100')}>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            darkMode 
              ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
              : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
          )}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col',
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
        'border-r',
        collapsed ? 'w-16' : 'w-64',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={clsx(
          'h-16 flex items-center px-4 border-b',
          darkMode ? 'border-gray-800' : 'border-gray-200'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
              )}>
                <Terminal className={clsx('w-5 h-5', darkMode ? 'text-emerald-400' : 'text-emerald-600')} />
              </div>
              <div>
                <h1 className={clsx('font-bold', darkMode ? 'text-white' : 'text-gray-900')}>
                  Dento
                </h1>
                <p className={clsx('text-xs', darkMode ? 'text-gray-500' : 'text-gray-500')}>
                  Developer Portal
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center mx-auto',
              darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
            )}>
              <Terminal className={clsx('w-5 h-5', darkMode ? 'text-emerald-400' : 'text-emerald-600')} />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navigation.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <li key={index} className="pt-4 pb-2">
                    {!collapsed && (
                      <span className={clsx(
                        'text-xs font-semibold uppercase tracking-wider px-3',
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                      )}>
                        {item.label}
                      </span>
                    )}
                    {collapsed && <div className={clsx('h-px mx-2', darkMode ? 'bg-gray-800' : 'bg-gray-200')} />}
                  </li>
                );
              }

              const Icon = item.icon;
              const active = isActive(item);

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group',
                      active
                        ? darkMode 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-emerald-50 text-emerald-600'
                        : darkMode
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      collapsed && 'justify-center'
                    )}
                  >
                    <Icon className={clsx('w-5 h-5 flex-shrink-0', active && 'text-emerald-500')} />
                    {!collapsed && (
                      <>
                        <span className="font-medium">{item.name}</span>
                        {item.badge && (
                          <span className={clsx(
                            'ml-auto text-xs px-2 py-0.5 rounded-full',
                            darkMode 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-emerald-100 text-emerald-600'
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className={clsx(
                        'absolute left-full ml-2 px-2 py-1 rounded text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all',
                        darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-900 text-white'
                      )}>
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={clsx(
          'border-t p-3',
          darkMode ? 'border-gray-800' : 'border-gray-200'
        )}>
          {/* Back to Main App */}
          <a
            href="http://localhost:5173/"
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-2',
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              collapsed && 'justify-center'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            {!collapsed && <span className="font-medium">Back to Admin</span>}
          </a>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={clsx(
        'transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        {/* Top Header */}
        <header className={clsx(
          'sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 border-b',
          darkMode 
            ? 'bg-gray-900/95 backdrop-blur border-gray-800' 
            : 'bg-white/95 backdrop-blur border-gray-200'
        )}>
          {/* Tenant Selector */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={selectedTenant?.id || ''}
                onChange={(e) => {
                  const tenant = tenants.find(t => t.id === e.target.value);
                  selectTenant(tenant || null);
                }}
                disabled={tenantsLoading}
                className={clsx(
                  'appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-medium min-w-[200px] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer',
                  darkMode 
                    ? 'bg-gray-800 text-gray-200 border border-gray-700' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                )}
              >
                <option value="">Select a tenant...</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name || tenant.clinic_name}
                  </option>
                ))}
              </select>
              <Building2 className={clsx(
                'absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
                darkMode ? 'text-gray-500' : 'text-gray-400'
              )} />
            </div>

            {/* Search / Command Palette Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className={clsx(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors min-w-[240px]',
                darkMode 
                  ? 'bg-gray-800 text-gray-400 hover:text-gray-200' 
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              )}
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search commands...</span>
              <kbd className={clsx(
                'ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              )}>
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Environment Badge */}
            <span className={clsx(
              'hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
              darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
            )}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Development
            </span>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                darkMode 
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button className={clsx(
              'p-2 rounded-lg transition-colors relative',
              darkMode 
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* User Menu */}
            <div className="relative group">
              <button className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
                darkMode 
                  ? 'hover:bg-gray-800' 
                  : 'hover:bg-gray-100'
              )}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
                )}>
                  <User className={clsx('w-4 h-4', darkMode ? 'text-emerald-400' : 'text-emerald-600')} />
                </div>
                <span className={clsx(
                  'hidden sm:inline font-medium',
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                )}>
                  {user?.full_name || 'Developer'}
                </span>
              </button>
              
              {/* Dropdown */}
              <div className={clsx(
                'absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all',
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              )}>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className={clsx(
                      'w-full flex items-center gap-2 px-4 py-2 text-sm',
                      darkMode 
                        ? 'text-red-400 hover:bg-gray-700' 
                        : 'text-red-600 hover:bg-gray-100'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={clsx(
          'p-4 lg:p-6 min-h-[calc(100vh-4rem)]',
          darkMode ? 'text-gray-100' : 'text-gray-900'
        )}>
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default DeveloperLayout;
