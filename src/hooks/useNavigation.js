import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useNavigation - Hook for managing website navigation menus
 * Reads from navigation_menus table (not website_settings)
 * @param {string} tenantId - Tenant ID to fetch navigation for
 */
export const useNavigation = (tenantId) => {
  const [menus, setMenus] = useState({ header: [], footer: [], mobile: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch all navigation menus for tenant
  const fetchMenus = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('navigation_menus')
        .select('*')
        .eq('tenant_id', tenantId);

      if (fetchError) throw fetchError;

      // Organize by menu_type
      const organized = { header: [], footer: [], mobile: [] };
      data?.forEach(menu => {
        organized[menu.menu_type] = menu.items || [];
      });
      setMenus(organized);
    } catch (err) {
      console.error('Failed to fetch navigation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  // Save menu items for a specific menu type
  const saveMenu = useCallback(async (menuType, items) => {
    if (!tenantId) return false;

    setSaving(true);
    try {
      const { error: upsertError } = await supabase
        .from('navigation_menus')
        .upsert({
          tenant_id: tenantId,
          menu_type: menuType,
          items,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,menu_type' });

      if (upsertError) throw upsertError;

      setMenus(prev => ({ ...prev, [menuType]: items }));
      return true;
    } catch (err) {
      console.error('Failed to save navigation:', err);
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [tenantId]);

  // Legacy navigation object for backward compatibility
  const navigation = {
    items: menus.header,
    footerItems: menus.footer,
    mobileItems: menus.mobile,
  };

  // Add item to a specific menu
  const addMenuItem = useCallback(async (menuType, item) => {
    const currentItems = menus[menuType] || [];
    const newItem = { ...item, id: item.id || crypto.randomUUID() };
    return saveMenu(menuType, [...currentItems, newItem]);
  }, [menus, saveMenu]);

  // Update item in a specific menu
  const updateMenuItem = useCallback(async (menuType, id, updates) => {
    const currentItems = menus[menuType] || [];
    const updatedItems = currentItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    return saveMenu(menuType, updatedItems);
  }, [menus, saveMenu]);

  // Remove item from a specific menu
  const removeMenuItem = useCallback(async (menuType, id) => {
    const currentItems = menus[menuType] || [];
    const filteredItems = currentItems.filter(item => item.id !== id);
    return saveMenu(menuType, filteredItems);
  }, [menus, saveMenu]);

  // Reorder items in a specific menu
  const reorderItems = useCallback(async (menuType, items) => {
    return saveMenu(menuType, items);
  }, [saveMenu]);

  // Get items for a specific menu type
  const getMenuItems = useCallback((menuType) => {
    return menus[menuType] || [];
  }, [menus]);

  return {
    menus,
    navigation,
    loading,
    error,
    saving,
    fetchMenus,
    saveMenu,
    addMenuItem,
    updateMenuItem,
    removeMenuItem,
    reorderItems,
    getMenuItems,
  };
};
