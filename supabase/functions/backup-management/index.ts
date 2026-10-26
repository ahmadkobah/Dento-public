// Backup Management Edge Function
// Handles backup creation, restoration, and management for tenants

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Tables to backup for each tenant
const TENANT_BACKUP_TABLES = [
  'patients',
  'appointments',
  'treatments',
  'invoices',
  'payments',
  'doctors',
  'services',
  'service_categories',
  'medical_history',
  'prescriptions',
  'dental_charts',
  'branches',
  'site_settings',
  'team_members',
  'testimonials',
  'portfolio_cases',
]

// System tables for dev portal backup
const SYSTEM_BACKUP_TABLES = [
  'tenants',
  'tenant_users',
  'tenant_modules',
  'modules',
  'api_keys',
  'feature_flags',
  'backup_settings',
]

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role for backup operations
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const url = new URL(req.url)
    const path = url.pathname.replace('/backup-management', '')
    const method = req.method

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ 
        error: 'Invalid token', 
        details: authError?.message || 'User not found'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user is developer
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isDeveloper = userData?.role === 'developer'
    const tenantId = req.headers.get('x-tenant-id')

    // Route handling
    switch (true) {
      // GET /backups - List backups
      case method === 'GET' && (path === '' || path === '/' || path === '/backups'): {
        let query = supabase
          .from('backups')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (!isDeveloper && tenantId) {
          query = query.eq('tenant_id', tenantId)
        } else if (url.searchParams.get('tenant_id')) {
          query = query.eq('tenant_id', url.searchParams.get('tenant_id'))
        }

        const { data, error } = await query
        if (error) throw error

        return new Response(JSON.stringify({ backups: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // POST /backups - Create new backup
      case method === 'POST' && (path === '' || path === '/' || path === '/backups'): {
        const body = await req.json()
        const targetTenantId = body.tenant_id || tenantId

        if (!targetTenantId && !isDeveloper) {
          return new Response(JSON.stringify({ error: 'Tenant ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Check if tenant has backup module enabled (if not developer)
        if (!isDeveloper && targetTenantId) {
          const { data: moduleData } = await supabase
            .from('tenant_modules')
            .select('is_active')
            .eq('tenant_id', targetTenantId)
            .eq('module_key', 'backup')
            .single()

          if (!moduleData?.is_active) {
            return new Response(JSON.stringify({ 
              error: 'Backup module not enabled for this tenant',
              code: 'MODULE_NOT_ENABLED'
            }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }

        // Get tenant info for bucket naming
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug, name')
          .eq('id', targetTenantId)
          .single()

        const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        const storagePath = targetTenantId 
          ? `tenants/${targetTenantId}/${backupName}`
          : `system/${backupName}`

        // Create backup record
        const { data: backupRecord, error: insertError } = await supabase
          .from('backups')
          .insert({
            tenant_id: targetTenantId || null,
            name: backupName,
            description: body.description || `${body.type === 'automatic' ? 'Automatic' : 'Manual'} backup`,
            type: body.type || 'manual',
            status: 'in_progress',
            storage_bucket: 'backups',
            storage_path: storagePath,
            started_at: new Date().toISOString(),
            created_by: user.id,
            metadata: { 
              tenant_slug: tenant?.slug,
              tenant_name: tenant?.name,
              include_media: body.include_media || false
            }
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Perform backup in background
        const backupPromise = performBackup(supabase, backupRecord.id, targetTenantId, body.include_media)
        
        // Don't await - let it run in background
        backupPromise.catch(err => console.error('Backup failed:', err))

        return new Response(JSON.stringify({ 
          message: 'Backup started',
          backup: backupRecord 
        }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // GET /backups/:id - Get backup details
      case method === 'GET' && path.match(/^\/backups\/[a-f0-9-]+$/): {
        const backupId = path.split('/').pop()
        
        const { data, error } = await supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()

        if (error) throw error
        if (!data) {
          return new Response(JSON.stringify({ error: 'Backup not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ backup: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // GET /backups/:id/download - Download backup file
      case method === 'GET' && path.match(/^\/backups\/[a-f0-9-]+\/download$/): {
        const backupId = path.split('/')[2]
        
        const { data: backup, error } = await supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()

        if (error || !backup) {
          return new Response(JSON.stringify({ error: 'Backup not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (backup.status !== 'completed') {
          return new Response(JSON.stringify({ error: 'Backup not ready' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Generate signed URL for download
        const { data: signedUrl, error: urlError } = await supabase
          .storage
          .from(backup.storage_bucket)
          .createSignedUrl(backup.storage_path, 3600) // 1 hour expiry

        if (urlError) throw urlError

        return new Response(JSON.stringify({ download_url: signedUrl.signedUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // POST /backups/:id/restore - Restore from backup
      case method === 'POST' && path.match(/^\/backups\/[a-f0-9-]+\/restore$/): {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Only developers can restore backups' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const backupId = path.split('/')[2]
        const body = await req.json()
        
        const { data: backup, error } = await supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()

        if (error || !backup || backup.status !== 'completed') {
          return new Response(JSON.stringify({ error: 'Valid completed backup not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Download and restore backup
        const restoreResult = await performRestore(supabase, backup, body.tables || null)

        return new Response(JSON.stringify({ 
          message: 'Restore completed',
          result: restoreResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // DELETE /backups/:id - Delete backup
      case method === 'DELETE' && path.match(/^\/backups\/[a-f0-9-]+$/): {
        const backupId = path.split('/').pop()
        
        const { data: backup, error: fetchError } = await supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()

        if (fetchError || !backup) {
          return new Response(JSON.stringify({ error: 'Backup not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Delete from storage
        if (backup.storage_path) {
          await supabase.storage
            .from(backup.storage_bucket)
            .remove([backup.storage_path])
        }

        // Delete record
        const { error } = await supabase
          .from('backups')
          .delete()
          .eq('id', backupId)

        if (error) throw error

        return new Response(JSON.stringify({ message: 'Backup deleted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // GET /settings - Get backup settings
      case method === 'GET' && path === '/settings': {
        if (isDeveloper) {
          // Return all tenant settings plus dev settings
          const { data: tenantSettings } = await supabase
            .from('backup_settings')
            .select('*, tenant:tenants(id, name, slug)')
          
          const { data: devSettings } = await supabase
            .from('dev_backup_settings')
            .select('*')

          return new Response(JSON.stringify({ 
            tenant_settings: tenantSettings || [],
            dev_settings: devSettings || []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else if (tenantId) {
          const { data } = await supabase
            .from('backup_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()

          return new Response(JSON.stringify({ settings: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ error: 'Tenant ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // PUT /settings - Update backup settings
      case method === 'PUT' && path === '/settings': {
        const body = await req.json()
        const targetTenantId = body.tenant_id || tenantId

        if (!targetTenantId) {
          return new Response(JSON.stringify({ error: 'Tenant ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabase
          .from('backup_settings')
          .upsert({
            tenant_id: targetTenantId,
            auto_backup_enabled: body.auto_backup_enabled,
            backup_frequency: body.backup_frequency,
            backup_time: body.backup_time,
            retention_days: body.retention_days,
            include_media: body.include_media,
            include_audit_logs: body.include_audit_logs,
            encrypt_backups: body.encrypt_backups,
            notify_on_complete: body.notify_on_complete,
            notify_on_failure: body.notify_on_failure,
            notification_email: body.notification_email,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id' })
          .select()
          .single()

        if (error) throw error

        return new Response(JSON.stringify({ settings: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // GET /buckets - List all storage buckets
      case method === 'GET' && path === '/buckets': {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Developer access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: bucketList, error: listError } = await supabase.storage.listBuckets()
        
        if (listError) {
          console.error('Error listing buckets:', listError)
          return new Response(JSON.stringify({ error: listError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get file count for each bucket
        const bucketsWithStats = await Promise.all(
          (bucketList || []).map(async (bucket) => {
            try {
              const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 })
              return {
                ...bucket,
                fileCount: files?.length || 0
              }
            } catch {
              return { ...bucket, fileCount: 0 }
            }
          })
        )

        return new Response(JSON.stringify({ buckets: bucketsWithStats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // POST /buckets/init - Initialize storage buckets for tenant
      case method === 'POST' && path === '/buckets/init': {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Developer access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const body = await req.json()
        const buckets: string[] = []
        const errors: string[] = []

        // Create a custom bucket if bucket_name provided
        if (body.bucket_name) {
          try {
            await supabase.storage.createBucket(body.bucket_name, { 
              public: false,
              fileSizeLimit: 52428800 // 50MB
            })
            buckets.push(body.bucket_name)
          } catch (e: any) {
            if (e?.message?.includes('already exists')) {
              return new Response(JSON.stringify({ error: 'Bucket already exists' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }
            errors.push(`${body.bucket_name}: ${e?.message}`)
          }
          
          return new Response(JSON.stringify({ 
            message: 'Bucket created',
            buckets,
            errors: errors.length > 0 ? errors : undefined
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Create main backups bucket if not exists
        try {
          await supabase.storage.createBucket('backups', { public: false })
          buckets.push('backups')
        } catch (e: any) {
          if (!e?.message?.includes('already exists')) {
            errors.push(`backups: ${e?.message}`)
          }
        }

        // Create dev-portal bucket
        try {
          await supabase.storage.createBucket('dev-portal', { public: false })
          buckets.push('dev-portal')
        } catch (e: any) {
          if (!e?.message?.includes('already exists')) {
            errors.push(`dev-portal: ${e?.message}`)
          }
        }

        // Create tenant-specific bucket if tenant_id provided
        if (body.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', body.tenant_id)
            .single()

          if (tenant?.slug) {
            const tenantBucket = `tenant-${tenant.slug}`
            try {
              await supabase.storage.createBucket(tenantBucket, { 
                public: false,
                fileSizeLimit: 52428800 // 50MB
              })
              buckets.push(tenantBucket)
            } catch (e: any) {
              if (!e?.message?.includes('already exists')) {
                errors.push(`${tenantBucket}: ${e?.message}`)
              }
            }
          }
        }

        // Create buckets for ALL active tenants if requested
        if (body.create_all_tenant_buckets) {
          const { data: allTenants } = await supabase
            .from('tenants')
            .select('id, slug, status')

          for (const tenant of allTenants || []) {
            if (!tenant?.slug) continue
            const tenantBucket = `tenant-${tenant.slug}`
            try {
              await supabase.storage.createBucket(tenantBucket, { 
                public: false,
                fileSizeLimit: 52428800 // 50MB
              })
              buckets.push(tenantBucket)
            } catch (e: any) {
              if (!e?.message?.includes('already exists')) {
                errors.push(`${tenantBucket}: ${e?.message}`)
              }
            }
          }
        }

        return new Response(JSON.stringify({ 
          message: 'Buckets initialized',
          buckets,
          errors: errors.length > 0 ? errors : undefined
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // GET /stats - Get backup statistics
      case method === 'GET' && path === '/stats': {
        const targetTenantId = url.searchParams.get('tenant_id') || tenantId

        if (targetTenantId) {
          const { data } = await supabase.rpc('get_tenant_backup_stats', { 
            p_tenant_id: targetTenantId 
          })
          return new Response(JSON.stringify({ stats: data?.[0] || {} }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Global stats for developers
        if (isDeveloper) {
          const { data: backups } = await supabase
            .from('backups')
            .select('status, size_bytes')

          const stats = {
            total_backups: backups?.length || 0,
            successful_backups: backups?.filter(b => b.status === 'completed').length || 0,
            failed_backups: backups?.filter(b => b.status === 'failed').length || 0,
            total_size_bytes: backups?.reduce((sum, b) => sum + (b.size_bytes || 0), 0) || 0
          }

          return new Response(JSON.stringify({ stats }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ error: 'Tenant ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // DELETE /buckets/:name - Delete a bucket (developer only)
      case method === 'DELETE' && path.startsWith('/buckets/'): {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Developer access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const bucketName = path.replace('/buckets/', '')
        if (!bucketName) {
          return new Response(JSON.stringify({ error: 'Bucket name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        try {
          // First empty the bucket
          const { data: files } = await supabase.storage.from(bucketName).list('', { limit: 1000 })
          if (files?.length) {
            const filePaths = files.map(f => f.name)
            await supabase.storage.from(bucketName).remove(filePaths)
          }

          // Then delete the bucket
          const { error: deleteError } = await supabase.storage.deleteBucket(bucketName)
          if (deleteError) throw deleteError

          return new Response(JSON.stringify({ message: `Bucket ${bucketName} deleted` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (e: any) {
          console.error('Error deleting bucket:', e)
          return new Response(JSON.stringify({ error: e?.message || 'Failed to delete bucket' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // GET /files/:bucketName - List files in a bucket
      case method === 'GET' && path.startsWith('/files/'): {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Developer access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const bucketName = path.replace('/files/', '')
        if (!bucketName) {
          return new Response(JSON.stringify({ error: 'Bucket name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const folder = url.searchParams.get('folder') || ''
        const limit = parseInt(url.searchParams.get('limit') || '100')

        try {
          const { data: files, error } = await supabase.storage.from(bucketName).list(folder, {
            limit,
            sortBy: { column: 'created_at', order: 'desc' }
          })

          if (error) throw error

          return new Response(JSON.stringify({ files: files || [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (e: any) {
          console.error('Error listing files:', e)
          return new Response(JSON.stringify({ error: e?.message || 'Failed to list files' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // DELETE /files/:bucketName - Delete files from a bucket
      case method === 'DELETE' && path.startsWith('/files/'): {
        if (!isDeveloper) {
          return new Response(JSON.stringify({ error: 'Developer access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const bucketName = path.replace('/files/', '')
        if (!bucketName) {
          return new Response(JSON.stringify({ error: 'Bucket name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const body = await req.json()
        const filePaths = body.files as string[]
        
        if (!filePaths || filePaths.length === 0) {
          return new Response(JSON.stringify({ error: 'File paths required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        try {
          const { error } = await supabase.storage.from(bucketName).remove(filePaths)
          if (error) throw error

          return new Response(JSON.stringify({ 
            message: `Deleted ${filePaths.length} file(s)`,
            deleted: filePaths 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (e: any) {
          console.error('Error deleting files:', e)
          return new Response(JSON.stringify({ error: e?.message || 'Failed to delete files' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('Backup management error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Perform the actual backup
async function performBackup(
  supabase: any, 
  backupId: string, 
  tenantId: string | null,
  includeMedia: boolean
) {
  const backupData: Record<string, any[]> = {}
  let totalRecords = 0
  let tablesCount = 0

  try {
    const tablesToBackup = tenantId ? TENANT_BACKUP_TABLES : SYSTEM_BACKUP_TABLES

    for (const table of tablesToBackup) {
      try {
        let query = supabase.from(table).select('*')
        
        // Filter by tenant for tenant-specific backups
        if (tenantId) {
          query = query.eq('tenant_id', tenantId)
        }

        const { data, error } = await query
        
        if (!error && data) {
          backupData[table] = data
          totalRecords += data.length
          tablesCount++
        }
      } catch (e) {
        console.warn(`Skipping table ${table}:`, e)
      }
    }

    // Create JSON backup
    const backupJson = JSON.stringify({
      version: '1.0',
      created_at: new Date().toISOString(),
      tenant_id: tenantId,
      tables: backupData,
      metadata: {
        tables_count: tablesCount,
        records_count: totalRecords,
        include_media: includeMedia
      }
    }, null, 2)

    // Get storage path from backup record
    const { data: backup } = await supabase
      .from('backups')
      .select('storage_path, storage_bucket')
      .eq('id', backupId)
      .single()

    // Upload to storage
    const { error: uploadError } = await supabase
      .storage
      .from(backup.storage_bucket)
      .upload(backup.storage_path, backupJson, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Update backup record with success
    await supabase
      .from('backups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        tables_count: tablesCount,
        records_count: totalRecords,
        size_bytes: new TextEncoder().encode(backupJson).length
      })
      .eq('id', backupId)

    return { success: true, tables: tablesCount, records: totalRecords }

  } catch (error) {
    console.error('Backup error:', error)
    
    // Update backup record with failure
    await supabase
      .from('backups')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', backupId)

    throw error
  }
}

// Perform restore from backup
async function performRestore(
  supabase: any, 
  backup: any,
  tablesToRestore: string[] | null
) {
  // Download backup file
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from(backup.storage_bucket)
    .download(backup.storage_path)

  if (downloadError) throw downloadError

  const backupContent = JSON.parse(await fileData.text())
  const results: Record<string, { restored: number; errors: number }> = {}

  const tables = tablesToRestore || Object.keys(backupContent.tables)

  for (const table of tables) {
    const tableData = backupContent.tables[table]
    if (!tableData || !Array.isArray(tableData)) continue

    results[table] = { restored: 0, errors: 0 }

    for (const record of tableData) {
      try {
        // Upsert each record
        const { error } = await supabase
          .from(table)
          .upsert(record, { onConflict: 'id' })

        if (error) {
          results[table].errors++
        } else {
          results[table].restored++
        }
      } catch (e) {
        results[table].errors++
      }
    }
  }

  return results
}
