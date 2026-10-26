# Dento - Dental Clinic Management System

Dento is a multi-tenant software-as-a-service platform for dental clinics. One installation
serves many clinics. Each clinic gets its own isolated data, its own modules and its own
subscription, and manages patients, appointments, clinical records, billing and staff from a
web-based admin portal. The platform operator manages all clinics from a separate developer
portal.

> This is Dento version 1, built on Supabase. Version 2 is developed in the separate
> repository `Dentov2`. The planning documents for version 2 are in `Docs/v2/`.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [How It Works](#how-it-works)
4. [User Roles](#user-roles)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Configuration](#configuration)
9. [Database](#database)
10. [Edge Functions](#edge-functions)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Security](#security)
14. [Documentation](#documentation)
15. [Known Issues](#known-issues)
16. [License](#license)

---

## Overview

### Purpose

Many dental clinics still manage patient files, appointments, X-rays, invoices and staff
schedules with paper, spreadsheets or several unconnected tools. This makes daily work slow,
increases errors, and makes it hard to see the clinic's financial position.

Dento puts all clinic work into one system:

- **Clinical work:** patient records, dental charts, treatment plans, prescriptions, X-rays,
  CBCT scans, consent forms, procedure notes and lab orders.
- **Front desk:** appointment calendar, walk-in queue and doctor schedules.
- **Finance:** invoices, instalment plans, insurance claims, doctor commissions and daily
  cash reconciliation.
- **Operations:** branches and treatment chairs, staff schedules, attendance, leave requests
  and inventory.

Because Dento is multi-tenant, a single platform operator can sell it as a subscription to
many clinics and manage them centrally.

### Applications

| Application | Who uses it | Default URL |
|-------------|-------------|-------------|
| Admin portal | Clinic staff (admin, doctors, receptionists, assistants) | `http://localhost:5173` |
| Developer portal | Platform operator | `http://localhost:9000` |
| Platform pages | New clinics (registration, login, password reset) | part of the admin app |

---

## Features

### Admin portal (clinic)

| Area | Features |
|------|----------|
| Patients | Patient list and profile, medical history, interactive dental chart (odontogram), treatment history, clinical records |
| Appointments | Calendar, list, booking form, walk-in queue |
| Schedules | Doctor schedules, exceptions, unified calendar, staff schedules |
| Clinical | Treatment plans, prescriptions (printable), X-rays, CBCT scans, consent forms with signatures, procedure notes, lab orders |
| Finance | Invoices (printable), instalment plans, insurance companies and claims, doctor commissions, daily reconciliation |
| Operations | Branches and chairs, doctors, inventory, material usage report, attendance, leave requests |
| Administration | Users, roles and permissions, active sessions, notification settings, site settings, subscription overview |
| Support | Live support sessions with screen sharing to the platform operator |

### Developer portal (platform operator)

| Area | Features |
|------|----------|
| Tenants | Create clinics with a setup wizard, view details, assign modules |
| Modules and feature flags | Turn platform modules and features on or off per clinic |
| Subscriptions | Subscription overview and revenue dashboard |
| Monitoring | Error dashboard, error list, health status, audit and system logs |
| Deployments and domains | Deployment history, custom domains |
| Integration | API keys and API catalogue, webhooks and delivery logs, custom fields, workflows |
| Support | Support sessions with screen sharing |
| Settings | Database, storage, backups, branding, system settings |

### Platform

- Self-service clinic registration
- One login page for all clinics, password reset
- Clinic resolution by subdomain or custom domain
- Module gate: pages are only shown when the clinic's subscription includes the module
- English and Arabic interface, with right-to-left layout for Arabic
- Regional settings and currency conversion (for example EGP and USD)

---

## How It Works

```
   Clinic staff                          Platform operator
        |                                        |
        v                                        v
 +---------------------+               +----------------------+
 | Admin portal        |               | Developer portal     |
 | React, port 5173    |               | React, port 9000     |
 +----------+----------+               +----------+-----------+
            |                                     |
            |  Supabase JS client (anon key + user session)
            v                                     v
 +-------------------------------------------------------------+
 | Supabase                                                    |
 |  - PostgreSQL with Row Level Security (one row set per      |
 |    clinic, separated by tenant_id)                          |
 |  - Auth (users and sessions)                                |
 |  - Storage (X-rays, documents, images)                      |
 |  - Edge Functions (billing, notifications, tenants, ...)    |
 +---------------------------+---------------------------------+
                             |
          +------------------+------------------+
          v                  v                  v
      Stripe            LiveKit              Vercel
     (payments)    (screen sharing)   (hosting and domains)
```

1. A user opens the app. The router finds the clinic from the subdomain or custom domain.
2. The user signs in through Supabase Auth. The app loads the user's role and clinic.
3. All data requests go directly to Supabase. Row Level Security policies make sure each
   user only sees data of their own clinic.
4. Server-side tasks that need secret keys (payments, invoices as PDF, domain setup, tenant
   management, notifications) run as Supabase Edge Functions.
5. The admin portal uses Refine as its data framework, so most pages follow the same list,
   create, edit and view pattern.

---

## User Roles

| Role | Access |
|------|--------|
| `developer` | Developer portal and admin portal |
| `admin` | Full access to the clinic's admin portal; can open the developer portal |
| `doctor` | Clinical pages and own schedule |
| `receptionist` | Patients, appointments, invoices |
| `assistant` | Supporting clinical tasks |
| `cbct_tech` | CBCT scans |

Detailed permissions are defined in `src/admin/config/rolePermissions.js`.

---

## Technology Stack

| Area | Technology | Purpose |
|------|------------|---------|
| Frontend | React 19, Vite 7 | User interface and build |
| Routing | React Router 7 | Page routing |
| Data framework | Refine (with Supabase provider) | Data access, list and form pages |
| State and data | React Context, TanStack Query, TanStack Table | Shared state, caching, tables |
| Forms | React Hook Form, Zod | Forms and validation |
| Styling | Tailwind CSS 4, styled-components | Layout and styling |
| Rich text | TipTap | Text editor |
| Animation | Framer Motion | Animations |
| Drag and drop | dnd-kit | Sortable lists |
| Dental chart | react-odontogram | Interactive tooth chart |
| Signatures | react-signature-canvas | Consent form signatures |
| PDF | jsPDF, html2canvas | Printable documents |
| Video | LiveKit | Screen sharing in support sessions |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) | Database, authentication, files, server logic |
| Payments | Stripe | Subscriptions and payments |
| Error tracking | Sentry | Error reports |
| Security | DOMPurify | HTML sanitising |
| Testing | Vitest, Testing Library, jsdom | Unit and integration tests |
| Hosting | Vercel | Frontend hosting and custom domains |
| CI | GitHub Actions | Lint, test and build on every push |

---

## Project Structure

```
Dento/
|-- src/
|   |-- admin/              Admin portal (pages, layouts, components, Refine providers, roles)
|   |-- developer/          Developer portal (pages, components, services, hooks)
|   |-- platform/           Registration, universal login, password reset
|   |-- routing/            Domain resolver, tenant router, module gate, language router
|   |-- components/         Shared components (error boundary, protected route, toast)
|   |-- context/, contexts/ Auth, language, theme, region and tenant state
|   |-- hooks/              Shared hooks (Supabase, tenant, toast, LiveKit, ...)
|   |-- lib/                Supabase client and API helpers
|   |-- templates/          Page and section templates
|   |-- utils/              Validation, currency, sanitising
|   `-- test/               Test suites
|-- supabase/
|   |-- functions/          Edge Functions (Deno, TypeScript)
|   `-- migrations/         SQL migrations and seed scripts
|-- Docs/                   Analysis, plans, testing notes and version 2 design
|-- .github/workflows/      CI pipeline
|-- index.html              Admin portal entry
|-- developer.html          Developer portal entry
|-- vite.config.js          Admin portal build
|-- vite.config.developer.js  Developer portal build
`-- vercel.json             Hosting configuration
```

---

## Getting Started

### Prerequisites

- Node.js 20 or later and npm
- A Supabase project ([supabase.com](https://supabase.com))
- Optional: Stripe, LiveKit and Sentry accounts for payments, screen sharing and error tracking

### 1. Clone and install

```bash
git clone https://github.com/ahmadkobah/Dento-public.git
cd Dento-public
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Fill in your Supabase URL and anon key (see [Configuration](#configuration)).

### 3. Set up the database

Apply the SQL files in `supabase/migrations/` to your Supabase project in order, for example
with the Supabase CLI (`supabase db push`) or the SQL editor in the Supabase dashboard.
Deploy the Edge Functions with `supabase functions deploy`.

### 4. Start

```bash
npm run dev            # admin portal and developer portal together
npm run dev:admin      # admin portal only (port 5173)
npm run dev:portal     # developer portal only (port 9000)
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both portals |
| `npm run build` | Build the admin portal (`dist/`) |
| `npm run build:portal` | Build the developer portal (`dist-developer/`) |
| `npm run build:all` | Build both portals |
| `npm test` | Run the tests |
| `npm run test:coverage` | Run the tests with a coverage report |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `VITE_SENTRY_DSN` | No | Sentry project DSN for error tracking |

Secret keys (Supabase service role, Stripe, LiveKit, Vercel) belong in the Edge Function
secrets of your Supabase project, never in the frontend `.env` file. Variables that start with
`VITE_` are included in the browser bundle and are visible to every user.

---

## Database

The database runs on Supabase PostgreSQL. The migrations in `supabase/migrations/` create:

- **Multi-tenant base:** clinics (tenants), modules, subscriptions, billing, deployments, domains
- **Clinical data:** patients, appointments, treatments, treatment plans, prescriptions,
  X-rays, CBCT scans, consent forms, procedure notes, lab orders
- **Finance:** invoices, payments, instalments, insurance, commissions, reconciliation
- **Operations:** branches, chairs, schedules, attendance, leave, inventory
- **Platform:** API keys, webhooks, audit logs, support sessions, backups, templates

Almost every table has a `tenant_id` column, and Row Level Security policies limit each user
to the data of their own clinic.

---

## Edge Functions

Server-side logic runs as Supabase Edge Functions (Deno, TypeScript) in `supabase/functions/`:

| Group | Functions |
|-------|-----------|
| Tenants | `tenant-management`, `tenant-modules`, `tenant-impersonate` |
| Billing | `stripe-billing`, `stripe-sync`, `process-payment`, `billing-plan-change`, `billing-dunning`, `subscription-api`, `generate-invoice-pdf`, `calculate-commission`, `currency-rates` |
| Domains and deployment | `domain-api`, `verify-domain`, `vercel-domain`, `deployment-api` |
| Platform | `api-keys`, `webhooks-api`, `audit-api`, `monitoring-api`, `dashboard-stats`, `backup-management` |
| Communication | `send-notification`, `admin-support-request`, `livekit-token` |

---

## Testing

```bash
npm test                  # watch mode
npx vitest run            # single run
npm run test:coverage     # with coverage
```

The test suites in `src/test/` contain about 2,200 test cases. They cover security
(including penetration-style tests), authentication and authorisation, CRUD operations,
clinical modules, currency handling, multi-tenancy, page templates, support sessions,
Edge Functions, accessibility, performance and error handling.

---

## Deployment

- **Hosting:** Vercel (`vercel.json`) builds the admin portal with `npm run build`, serves it
  as a single-page app, caches assets for one year and sets security headers.
- **Backend:** Supabase hosts the database, authentication, storage and Edge Functions.
- **CI:** `.github/workflows/ci.yml` runs lint, tests and build on every push and pull request
  to `main` and `develop`.

---

## Security

- **Tenant isolation:** Row Level Security on clinic tables, separated by `tenant_id`.
- **Role-based access:** routes and pages are protected by role; modules are hidden when the
  clinic's subscription does not include them.
- **Input safety:** HTML is sanitised with DOMPurify; form input is validated with Zod.
- **Secrets:** the service role key is not used in frontend code; privileged actions run in
  Edge Functions.
- **HTTP headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` and
  `Referrer-Policy` are set by Vercel.
- **Other protections:** rate limiting and failed-login tracking, hashed webhook secrets, SSRF
  protection for webhooks, and signed tokens for operator impersonation.

---

## Documentation

| Folder | Content |
|--------|---------|
| `Docs/analysis/` | Codebase, module, billing and website builder analysis |
| `Docs/code-quality/` | Code scan reports and fix plans |
| `Docs/feature-plans/` | Plans for dental chart, developer portal, page builder and support sessions |
| `Docs/planning/` | Implementation status and time plans |
| `Docs/testing/` | Multi-tenant test notes |
| `Docs/v2/` | Design of Dento version 2 |

---

## Known Issues

- **Public website:** `website.html` points to `src/website/main.jsx`, which is not in the
  repository, so the public clinic website cannot be built from this repository.
- **Page builder:** page and section templates exist in `src/templates/`, but the visual page
  builder is not part of the current code.
- **Environment template:** `.env.example` still lists `VITE_SUPABASE_SERVICE_ROLE_KEY`. Remove
  it; a service role key must never be exposed to the browser.
- **Unrelated files:** `wordpress-theme/` and `google-apps-script-calendar.js` belong to a
  separate WordPress clinic website and are not used by Dento.

---

## License

Private. All rights reserved.

Author: Ahmad Kobah
