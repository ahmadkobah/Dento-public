# 🏗️ Dento Developer Portal - SaaS Management Platform

## Executive Summary

Transform the current single-tenant dental clinic system into a **multi-tenant SaaS platform** with a centralized developer portal for managing multiple clinic instances (like "Canine Dental Clinic"), licensing, monitoring, and deployment.

---

## 📊 Current State vs Target State

### Current State
- Single clinic deployment
- No tenant isolation
- No centralized monitoring
- Manual deployment
- No license management

### Target State
- Multi-tenant architecture (multiple clinics like Canine, etc.)
- Complete tenant data isolation with RLS
- Real-time error monitoring across all clinics
- Automated deployment & rollback
- Module licensing per clinic
- Custom domain management
- Remote support capabilities

---

## 🗂️ Database Schema Changes

### Phase 1: Multi-Tenant Core Tables

#### 1. `tenants` - Clinic Instances
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- "Canine Dental Clinic"
    slug TEXT UNIQUE NOT NULL,             -- "canine-dental"
    display_name TEXT NOT NULL,
    logo_url TEXT,
    
    -- Contact
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    billing_email TEXT,
    
    -- Status
    status TEXT DEFAULT 'trial' CHECK (status IN (
        'trial', 'active', 'suspended', 'cancelled', 'expired'
    )),
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'basic',
    subscription_ends_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    
    -- Regional Settings  
    country_code VARCHAR(3) DEFAULT 'EG',
    currency_code VARCHAR(3) DEFAULT 'EGP',
    timezone TEXT DEFAULT 'Africa/Cairo',
    
    -- Domain
    custom_domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,                 -- "canine.dento.app"
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `tenant_modules` - Module Assignments
```sql
CREATE TABLE tenant_modules (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    module_id UUID REFERENCES modules(id),
    status TEXT DEFAULT 'active',          -- active, inactive, trial, expired
    enabled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    license_key TEXT,
    max_users INTEGER,
    settings JSONB DEFAULT '{}',
    UNIQUE(tenant_id, module_id)
);
```

#### 3. `modules` - Available Features
```sql
CREATE TABLE modules (
    id UUID PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,             -- "inventory", "dental-tourism"
    name_en TEXT NOT NULL,
    name_ar TEXT,
    category TEXT NOT NULL,                -- core, clinical, financial, etc.
    is_free BOOLEAN DEFAULT false,
    base_price_monthly DECIMAL(10,2),
    min_tier TEXT DEFAULT 'basic',
    depends_on UUID[],                     -- Dependencies
    version TEXT DEFAULT '1.0.0'
);
```

#### 4. `subscription_plans` - Pricing Tiers
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,             -- "basic", "professional"
    name_en TEXT NOT NULL,
    price_monthly_usd DECIMAL(10,2),
    price_yearly_usd DECIMAL(10,2),
    max_users INTEGER,
    max_patients INTEGER,
    max_branches INTEGER,
    included_modules UUID[],
    features JSONB DEFAULT '{}'
);
```

### Phase 2: Monitoring & Logging Tables

#### 5. `error_logs` - Centralized Error Tracking
```sql
CREATE TABLE error_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    
    -- Error Info
    error_type TEXT NOT NULL,              -- JavaScript, API, Database
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_fingerprint TEXT,                -- For grouping
    
    -- Context
    url TEXT,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Status
    status TEXT DEFAULT 'unresolved',
    occurrence_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    
    resolved_by UUID,
    resolved_at TIMESTAMPTZ
);
```

#### 6. `application_logs` - Centralized Logs
```sql
CREATE TABLE application_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    level TEXT NOT NULL,                   -- debug, info, warn, error
    logger TEXT,                           -- auth, api, payment
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    correlation_id TEXT,                   -- Request tracing
    source TEXT,                           -- frontend, backend, edge
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `health_checks` - Uptime Monitoring
```sql
CREATE TABLE health_checks (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    check_type TEXT NOT NULL,              -- http, database, storage
    endpoint TEXT,
    status TEXT NOT NULL,                  -- healthy, degraded, unhealthy
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. `alerts` - System Alerts
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    alert_type TEXT NOT NULL,              -- error_spike, high_latency
    severity TEXT NOT NULL,                -- info, warning, critical
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    acknowledged_by UUID,
    resolved_at TIMESTAMPTZ
);
```

