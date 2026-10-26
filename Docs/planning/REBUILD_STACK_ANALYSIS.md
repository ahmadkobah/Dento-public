# Dento v2 – Rebuild Stack Analysis & Recommendation

> **Date:** 2026-02-24  
> **Purpose:** Evaluate Option A (Node.js + MongoDB + React) vs Option B (.NET C# + MongoDB + Angular) for a full rebuild of the Dento dental SaaS platform.

---

## 1. Current Codebase Summary (What We're Replacing)

| Metric | Value |
|--------|-------|
| Total source files | ~230 JSX/JS files |
| Total lines of code | ~117,000 |
| Admin modules | 28 page groups |
| Developer portal modules | 16 page groups |
| Database tables | ~140 unique tables |
| Supabase Edge Functions | 25 |
| Database migrations | 82 |
| Frontend framework | React 19 + Vite 7 + Tailwind 4 |
| Backend | Supabase (Postgres + Edge Functions) |
| Auth | Supabase Auth (JWT-based) |
| Multi-tenancy | RLS with `tenant_id` + `set_config()` RPC |

### Current Problems Being Solved
1. **Supabase lock-in** – Edge Functions are limited, no custom middleware, no background jobs
2. **Schema mess** – 82 migrations with duplicates, renamed tables, orphan columns
3. **Dead modules** – Tourism packages, website builder, website themes still in DB/code
4. **Inconsistent patterns** – Mixed data-fetching (Refine + raw Supabase + React Query)
5. **No proper module versioning** – tenant_modules table exists but no version lifecycle
6. **No proper CI/CD pipeline** – Manual Vercel deploys
7. **Support tooling** – LiveKit integration half-implemented, needs Tailscale

---

## 2. Head-to-Head Comparison

### 2.1 Development Speed

| Factor | Node.js + MongoDB + React | .NET + MongoDB + Angular |
|--------|---------------------------|--------------------------|
| **Time to MVP** | ⚡ 3-4 months | 🐢 5-7 months |
| **Your familiarity** | ✅ Already know React + JS | ❌ Must learn C# + Angular from scratch |
| **Ecosystem packages** | ✅ npm: 2M+ packages | ⚠️ NuGet: 400K packages (good but smaller) |
| **Boilerplate code** | ✅ Minimal (Express/Fastify) | ❌ Heavy (Controllers, Services, DTOs, DI) |
| **AI coding assistance** | ✅ Best AI support (JS/TS) | ⚠️ Good but less training data for C# |
| **Hiring / freelancers** | ✅ Largest pool globally | ⚠️ Smaller, more expensive developers |

**Winner: Node.js + React** — You already have 117K lines of React code. Rebuilding in the same frontend language means you can **port** working components instead of rewriting from scratch.

---

### 2.2 Architecture & Scalability

| Factor | Node.js + MongoDB + React | .NET + MongoDB + Angular |
|--------|---------------------------|--------------------------|
| **Type safety** | ⚠️ TypeScript (opt-in) | ✅ C# (built-in, strict) |
| **Multi-tenancy patterns** | ✅ Middleware-based (simple) | ✅ Built-in DI scopes |
| **Background jobs** | ✅ BullMQ + Redis | ✅ Hangfire / Azure Functions |
| **API structure** | ✅ Express/Fastify REST + tRPC | ✅ ASP.NET Controllers + Swagger |
| **MongoDB driver** | ✅ Mongoose (mature) | ✅ MongoDB.Driver (official, strong) |
| **Real-time** | ✅ Socket.io (native) | ⚠️ SignalR (good, more setup) |
| **Microservice readiness** | ✅ Natural fit (small services) | ✅ Also good (heavier per service) |
| **Memory/CPU efficiency** | ⚠️ Higher memory per instance | ✅ Lower memory, better CPU perf |

**Winner: Tie** — Both handle SaaS well. Node.js is simpler; .NET is more structured. For a dental SaaS (not high-frequency trading), both are overkill-capable.

---

### 2.3 MongoDB Fit for Dental SaaS

| Concern | Analysis |
|---------|----------|
| **Patient records** | ✅ Document model is natural (embedded allergies, history, charts) |
| **Appointments** | ✅ Time-series queries work well with proper indexing |
| **Multi-tenancy** | ✅ `tenantId` field + compound indexes = simple and fast |
| **Invoicing/billing** | ⚠️ Relational joins needed → use `$lookup` or denormalize |
| **Reporting** | ⚠️ Aggregation pipeline is powerful but complex vs SQL |
| **ACID transactions** | ✅ Multi-document transactions supported since MongoDB 4.0 |
| **Migration from 140 tables** | ⚠️ Need to redesign schema — embed related data, reduce collections to ~40-50 |

**Verdict:** MongoDB works well for this use case. The current 140 Postgres tables can collapse into ~40-50 MongoDB collections by embedding related data (e.g., patient + allergies + medical_history = 1 document).

---

### 2.4 Developer Experience & Ecosystem

| Factor | Node.js + React | .NET + Angular |
|--------|----------------|----------------|
| **Frontend hot reload** | ✅ Vite (instant) | ⚠️ Angular CLI (slower) |
| **Backend hot reload** | ✅ nodemon / tsx watch | ⚠️ dotnet watch (slower) |
| **Monorepo tools** | ✅ Turborepo, Nx | ✅ Nx (Angular-native) |
| **Testing** | ✅ Vitest + Playwright | ✅ xUnit + Playwright |
| **Docker image size** | ✅ ~150MB (Node Alpine) | ⚠️ ~300MB (.NET runtime) |
| **Deployment options** | ✅ Vercel, Railway, Fly.io, AWS | ⚠️ Azure (best), AWS, Docker |
| **Tailscale integration** | ✅ Simple (node + tailscale) | ✅ Simple (.NET + tailscale) |
| **Mobile app (future)** | ✅ React Native (shared code) | ❌ Separate Xamarin/MAUI or Ionic |

**Winner: Node.js + React** — Especially because of React Native code sharing for the planned mobile app.

---

### 2.5 Cost Analysis (First 12 Months)

| Cost Item | Node.js Stack | .NET Stack |
|-----------|--------------|------------|
| **Hosting (VPS/Cloud)** | $20-50/mo (Railway/Fly) | $40-80/mo (Azure App Service) |
| **MongoDB Atlas (M10)** | $57/mo | $57/mo |
| **Redis (caching/queues)** | $10-15/mo | $10-15/mo |
| **Domain + SSL** | $15/yr | $15/yr |
| **CI/CD** | Free (GitHub Actions) | Free (GitHub Actions) |
| **Developer cost** | Lower (JS devs cheaper) | Higher (C# devs premium) |
| **Learning time cost** | 0 weeks | 8-12 weeks (C# + Angular) |
| **Estimated yearly** | **~$1,100-1,600** | **~$1,500-2,200** |

---

## 3. ⭐ RECOMMENDATION: Option A – Node.js + MongoDB + React (with TypeScript)

### Why This Wins Decisively

1. **Zero learning curve** — You already built 117K lines of React. Don't throw away that knowledge.
2. **Component reuse** — ~60% of your React admin UI components can be ported (forms, tables, charts, dental chart). With Angular, it's 0% reuse.
3. **React Native** — Your MOBILE_APP_PLAN.md is designed for React Native. Shared code between web and mobile is only possible with React.
4. **Speed** — You can have a working MVP in 3-4 months vs 5-7 months with .NET/Angular.
5. **AI pair-programming** — JS/TS has the best AI tooling support (Copilot, Cursor, etc.).
6. **One language everywhere** — TypeScript on frontend, backend, and mobile. No context-switching.

### When .NET Would Be Better (Not Your Case)
- Enterprise clients requiring .NET stack compliance
- Team of 10+ developers needing strict architectural guardrails
- CPU-intensive workloads (image processing, complex calculations)
- Already having a .NET team

---

## 4. Recommended Tech Stack (Dento v2)

```
┌─────────────────────────────────────────────────────┐
│                    DENTO v2 STACK                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  FRONTEND (Web)          MOBILE (Future)             │
│  ├─ React 19 + TypeScript  ├─ React Native (Expo 52)│
│  ├─ Vite 7                 ├─ NativeWind 4           │
│  ├─ TailwindCSS 4          ├─ Zustand                │
│  ├─ Zustand (state)        └─ Shared /packages/      │
│  ├─ TanStack Query v5                                │
│  ├─ TanStack Table v8                                │
│  ├─ React Hook Form + Zod                            │
│  └─ Shadcn/ui (component library)                    │
│                                                      │
│  BACKEND (API)                                       │
│  ├─ Node.js 22 LTS + TypeScript 5.x                 │
│  ├─ Fastify 5 (2x faster than Express)              │
│  ├─ Mongoose 8 (MongoDB ODM)                         │
│  ├─ BullMQ + Redis (background jobs)                 │
│  ├─ Socket.io (real-time)                            │
│  ├─ Passport.js + JWT (auth)                         │
│  ├─ Zod (API validation, shared with frontend)       │
│  └─ Pino (structured logging)                        │
│                                                      │
│  DATABASE                                            │
│  ├─ MongoDB Atlas (primary)                          │
│  ├─ Redis (cache + job queue + sessions)             │
│  └─ S3/Cloudflare R2 (file storage)                  │
│                                                      │
│  INFRASTRUCTURE                                      │
│  ├─ Docker + Docker Compose (local dev)              │
│  ├─ GitHub Actions (CI/CD)                           │
│  ├─ Railway / Fly.io (hosting)                       │
│  ├─ Tailscale (secure support tunnels)               │
│  ├─ Sentry (error tracking)                          │
│  └─ Upstash (serverless Redis, optional)             │
│                                                      │
│  DEVELOPER PORTAL                                    │
│  ├─ Separate Vite app (like current)                 │
│  ├─ API key management                               │
│  ├─ Tenant management                                │
│  ├─ Module versioning system                         │
│  ├─ Feature flags                                    │
│  └─ Monitoring dashboard                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 5. Rebuild Plan – Phase-by-Phase

### Phase 0: Foundation (Week 1-2) — 💰 Critical
```
📁 dento-v2/
├── packages/
│   ├── shared/           # Shared types, Zod schemas, utils
│   │   ├── src/
│   │   │   ├── schemas/  # Zod schemas (patient, appointment, etc.)
│   │   │   ├── types/    # TypeScript interfaces
│   │   │   └── utils/    # Shared helpers
│   │   └── package.json
│   └── ui/               # Shared UI components (future: web + mobile)
│       ├── src/
│       └── package.json
├── apps/
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── middleware/
│   │   │   ├── plugins/  # Fastify plugins
│   │   │   └── config/
│   │   └── package.json
│   ├── admin/            # React admin SPA
│   │   ├── src/
│   │   └── package.json
│   └── developer/        # React developer portal SPA
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── turbo.json            # Turborepo config
└── package.json          # Root workspace
```

**Tasks:**
- [ ] Init Turborepo monorepo
- [ ] Setup Fastify + TypeScript + MongoDB connection
- [ ] Setup React + Vite + Tailwind + Shadcn/ui
- [ ] Docker Compose (MongoDB + Redis + API + Web)
- [ ] GitHub Actions CI pipeline
- [ ] ESLint + Prettier + Husky pre-commit hooks

---

### Phase 1: Auth & Multi-Tenancy (Week 3-4) — 🔐 Core
**MongoDB Multi-Tenancy Strategy: `tenantId` field on every document**

```typescript
// middleware/tenantContext.ts
export const tenantMiddleware = async (req, reply) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) throw new UnauthorizedError();
  
  // Attach to request — all DB queries auto-filter
  req.tenantId = tenantId;
};

// Base model with tenant isolation
const PatientSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  firstName: String,
  lastName: String,
  // ... embedded: allergies, medicalHistory
}, { timestamps: true });

