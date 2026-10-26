import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronsUpDown,
  Check,
  Building2,
  Search,
  Plus,
  X,
} from 'lucide-react';

// Mock tenant data for the selector
const mockTenants = [
  { id: '1', name: 'Dento Clinic', slug: 'dento', status: 'active', plan: 'Professional' },
  { id: '2', name: 'Smile Center', slug: 'smile-center', status: 'active', plan: 'Enterprise' },
  { id: '3', name: 'Dental Plus', slug: 'dental-plus', status: 'active', plan: 'Starter' },
  { id: '4', name: 'Bright Teeth', slug: 'bright-teeth', status: 'trial', plan: 'Professional' },
  { id: '5', name: 'City Dental', slug: 'city-dental', status: 'suspended', plan: 'Starter' },
  { id: '6', name: 'Family Dental Care', slug: 'family-dental', status: 'active', plan: 'Professional' },
];

const planColors = {
  Starter: 'bg-gray-500/20 text-gray-400',
  Professional: 'bg-blue-500/20 text-blue-400',
  Enterprise: 'bg-purple-500/20 text-purple-400',
};

const statusColors = {
  active: 'bg-emerald-500',
  trial: 'bg-amber-500',
  suspended: 'bg-red-500',
};

export default function TenantSelector({ selectedTenantId, onSelectTenant, showAllOption = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedTenant = selectedTenantId
    ? mockTenants.find((t) => t.id === selectedTenantId)
    : null;

  // Filter tenants based on search
  const filteredTenants = mockTenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (tenantId) => {
    onSelectTenant(tenantId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-left transition-colors hover:border-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 rounded-lg bg-gray-700 p-1.5">
            <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
          </div>
          {selectedTenant ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${statusColors[selectedTenant.status]}`}
                />
                <span className="truncate text-sm font-medium text-white">
                  {selectedTenant.name}
                </span>
              </div>
              <span className="text-xs text-gray-500">{selectedTenant.slug}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">All Tenants</span>
          )}
        </div>
        <ChevronUpDownIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-900 py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1">
            {/* All Tenants Option */}
            {showAllOption && (
              <button
                onClick={() => handleSelect(null)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                  !selectedTenantId
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gray-700 p-1.5">
                    <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium">All Tenants</span>
                </div>
                {!selectedTenantId && <CheckIcon className="h-4 w-4" />}
              </button>
            )}

            {/* Tenant Options */}
            {filteredTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelect(tenant.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
                  selectedTenantId === tenant.id
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${statusColors[tenant.status]}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{tenant.name}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${planColors[tenant.plan]}`}>
                        {tenant.plan}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{tenant.slug}</span>
                  </div>
                </div>
                {selectedTenantId === tenant.id && <CheckIcon className="h-4 w-4 flex-shrink-0" />}
              </button>
            ))}

            {filteredTenants.length === 0 && (
              <div className="py-4 text-center text-sm text-gray-500">
                No tenants found
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-2">
            <Link
              to="/developer/tenants/new"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-emerald-400 hover:bg-gray-700 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <PlusIcon className="h-4 w-4" />
              Add New Tenant
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