### Phase 3: Deployment & Domain Tables

#### 9. `deployments` - Version Management
```sql
CREATE TABLE deployments (
    id UUID PRIMARY KEY,
    version TEXT NOT NULL,
    commit_sha TEXT,
    release_notes TEXT,
    status TEXT NOT NULL,                  -- pending, deploying, deployed
    target_type TEXT DEFAULT 'all',        -- all, tenants, tiers
    target_tenants UUID[],
    rollout_percentage INTEGER DEFAULT 100,
    deployed_by UUID,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

#### 10. `domains` - Custom Domain Management
```sql
CREATE TABLE domains (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    domain TEXT UNIQUE NOT NULL,
    domain_type TEXT DEFAULT 'custom',     -- subdomain, custom
    dns_verified BOOLEAN DEFAULT false,
    ssl_status TEXT DEFAULT 'pending',
    ssl_expires_at TIMESTAMPTZ,
    provider TEXT                          -- vercel, netlify
);
```

#### 11. `support_sessions` - Remote Support
```sql
CREATE TABLE support_sessions (
    id UUID PRIMARY KEY,
    developer_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    impersonated_user_id UUID,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    actions_performed TEXT[]
);
```

---

## 🎯 Developer Portal Pages Structure

```
src/developer/
├── DeveloperApp.jsx                     # Main routing
├── components/
│   ├── DeveloperLayout.jsx              # ✅ EXISTS
│   ├── TenantSelector.jsx               # NEW - Global tenant switcher
│   ├── MetricsCard.jsx                  # NEW - Stats display
│   ├── ErrorChart.jsx                   # NEW - Error visualization
│   ├── HealthIndicator.jsx              # NEW - Status indicators
│   └── ImpersonationBanner.jsx          # NEW - Support mode UI
│
└── pages/
    ├── DeveloperDashboard.jsx           # ✅ EXISTS - Enhance
    │
    ├── tenants/                         # 🆕 CLINIC MANAGEMENT
    │   ├── TenantList.jsx               # All clinics overview
    │   ├── TenantDetail.jsx             # Single clinic details
    │   ├── TenantCreate.jsx             # Onboard new clinic
    │   ├── TenantSettings.jsx           # Clinic configuration
    │   ├── TenantModules.jsx            # Assign modules to clinic
    │   └── TenantBilling.jsx            # Clinic subscription
    │
    ├── modules/                         # ✅ EXISTS - Enhance
    │   ├── ModuleList.jsx               # Global module catalog
    │   ├── ModuleDetail.jsx             # Module configuration
    │   └── ModuleAssignments.jsx        # 🆕 Which clinics have which modules
    │
    ├── monitoring/                      # 🆕 ERROR & HEALTH MONITORING
    │   ├── ErrorDashboard.jsx           # Real-time error overview
    │   ├── ErrorList.jsx                # All errors across tenants
    │   ├── ErrorDetail.jsx              # Single error with stack trace
    │   ├── HealthStatus.jsx             # System health overview
    │   └── AlertList.jsx                # Active alerts
    │
    ├── logs/                            # ✅ EXISTS - Enhance
    │   ├── AuditLogs.jsx                # Enhanced with tenant filter
    │   ├── ApplicationLogs.jsx          # 🆕 Centralized logs
    │   └── LogSearch.jsx                # 🆕 Full-text search
    │
    ├── deployments/                     # 🆕 DEPLOYMENT MANAGEMENT
    │   ├── DeploymentList.jsx           # Deployment history
    │   ├── DeploymentCreate.jsx         # Trigger new deployment
    │   ├── DeploymentDetail.jsx         # Logs & status
    │   └── RollbackModal.jsx            # Rollback confirmation
    │
    ├── subscriptions/                   # 🆕 LICENSE & BILLING
    │   ├── PlanList.jsx                 # Manage subscription plans
    │   ├── PlanEditor.jsx               # Create/edit plans
    │   ├── SubscriptionOverview.jsx     # All tenant subscriptions
    │   ├── RevenueMetrics.jsx           # MRR, churn, growth
    │   └── UsageLimits.jsx              # Usage tracking per tenant
    │
    ├── domains/                         # 🆕 DOMAIN MANAGEMENT
    │   ├── DomainList.jsx               # All custom domains
    │   ├── DomainSetup.jsx              # Add new domain
    │   └── SSLStatus.jsx                # Certificate status
    │
    ├── support/                         # 🆕 REMOTE SUPPORT
    │   ├── SupportSessions.jsx          # Active/past sessions
    │   ├── StartSession.jsx             # Initiate support
    │   └── TenantDebugger.jsx           # View tenant data
    │
    ├── settings/                        # ✅ EXISTS - Enhance
    │   ├── SystemSettings.jsx           # Platform settings
    │   ├── IntegrationSettings.jsx      # 🆕 Sentry, Stripe, etc.
    │   └── NotificationSettings.jsx     # 🆕 Alert channels
    │
    ├── api-keys/                        # ✅ EXISTS
    │   └── ApiKeyList.jsx               # API key management
    │
    ├── webhooks/                        # ✅ EXISTS
    │   └── WebhookList.jsx              # Webhook configuration
    │
    └── feature-flags/                   # ✅ EXISTS - Enhance
        └── FeatureFlagList.jsx          # Per-tenant feature flags