// Mongoose plugin: auto-add tenantId to all queries
PatientSchema.pre(/^find/, function() {
  this.where({ tenantId: this.getQuery().tenantId });
});
```

**Tasks:**
- [ ] User registration + login (JWT + refresh tokens)
- [ ] Tenant creation + invitation flow
- [ ] Tenant middleware (auto-filter all queries)
- [ ] Role-based access control (RBAC)
- [ ] Login history + session management
- [ ] Password reset flow

---

### Phase 2: Developer Portal (Week 5-7) — 🛠️ Platform
**Port existing 16 modules, cleaned up:**

| Module | Description | Priority |
|--------|-------------|----------|
| Tenants | CRUD, impersonation, usage metrics | P0 |
| Modules | Versioning, enable/disable per tenant, update lifecycle | P0 |
| API Keys | CRUD, rate limiting, usage tracking | P0 |
| Feature Flags | Per-tenant toggles with rollout % | P0 |
| Subscriptions | Plan management, billing (Stripe) | P1 |
| Deployments | Deploy hooks, status, rollback | P1 |
| Monitoring | Error logs, health checks, alerts | P1 |
| Domains | Custom domain management | P1 |
| Webhooks | Event subscriptions, delivery logs | P2 |
| Logs | Audit trail, application logs | P2 |
| Support | Tailscale-based remote support | P2 |
| Workflows | Automation rules | P3 |
| Settings | Platform-wide configuration | P1 |

**Module Versioning System (NEW in v2):**
```typescript
// Module lifecycle
interface Module {
  _id: ObjectId;
  slug: string;              // "appointments", "inventory", "lab-orders"
  name: string;
  currentVersion: string;    // "2.1.0"
  versions: [{
    version: string,         // "2.1.0"
    changelog: string,
    migrationScript?: string, // MongoDB migration if needed
    releasedAt: Date,
    breakingChanges: boolean
  }];
  dependencies: string[];    // ["patients", "doctors"]
  category: "core" | "clinical" | "financial" | "operational";
}

