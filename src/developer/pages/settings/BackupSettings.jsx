import { useState, useEffect, useCallback } from 'react';
import { 
  Archive, 
  Download,
  Upload,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Settings,
  Database,
  HardDrive,
  History,
  Building2,
  Filter
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../contexts/UnifiedTenantContext';
import { useToast } from '../../../hooks/useToast';

const BackupSettings = () => {
  const toast = useToast();
  const { tenants } = useTenant();
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [backups, setBackups] = useState([]);
  const [stats, setStats] = useState({
    totalBackups: 0,
    successfulBackups: 0,
    failedBackups: 0,
    totalSizeBytes: 0,
    lastBackupAt: null
  });
  
  const [settings, setSettings] = useState({
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    backupTime: '03:00',
    retentionDays: 30,
    includeMedia: false,
    includeAuditLogs: true,
    encryptBackups: true,
    notifyOnComplete: true,
    notifyOnFailure: true,
  });

  const [settingsChanged, setSettingsChanged] = useState(false);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      const { data, error } = await query;
      
      // If table doesn't exist yet, just show empty state
      if (error) {
        console.warn('backups table may not exist yet:', error.message);
        setBackups([]);
        setLoading(false);
        return;
      }
      
      setBackups(data || []);

      // Calculate stats
      const completed = (data || []).filter(b => b.status === 'completed');
      const failed = (data || []).filter(b => b.status === 'failed');
      const totalSize = completed.reduce((sum, b) => sum + (b.size_bytes || 0), 0);
      
      setStats({
        totalBackups: data?.length || 0,
        successfulBackups: completed.length,
        failedBackups: failed.length,
        totalSizeBytes: totalSize,
        lastBackupAt: completed[0]?.completed_at || null
      });
    } catch (error) {
      console.warn('Error fetching backups (table may not exist):', error);
      setBackups([]);
    }
    setLoading(false);
  }, [selectedTenant]);

  // Fetch backup settings
  const fetchSettings = useCallback(async () => {
    try {
      // Fetch tenant-specific settings if selected
      if (selectedTenant !== 'all') {
        const { data: tenantSettings, error } = await supabase
          .from('backup_settings')
          .select('*')
          .eq('tenant_id', selectedTenant)
          .maybeSingle();

        // If error is 406 or table doesn't exist, just use defaults
        if (error && error.code !== 'PGRST116') {
          console.warn('backup_settings table may not exist yet:', error.message);
          return;
        }

        if (tenantSettings) {
          setSettings({
            autoBackupEnabled: tenantSettings.auto_backup_enabled,
            backupFrequency: tenantSettings.backup_frequency,
            backupTime: tenantSettings.backup_time?.slice(0, 5) || '03:00',
            retentionDays: tenantSettings.retention_days,
            includeMedia: tenantSettings.include_media,
            includeAuditLogs: tenantSettings.include_audit_logs,
            encryptBackups: tenantSettings.encrypt_backups,
            notifyOnComplete: tenantSettings.notify_on_complete,
            notifyOnFailure: tenantSettings.notify_on_failure,
          });
        }
      }
    } catch (error) {
      console.warn('Error fetching settings (table may not exist):', error);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchBackups();
    fetchSettings();
  }, [fetchBackups, fetchSettings]);

  // Save settings
  const saveSettings = async () => {
    if (selectedTenant === 'all') {
      toast.warning('Please select a specific tenant to save settings');
      return;
    }

    try {
      const { error } = await supabase
        .from('backup_settings')
        .upsert({
          tenant_id: selectedTenant,
          auto_backup_enabled: settings.autoBackupEnabled,
          backup_frequency: settings.backupFrequency,
          backup_time: settings.backupTime + ':00',
          retention_days: settings.retentionDays,
          include_media: settings.includeMedia,
          include_audit_logs: settings.includeAuditLogs,
          encrypt_backups: settings.encryptBackups,
          notify_on_complete: settings.notifyOnComplete,
          notify_on_failure: settings.notifyOnFailure,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' });

      if (error) throw error;
      setSettingsChanged(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  // Create manual backup
  const handleManualBackup = async () => {
    setBackupInProgress(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-management/backups`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
            ...(selectedTenant !== 'all' && { 'x-tenant-id': selectedTenant })
          },
          body: JSON.stringify({
            tenant_id: selectedTenant !== 'all' ? selectedTenant : null,
            type: 'manual',
            include_media: settings.includeMedia,
            description: 'Manual backup from developer portal'
          })
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Backup failed');
      }

      toast.success('Backup started! It will complete in the background.');
      
      // Refresh after a delay
      setTimeout(() => fetchBackups(), 3000);
    } catch (err) {
      console.error('Backup error:', err);
      toast.error(`Backup failed: ${err.message}`);
    } finally {
      setBackupInProgress(false);
    }
  };

  // Restore from backup
  const handleRestore = async (backupId) => {
    if (!confirm('WARNING: This will overwrite all current data. Are you sure you want to restore from this backup?')) {
      return;
    }
    if (!confirm('FINAL CONFIRMATION: All data created after this backup will be lost. Continue?')) {
      return;
    }
    
    setRestoreInProgress(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-management/backups/${backupId}/restore`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Restore failed');
      }

      toast.success('Restore completed successfully! Please refresh the application.');
    } catch (err) {
      console.error('Restore error:', err);
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setRestoreInProgress(false);
    }
  };

  // Download backup
  const handleDownload = async (backup) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-management/backups/${backup.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Download failed');
      }

      // Open download URL
      window.open(result.download_url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Download failed: ${err.message}`);
    }
  };

  // Delete backup
  const handleDelete = async (backupId) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-management/backups/${backupId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Delete failed');
      }

      toast.success('Backup deleted');
      fetchBackups();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTenantName = (tenantId) => {
    if (!tenantId) return 'System / Global';
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.name || tenant?.display_name || tenantId.slice(0, 8);
  };

  const updateSetting = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSettingsChanged(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Backup & Recovery</h1>
          <p className="text-gray-400 mt-1">Schedule backups and restore from previous snapshots</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={handleManualBackup}
            disabled={backupInProgress}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              backupInProgress 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {backupInProgress ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Backing up...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Create Backup Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tenant Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
          >
            <option value="all">All Tenants (Global)</option>
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name || tenant.display_name} {tenant.status !== 'active' ? `(${tenant.status})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Filter className="w-4 h-4" />
          <span>{selectedTenant === 'all' ? 'Showing all backups' : 'Filtered by tenant'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Last Backup</p>
              <p className="text-lg font-bold text-white">
                {stats.lastBackupAt ? formatDate(stats.lastBackupAt) : 'Never'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Archive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Backups</p>
              <p className="text-lg font-bold text-white">{stats.totalBackups}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Storage Used</p>
              <p className="text-lg font-bold text-white">{formatSize(stats.totalSizeBytes)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Failed Backups</p>
              <p className="text-lg font-bold text-white">{stats.failedBackups}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Settings className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Schedule Settings</h2>
            </div>
            {settingsChanged && (
              <button
                onClick={saveSettings}
                className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500"
              >
                Save
              </button>
            )}
          </div>

          {selectedTenant === 'all' && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
              Select a specific tenant to configure backup settings
            </div>
          )}

          <div className="space-y-4">
            {/* Auto Backup Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Automatic Backups</p>
                <p className="text-gray-500 text-sm">Run backups on schedule</p>
              </div>
              <button
                onClick={() => updateSetting('autoBackupEnabled', !settings.autoBackupEnabled)}
                disabled={selectedTenant === 'all'}
                className={clsx(
                  'w-12 h-6 rounded-full transition-colors relative',
                  settings.autoBackupEnabled ? 'bg-emerald-600' : 'bg-gray-700',
                  selectedTenant === 'all' && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className={clsx(
                  'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform',
                  settings.autoBackupEnabled ? 'translate-x-6' : 'translate-x-0.5'
                )} />
              </button>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
              <select
                value={settings.backupFrequency}
                onChange={(e) => updateSetting('backupFrequency', e.target.value)}
                disabled={selectedTenant === 'all'}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Backup Time</label>
              <input
                type="time"
                value={settings.backupTime}
                onChange={(e) => updateSetting('backupTime', e.target.value)}
                disabled={selectedTenant === 'all'}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            {/* Retention */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Retention Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.retentionDays}
                onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value))}
                disabled={selectedTenant === 'all'}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <div className="border-t border-gray-800 pt-4 mt-4 space-y-3">
              {/* Include Media */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includeMedia}
                  onChange={(e) => updateSetting('includeMedia', e.target.checked)}
                  disabled={selectedTenant === 'all'}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-gray-300">Include media files</span>
              </label>

              {/* Include Audit Logs */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.includeAuditLogs}
                  onChange={(e) => updateSetting('includeAuditLogs', e.target.checked)}
                  disabled={selectedTenant === 'all'}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-gray-300">Include audit logs</span>
              </label>

              {/* Encrypt Backups */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.encryptBackups}
                  onChange={(e) => updateSetting('encryptBackups', e.target.checked)}
                  disabled={selectedTenant === 'all'}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className="text-gray-300">Encrypt backups</span>
              </label>
            </div>
          </div>
        </div>

        {/* Backup History */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <History className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Backup History</h2>
            </div>
          </div>

          {restoreInProgress && (
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                <div>
                  <p className="text-yellow-400 font-medium">Restore in progress...</p>
                  <p className="text-yellow-400/70 text-sm">Please do not close this page.</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm mt-1">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {backups.map(backup => (
                <div
                  key={backup.id}
                  className={clsx(
                    'p-4 rounded-lg border transition-colors',
                    backup.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : backup.status === 'in_progress'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        backup.status === 'failed' ? 'bg-red-500/10' : 
                        backup.status === 'in_progress' ? 'bg-yellow-500/10' :
                        'bg-emerald-500/10'
                      )}>
                        {backup.status === 'failed' ? (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        ) : backup.status === 'in_progress' ? (
                          <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" />
                        ) : (
                          <Archive className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium">{backup.name}</p>
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs',
                            backup.type === 'manual'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-700 text-gray-400'
                          )}>
                            {backup.type}
                          </span>
                          {backup.tenant_id && (
                            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-400">
                              {getTenantName(backup.tenant_id)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(backup.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatSize(backup.size_bytes)}
                          </span>
                          {backup.status === 'completed' && (
                            <>
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {backup.tables_count} tables
                              </span>
                              <span>{(backup.records_count || 0).toLocaleString()} records</span>
                            </>
                          )}
                        </div>
                        {backup.status === 'failed' && (
                          <p className="text-red-400 text-sm mt-1">Error: {backup.error_message}</p>
                        )}
                      </div>
                    </div>

                    {backup.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(backup)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestore(backup.id)}
                          disabled={restoreInProgress}
                          className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Restore"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(backup.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Important Notice</p>
            <p className="text-yellow-400/70 text-sm mt-1">
              Restoring from a backup will overwrite all current data. This action cannot be undone.
              Make sure to create a backup of current data before restoring from an older backup.
              For point-in-time recovery of specific tables, contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupSettings;