```

---

## 🔧 Third-Party Services Needed

### 1. Error Monitoring: **Sentry** (Recommended)
- Free tier: 5K errors/month
- Paid: $26/month for 50K errors
- Features: Stack traces, user context, release tracking

```bash
npm install @sentry/react @sentry/vite-plugin
```

### 2. Log Aggregation: **Axiom** or **Logflare**
- Axiom: Free tier 500MB/month, excellent search
- Logflare: Built into Supabase

### 3. Uptime Monitoring: **Better Uptime** or **Checkly**
- Better Uptime: $20/month for 10 monitors
- Checkly: Free tier available

### 4. Payment Processing: **Stripe**
- 2.9% + 30¢ per transaction
- Subscription management built-in

### 5. Domain/SSL: **Vercel API** or **Cloudflare**
- Automatic SSL provisioning
- Custom domain verification

---

## 📡 Edge Functions Required

```
supabase/functions/
├── tenant-management/
│   ├── create-tenant/           # Onboard new clinic
│   ├── update-tenant/           # Update clinic settings
│   ├── suspend-tenant/          # Suspend/reactivate
│   └── delete-tenant/           # Data cleanup
│
├── licensing/
│   ├── activate-module/         # Enable module for tenant
│   ├── deactivate-module/       # Disable module
│   ├── validate-license/        # Check if module is valid
│   └── check-usage-limits/      # Enforce plan limits
│
├── monitoring/
│   ├── ingest-error/            # Receive errors from clients
│   ├── ingest-logs/             # Centralized logging
│   ├── run-health-check/        # Periodic health checks
│   └── trigger-alert/           # Create/send alerts
│
├── deployment/
│   ├── trigger-deploy/          # Start deployment
│   ├── check-deploy-status/     # Get deployment progress
│   └── rollback/                # Rollback to previous
│
├── domains/
│   ├── add-domain/              # Add custom domain
│   ├── verify-dns/              # Check DNS configuration
│   └── provision-ssl/           # Request SSL certificate
│
├── billing/
│   ├── create-subscription/     # New subscription
│   ├── cancel-subscription/     # Cancel
│   ├── stripe-webhook/          # Handle Stripe events
│   └── generate-invoice/        # PDF invoice
│
└── support/
    ├── start-session/           # Begin support session
    ├── end-session/             # End session
    └── generate-token/          # Auth token for impersonation
```

---

## 🔐 Security Considerations

### 1. Tenant Data Isolation
```sql
-- Add tenant_id to ALL tables
ALTER TABLE patients ADD COLUMN tenant_id UUID;
ALTER TABLE appointments ADD COLUMN tenant_id UUID;
-- ... all tables

-- RLS Policy
CREATE POLICY tenant_isolation ON patients
    FOR ALL USING (
        tenant_id = get_current_tenant_id()
        OR is_developer()
    );
```

### 2. Developer-Only Access
```sql
CREATE POLICY developer_only ON tenants
    FOR ALL USING (get_user_role() = 'developer');