// Per-tenant module state
interface TenantModule {
  tenantId: ObjectId;
  moduleSlug: string;
  enabled: boolean;
  installedVersion: string;   // "2.0.0"
  availableVersion: string;   // "2.1.0"
  autoUpdate: boolean;
  config: Record<string, any>; // tenant-specific settings
}
```

---

### Phase 3: Core Clinical Modules (Week 8-13) — 🏥 Business Logic

**Build order (by dependency):**

```
Week 8:  Branches → Doctors → Doctor Schedules → Doctor Availability
Week 9:  Patients (with embedded allergies + medical history)
Week 10: Appointments → Appointment Types → Waitlist → Queue
Week 11: Dental Charts → Procedure Notes → Treatment Plans
Week 12: Services → Service Categories → Prescriptions → Medications
Week 13: CBCT/X-rays → Lab Orders
```

**MongoDB Schema Design — Embed vs Reference:**

| Embed (subdocument) | Reference (separate collection) |
|---------------------|---------------------------------|
| Patient ← allergies, medical_history | Patients ↔ Appointments |
| Doctor ← certificates, schedules | Doctors ↔ Branches |
| Invoice ← invoice_items | Invoices ↔ Payments |
| Prescription ← prescription_items | Appointments ↔ Dental Charts |
| Treatment Plan ← plan_items | Lab Orders ↔ Dental Labs |

**Target: ~40-45 collections** (down from 140 Postgres tables)

---

### Phase 4: Financial Modules (Week 14-16) — 💰

```
Week 14: Invoices → Invoice Items → Payments
Week 15: Insurance Companies → Claims → Patient Insurance
Week 16: Installment Plans → Commissions → Reconciliation
```

---

### Phase 5: Operational Modules (Week 17-19) — 📊

```
Week 17: Inventory → Stock → Purchase Orders → Suppliers
Week 18: Leave Management → Attendance → Staff Schedules
Week 19: Notifications → Reports → Audit Logs
```

---

### Phase 6: Support & Infrastructure (Week 20-21) — 🔧

**Tailscale Integration (replaces LiveKit screen-share):**
```typescript
// Tailscale Funnel for secure support sessions
// Agent connects via Tailscale → sees tenant's admin panel
// No port forwarding, no LiveKit complexity

