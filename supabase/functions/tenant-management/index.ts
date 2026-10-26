// supabase/functions/tenant-management/index.ts
// Edge function for tenant management operations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface TenantCreatePayload {
  name: string;
  slug: string;
  display_name?: string;
  subdomain?: string;
  plan_id?: string;
  subscription_plan?: string;
  owner_name?: string;
  owner_email: string;
  owner_password?: string;
  owner_phone?: string;
  contact_name?: string; // Legacy support
  contact_email?: string; // Legacy support
  contact_phone?: string; // Legacy support
  address_line1?: string;
  city?: string;
  state?: string;
  country_code?: string;
  currency?: string;
  currency_code?: string;
  timezone?: string;
  max_users?: number;
  max_patients?: number;
  max_branches?: number;
  status?: string;
  modules?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Authenticate user - service role key bypass REMOVED for security
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new Error('Unauthorized');
    }
    const user = authData.user;

    // Verify developer or admin role
    const { data: profile } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['developer', 'admin'].includes(profile.role)) {
      throw new Error('Only developers and admins can manage tenants');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const method = req.method;

    // Route handling
    switch (`${method} ${path}`) {
      case 'GET tenant-management': {
        // Check for single tenant request
        const tenantId = url.searchParams.get('id');
        const getStats = url.searchParams.get('stats');

        if (getStats === 'true') {
          // Return tenant stats
          const { data: tenants } = await supabaseClient
            .from('tenants')
            .select('id, status');
          
          const stats = {
            total: tenants?.length || 0,
            active: tenants?.filter(t => t.status === 'active').length || 0,
            trial: tenants?.filter(t => t.status === 'trial').length || 0,
            suspended: tenants?.filter(t => t.status === 'suspended').length || 0,
          };
          
          return new Response(JSON.stringify({ stats }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (tenantId) {
          // Get single tenant with full details
          const { data: tenant, error } = await supabaseClient
            .from('tenants')
            .select(`
              *,
              subscription_plans:subscription_plan_id (slug, name_en, name_ar, max_users, max_storage_gb),
              tenant_users (
                id,
                user_id,
                role,
                created_at
              ),
              tenant_modules (
                id,
                status,
                created_at,
                trial_ends_at,
                modules (id, name_en, name_ar, slug)
              ),
              domains (*)
            `)
            .eq('id', tenantId)
            .single();

          if (error) throw error;
          if (!tenant) throw new Error('Tenant not found');

          // Fetch user profiles separately if there are tenant_users
          let usersWithProfiles: any[] = [];
          if (tenant.tenant_users && tenant.tenant_users.length > 0) {
            const userIds = tenant.tenant_users.map((tu: any) => tu.user_id);
            
            // Get users from users table (contains full_name, email, role)
            const { data: users } = await supabaseClient
              .from('users')
              .select('id, email, full_name, role, phone, avatar_url')
              .in('id', userIds);

            // Map users to tenant_users
            usersWithProfiles = tenant.tenant_users.map((tu: any) => {
              const user = users?.find((u: any) => u.id === tu.user_id);
              return {
                id: tu.id,
                user_id: tu.user_id,
                role: tu.role,
                user_role: user?.role, // Role from users table (admin, doctor, receptionist, etc.)
                created_at: tu.created_at,
                email: user?.email,
                full_name: user?.full_name || user?.email?.split('@')[0] || 'Unknown',
                name: user?.full_name || user?.email?.split('@')[0] || 'Unknown',
                phone: user?.phone,
                avatar_url: user?.avatar_url,
                last_login_at: null, // Would need login_history table
              };
            });
          }

          const tenantWithUsers = {
            ...tenant,
            tenant_users: usersWithProfiles,
          };

          return new Response(JSON.stringify(tenantWithUsers), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // List all tenants
        const { data: tenants, error } = await supabaseClient
          .from('tenants')
          .select(`
            *,
            subscription_plans:subscription_plan_id (slug, name_en, name_ar, max_users, max_storage_gb),
            tenant_users (count),
            tenant_modules (
              id,
              status,
              modules (name_en, name_ar, slug)
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ tenants }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST tenant-management': {
        // Create new tenant
        const payload: TenantCreatePayload = await req.json();

        // Support both owner_email and contact_email (legacy)
        const ownerEmail = payload.owner_email || payload.contact_email;
        const ownerName = payload.owner_name || payload.contact_name;
        const ownerPhone = payload.owner_phone || payload.contact_phone;

        // Validate required fields
        if (!payload.name || !payload.slug || !ownerEmail) {
          throw new Error('Missing required fields: name, slug, owner_email');
        }

        // Check if slug is available
        const { data: existing } = await supabaseClient
          .from('tenants')
          .select('id')
          .eq('slug', payload.slug)
          .single();

        if (existing) {
          throw new Error('Tenant slug already exists');
        }

        // Look up subscription plan if specified
        let planId = payload.plan_id || null;
        if (!planId && payload.subscription_plan) {
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('id')
            .eq('slug', payload.subscription_plan)
            .single();
          if (plan) {
            planId = plan.id;
          }
        }

        // Create tenant with all fields mapped to actual table columns
        // Note: max_users, max_patients, max_branches come from subscription_plans, not tenants table
        const { data: tenant, error: createError } = await supabaseClient
          .from('tenants')
          .insert({
            name: payload.name,
            slug: payload.slug,
            display_name: payload.display_name || payload.name,
            subdomain: payload.subdomain || payload.slug,
            owner_name: ownerName,
            owner_email: ownerEmail,
            owner_phone: ownerPhone,
            address_line1: payload.address_line1,
            city: payload.city,
            state: payload.state,
            country_code: payload.country_code || 'EG',
            currency_code: payload.currency_code || payload.currency || 'EGP',
            timezone: payload.timezone || 'Africa/Cairo',
            status: payload.status || 'trial',
            subscription_plan_id: planId,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Link owner to tenant as admin/owner
        // First, check if user with owner_email exists in auth.users
        let ownerUserId = '';
        let ownerCreationWarning = '';

        try {
          const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
          const existingAuthUser = existingUsers?.users?.find(u => u.email === ownerEmail);

          if (existingAuthUser) {
            // User exists in auth - use their ID
            ownerUserId = existingAuthUser.id;
            
            // Make sure they exist in public.users too with correct role
            await supabaseClient.from('users').upsert({
              id: ownerUserId,
              email: ownerEmail,
              role: 'admin',
              is_active: true,
              tenant_id: tenant.id,
            }, { onConflict: 'id' });
            
          } else if (payload.owner_password) {
            // User doesn't exist - create them with the provided password
            const { data: newAuthUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
              email: ownerEmail,
              password: payload.owner_password,
              email_confirm: true,
              user_metadata: {
                full_name: ownerName || ownerEmail.split('@')[0],
                role: 'admin',
              },
            });

            if (createUserError) {
              console.error('Error creating auth user:', createUserError);
              ownerCreationWarning = `Owner account could not be created: ${createUserError.message}. You can add the owner manually later.`;
            } else {
              ownerUserId = newAuthUser.user.id;

              // Wait a moment for trigger to complete, then upsert to override with correct values
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Upsert to ensure correct role (trigger may have set 'patient')
              const { error: upsertError } = await supabaseClient.from('users').upsert({
                id: ownerUserId,
                email: ownerEmail,
                role: 'admin',
                is_active: true,
                tenant_id: tenant.id,
              }, { onConflict: 'id' });
              
              if (upsertError) {
                console.error('Error upserting users record:', upsertError);
              }
            }
          }
        } catch (userErr) {
          console.error('Error in owner user flow:', userErr);
          ownerCreationWarning = 'Could not set up owner account. You can add them manually.';
        }

        // Add owner to tenant_users if we have a user ID
        if (ownerUserId) {
          await supabaseClient.from('tenant_users').insert({
            tenant_id: tenant.id,
            user_id: ownerUserId,
            role: 'owner',
            status: 'active',
          }).catch((err) => {
            console.error('Error adding to tenant_users:', err);
          });
        }

        // Activate default modules if specified
        if (payload.modules && payload.modules.length > 0) {
          const moduleInserts = payload.modules.map((moduleId) => ({
            tenant_id: tenant.id,
            module_id: moduleId,
            status: 'active',
            activated_at: new Date().toISOString(),
          }));

          await supabaseClient.from('tenant_modules').insert(moduleInserts);
        }

        // Create storage bucket for this tenant
        const bucketName = `tenant-${payload.slug}`;
        try {
          await supabaseClient.storage.createBucket(bucketName, {
            public: false,
            fileSizeLimit: 52428800, // 50MB limit
          });
          console.log(`Created storage bucket: ${bucketName}`);
        } catch (bucketErr: any) {
          // Bucket might already exist, which is fine
          if (!bucketErr?.message?.includes('already exists')) {
            console.error('Error creating tenant bucket:', bucketErr);
          }
        }

        // Log the action
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: tenant.id,
          actor_id: user.id,
          action: 'tenant.created',
          resource_type: 'tenant',
          resource_id: tenant.id,
          description: `Tenant ${tenant.name || tenant.slug} created`,
          metadata: { created: payload },
        });

        return new Response(JSON.stringify({ 
          tenant,
          owner_created: !!ownerUserId,
          bucket_created: bucketName,
          warning: ownerCreationWarning || undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'PUT tenant-management': {
        // Update tenant
        const { id, settings, ...otherUpdates } = await req.json();

        if (!id) {
          throw new Error('Tenant ID is required');
        }

        // Get current tenant for audit and settings merge
        const { data: currentTenant } = await supabaseClient
          .from('tenants')
          .select('*')
          .eq('id', id)
          .single();

        // Merge settings if provided (deep merge with existing settings)
        let updates = { ...otherUpdates };
        if (settings) {
          const currentSettings = currentTenant?.settings || {};
          updates.settings = { ...currentSettings, ...settings };
        }

        const { data: tenant, error: updateError } = await supabaseClient
          .from('tenants')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Log the action (user may be null if using service role)
        if (user?.id) {
          await supabaseClient.from('saas_audit_trail').insert({
            tenant_id: id,
            actor_id: user.id,
            action: 'tenant.updated',
            resource_type: 'tenant',
            resource_id: id,
            description: 'Tenant updated',
            old_values: currentTenant,
            new_values: updates,
          });
        }

        return new Response(JSON.stringify({ tenant }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE tenant-management': {
        // Suspend/Delete tenant
        const { id, action } = await req.json();

        if (!id) {
          throw new Error('Tenant ID is required');
        }

        if (action === 'suspend') {
          const { error: suspendError } = await supabaseClient
            .from('tenants')
            .update({ status: 'suspended' })
            .eq('id', id);

          if (suspendError) throw suspendError;

          await supabaseClient.from('saas_audit_trail').insert({
            tenant_id: id,
            actor_id: user?.id,
            action: 'tenant.suspended',
            resource_type: 'tenant',
            resource_id: id,
            description: 'Tenant suspended',
          });
        } else if (action === 'delete') {
          // Soft delete - mark as cancelled (no 'deleted' status in constraint)
          const { error: deleteError } = await supabaseClient
            .from('tenants')
            .update({ status: 'cancelled' })
            .eq('id', id);

          if (deleteError) throw deleteError;

          await supabaseClient.from('saas_audit_trail').insert({
            tenant_id: id,
            actor_id: user?.id,
            action: 'tenant.deleted',
            resource_type: 'tenant',
            resource_id: id,
            description: 'Tenant deleted (soft)',
          });
        } else {
          // Default: just mark as cancelled if no action specified
          const { error: defaultDeleteError } = await supabaseClient
            .from('tenants')
            .update({ status: 'cancelled' })
            .eq('id', id);

          if (defaultDeleteError) throw defaultDeleteError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
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