```

### 3. Impersonation Audit Trail
- All actions during support sessions logged
- Session expires automatically after 1 hour
- Visual banner shown during impersonation

### 4. API Rate Limiting
- Per-tenant rate limits based on plan
- Automatic throttling

---

## 📅 Implementation Roadmap

### Phase 1: Multi-Tenant Foundation (2-3 weeks)
- [ ] Create migration 040_saas_multi_tenant_core.sql
- [ ] Add tenant_id to all existing tables
- [ ] Update RLS policies
- [ ] Create tenant CRUD Edge Functions
- [ ] Build TenantList, TenantDetail, TenantCreate pages
- [ ] Implement tenant switcher in DeveloperLayout

### Phase 2: Module Licensing (2 weeks)
- [ ] Create modules catalog
- [ ] Build module assignment UI
- [ ] Implement license validation Edge Function
- [ ] Add module checks to existing features

### Phase 3: Error Monitoring (2 weeks)
- [ ] Integrate Sentry OR build custom error_logs
- [ ] Create error ingestion Edge Function
- [ ] Build ErrorDashboard, ErrorList, ErrorDetail pages
- [ ] Set up alert thresholds

### Phase 4: Billing & Subscriptions (2-3 weeks)
- [ ] Integrate Stripe
- [ ] Create subscription plans
- [ ] Build billing UI
- [ ] Implement usage metering

### Phase 5: Deployment & Domains (2 weeks)
- [ ] Build deployment tracking
- [ ] Integrate Vercel API for domains
- [ ] SSL automation
- [ ] Rollback mechanism

### Phase 6: Remote Support (1-2 weeks)
- [ ] Impersonation system
- [ ] Support session logging
- [ ] Tenant debugger view

### Phase 7: Polish & Documentation (1 week)
- [ ] Dashboard refinements
- [ ] API documentation
- [ ] User guide

---

## 💰 Cost Estimate (Monthly)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Supabase | ✅ Pro ($25) | $25-100 |
| Sentry | 5K errors | $26/50K |
| Axiom | 500MB logs | $25/5GB |
| Better Uptime | 3 monitors | $20/10 |
| Stripe | N/A | 2.9% + 30¢ |
| Vercel | 100GB BW | $20/team |
| **Total** | ~$50/month | ~$150/month |

---

## 🚀 Quick Start Commands

```bash
# 1. Run migrations
npx supabase db push

# 2. Deploy Edge Functions
npx supabase functions deploy tenant-management
npx supabase functions deploy licensing
npx supabase functions deploy monitoring

# 3. Install Sentry
npm install @sentry/react @sentry/vite-plugin

# 4. Install Stripe
npm install @stripe/stripe-js stripe
```

---

## 📊 Default Module Seed Data

```sql
INSERT INTO modules (slug, name_en, category, is_free, min_tier) VALUES
  ('core-scheduling', 'Appointment Scheduling', 'core', true, 'basic'),
  ('patient-records', 'Patient Records', 'core', true, 'basic'),
  ('basic-billing', 'Basic Billing', 'financial', true, 'basic'),
  ('inventory', 'Inventory Management', 'operations', false, 'professional'),
  ('dental-tourism', 'Dental Tourism', 'marketing', false, 'professional'),
  ('hr-management', 'HR & Payroll', 'operations', false, 'enterprise'),
  ('advanced-analytics', 'Advanced Analytics', 'advanced', false, 'enterprise'),
  ('api-access', 'API Access', 'integration', false, 'enterprise'),
  ('multi-branch', 'Multi-Branch', 'operations', false, 'professional'),
  ('white-label', 'White Label Branding', 'advanced', false, 'unlimited');

INSERT INTO subscription_plans (slug, name_en, price_monthly_usd, max_users, max_patients) VALUES
  ('trial', 'Free Trial', 0, 3, 100),
  ('basic', 'Basic', 49, 5, 1000),
  ('professional', 'Professional', 149, 15, 5000),
  ('enterprise', 'Enterprise', 399, 50, 25000),
  ('unlimited', 'Unlimited', 999, NULL, NULL);
```

---

## ✅ Summary

This plan transforms Dento from a single-clinic app into a full SaaS platform where:

1. **Multiple clinics** (Canine, others) can be managed from one Developer Portal
2. **Modules can be assigned/activated/deactivated** per clinic
3. **Real-time error monitoring** shows issues across all client portals
4. **Centralized logging** helps debug problems remotely
5. **License management** controls feature access per subscription tier
6. **Custom domains** can be configured for each clinic
7. **Remote support sessions** allow developers to help clients safely
8. **Automated deployments** with rollback capability

Ready to begin implementation when you are!