interface SupportSession {
  _id: ObjectId;
  tenantId: ObjectId;
  agentId: ObjectId;
  tailscaleNodeId: string;
  status: "pending" | "active" | "ended";
  startedAt: Date;
  endedAt?: Date;
  recording?: string;  // S3 URL
  actions: [{
    timestamp: Date,
    type: string,
    details: string
  }];
}
```

---

### Phase 7: Mobile App (Week 22-26) — 📱

React Native with Expo — shares `packages/shared` Zod schemas and types with web.

---

## 6. Modules to REMOVE (Not Rebuilding)

| Module | Reason |
|--------|--------|
| 🗑️ Tourism Packages | Not core dental SaaS — niche feature nobody uses |
| 🗑️ Website Builder | Too complex, competitors (Wix/WordPress) do it better |
| 🗑️ Website Themes | Removed with website builder |
| 🗑️ Page Builder | Same as above |
| 🗑️ Content Editor/CMS | Part of website builder system |
| 🗑️ Portfolio Cases | Website feature |
| 🗑️ Testimonials | Website feature |
| 🗑️ Team Members (public) | Website feature |
| 🗑️ Contact Messages | Website feature |
| 🗑️ FAQs | Website feature |
| 🗑️ Navigation Menus | Website feature |
| 🗑️ Media Library | Simplify to direct S3 upload per entity |
| 🗑️ Translations/i18n | Rebuild simpler (just en/ar JSON files) |
| 🗑️ Site Settings | Website feature |

**Result: ~30 tables/collections removed**, codebase shrinks ~25%.

---

## 7. Modules to ADD (New in v2)

| Module | Description |
|--------|-------------|
| ✅ Module Versioning | Semantic versioning per module with upgrade lifecycle |
| ✅ Tailscale Support | Secure remote support via Tailscale Funnel |
| ✅ Tenant Backup/Restore | Per-tenant MongoDB dump/restore |
| ✅ Webhook v2 | Proper event bus with retry + dead letter queue |
| ✅ Bulk Operations | Bulk patient import, bulk invoice generation |
| ✅ Appointment Reminders | BullMQ scheduled jobs (SMS/email/WhatsApp) |
| ✅ Patient Portal | Read-only patient access (future) |
| ✅ API Rate Limiting | Redis-based per-API-key rate limits |

---

## 8. Timeline Summary

| Phase | Weeks | Duration | Deliverable |
|-------|-------|----------|-------------|
| 0 – Foundation | 1-2 | 2 weeks | Monorepo, Docker, CI/CD |
| 1 – Auth & Multi-Tenancy | 3-4 | 2 weeks | Login, RBAC, tenant isolation |
| 2 – Developer Portal | 5-7 | 3 weeks | 13 portal modules |
| 3 – Clinical Modules | 8-13 | 6 weeks | Patients, appointments, charts |
| 4 – Financial Modules | 14-16 | 3 weeks | Invoicing, insurance, payments |
| 5 – Operational Modules | 17-19 | 3 weeks | Inventory, HR, notifications |
| 6 – Support & Infra | 20-21 | 2 weeks | Tailscale, backups |
| 7 – Mobile App | 22-26 | 5 weeks | React Native (Expo) |
| **Total** | | **26 weeks (~6 months)** | **Full platform** |

---

## 9. Risk Comparison

| Risk | Node.js + React | .NET + Angular |
|------|----------------|----------------|
| You abandon midway (burnout) | 🟡 Lower (familiar stack) | 🔴 High (learning + building) |
| Can't find help | 🟢 Easy (JS devs everywhere) | 🟡 Moderate |
| Performance issues | 🟡 Possible (Node single-thread) | 🟢 Unlikely (.NET is fast) |
| Security mistakes | 🟡 More manual (helmet, CORS) | 🟢 Built-in (ASP.NET) |
| MongoDB learning curve | 🟡 Some (schema design matters) | 🟡 Same |
| Scope creep | 🔴 Risk exists in both | 🔴 Risk exists in both |

---

## 10. Final Verdict

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⭐  RECOMMENDATION:  Node.js + MongoDB + React (TypeScript) ║
║                                                               ║
║   Reasons:                                                    ║
║   1. You already know React — 0 learning overhead             ║
║   2. ~60% of UI components can be ported from v1              ║
║   3. React Native shares code with web (mobile plan)          ║
║   4. TypeScript everywhere = one language, one brain          ║
║   5. 3-4 months faster to MVP than .NET/Angular               ║
║   6. Cheaper developers, more packages, better AI tools       ║
║   7. MongoDB + Mongoose is a natural fit for JS/TS            ║
║                                                               ║
║   The ONLY reason to pick .NET + Angular:                     ║
║   → You want to LEARN C# and Angular as a career investment   ║
║   → But that doubles your timeline and risk                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 11. Immediate Next Steps (If You Agree)

1. **Create `dento-v2` repo** with Turborepo monorepo structure
2. **Setup Docker Compose** (MongoDB + Redis + API + Web)
3. **Implement auth + tenant isolation** (the hardest part, do it first)
4. **Build Developer Portal** (your control plane for everything)
5. **Port admin modules** one by one, starting with patients + appointments

Ready to start Phase 0 when you give the green light.
