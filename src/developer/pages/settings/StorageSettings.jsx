import { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Folder,
  File,
  Image,
  FileVideo,
  FileAudio,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  MoreVertical,
  Upload,
  FolderOpen,
  X,
  Clock,
  Database,
  Building2,
  Settings,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../contexts/UnifiedTenantContext';
import { useToast } from '../../../hooks/useToast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const StorageSettings = () => {
  const toast = useToast();
  const { tenants } = useTenant();
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showInitBuckets, setShowInitBuckets] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [stats, setStats] = useState({
    totalSize: 0,
    totalFiles: 0,
    byType: {}
  });

  // Fetch storage buckets via edge function
  useEffect(() => {
    fetchBuckets();
  }, []);

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session for bucket listing');
        setBuckets([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/backup-management/buckets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching buckets:', response.status, errorText);
        setBuckets([]);
        setLoading(false);
        return;
      }

      const result = await response.json();
      const bucketList = result.buckets || [];
      setBuckets(bucketList);
      
      // Calculate stats from file counts
      let totalFiles = 0;
      for (const bucket of bucketList) {
        totalFiles += bucket.fileCount || 0;
      }
      setStats(prev => ({ ...prev, totalFiles }));
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
    setLoading(false);
  };

  const fetchFiles = async (bucketName) => {
    setLoading(true);
    try {
      const result = await callStorageApi(`/files/${encodeURIComponent(bucketName)}`);
      setFiles(result.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    }
    setLoading(false);
  };

  const createBucket = async () => {
    if (!newBucketName.trim()) return;
    
    try {
      const _result = await callBucketApi({ bucket_name: newBucketName.trim() });
      setNewBucketName('');
      setShowCreateBucket(false);
      fetchBuckets();
      toast.success(`Created bucket: ${newBucketName}`);
    } catch (error) {
      console.error('Error creating bucket:', error);
      toast.error(error.message);
    }
  };

  const deleteBucket = async (bucketName) => {
    if (!confirm(`Are you sure you want to delete bucket "${bucketName}"? This will delete all files in it.`)) return;
    
    try {
      await callStorageApi(`/buckets/${encodeURIComponent(bucketName)}`, 'DELETE');
      
      if (selectedBucket === bucketName) {
        setSelectedBucket(null);
        setFiles([]);
      }
      fetchBuckets();
      toast.success(`Deleted bucket: ${bucketName}`);
    } catch (error) {
      console.error('Error deleting bucket:', error);
      toast.error(error.message);
    }
  };

  const deleteFiles = async () => {
    if (!selectedBucket || selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} file(s)?`)) return;
    
    try {
      await callStorageApi(`/files/${encodeURIComponent(selectedBucket)}`, 'DELETE', { files: selectedFiles });
      
      setSelectedFiles([]);
      fetchFiles(selectedBucket);
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error(error.message);
    }
  };

  const cleanUnusedFiles = async () => {
    if (!confirm('This will scan for and remove orphaned files. Continue?')) return;
    
    // This would need backend logic to compare files against database references
    toast.warning('Clean unused files feature requires backend implementation to safely identify orphaned files.');
  };

  // Generic edge function API call helper
  const callStorageApi = async (path, method = 'GET', payload = null) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Failed to get session');
    }
    
    if (!session?.access_token) {
      console.error('No session found - user may need to re-login');
      throw new Error('Not authenticated - please refresh and login again');
    }
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
    };
    
    if (payload && (method === 'POST' || method === 'DELETE')) {
      options.body = JSON.stringify(payload);
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/backup-management${path}`, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Storage API error:', response.status, errorText);
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || `API error (${response.status})`);
      } catch (e) {
        if (e.message.includes('API error')) throw e;
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
    }
    
    return response.json();
  };

  // Legacy helper for bucket init
  const callBucketApi = async (payload) => {
    return callStorageApi('/buckets/init', 'POST', payload);
  };

  // Initialize system buckets (backups, dev-portal)
  const initSystemBuckets = async () => {
    try {
      const result = await callBucketApi({});
      const bucketList = result.buckets?.join(', ') || 'None (already exist)';
      toast.success(`Buckets: ${bucketList}`);
      fetchBuckets();
    } catch (err) {
      console.error('Error creating buckets:', err);
      toast.error('Error: ' + err.message);
    }
  };

  // Create tenant-specific bucket
  const createTenantBucket = async (tenantId) => {
    try {
      const result = await callBucketApi({ tenant_id: tenantId });
      const bucketList = result.buckets?.join(', ') || 'None (already exist)';
      toast.success(`Created: ${bucketList}`);
      fetchBuckets();
    } catch (err) {
      console.error('Error creating tenant bucket:', err);
      toast.error('Error: ' + err.message);
    }
  };

  // Create all missing tenant buckets
  const createAllTenantBuckets = async () => {
    try {
      const result = await callBucketApi({ create_all_tenant_buckets: true });
      const bucketList = result.buckets?.join(', ') || 'None (all already exist)';
      toast.success(`Created buckets: ${bucketList}`);
      if (result.errors?.length) {
        console.error('Bucket creation errors:', result.errors);
      }
      fetchBuckets();
    } catch (err) {
      console.error('Error creating tenant buckets:', err);
      toast.error('Error: ' + err.message);
    }
  };

  // Get tenant info from bucket name
  const getBucketTenantInfo = (bucketName) => {
    if (bucketName === 'backups') return { type: 'system', label: 'Backups', color: 'emerald' };
    if (bucketName === 'dev-portal') return { type: 'system', label: 'Dev Portal', color: 'blue' };
    if (bucketName.startsWith('tenant-')) {
      const slug = bucketName.replace('tenant-', '');
      const tenant = tenants.find(t => t.slug === slug);
      return { 
        type: 'tenant', 
        label: tenant?.name || tenant?.display_name || slug, 
        color: 'purple',
        tenantId: tenant?.id
      };
    }
    return { type: 'other', label: 'Other', color: 'gray' };
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return FileVideo;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return FileAudio;
    return File;
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Storage Management</h1>
          <p className="text-gray-400 mt-1">Manage file storage buckets and clean up unused files</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInitBuckets(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Init Buckets
          </button>
          <button
            onClick={cleanUnusedFiles}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clean Unused
          </button>
          <button
            onClick={() => setShowCreateBucket(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            New Bucket
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Buckets</p>
              <p className="text-xl font-bold text-white">{buckets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <File className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Files</p>
              <p className="text-xl font-bold text-white">{stats.totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Storage Used</p>
              <p className="text-xl font-bold text-white">{formatBytes(stats.totalSize)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Image className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Images</p>
              <p className="text-xl font-bold text-white">{files.filter(f => getFileIcon(f.name) === Image).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bucket List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-4">Buckets</h3>
          <div className="space-y-2">
            {loading && !buckets.length ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : buckets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">No buckets found</p>
                <button
                  onClick={initSystemBuckets}
                  className="text-emerald-400 text-sm hover:underline"
                >
                  Initialize system buckets
                </button>
              </div>
            ) : (
              buckets.map(bucket => {
                const info = getBucketTenantInfo(bucket.name);
                return (
                  <div
                    key={bucket.id}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group',
                      selectedBucket === bucket.name
                        ? 'bg-emerald-500/20 border border-emerald-500/30'
                        : 'bg-gray-800 hover:bg-gray-700'
                    )}
                    onClick={() => {
                      setSelectedBucket(bucket.name);
                      fetchFiles(bucket.name);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Folder className={clsx(
                          'w-4 h-4 flex-shrink-0',
                          selectedBucket === bucket.name ? 'text-emerald-400' : 'text-gray-400'
                        )} />
                        <span className="text-white text-sm truncate">{bucket.name}</span>
                      </div>
                      <div className="mt-1 ml-6">
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-xs',
                          info.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
                          info.color === 'blue' && 'bg-blue-500/10 text-blue-400',
                          info.color === 'purple' && 'bg-purple-500/10 text-purple-400',
                          info.color === 'gray' && 'bg-gray-500/10 text-gray-400'
                        )}>
                          {info.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBucket(bucket.name);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* File List */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          {selectedBucket ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">
                  Files in <span className="text-emerald-400">{selectedBucket}</span>
                </h3>
                <div className="flex items-center gap-2">
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={deleteFiles}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedFiles.length})
                    </button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <File className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No files in this bucket</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredFiles.map(file => {
                    const FileIcon = getFileIcon(file.name);
                    const isSelected = selectedFiles.includes(file.name);
                    
                    return (
                      <div
                        key={file.id}
                        className={clsx(
                          'flex items-center gap-4 p-3 rounded-lg transition-colors',
                          isSelected ? 'bg-emerald-500/20' : 'bg-gray-800 hover:bg-gray-700'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles([...selectedFiles, file.name]);
                            } else {
                              setSelectedFiles(selectedFiles.filter(f => f !== file.name));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <FileIcon className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{file.name}</p>
                          <p className="text-gray-500 text-xs">
                            {formatBytes(file.metadata?.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {new Date(file.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a bucket to view files</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Bucket Modal */}
      {showCreateBucket && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateBucket(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create New Bucket</h2>
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="bucket-name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-2">Only lowercase letters, numbers, and hyphens allowed</p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateBucket(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={createBucket}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Buckets Modal */}
      {showInitBuckets && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowInitBuckets(false)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Initialize Storage Buckets</h2>
                <button
                  onClick={() => setShowInitBuckets(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* System Buckets */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">System Buckets</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Database className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">backups</p>
                        <p className="text-gray-500 text-xs">Store tenant and system backups</p>
                      </div>
                    </div>
                    {buckets.find(b => b.name === 'backups') ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <span className="text-yellow-400 text-xs">Not created</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">dev-portal</p>
                        <p className="text-gray-500 text-xs">Developer portal assets</p>
                      </div>
                    </div>
                    {buckets.find(b => b.name === 'dev-portal') ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <span className="text-yellow-400 text-xs">Not created</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { initSystemBuckets(); setShowInitBuckets(false); }}
                  className="w-full mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  Create System Buckets
                </button>
              </div>

              {/* Tenant Buckets */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">Tenant Buckets</h3>
                  <button
                    onClick={createAllTenantBuckets}
                    className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-500"
                  >
                    Create All Missing
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tenants.map(tenant => {
                      const bucketName = `tenant-${tenant.slug}`;
                      const exists = buckets.find(b => b.name === bucketName);
                      return (
                        <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                              <Folder className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{bucketName}</p>
                              <p className="text-gray-500 text-xs">
                                {tenant.name || tenant.display_name}
                                {tenant.status !== 'active' && <span className="ml-1 text-yellow-400">({tenant.status})</span>}
                              </p>
                            </div>
                          </div>
                          {exists ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <button
                              onClick={() => createTenantBucket(tenant.id)}
                              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-500"
                            >
                              Create
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowInitBuckets(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageSettings;
