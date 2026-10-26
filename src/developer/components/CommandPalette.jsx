import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Command as CommandIcon,
  LayoutDashboard,
  Building2,
  Boxes,
  Flag,
  Settings,
  Key,
  Webhook,
  Shield,
  Terminal,
  MonitorDot,
  Rocket,
  CreditCard,
  Globe,
  Headphones,
  Database,
  HardDrive,
  Plus,
  FileText,
  Users,
  Activity,
  ArrowRight,
  X,
  Hash
} from 'lucide-react';
import clsx from 'clsx';

// All available commands
const commands = [
  // Navigation
  { id: 'nav-dashboard', type: 'navigation', name: 'Go to Dashboard', icon: LayoutDashboard, action: '/', keywords: ['home', 'overview'] },
  { id: 'nav-tenants', type: 'navigation', name: 'Go to Tenants', icon: Building2, action: '/tenants', keywords: ['clinics', 'clients'] },
  { id: 'nav-modules', type: 'navigation', name: 'Go to Modules', icon: Boxes, action: '/modules', keywords: ['features', 'packages'] },
  { id: 'nav-flags', type: 'navigation', name: 'Go to Feature Flags', icon: Flag, action: '/feature-flags', keywords: ['toggles', 'features'] },
  { id: 'nav-settings', type: 'navigation', name: 'Go to System Settings', icon: Settings, action: '/settings', keywords: ['config', 'configuration'] },
  { id: 'nav-database', type: 'navigation', name: 'Go to Database', icon: Database, action: '/settings/database', keywords: ['db', 'postgres'] },
  { id: 'nav-storage', type: 'navigation', name: 'Go to Storage', icon: HardDrive, action: '/settings/storage', keywords: ['files', 'buckets'] },
  { id: 'nav-apikeys', type: 'navigation', name: 'Go to API Keys', icon: Key, action: '/api-keys', keywords: ['tokens', 'auth'] },
  { id: 'nav-webhooks', type: 'navigation', name: 'Go to Webhooks', icon: Webhook, action: '/webhooks', keywords: ['hooks', 'events'] },
  { id: 'nav-audit', type: 'navigation', name: 'Go to Audit Logs', icon: Shield, action: '/logs/audit', keywords: ['activity', 'history'] },
  { id: 'nav-system', type: 'navigation', name: 'Go to System Logs', icon: Terminal, action: '/logs/system', keywords: ['errors', 'debug'] },
  { id: 'nav-monitoring', type: 'navigation', name: 'Go to Monitoring', icon: MonitorDot, action: '/monitoring', keywords: ['health', 'status'] },
  { id: 'nav-deployments', type: 'navigation', name: 'Go to Deployments', icon: Rocket, action: '/deployments', keywords: ['releases', 'versions'] },
  { id: 'nav-subscriptions', type: 'navigation', name: 'Go to Subscriptions', icon: CreditCard, action: '/subscriptions', keywords: ['billing', 'plans'] },
  { id: 'nav-domains', type: 'navigation', name: 'Go to Domains', icon: Globe, action: '/domains', keywords: ['dns', 'urls'] },
  { id: 'nav-support', type: 'navigation', name: 'Go to Support Sessions', icon: Headphones, action: '/support', keywords: ['help', 'impersonate'] },
  
  // Actions
  { id: 'action-create-tenant', type: 'action', name: 'Create New Tenant', icon: Plus, action: '/tenants/create', keywords: ['add', 'new clinic'] },
  { id: 'action-create-apikey', type: 'action', name: 'Generate API Key', icon: Key, action: '/api-keys?create=true', keywords: ['new key', 'token'] },
  { id: 'action-create-webhook', type: 'action', name: 'Create Webhook', icon: Webhook, action: '/webhooks?create=true', keywords: ['new hook'] },
  { id: 'action-create-flag', type: 'action', name: 'Create Feature Flag', icon: Flag, action: '/feature-flags?create=true', keywords: ['new flag', 'toggle'] },
  
  // Quick views
  { id: 'view-errors', type: 'view', name: 'View Error Dashboard', icon: Activity, action: '/monitoring/errors', keywords: ['exceptions', 'bugs'] },
  { id: 'view-health', type: 'view', name: 'View Health Status', icon: MonitorDot, action: '/monitoring/health', keywords: ['uptime', 'status'] },
];

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => {
      const nameMatch = cmd.name.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
      return nameMatch || keywordMatch;
    });
  }, [query]);

  // Group commands by type
  const groupedCommands = useMemo(() => {
    const groups = {
      navigation: { label: 'Navigation', items: [] },
      action: { label: 'Actions', items: [] },
      view: { label: 'Quick Views', items: [] },
    };
    
    filteredCommands.forEach(cmd => {
      if (groups[cmd.type]) {
        groups[cmd.type].items.push(cmd);
      }
    });
    
    return Object.values(groups).filter(g => g.items.length > 0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Execute command handler
  const executeCommand = useCallback((cmd) => {
    onClose();
    navigate(cmd.action);
  }, [onClose, navigate]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredCommands, selectedIndex, executeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative min-h-screen flex items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center px-4 border-b border-gray-700">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className="flex-1 px-4 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
            />
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-800 rounded border border-gray-700">
                ESC
              </kbd>
            </div>
          </div>

          {/* Command list */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No commands found for "{query}"</p>
              </div>
            ) : (
              groupedCommands.map((group) => (
                <div key={group.label} className="mb-2">
                  <div className="px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map((cmd) => {
                    flatIndex++;
                    const currentIndex = flatIndex;
                    const Icon = cmd.icon;
                    const isSelected = selectedIndex === currentIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        data-index={currentIndex}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'text-gray-300 hover:bg-gray-800'
                        )}
                      >
                        <div className={clsx(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          isSelected ? 'bg-emerald-500/20' : 'bg-gray-800'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{cmd.name}</p>
                          {cmd.keywords && (
                            <p className="text-sm text-gray-500">
                              {cmd.keywords.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↵</kbd>
                <span className="ml-1">Select</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CommandIcon className="w-3 h-3" />
              <span>K to open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
