import { useState, useRef, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Building2, ChevronDown, Check, RefreshCw, AlertCircle, GripVertical, Minimize2, Maximize2 } from 'lucide-react';

/**
 * TenantSwitcher - Development tool for switching between tenants
 * Only visible in development mode or localhost
 * Collapsible + Draggable so it doesn't block the view
 */
export default function TenantSwitcher() {
  const { 
    tenant, 
    availableTenants, 
    switchTenant, 
    loading,
    error 
  } = useTenant();
  
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('dento-dev-collapsed') === 'true'; } catch { /* ignore */ return false; }
  });
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('dento-dev-position');
      return saved ? JSON.parse(saved) : { x: 16, y: null }; // y=null means bottom:16px
    } catch { /* ignore */ return { x: 16, y: null }; }
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Only show in development
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  // Drag effect — must be declared before any conditional returns
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const x = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
      setPosition({ x, y });
    };
    const onUp = () => {
      setDragging(false);
      try { localStorage.setItem('dento-dev-position', JSON.stringify(position)); } catch { /* ignore */ }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, position]);

  if (!isDev) return null;

  const handleSwitch = async (tenantId) => {
    setSwitching(true);
    try {
      await switchTenant(tenantId);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to switch tenant:', err);
    } finally {
      setSwitching(false);
    }
  };

  const toggleCollapsed = (e) => {
    e.stopPropagation();
    const next = !collapsed;
    setCollapsed(next);
    setIsOpen(false);
    try { localStorage.setItem('dento-dev-collapsed', String(next)); } catch { /* ignore */ }
  };

  // Drag handlers
  const onDragStart = (e) => {
    if (e.target.closest('[data-no-drag]')) return;
    e.preventDefault();
    const rect = dragRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const posStyle = position.y != null
    ? { left: position.x, top: position.y }
    : { left: position.x, bottom: 16 };

  if (loading) {
    return (
      <div className="fixed z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2" style={posStyle}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading tenant...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed z-50 bg-red-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2" style={posStyle}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Tenant error</span>
      </div>
    );
  }

  // Collapsed: tiny pill
  if (collapsed) {
    return (
      <div
        ref={dragRef}
        className="fixed z-50 select-none"
        style={{ ...posStyle, cursor: dragging ? 'grabbing' : 'default' }}
      >
        <div
          className="flex items-center gap-1.5 bg-gray-900/80 backdrop-blur text-white pl-1 pr-2 py-1 rounded-full shadow-lg hover:bg-gray-800 transition-colors group"
        >
          <button
            onMouseDown={onDragStart}
            className="p-0.5 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Drag to move"
          >
            <GripVertical className="h-3 w-3" />
          </button>
          <span className="text-[10px] font-medium text-amber-400">🔧</span>
          <span className="text-xs font-medium truncate max-w-[80px]">{tenant?.name?.split(' ')[0] || 'DEV'}</span>
          <button
            data-no-drag
            onClick={toggleCollapsed}
            className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            title="Expand"
          >
            <Maximize2 className="h-3 w-3 text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded: full switcher
  return (
    <div
      ref={dragRef}
      className="fixed z-50 select-none"
      style={{ ...posStyle, cursor: dragging ? 'grabbing' : 'default' }}
    >
      {/* Development Banner */}
      <div className="mb-2 px-3 py-1 bg-amber-500 text-amber-900 text-xs font-medium rounded-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onMouseDown={onDragStart}
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-amber-400 rounded transition-colors"
            title="Drag to move"
          >
            <GripVertical className="h-3 w-3" />
          </button>
          🔧 DEV MODE
        </div>
        <button
          data-no-drag
          onClick={toggleCollapsed}
          className="p-0.5 hover:bg-amber-400 rounded transition-colors"
          title="Collapse"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>
      
      {/* Tenant Selector */}
      <div className="relative">
        <button
          data-no-drag
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg hover:bg-gray-800 transition-colors min-w-[250px]"
        >
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">
              {tenant?.display_name || tenant?.name || 'No Tenant Selected'}
            </div>
            <div className="text-xs text-gray-400">
              {tenant?.slug ? `${tenant.slug}.dento.app` : 'Click to select'}
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <p className="text-xs text-gray-400 px-2">Switch Tenant</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {availableTenants.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No tenants available
                </div>
              ) : (
                availableTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSwitch(t.id)}
                    disabled={switching}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors ${
                      tenant?.id === t.id ? 'bg-gray-800' : ''
                    }`}
                  >
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">
                        {t.display_name || t.name}
                      </div>
                      <div className="text-xs text-gray-400">{t.slug}</div>
                    </div>
                    {tenant?.id === t.id && (
                      <Check className="h-4 w-4 text-primary-500" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.status === 'trial' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {t.status}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="p-2 border-t border-gray-700">
              <a
                href="/developer/tenants/create"
                className="block w-full text-center text-sm text-primary-400 hover:text-primary-300 py-2"
              >
                + Create New Tenant
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
