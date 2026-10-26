// supabase/functions/tenant-modules/index.ts
// Edge function for managing tenant module licenses AND module definitions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ModuleActivationPayload {
  tenant_id: string;
  module_id: string;
  trial_days?: number;
}

// Validate semver format (loose: major.minor.patch)
function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version);
}

// Compare semver: returns 1 if a > b, -1 if a < b, 0 if equal
function compareSemver(a: string, b: string): number {
  const pa = a.replace(/-.*$/, '').split('.').map(Number);
  const pb = b.replace(/-.*$/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

// Valid categories (matches DB CHECK constraint)
const VALID_CATEGORIES = ['core', 'clinical', 'financial', 'operations', 'marketing', 'integration', 'advanced'];
const VALID_STATUSES = ['development', 'beta', 'active', 'deprecated', 'retired'];
const VALID_TIERS = ['basic', 'professional', 'enterprise', 'unlimited'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const method = req.method;
    const url = new URL(req.url);
    // Routes: /tenant-modules?scope=modules for module-definition CRUD
    //         /tenant-modules (default) for tenant-module license management
    const scope = url.searchParams.get('scope');

    // ===================================================
    // MODULE DEFINITION CRUD (scope=modules)
    // ===================================================
    if (scope === 'modules') {
      switch (method) {
        case 'POST': {
          // ==== CREATE MODULE ====
          const payload = await req.json();

          // --- Validations ---
          if (!payload.slug || !payload.name_en) {
            throw new Error('slug and name_en are required');
          }
          if (!/^[a-z0-9-]+$/.test(payload.slug)) {
            throw new Error('slug must contain only lowercase letters, numbers, and hyphens');
          }
          if (payload.version && !isValidSemver(payload.version)) {
            throw new Error(`Invalid version format "${payload.version}". Use semver: major.minor.patch (e.g. 1.0.0)`);
          }
          if (payload.category && !VALID_CATEGORIES.includes(payload.category)) {
            throw new Error(`Invalid category "${payload.category}". Must be: ${VALID_CATEGORIES.join(', ')}`);
          }
          if (payload.status && !VALID_STATUSES.includes(payload.status)) {
            throw new Error(`Invalid status "${payload.status}". Must be: ${VALID_STATUSES.join(', ')}`);
          }
          if (payload.min_tier && !VALID_TIERS.includes(payload.min_tier)) {
            throw new Error(`Invalid min_tier "${payload.min_tier}". Must be: ${VALID_TIERS.join(', ')}`);
          }

          // Check slug uniqueness
          const { data: existingSlug } = await supabaseClient
            .from('modules')
            .select('id')
            .eq('slug', payload.slug)
            .maybeSingle();
          if (existingSlug) {
            throw new Error(`Module with slug "${payload.slug}" already exists`);
          }

          // Validate depends_on references exist
          if (payload.depends_on && Array.isArray(payload.depends_on) && payload.depends_on.length > 0) {
            const { data: depModules } = await supabaseClient
              .from('modules')
              .select('id')
              .in('id', payload.depends_on);
            const foundIds = (depModules || []).map((m: any) => m.id);
            const missing = payload.depends_on.filter((id: string) => !foundIds.includes(id));
            if (missing.length > 0) {
              throw new Error(`depends_on references non-existent module IDs: ${missing.join(', ')}`);
            }
          }

          // Validate conflicts_with references exist
          if (payload.conflicts_with && Array.isArray(payload.conflicts_with) && payload.conflicts_with.length > 0) {
            const { data: conflictModules } = await supabaseClient
              .from('modules')
              .select('id')
              .in('id', payload.conflicts_with);
            const foundIds = (conflictModules || []).map((m: any) => m.id);
            const missing = payload.conflicts_with.filter((id: string) => !foundIds.includes(id));
            if (missing.length > 0) {
              throw new Error(`conflicts_with references non-existent module IDs: ${missing.join(', ')}`);
            }
          }

          // --- Insert ---
          const { data: newModule, error: createError } = await supabaseClient
            .from('modules')
            .insert({
              slug: payload.slug,
              name_en: payload.name_en,
              name_ar: payload.name_ar || null,
              description_en: payload.description_en || null,
              description_ar: payload.description_ar || null,
              category: payload.category || 'core',
              is_free: payload.is_free ?? true,
              base_price_monthly: payload.is_free ? 0 : (parseFloat(payload.base_price_monthly) || 0),
              base_price_yearly: payload.is_free ? 0 : (parseFloat(payload.base_price_yearly) || 0),
              min_tier: payload.min_tier || 'basic',
              version: payload.version || '1.0.0',
              status: payload.status || 'active',
              is_visible: payload.is_visible ?? true,
              entry_point: payload.entry_point || null,
              documentation_url: payload.documentation_url || null,
              depends_on: payload.depends_on || null,
              conflicts_with: payload.conflicts_with || null,
              icon: payload.icon || null,
              color: payload.color || null,
              changelog: [{ version: payload.version || '1.0.0', date: new Date().toISOString().split('T')[0], changes: ['Module created'] }],
            })
            .select()
            .single();

          if (createError) throw createError;

          // Audit log
          await supabaseClient.from('saas_audit_trail').insert({
            actor_id: user.id,
            action: 'module.created',
            resource_type: 'module',
            resource_id: newModule.id,
            description: `Module ${payload.slug} created`,
            metadata: { slug: payload.slug, name_en: payload.name_en, version: newModule.version },
          }).catch(() => {}); // Non-blocking

          return new Response(JSON.stringify(newModule), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          });
        }

        case 'PUT': {
          // ==== UPDATE MODULE (including version bump) ====
          const payload = await req.json();
          const moduleId = payload.id;
          if (!moduleId) throw new Error('Module id is required');

          // Get current module state
          const { data: current, error: fetchErr } = await supabaseClient
            .from('modules')
            .select('*')
            .eq('id', moduleId)
            .single();
          if (fetchErr || !current) throw new Error('Module not found');

          // --- Validation ---
          if (payload.version) {
            if (!isValidSemver(payload.version)) {
              throw new Error(`Invalid version format "${payload.version}". Use semver: major.minor.patch`);
            }
            // Prevent version downgrade
            if (compareSemver(payload.version, current.version || '0.0.0') < 0) {
              throw new Error(`Cannot downgrade version from ${current.version} to ${payload.version}. Only equal or higher versions are allowed.`);
            }
          }
          if (payload.category && !VALID_CATEGORIES.includes(payload.category)) {
            throw new Error(`Invalid category "${payload.category}". Must be: ${VALID_CATEGORIES.join(', ')}`);
          }
          if (payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
            throw new Error(`Invalid status "${payload.status}". Must be: ${VALID_STATUSES.join(', ')}`);
          }
          if (payload.min_tier && !VALID_TIERS.includes(payload.min_tier)) {
            throw new Error(`Invalid min_tier "${payload.min_tier}".`);
          }

          // Prevent slug change if tenant_modules reference this module
          if (payload.slug && payload.slug !== current.slug) {
            const { count } = await supabaseClient
              .from('tenant_modules')
              .select('id', { count: 'exact', head: true })
              .eq('module_id', moduleId);
            if ((count || 0) > 0) {
              throw new Error(`Cannot change slug: ${count} tenant(s) have this module installed. Slug is an identity field.`);
            }
          }

          // Prevent retiring/deprecating if active tenants use it
          if (payload.status === 'retired') {
            const { count } = await supabaseClient
              .from('tenant_modules')
              .select('id', { count: 'exact', head: true })
              .eq('module_id', moduleId)
              .in('status', ['active', 'trial']);
            if ((count || 0) > 0) {
              throw new Error(`Cannot retire module: ${count} tenant(s) still have it active. Deactivate them first.`);
            }
          }

          // Validate depends_on if changed
          if (payload.depends_on && Array.isArray(payload.depends_on) && payload.depends_on.length > 0) {
            // Cannot depend on itself
            if (payload.depends_on.includes(moduleId)) {
              throw new Error('A module cannot depend on itself');
            }
            const { data: depModules } = await supabaseClient
              .from('modules')
              .select('id')
              .in('id', payload.depends_on);
            const foundIds = (depModules || []).map((m: any) => m.id);
            const missing = payload.depends_on.filter((id: string) => !foundIds.includes(id));
            if (missing.length > 0) {
              throw new Error(`depends_on references non-existent module IDs: ${missing.join(', ')}`);
            }
          }

          // Build update payload (only changed fields)
          const updates: Record<string, any> = {};
          const changedFields: string[] = [];
          const allowedFields = [
            'name_en', 'name_ar', 'description_en', 'description_ar',
            'category', 'is_free', 'base_price_monthly', 'base_price_yearly',
            'min_tier', 'version', 'status', 'is_visible', 'entry_point',
            'documentation_url', 'depends_on', 'conflicts_with', 'icon', 'color',
            'routes', 'permissions_required', 'slug',
          ];
          for (const field of allowedFields) {
            if (payload[field] !== undefined && payload[field] !== current[field]) {
              updates[field] = payload[field];
              changedFields.push(field);
            }
          }

          if (changedFields.length === 0) {
            // Nothing changed, return current
            return new Response(JSON.stringify(current), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Auto-update changelog if version is bumped
          if (updates.version && updates.version !== current.version) {
            const existingChangelog = Array.isArray(current.changelog) ? current.changelog : [];
            const changeNotes = payload.changelog_notes || `Updated to v${updates.version}`;
            const newEntry = {
              version: updates.version,
              date: new Date().toISOString().split('T')[0],
              changes: Array.isArray(changeNotes) ? changeNotes : [changeNotes],
            };
            updates.changelog = [newEntry, ...existingChangelog];
          }

          // Apply update
          const { data: updated, error: updateErr } = await supabaseClient
            .from('modules')
            .update(updates)
            .eq('id', moduleId)
            .select()
            .single();

          if (updateErr) throw updateErr;

          // Audit log
          await supabaseClient.from('saas_audit_trail').insert({
            actor_id: user.id,
            action: updates.version ? 'module.version_updated' : 'module.updated',
            resource_type: 'module',
            resource_id: moduleId,
            description: `Module updated: ${changedFields.join(', ')}`,
            metadata: {
              fields_changed: changedFields,
              old_version: current.version,
              new_version: updates.version || current.version,
            },
          }).catch(() => {});

          return new Response(JSON.stringify(updated), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'DELETE': {
          // ==== DELETE MODULE ====
          const payload = await req.json();
          const moduleId = payload.id;
          if (!moduleId) throw new Error('Module id is required');

          // Safety: prevent deleting modules that tenants use
          const { count: activeCount } = await supabaseClient
            .from('tenant_modules')
            .select('id', { count: 'exact', head: true })
            .eq('module_id', moduleId);

          if ((activeCount || 0) > 0) {
            throw new Error(
              `Cannot delete module: ${activeCount} tenant assignment(s) exist. ` +
              `Remove all tenant_modules references first, or set status to "retired" instead.`
            );
          }

          // Check if other modules depend on this one
          const { data: dependents } = await supabaseClient
            .from('modules')
            .select('slug, depends_on')
            .not('depends_on', 'is', null);

          const dependentSlugs = (dependents || [])
            .filter((m: any) => Array.isArray(m.depends_on) && m.depends_on.includes(moduleId))
            .map((m: any) => m.slug);

          if (dependentSlugs.length > 0) {
            throw new Error(
              `Cannot delete module: other modules depend on it: ${dependentSlugs.join(', ')}. ` +
              `Remove the dependency first.`
            );
          }

          // Get module info for audit before deleting
          const { data: moduleInfo } = await supabaseClient
            .from('modules')
            .select('slug, name_en')
            .eq('id', moduleId)
            .single();

          const { error: deleteErr } = await supabaseClient
            .from('modules')
            .delete()
            .eq('id', moduleId);

          if (deleteErr) throw deleteErr;

          // Audit log
          await supabaseClient.from('saas_audit_trail').insert({
            actor_id: user.id,
            action: 'module.deleted',
            resource_type: 'module',
            resource_id: moduleId,
            description: `Module ${moduleInfo?.slug} deleted`,
            metadata: { slug: moduleInfo?.slug, name_en: moduleInfo?.name_en },
          }).catch(() => {});

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        default:
          return new Response(JSON.stringify({ error: 'Method not allowed for scope=modules' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
          });
      }
    }

    // ===================================================
    // TENANT-MODULE LICENSE MANAGEMENT (default scope)
    // ===================================================

    switch (method) {
      case 'GET': {
        // Get tenant modules
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenant_id');

        if (!tenantId) {
          // Return all modules with tenant activation status
          const { data: modules, error } = await supabaseClient
            .from('modules')
            .select(`
              *,
              tenant_modules (
                tenant_id,
                status,
                enabled_at,
                expires_at,
                trial_ends_at
              )
            `)
            .eq('is_visible', true)
            .order('category');

          if (error) throw error;
          return new Response(JSON.stringify({ modules }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Return modules for specific tenant
        const { data: tenantModules, error } = await supabaseClient
          .from('tenant_modules')
          .select(`
            *,
            modules (*)
          `)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        return new Response(JSON.stringify({ tenantModules }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        // Activate module for tenant
        const payload: ModuleActivationPayload = await req.json();

        if (!payload.tenant_id || !payload.module_id) {
          throw new Error('tenant_id and module_id are required');
        }

        // Fetch the module definition to check dependencies & conflicts
        const { data: moduleDef, error: modErr } = await supabaseClient
          .from('modules')
          .select('id, slug, name_en, depends_on, conflicts_with, status')
          .eq('id', payload.module_id)
          .single();

        if (modErr || !moduleDef) {
          throw new Error('Module not found');
        }
        if (moduleDef.status === 'retired') {
          throw new Error(`Module "${moduleDef.name_en}" is retired and cannot be activated`);
        }

        // Check if module is already active
        const { data: existing } = await supabaseClient
          .from('tenant_modules')
          .select('id, status')
          .eq('tenant_id', payload.tenant_id)
          .eq('module_id', payload.module_id)
          .single();

        if (existing && existing.status === 'active') {
          throw new Error('Module is already active for this tenant');
        }

        // --- Dependency check: all depends_on modules must be active for this tenant ---
        if (moduleDef.depends_on && Array.isArray(moduleDef.depends_on) && moduleDef.depends_on.length > 0) {
          const { data: activeDeps } = await supabaseClient
            .from('tenant_modules')
            .select('module_id')
            .eq('tenant_id', payload.tenant_id)
            .in('module_id', moduleDef.depends_on)
            .in('status', ['active', 'trial']);

          const activeDepIds = (activeDeps || []).map((d: any) => d.module_id);
          const missingDeps = moduleDef.depends_on.filter((id: string) => !activeDepIds.includes(id));

          if (missingDeps.length > 0) {
            // Resolve missing dep names for user-friendly error
            const { data: missingModules } = await supabaseClient
              .from('modules')
              .select('slug, name_en')
              .in('id', missingDeps);
            const names = (missingModules || []).map((m: any) => m.name_en || m.slug).join(', ');
            throw new Error(
              `Cannot activate: required dependency module(s) not active for this tenant: ${names}. ` +
              `Activate them first.`
            );
          }
        }

        // --- Conflict check: conflicts_with modules must NOT be active ---
        if (moduleDef.conflicts_with && Array.isArray(moduleDef.conflicts_with) && moduleDef.conflicts_with.length > 0) {
          const { data: activeConflicts } = await supabaseClient
            .from('tenant_modules')
            .select('module_id')
            .eq('tenant_id', payload.tenant_id)
            .in('module_id', moduleDef.conflicts_with)
            .in('status', ['active', 'trial']);

          if (activeConflicts && activeConflicts.length > 0) {
            const conflictIds = activeConflicts.map((c: any) => c.module_id);
            const { data: conflictModules } = await supabaseClient
              .from('modules')
              .select('slug, name_en')
              .in('id', conflictIds);
            const names = (conflictModules || []).map((m: any) => m.name_en || m.slug).join(', ');
            throw new Error(
              `Cannot activate: conflicts with currently active module(s): ${names}. ` +
              `Deactivate the conflicting module first.`
            );
          }
        }

        const now = new Date();
        const insertData: any = {
          tenant_id: payload.tenant_id,
          module_id: payload.module_id,
          enabled_at: now.toISOString(),
        };

        // If trial days specified, set up trial
        if (payload.trial_days) {
          const trialEnd = new Date(now.getTime() + payload.trial_days * 24 * 60 * 60 * 1000);
          insertData.status = 'trial';
          insertData.trial_ends_at = trialEnd.toISOString();
        } else {
          insertData.status = 'active';
        }

        let result;
        if (existing) {
          // Reactivate
          const { data, error } = await supabaseClient
            .from('tenant_modules')
            .update(insertData)
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          result = data;
        } else {
          // New activation
          const { data, error } = await supabaseClient
            .from('tenant_modules')
            .insert(insertData)
            .select()
            .single();
          if (error) throw error;
          result = data;
        }

        // Log the action
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: payload.tenant_id,
          actor_id: user.id,
          action: payload.trial_days ? 'module.trial_started' : 'module.activated',
          resource_type: 'tenant_module',
          resource_id: result.id,
          description: `Module ${payload.module_id} activated`,
          metadata: { module_id: payload.module_id, trial_days: payload.trial_days },
        });

        return new Response(JSON.stringify({ tenantModule: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'PUT': {
        // Update module status (extend trial, change status)
        const { id, ...updates } = await req.json();

        if (!id) {
          throw new Error('tenant_module id is required');
        }

        const { data: tenantModule, error } = await supabaseClient
          .from('tenant_modules')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            modules (name_en)
          `)
          .single();

        if (error) throw error;

        // Log the action
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: tenantModule.tenant_id,
          actor_id: user.id,
          action: 'module.updated',
          resource_type: 'tenant_module',
          resource_id: id,
          description: 'Tenant module updated',
          metadata: updates,
        });

        return new Response(JSON.stringify({ tenantModule }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        // Deactivate module
        const { tenant_id, module_id } = await req.json();

        if (!tenant_id || !module_id) {
          throw new Error('tenant_id and module_id are required');
        }

        const { data: tenantModule, error } = await supabaseClient
          .from('tenant_modules')
          .update({
            status: 'inactive',
            disabled_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenant_id)
          .eq('module_id', module_id)
          .select()
          .single();

        if (error) throw error;

        // Log the action
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id,
          actor_id: user.id,
          action: 'module.deactivated',
          resource_type: 'tenant_module',
          resource_id: tenantModule.id,
          description: `Module ${module_id} deactivated`,
          metadata: { module_id },
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
