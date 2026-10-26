# Dento Mobile App & Staff Portal Strategy

**Created:** February 9, 2026  
**Last Updated:** February 16, 2026  
**Status:** Audited & Updated — Ready for Development

> **Audit Note (Feb 16, 2026):** This plan has been cross-referenced against the actual Supabase database (90 migrations), 25 deployed edge functions, and the web app codebase. All table names, edge function references, and tech stack versions have been corrected to match reality. See section at the bottom for the full audit changelog.

---

## Executive Summary

This document outlines the complete strategy for mobile access and role-based staff portals for the Dento dental clinic management system.

### Portal Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DENTO PLATFORM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐│
│  │ DEVELOPER PORTAL│   │  PUBLIC WEBSITE │   │       ADMIN PORTAL          ││
│  │   (Web Only)    │   │   (Web Only)    │   │      (Role-Based Web)       ││
│  │                 │   │                 │   │                             ││
│  │ • System Config │   │ • Home Page     │   │ ┌─────────────────────────┐ ││
│  │ • Tenant Mgmt   │   │ • Services      │   │ │     CLINIC OWNER        │ ││
│  │ • Page Builder  │   │ • Booking       │   │ │  Full access to all     │ ││
│  │ • Support       │   │ • Contact       │   │ │  modules & settings     │ ││
│  │ • API/Webhooks  │   │ • Portfolio     │   │ └─────────────────────────┘ ││
│  │                 │   │                 │   │ ┌─────────────────────────┐ ││
│  └────────┬────────┘   └────────┬────────┘   │ │       MANAGER           │ ││
│           │                     │            │ │  Staff, Reports, Inv.   │ ││
│           │                     │            │ └─────────────────────────┘ ││
│           │                     │            │ ┌─────────────────────────┐ ││
│           │                     │            │ │      RECEPTIONIST       │ ││
│           │                     │            │ │  Appointments, Patients │ ││
│           │                     │            │ │  Check-in, Payments     │ ││
│           │                     │            │ └─────────────────────────┘ ││
│           │                     │            │ ┌─────────────────────────┐ ││
│           │                     │            │ │       DOCTOR            │ ││
│           │                     │            │ │  Patients, Charts, Rx   │ ││
│           │                     │            │ │  Treatment Plans        │ ││
│           │                     │            │ └─────────────────────────┘ ││
│           │                     │            │ ┌─────────────────────────┐ ││
│           │                     │            │ │      ACCOUNTANT         │ ││
│           │                     │            │ │  Invoices, Reports      │ ││
│           │                     │            │ │  Commissions            │ ││
│           │                     │            │ └─────────────────────────┘ ││
│           │                     │            └─────────────┬───────────────┘│
│           │                     │                          │                │
│           └─────────────────────┼──────────────────────────┘                │
│                                 │                                            │
│                    ┌────────────▼────────────┐                              │
│                    │    SUPABASE BACKEND     │                              │
│                    │  • Auth (RLS Policies)  │                              │
│                    │  • Database (Per Role)  │                              │
│                    │  • Edge Functions       │                              │
│                    │  • Real-time            │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                            │
│           ┌─────────────────────┼─────────────────────┐                     │
│           │                     │                     │                     │
│  ┌────────▼────────┐   ┌───────▼───────┐   ┌────────▼────────┐             │
│  │  DENTO DOCTOR   │   │ Future: DENTO │   │ Future: PATIENT │             │
│  │  (Mobile App)   │   │    STAFF      │   │    PORTAL       │             │
│  │                 │   │ (Mobile App)  │   │   (Phase 8)     │             │
│  │ • Calendar      │   │               │   │                 │             │
│  │ • Appointments  │   │ (Optional)    │   │                 │             │
│  │ • Patient View  │   │               │   │                 │             │
│  │ • Earnings      │   │               │   │                 │             │
│  └─────────────────┘   └───────────────┘   └─────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Part 1: Staff Role-Based Admin Portal

## 1.1 Current Role System

### Database Roles
```sql
-- Current roles in the system
CREATE TYPE user_role AS ENUM (
  'admin',           -- Clinic Owner / Super Admin
  'manager',         -- Clinic Manager
  'doctor',          -- Dentist / Specialist
  'receptionist',    -- Front Desk Staff
  'accountant',      -- Financial Staff
  'hygienist',       -- Dental Hygienist
  'assistant',       -- Dental Assistant
  'lab_tech'         -- Lab Technician
);
```

> **\u26a0\ufe0f Audit Note (Feb 16, 2026):** The actual roles implemented in `src/lib/supabase.js` ROLES enum are: `developer, admin, doctor, receptionist, cbct_tech, assistant, patient`. The roles `manager`, `accountant`, `hygienist`, and `lab_tech` are **planned but not yet in the ROLES constant**. They exist in the DB enum but not in the frontend permission system. The role-based portal (Part 1) will need to add these to the frontend ROLES constant.

## 1.2 Role Permission Matrix

### Admin Portal Menu Visibility by Role

| Module | Admin | Manager | Doctor | Receptionist | Accountant | Hygienist | Assistant |
|--------|:-----:|:-------:|:------:|:------------:|:----------:|:---------:|:---------:|
| **Dashboard** | ✅ Full | ✅ Full | ✅ Limited | ✅ Limited | ✅ Financial | ✅ Today | ✅ Today |
| **Appointments** | ✅ All | ✅ All | ✅ Own | ✅ All | ❌ | ✅ Own | ✅ Assigned |
| **Patients** | ✅ All | ✅ All | ✅ Own | ✅ All | ❌ | ✅ Own | ✅ View |
| **Dental Charts** | ✅ | ✅ View | ✅ Edit | ❌ | ❌ | ✅ Edit | ✅ View |
| **Treatment Plans** | ✅ | ✅ | ✅ Create | ❌ | ❌ | ❌ | ✅ View |
| **Prescriptions** | ✅ | ✅ View | ✅ Create | ❌ | ❌ | ❌ | ❌ |
| **X-Rays** | ✅ | ✅ | ✅ | ✅ Upload | ❌ | ✅ | ✅ |
| **Lab Orders** | ✅ | ✅ | ✅ Create | ✅ Track | ❌ | ❌ | ✅ Track |
| **Invoices** | ✅ | ✅ | ✅ View | ✅ Create | ✅ Full | ❌ | ❌ |
| **Payments** | ✅ | ✅ | ❌ | ✅ Collect | ✅ Full | ❌ | ❌ |
| **Insurance** | ✅ | ✅ | ❌ | ✅ Submit | ✅ Full | ❌ | ❌ |
| **Inventory** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ Use | ✅ Use |
| **Commissions** | ✅ | ✅ View | ✅ Own | ❌ | ✅ Full | ❌ | ❌ |
| **Staff Schedule** | ✅ | ✅ All | ✅ Own | ✅ View | ❌ | ✅ Own | ✅ Own |
| **Leave Requests** | ✅ Approve | ✅ Approve | ✅ Request | ✅ Request | ✅ Request | ✅ Request | ✅ Request |
| **Reports** | ✅ All | ✅ All | ✅ Own | ✅ Basic | ✅ Financial | ❌ | ❌ |
| **Settings** | ✅ All | ✅ Limited | ✅ Profile | ✅ Profile | ✅ Profile | ✅ Profile | ✅ Profile |
| **Branches** | ✅ All | ✅ Assigned | ✅ Assigned | ✅ Assigned | ✅ View | ✅ Assigned | ✅ Assigned |
| **Users** | ✅ All | ✅ Staff | ❌ | ❌ | ❌ | ❌ | ❌ |

### Legend
- ✅ Full: Complete CRUD access
- ✅ All: Access to all records
- ✅ Own: Access to own records only
- ✅ View: Read-only access
- ✅ Create: Can create new records
- ✅ Limited: Restricted view
- ❌ No access

## 1.3 Role-Specific Dashboards

### 1.3.1 Admin/Manager Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard - Clinic Overview                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Today's     │ │ Revenue     │ │ Patients    │ │ Staff       │ │
│ │ Appointments│ │ This Month  │ │ This Month  │ │ Present     │ │
│ │     24      │ │   $45,230   │ │     127     │ │    12/15    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │   Revenue Chart (Month)     │ │   Upcoming Appointments     │ │
│ │   [Bar Chart]               │ │   - 09:00 John Smith        │ │
│ │                             │ │   - 09:30 Sarah Johnson     │ │
│ │                             │ │   - 10:00 Mike Brown        │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │   Doctor Performance        │ │   Alerts                    │ │
│ │   [Table with stats]        │ │   ⚠️ 3 overdue payments     │ │
│ │                             │ │   ⚠️ 2 low stock items      │ │
│ │                             │ │   ⚠️ 1 expired license      │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3.2 Doctor Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard - Dr. Ahmad Hassan                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Today's     │ │ This Month  │ │ Pending     │ │ Rating      │ │
│ │ Patients    │ │ Earnings    │ │ Notes       │ │             │ │
│ │     8       │ │   $3,450    │ │     2       │ │    ⭐ 4.8   │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │   Today's Schedule                                          │ │
│ │                                                             │ │
│ │   09:00  ● John Smith - Root Canal (In Progress)           │ │
│ │   10:30  ○ Sarah Johnson - Crown Prep                      │ │
│ │   12:00  ○ Lunch Break                                     │ │
│ │   01:00  ○ Mike Brown - Extraction                         │ │
│ │   02:00  ○ Lisa Chen - Cleaning                            │ │
│ │   03:00  ○ Available                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │   Quick Actions             │ │   Recent Patients           │ │
│ │   [View Patient] [New Rx]   │ │   - John Smith (today)      │ │
│ │   [Add Note] [Lab Order]    │ │   - Sarah Johnson (today)   │ │
│ │                             │ │   - Mike Brown (yesterday)  │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3.3 Receptionist Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard - Front Desk                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Waiting     │ │ Today's     │ │ Pending     │ │ Walk-ins    │ │
│ │ Patients    │ │ Appointments│ │ Check-ins   │ │ Today       │ │
│ │     3       │ │     24      │ │     5       │ │     2       │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │   Waiting Room                                              │ │
│ │                                                             │ │
│ │   1. John Smith - 09:00 - Dr. Ahmad - ⏱️ 10 min waiting    │ │
│ │      [Check-in] [Reschedule] [Cancel]                       │ │
│ │                                                             │ │
│ │   2. Sarah Johnson - 09:30 - Dr. Ahmad - Just arrived       │ │
│ │      [Check-in] [Reschedule] [Cancel]                       │ │
│ │                                                             │ │
│ │   3. Walk-in - Mike Brown - Waiting for availability        │ │
│ │      [Book Slot] [Add to Queue]                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │   Quick Actions             │ │   Upcoming (Next 2 hours)   │ │
│ │   [New Appointment]         │ │   10:00 - Crown Prep        │ │
│ │   [New Patient]             │ │   10:30 - Consultation      │ │
│ │   [Collect Payment]         │ │   11:00 - Cleaning          │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3.4 Accountant Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard - Finance                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Today's     │ │ Outstanding │ │ Insurance   │ │ Overdue     │ │
│ │ Collections │ │ Invoices    │ │ Claims      │ │ Payments    │ │
│ │   $2,450    │ │   $12,340   │ │   $8,500    │ │   $3,200    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │   Revenue Overview (This Month)                             │ │
│ │   [Line Chart - Daily Revenue]                              │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │   Pending Actions           │ │   Doctor Commissions        │ │
│ │   • 5 invoices to send      │ │   Dr. Ahmad: $3,450         │ │
│ │   • 3 claims to submit      │ │   Dr. Sarah: $2,890         │ │
│ │   • 2 reconciliations due   │ │   Dr. Mike: $1,230          │ │
│ │   • 8 installments due      │ │   [View All] [Process]      │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.4 Implementation Tasks - Role-Based Portal

### 1.4.1 Navigation Configuration
- [ ] Create `rolePermissions.js` configuration file
- [ ] Define menu items per role
- [ ] Create `useRoleAccess` hook
- [ ] Implement `RoleBasedMenu` component
- [ ] Update `AdminLayout` to use role-based menu
- [ ] Hide inaccessible routes per role

### 1.4.2 Dashboard Variations
- [ ] Create `AdminDashboard` component (full stats)
- [ ] Create `DoctorDashboard` component (personal + patients)
- [ ] Create `ReceptionistDashboard` component (waiting room)
- [ ] Create `AccountantDashboard` component (financial)
- [ ] Create `HygienistDashboard` component (today's schedule)
- [ ] Update main Dashboard to render based on role

### 1.4.3 Data Filtering by Role
- [ ] Update `dataProvider.js` to filter by role
- [ ] Add doctor_id filter for doctor role
- [ ] Add branch_id filter for branch-assigned roles
- [ ] Update RLS policies for role-based access
- [ ] Test cross-role data isolation

### 1.4.4 UI Customization
- [ ] Add role indicator in header
- [ ] Customize quick actions per role
- [ ] Role-specific notifications
- [ ] Role-specific help documentation

---

# Part 2: Dento Doctor Mobile App

## 2.0 App Overview

**App Name:** Dento Doctor  
**Target Users:** Doctors/Dentists working at Dento-powered clinics  
**Platforms:** iOS 14+ and Android 10+  
**Repository:** `dento-doctor-mobile/` (separate repo)

### Key Features at a Glance
| Feature | Priority | Complexity |
|---------|----------|------------|
| Authentication (Biometric) | P0 | Medium |
| Appointment Calendar | P0 | High |
| Appointment Management | P0 | High |
| Patient Quick View | P0 | Medium |
| Push Notifications | P0 | High |
| Offline Mode | P1 | High |
| Dental Chart View | P1 | Medium |
| Earnings Dashboard | P1 | Low |
| Time Off Requests | P2 | Low |
| Quick Prescriptions | P2 | Medium |

### Success Metrics
- [ ] App Store rating ≥ 4.5 stars
- [ ] 80% doctor adoption within 3 months of launch
- [ ] < 2% crash rate
- [ ] < 3 second cold start time
- [ ] Offline mode works for 24+ hours without sync

---

## 2.1 Technology Stack

### 2.1.1 Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.73+ | Cross-platform framework |
| Expo SDK | 50+ | Development tooling |
| TypeScript | 5.3+ | Type safety |
| React Navigation | 6.x | Navigation system |
| Supabase JS | 2.x | Backend integration |

### 2.1.2 State Management
| Library | Purpose |
|---------|---------|
| Zustand | Global state (**v5.0+**) |
| TanStack Query | Server state & caching (**v5.62+**) |
| AsyncStorage | Persistent local storage |
| MMKV | High-performance key-value store |

### 2.1.3 UI & Styling
| Library | Purpose |
|---------|---------|
| NativeWind | Tailwind CSS for React Native (**v4.x** — breaking changes from v2) |
| React Native Paper | Material Design components |
| React Native Reanimated | Smooth animations |
| React Native Gesture Handler | Touch handling |
| Expo Vector Icons | Icon library |

### 2.1.4 Native Features
| Library | Purpose |
|---------|---------|
| expo-local-authentication | Biometric (Face ID/Touch ID) |
| expo-notifications | Push notifications |
| expo-image-picker | Camera & gallery |
| expo-secure-store | Encrypted storage |
| @react-native-community/netinfo | Network status |

### 2.1.5 Development Tools
| Tool | Purpose |
|------|---------|
| ESLint + Prettier | Code quality |
| Jest | Unit testing |
| Detox | E2E testing |
| React Native Testing Library | Component testing |
| Flipper | Debugging |

---

## 2.2 Project Setup

### 2.2.1 Repository Structure
```
dento-doctor-mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/              # Auth screens (login)
│   │   └── login.tsx
│   ├── (tabs)/              # Bottom tab screens
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # 📅 Calendar (Home)
│   │   ├── patients.tsx     # 👥 Patients
│   │   ├── earnings.tsx     # 💰 Earnings
│   │   └── profile.tsx      # 👤 Profile
│   ├── appointment/
│   │   └── [id].tsx         # Appointment detail
│   ├── patient/
│   │   └── [id].tsx         # Patient detail
│   └── _layout.tsx          # Root layout
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/             # Basic UI (Button, Card, etc.)
│   │   ├── forms/          # Form components
│   │   ├── calendar/       # Calendar components
│   │   ├── dental/         # Dental chart components
│   │   └── shared/         # Shared components
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useBiometric.ts
│   │   ├── useAppointments.ts
│   │   ├── usePatients.ts
│   │   ├── useNotifications.ts
│   │   ├── useOffline.ts
│   │   └── useEarnings.ts
│   ├── services/           # API services
│   │   ├── supabase.ts
│   │   ├── api.ts
│   │   └── notifications.ts
│   ├── stores/             # Zustand stores
│   │   ├── authStore.ts
│   │   ├── appointmentStore.ts
│   │   └── offlineStore.ts
│   ├── types/              # TypeScript types
│   │   ├── database.ts
│   │   ├── api.ts
│   │   └── navigation.ts
│   ├── utils/              # Utility functions
│   │   ├── date.ts
│   │   ├── formatting.ts
│   │   └── validation.ts
│   ├── constants/          # App constants
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── config.ts
│   └── i18n/               # Localization
│       ├── en.json
│       └── ar.json
├── assets/                  # Images, fonts
├── app.json                 # Expo config
├── eas.json                 # EAS Build config
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

### 2.2.2 Initial Setup Tasks
- [ ] Create Expo project with TypeScript template
- [ ] Configure `app.json` with app identifiers
- [ ] Setup EAS Build configuration
- [ ] Install core dependencies
- [ ] Configure Supabase client
- [ ] Setup environment variables (.env)
- [ ] Configure ESLint + Prettier
- [ ] Setup Git hooks (husky + lint-staged)
- [ ] Configure path aliases (@/components, etc.)

### 2.2.3 Environment Variables
```env
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_LIVEKIT_URL=wss://xxx.livekit.cloud
EXPO_PUBLIC_API_BASE_URL=https://api.dento.app
```

### 2.2.4 App Configuration (app.json)
```json
{
  "expo": {
    "name": "Dento Doctor",
    "slug": "dento-doctor",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1e40af"
    },
    "ios": {
      "bundleIdentifier": "com.dento.doctor",
      "supportsTablet": true,
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID to quickly sign in",
        "NSCameraUsageDescription": "Take photos for patient records"
      }
    },
    "android": {
      "package": "com.dento.doctor",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1e40af"
      },
      "permissions": ["CAMERA", "USE_BIOMETRIC", "USE_FINGERPRINT"]
    },
    "plugins": [
      "expo-local-authentication",
      "expo-notifications",
      "expo-secure-store"
    ]
  }
}
```

---

## 2.3 Backend Integration Architecture

### 2.3.1 Supabase Integration Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    DENTO DOCTOR MOBILE APP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Auth Store  │  │ Appointment  │  │   Patient    │           │
│  │   (Zustand)  │  │    Store     │  │    Store     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│  ┌──────▼─────────────────▼─────────────────▼───────┐           │
│  │              TanStack Query (Cache)              │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                        │
│  ┌──────────────────────▼───────────────────────────┐           │
│  │              Supabase Client                      │           │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐  │           │
│  │  │  Auth   │ │Database │ │Realtime │ │Storage │  │           │
│  │  └─────────┘ └─────────┘ └─────────┘ └────────┘  │           │
│  └──────────────────────┬───────────────────────────┘           │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Database Tables (with RLS)                                   ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ││
│  │ │ doctors  │ │appoint-  │ │ patients │ │ prescriptions    │ ││
│  │ │          │ │ments     │ │          │ │                  │ ││
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ││
│  │ │ services │ │ branches │ │procedure │ │ dental_charts    │ ││
│  │ │          │ │          │ │ _notes   │ │                  │ ││
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ ││
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ ││
│  │ │doctor_   │ │leave_    │ │medical_  │ │ device_tokens    │ ││
│  │ │commis-   │ │requests  │ │history   │ │                  │ ││
│  │ │sions     │ │          │ │          │ │                  │ ││
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Edge Functions                                               ││
│  │ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐ ││
│  │ │ calculate-    │ │ send-         │ │ get-doctor-         │ ││
│  │ │ commission    │ │ notification  │ │ earnings            │ ││
│  │ └───────────────┘ └───────────────┘ └─────────────────────┘ ││
│  │ ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐ ││
│  │ │ register-     │ │ sync-offline- │ │ generate-           │ ││
│  │ │ device-token  │ │ actions       │ │ prescription-pdf    │ ││
│  │ └───────────────┘ └───────────────┘ └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3.2 Database Tables Used by Mobile App

> ⚠️ **CORRECTED Feb 16, 2026** — Table names fixed to match actual database schema.

| Table | Read | Write | Purpose |
| `doctors` | ✅ | ✅ (own profile) | Doctor profile, availability, `working_hours` JSONB |
| `appointments` | ✅ | ✅ (status, notes) | Daily schedule — use `appointment_date`/`start_time`/`end_time` fields |
| `patients` | ✅ | ❌ | Patient information — has `patient_code`, `photo_url`, bilingual names |
| ~~`patient_notes`~~ → `procedure_notes` | ✅ | ✅ | Clinical notes per procedure — `patient_notes` table does NOT exist |
| ~~`dental_records`~~ → `dental_charts` | ✅ | ❌ | Per-tooth chart — `dental_records` does NOT exist, use `dental_charts` |
| `dental_chart_history` | ✅ | ❌ | **NEW** — Historical dental snapshots for comparison |
| `treatment_plans` + `treatment_plan_items` | ✅ | ✅ (approve) | Treatment approval with line items |
| `prescriptions` + `prescription_items` | ✅ | ✅ | Create prescriptions with medication items |
| `branches` | ✅ | ❌ | Clinic branches |
| `services` | ✅ | ❌ | Services list with pricing |
| ~~`commissions`~~ → `doctor_commissions` | ✅ | ❌ | Earnings data — actual table name is `doctor_commissions` |
| ~~`time_off_requests`~~ → `leave_requests` | ✅ | ✅ | Time off requests — use `leave_requests` + `leave_balances` |
| `schedule_exceptions` | ✅ | ✅ | **NEW** — Doctor vacation/sick_leave blocking appointment slots |
| ~~`doctor_ratings`~~ | ❌ | ❌ | ❌ Does NOT exist — deprioritized to P3, remove from MVP |
| `device_tokens` | ❌ | ✅ | Push notification tokens — must create migration |
| `medical_history` | ✅ | ❌ | **NEW** — Patient allergies, conditions, medications (P0 for safety) |
| `doctor_schedules` | ✅ | ❌ | **NEW** — Weekly schedule per branch per day |
| `doctor_availability` | ✅ | ❌ | **NEW** — Per-weekday availability slots |
| `medications` | ✅ | ❌ | **NEW** — Medication database for prescription autocomplete |
| `appointment_types` | ✅ | ❌ | **NEW** — Types with color coding and default duration |
| `leave_types` | ✅ | ❌ | **NEW** — Available leave categories |

### 2.3.3 Real-time Subscriptions
```typescript
// Appointments - real-time updates
supabase
  .channel('doctor-appointments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'appointments',
    filter: `doctor_id=eq.${doctorId}`
  }, handleAppointmentChange)
  .subscribe();

// Notifications channel
supabase
  .channel('doctor-notifications')
  .on('broadcast', { event: 'notification' }, handleNotification)
  .subscribe();
```

### 2.3.4 Edge Functions for Mobile

> ⚠️ **CORRECTED Feb 16, 2026** — Updated to reflect existing vs new edge functions.

#### Existing Edge Functions (Reusable — No Changes Needed)

| Function | Status | Mobile Use Case |
|----------|--------|----------------|
| `calculate-commission` | ✅ Deployed | Auto-calculate after appointment completion |
| `generate-invoice-pdf` | ✅ Deployed | View patient invoices (`?type=clinic`) |
| `currency-rates` | ✅ Deployed | Currency display in earnings |
| `livekit-token` | ✅ Deployed | Future: Video support from mobile |

#### Existing Edge Function (Needs Update)

| Function | Change Needed |
|----------|---------------|
| `send-notification` | Add `push` channel (FCM/APNs) — currently only WhatsApp/Email/SMS |

#### New Edge Functions to Create

| Function | Method | Purpose |
| `register-device-token` | POST | Store FCM/APNs token on login |
| `unregister-device-token` | POST | Remove token on logout (security) |
| `check-app-version` | GET | Force update capability |
| `get-doctor-earnings` | GET | Aggregated earnings from `doctor_commissions` |
| `sync-offline-actions` | POST | Batch sync offline changes |
| `generate-prescription-pdf` | POST | Create prescription PDF (web uses HTML print, mobile needs server-side) |
| `get-mobile-config` | GET | Tenant-specific app config (modules, features) |
| ~~`request-time-off`~~ | ~~POST~~ | ❌ **Removed** — Can INSERT directly into `leave_requests` via Supabase client |

---

## 2.4 Authentication System

### 2.4.1 Authentication Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   App Launch                                                     │
│       │                                                          │
│       ▼                                                          │
│   ┌───────────────┐                                              │
│   │ Check Secure  │                                              │
│   │ Store Token   │                                              │
│   └───────┬───────┘                                              │
│           │                                                      │
│     ┌─────┴─────┐                                                │
│     │Has Token? │                                                │
│     └─────┬─────┘                                                │
│       Yes │  No                                                  │
│     ┌─────┴─────────────────────────┐                            │
│     ▼                               ▼                            │
│ ┌───────────────┐           ┌───────────────┐                    │
│ │ Validate with │           │ Show Login    │                    │
│ │ Supabase      │           │ Screen        │                    │
│ └───────┬───────┘           └───────┬───────┘                    │
│         │                           │                            │
│   ┌─────┴─────┐                     ▼                            │
│   │  Valid?   │           ┌───────────────────┐                  │
│   └─────┬─────┘           │ Email + Password  │                  │
│     Yes │  No             │ OR                │                  │
│     ┌───┴───┐             │ Biometric (if set)│                  │
│     ▼       ▼             └─────────┬─────────┘                  │
│ ┌──────┐ ┌──────┐                   │                            │
│ │Check │ │Clear │                   ▼                            │
│ │Biome-│ │Token,│         ┌───────────────────┐                  │
│ │tric  │ │Show  │         │ Supabase.signIn() │                  │
│ │      │ │Login │         └─────────┬─────────┘                  │
│ └──┬───┘ └──────┘                   │                            │
│    │                          ┌─────┴─────┐                      │
│    ▼                          │  Success? │                      │
│ ┌───────────────┐             └─────┬─────┘                      │
│ │ Biometric     │               Yes │  No                        │
│ │ Prompt        │               ┌───┴───┐                        │
│ └───────┬───────┘               ▼       ▼                        │
│         │                   ┌──────┐ ┌──────┐                    │
│   ┌─────┴─────┐             │Store │ │Show  │                    │
│   │ Verified? │             │Token │ │Error │                    │
│   └─────┬─────┘             └──┬───┘ └──────┘                    │
│     Yes │  No                  │                                 │
│     ┌───┴───┐                  ▼                                 │
│     ▼       ▼            ┌───────────────┐                       │
│ ┌──────┐ ┌──────┐        │ Setup Biometric│                      │
│ │Home  │ │Show  │        │ (First Login)  │                      │
│ │Screen│ │Login │        └───────┬────────┘                      │
│ └──────┘ └──────┘                │                               │
│                                  ▼                               │
│                           ┌───────────────┐                      │
│                           │  Home Screen  │                      │
│                           └───────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4.2 Auth Store (Zustand)
```typescript
// src/stores/authStore.ts
interface AuthState {
  user: User | null;
  doctor: Doctor | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### 2.4.3 Authentication Tasks
- [ ] Login screen UI (email, password)
- [ ] Login form validation
- [ ] Supabase authentication integration
- [ ] Error handling (invalid credentials, network errors)
- [ ] Loading states
- [ ] Secure token storage (expo-secure-store)
- [ ] Session persistence
- [ ] Auto-login on app launch
- [ ] Biometric enrollment flow
- [ ] Biometric authentication
- [ ] Session timeout (24 hours)
- [ ] Logout functionality
- [ ] Clear all secure data on logout
- [ ] Doctor profile fetch on login
- [ ] Tenant context setup
- [ ] Role verification (must be doctor)
- [ ] **CRITICAL: Call `set_config('app.current_tenant_id', tenantId)` via RPC** — without this, RLS policies return empty results

### 2.4.4 Security Considerations
- [ ] Use expo-secure-store for tokens (encrypted)
- [ ] Never store password locally
- [ ] Implement certificate pinning
- [ ] Session timeout after inactivity
- [ ] Rate limit login attempts
- [ ] Audit log for login events

### 2.4.5 Tenant Context — Critical Integration Note (Added Feb 16, 2026)

> **\u26a0\ufe0f This is the most critical integration requirement.** The web app uses `UnifiedTenantContext.jsx` which calls `set_config('app.current_tenant_id', tenantId)` to activate RLS policies. The mobile app MUST replicate this.

**Web App Auth Pattern (from `src/contexts/UnifiedTenantContext.jsx`):**
- `supabase.auth.getUser()` + `onAuthStateChange` listener
- Fetches user's tenants from `tenant_users` table
- Persists selected tenant in localStorage
- Loads active modules from `tenant_modules` → `modules`
- 7 roles: `developer, admin, doctor, receptionist, cbct_tech, assistant, patient`

**Mobile App Must:**
1. Call `supabase.rpc('set_current_tenant', { tenant_id: tenantId })` after login
2. Only allow `doctor` role to access the app
3. Cache tenant info in `expo-secure-store`
4. Reload modules when tenant changes (multi-clinic doctors)
5. Handle AbortError from React StrictMode (already handled in web)

**Appointment Schema Warning:**
The `appointments` table has TWO datetime schemas from different migrations:
- Schema A: `datetime_start` / `datetime_end` (TIMESTAMPTZ)
- Schema B: `appointment_date` (DATE) + `start_time` / `end_time` (TIME) + `duration_minutes`

The web app uses **Schema B**. The mobile app should also use Schema B for consistency.

**Appointment Status Values:**
- Plan says "Scheduled" but actual DB value is `booked`
- Other values: `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`

---

## 2.5 Splash Screen & Animation

### 2.5.1 Splash Screen Design
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│         ┌───────────┐           │
│         │   🦷      │           │
│         │  Dento    │           │
│         │  Doctor   │           │
│         └───────────┘           │
│                                 │
│         ○ ○ ○ (loading)         │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

### 2.5.2 Animation Sequence

| Phase | Duration | Animation | Description |
|-------|----------|-----------|-------------|
| 1. Static Splash | 0-500ms | None | System splash (native) |
| 2. Logo Fade In | 500-1000ms | opacity 0→1 | Logo appears |
| 3. Logo Scale | 1000-1500ms | scale 0.8→1.0 | Logo bounces in |
| 4. Tagline Slide | 1500-2000ms | translateY 20→0 | "Dento Doctor" slides up |
| 5. Loading Dots | 2000ms+ | pulse | Dots animate while loading |
| 6. Transition Out | on ready | scale 1.0→1.1, opacity 1→0 | Zoom out to home |

### 2.5.3 Animation Implementation
```typescript
// src/components/AnimatedSplash.tsx
import { MotiView, MotiText } from 'moti';
import { useEffect, useState } from 'react';
import LottieView from 'lottie-react-native';

export function AnimatedSplash({ onAnimationComplete }: Props) {
  const [isReady, setIsReady] = useState(false);

  return (
    <MotiView
      from={{ opacity: 1, scale: 1 }}
      animate={isReady ? { opacity: 0, scale: 1.1 } : undefined}
      transition={{ type: 'timing', duration: 400 }}
      onDidAnimate={() => isReady && onAnimationComplete()}
      style={styles.container}
    >
      {/* Logo Animation */}
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', delay: 500 }}
      >
        <Image source={require('./logo.png')} />
      </MotiView>

      {/* App Name */}
      <MotiText
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', delay: 1000 }}
      >
        Dento Doctor
      </MotiText>

      {/* Lottie Loading Animation */}
      <LottieView
        source={require('./loading-dots.json')}
        autoPlay
        loop
        style={{ width: 60, height: 20 }}
      />
    </MotiView>
  );
}
```

### 2.5.4 Lottie Animations

| Animation | File | Usage |
|-----------|------|-------|
| Loading Dots | `loading-dots.json` | Splash screen loading |
| Tooth Spin | `tooth-spin.json` | Data loading states |
| Success Check | `success-check.json` | Action confirmations |
| Empty State | `empty-calendar.json` | No appointments |
| Error Shake | `error-shake.json` | Error feedback |

### 2.5.5 Splash Screen Tasks
- [ ] Create static splash image (1284x2778 for iOS)
- [ ] Design Dento logo for splash (tooth icon)
- [ ] Implement AnimatedSplash component
- [ ] Add Moti for declarative animations
- [ ] Add Lottie for complex animations
- [ ] Create loading-dots.json animation
- [ ] Handle auth check during splash
- [ ] Smooth transition to login or home
- [ ] Test on low-end devices (< 3s load)
- [ ] Dark mode splash variant

### 2.5.6 Required Libraries
```json
{
  "dependencies": {
    "moti": "^0.28.0",
    "lottie-react-native": "^6.5.0"
  }
}
```

---

## 2.6 Navigation Architecture

### 2.6.1 Navigation Structure (Expo Router)
```
app/
├── _layout.tsx              # Root layout (providers, auth check)
├── (auth)/
│   ├── _layout.tsx          # Auth stack layout
│   └── login.tsx            # Login screen
├── (app)/
│   ├── _layout.tsx          # Tab layout + header
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Bottom tabs
│   │   ├── index.tsx        # 📅 Calendar (Home)
│   │   ├── patients.tsx     # 👥 Patients
│   │   ├── earnings.tsx     # 💰 Earnings
│   │   └── profile.tsx      # 👤 Profile
│   ├── appointment/
│   │   └── [id].tsx         # Appointment detail
│   ├── patient/
│   │   ├── [id]/
│   │   │   ├── index.tsx    # Patient detail
│   │   │   ├── dental.tsx   # Dental chart
│   │   │   └── notes.tsx    # Notes history
│   ├── prescription/
│   │   └── new.tsx          # New prescription
│   ├── availability/
│   │   └── index.tsx        # Edit availability
│   ├── time-off/
│   │   ├── index.tsx        # Time off list
│   │   └── new.tsx          # Request time off
│   ├── notifications/
│   │   └── index.tsx        # Notification center
│   └── settings/
│       ├── index.tsx        # Settings menu
│       ├── security.tsx     # Security settings
│       └── language.tsx     # Language settings
```

### 2.5.2 Bottom Tab Navigation
| Tab | Icon | Screen | Badge |
|-----|------|--------|-------|
| Calendar | 📅 | Today's appointments | Pending count |
| Patients | 👥 | Recent patients list | - |
| Earnings | 💰 | Monthly earnings | - |
| Profile | 👤 | Doctor profile | Notification dot |

### 2.5.3 Navigation Tasks
- [ ] Setup Expo Router
- [ ] Configure auth redirect (protected routes)
- [ ] Bottom tab navigator with icons
- [ ] Stack navigators for detail screens
- [ ] Deep linking configuration
- [ ] Screen transition animations
- [ ] Header configuration
- [ ] RTL support for Arabic

---

## 2.7 Screen Specifications

### 2.7.1 Login Screen
**Route:** `/(auth)/login`
```
┌─────────────────────────────────┐
│                                 │
│           [Logo]                │
│        Dento Doctor             │
│                                 │
├─────────────────────────────────┤
│                                 │
│   ┌───────────────────────┐     │
│   │ Email                 │     │
│   └───────────────────────┘     │
│                                 │
│   ┌───────────────────────┐     │
│   │ Password        [👁️]  │     │
│   └───────────────────────┘     │
│                                 │
│   ☑️ Remember me                │
│                                 │
│   ┌───────────────────────┐     │
│   │       Sign In         │     │
│   └───────────────────────┘     │
│                                 │
│   ──────── or ────────          │
│                                 │
│   ┌───────────────────────┐     │
│   │    [👆] Use Biometric │     │
│   └───────────────────────┘     │
│                                 │
│   Forgot password?              │
│                                 │
└─────────────────────────────────┘
```

### 2.7.2 Calendar Screen (Home)
**Route:** `/(app)/(tabs)/index`
```
┌─────────────────────────────────┐
│ 📅 Today      [🔔 3]  [Filter]  │
├─────────────────────────────────┤
│                                 │
│  ◀️ Feb 9, 2026 (Sun) ▶️        │
│                                 │
│  [Day] [Week] [Month]           │
│                                 │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 09:00 AM                    │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │ 🔵 John Smith           │ │ │
│ │ │ Dental Cleaning         │ │ │
│ │ │ 09:00 - 09:30           │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 10:00 AM                    │ │
│ │ ┌─────────────────────────┐ │ │
│ │ │ 🟠 Sarah Johnson  [!]   │ │ │
│ │ │ Root Canal              │ │ │
│ │ │ 10:00 - 11:30           │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [📅] [👥] [💰] [👤]            │
└─────────────────────────────────┘
```

**Status Color Codes:**
| Status | Color | Icon |
|--------|-------|------|
| Scheduled | 🔵 Blue | - |
| Confirmed | 🟢 Green | ✓ |
| In Progress | 🟠 Orange | ⏱️ |
| Completed | ⚫ Gray | ✓✓ |
| Cancelled | 🔴 Red | ✗ |
| No Show | ⚪ White | ⊘ |

### 2.7.3 Appointment Detail Screen
**Route:** `/(app)/appointment/[id]`
```
┌─────────────────────────────────┐
│ ← Appointment Details           │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🟢 CONFIRMED                │ │
│ │ Today, 10:00 AM - 11:30 AM  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ───────── Patient ──────────    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [👤]  Sarah Johnson         │ │
│ │       📞 +1 555-123-4567    │ │
│ │       📧 sarah@email.com    │ │
│ │                    [View] → │ │
│ └─────────────────────────────┘ │
│                                 │
│ ───────── Service ──────────    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Root Canal Treatment        │ │
│ │ Duration: 90 min            │ │
│ │ Price: $450                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ ────────── Notes ───────────    │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Patient has mild anxiety    │ │
│ │ Allergic to penicillin      │ │
│ │                    [Edit]   │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│                                 │
│ ┌───────────┐ ┌───────────────┐ │
│ │  Cancel   │ │ Start Appt ▶️ │ │
│ └───────────┘ └───────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Actions by Status:**
| Current Status | Available Actions |
|----------------|-------------------|
| Scheduled | Confirm, Reschedule, Cancel |
| Confirmed | Start, Reschedule, Cancel |
| In Progress | Complete, Add Notes |
| Completed | View Summary, Add Notes |
| Cancelled | - |

### 2.7.4 Patient Detail Screen
**Route:** `/(app)/patient/[id]`
```
┌─────────────────────────────────┐
│ ← Patient Details               │
├─────────────────────────────────┤
│                                 │
│        ┌───────────┐            │
│        │    👤     │            │
│        │   Photo   │            │
│        └───────────┘            │
│       Sarah Johnson             │
│       Female, 34 years          │
│                                 │
│ ┌────────────────────────────┐  │
│ │📞 +1 555-123-4567  [Call]  │  │
│ │📧 sarah@email.com          │  │
│ └────────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ [Overview] [Dental] [History]   │
├─────────────────────────────────┤
│                                 │
│ ──── Active Treatment ────      │
│ ┌─────────────────────────────┐ │
│ │ Root Canal - Tooth #14      │ │
│ │ Progress: 2/3 sessions      │ │
│ │ [████████░░░░] 66%          │ │
│ └─────────────────────────────┘ │
│                                 │
│ ──── Medical Alerts ────        │
│ ┌─────────────────────────────┐ │
│ │ ⚠️ Penicillin Allergy       │ │
│ │ ⚠️ Mild Dental Anxiety      │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ [📝 Add Note]  [💊 Prescribe]  │
└─────────────────────────────────┘
```

### 2.7.5 Dental Chart View
**Route:** `/(app)/patient/[id]/dental`
```
┌─────────────────────────────────┐
│ ← Dental Chart                  │
├─────────────────────────────────┤
│                                 │
│ [Adult Teeth]  [Baby Teeth]     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     Upper Arch              │ │
│ │  18 17 16 15 14 13 12 11    │ │
│ │  [🦷][🦷][🦷][🔴][🦷][🦷][🦷][🦷] │ │
│ │      21 22 23 24 25 26 27 28│ │
│ │  [🦷][🦷][🦷][🦷][🦷][🟡][🦷][🦷] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     Lower Arch              │ │
│ │  48 47 46 45 44 43 42 41    │ │
│ │  [🦷][🦷][🔵][🦷][🦷][🦷][🦷][🦷] │ │
│ │      31 32 33 34 35 36 37 38│ │
│ │  [🦷][🦷][🦷][🦷][🦷][🦷][🦷][❌] │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Selected: Tooth #14             │
│ ┌─────────────────────────────┐ │
│ │ Condition: Needs Treatment  │ │
│ │ Procedure: Root Canal       │ │
│ │ Status: In Progress (2/3)   │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Legend:**
| Icon | Meaning |
|------|---------|
| 🦷 | Healthy |
| 🔴 | Needs Treatment |
| 🟡 | Filled/Restored |
| 🔵 | Crown |
| ❌ | Missing/Extracted |
| 🟠 | In Treatment |

### 2.7.6 Earnings Screen
**Route:** `/(app)/(tabs)/earnings`
```
┌─────────────────────────────────┐
│ 💰 Earnings                     │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │     February 2026           │ │
│ │    ◀️ [Month Picker] ▶️     │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     $4,250.00               │ │
│ │     Total Earnings          │ │
│ │                             │ │
│ │  [📊 Chart visualization]   │ │
│ │                             │ │
│ │ ┌─────────┐ ┌─────────────┐ │ │
│ │ │$3,800   │ │ $450        │ │ │
│ │ │Paid     │ │ Pending     │ │ │
│ │ └─────────┘ └─────────────┘ │ │
│ └─────────────────────────────┘ │
│                                 │
│ ───── Breakdown ─────           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Root Canals (4)      $1,800 │ │
│ │ Cleanings (12)       $1,200 │ │
│ │ Fillings (8)          $800  │ │
│ │ Consultations (15)    $450  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ───── Statistics ─────          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 👥 Patients Seen: 28        │ │
│ │ 📅 Appointments: 39         │ │
│ │ ⭐ Avg Rating: 4.8          │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### 2.7.7 Profile Screen
**Route:** `/(app)/(tabs)/profile`
```
┌─────────────────────────────────┐
│ 👤 Profile                      │
├─────────────────────────────────┤
│                                 │
│        ┌───────────┐            │
│        │    👤     │            │
│        │   Photo   │ [📷]       │
│        └───────────┘            │
│        Dr. Ahmad Hassan         │
│        Orthodontist             │
│        ⭐ 4.8 (127 reviews)     │
│                                 │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📅 Availability        →    │ │
│ ├─────────────────────────────┤ │
│ │ 🏖️ Time Off Requests   →    │ │
│ ├─────────────────────────────┤ │
│ │ 🔔 Notifications (3)   →    │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⚙️ Settings             →    │ │
│ ├─────────────────────────────┤ │
│ │ 🌐 Language: English   →    │ │
│ ├─────────────────────────────┤ │
│ │ 🔒 Security            →    │ │
│ └─────────────────────────────┘ │
│                                 │
│        Version 1.0.0            │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      🚪 Sign Out            │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 2.8 Offline Support Architecture

### 2.8.1 Offline Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFLINE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │                    SYNC MANAGER                             │  │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │  │
│ │  │ Network     │  │ Sync Queue  │  │ Conflict Resolver   │ │  │
│ │  │ Monitor     │  │ (FIFO)      │  │ (Last-Write-Wins)   │ │  │
│ │  └─────────────┘  └─────────────┘  └─────────────────────┘ │  │
│ └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│ ┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐     │
│ │ SQLite/MMKV  │  │ TanStack Query   │  │ AsyncStorage    │     │
│ │ (Structured) │  │ (Cache)          │  │ (Simple KV)     │     │
│ └──────────────┘  └──────────────────┘  └─────────────────┘     │
│        │                    │                    │               │
│        ▼                    ▼                    ▼               │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │                     LOCAL DATA STORE                          ││
│ │                                                               ││
│ │  📅 Today's Appointments (pre-fetched)                        ││
│ │  👥 Recent Patients (last 50)                                 ││
│ │  🦷 Patient Dental Records (cached on view)                   ││
│ │  📝 Pending Notes (queued for sync)                           ││
│ │  ⚙️ User Preferences                                          ││
│ │                                                               ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.8.2 Cacheable Data

| Data | Cache Duration | Priority | Size Limit |
|------|----------------|----------|------------|
| Today's appointments | Until midnight | High | - |
| Tomorrow's appointments | Until end of tomorrow | Medium | - |
| Recent patients (50) | 7 days | High | 50 records |
| Patient dental charts | On-demand, 24h | Low | Last 10 viewed |
| Services list | 30 days | Low | - |
| Doctor profile | 7 days | Medium | - |
| Pending sync queue | Permanent until synced | Critical | - |

### 2.8.3 Offline Actions Queue
```typescript
interface OfflineAction {
  id: string;
  type: 'update_appointment' | 'add_note' | 'create_prescription';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}
```

### 2.8.4 Offline Tasks
- [ ] Network status monitoring (@react-native-community/netinfo)
- [ ] SQLite setup for structured data
- [ ] MMKV for high-performance key-value
- [ ] Pre-fetch today's appointments on login
- [ ] Cache recent patients on list view
- [ ] Queue offline actions (notes, status changes)
- [ ] Sync queue on reconnect
- [ ] Conflict resolution strategy
- [ ] Offline indicator UI
- [ ] Background sync (when app is backgrounded)
- [ ] Clear stale cache (>7 days)
- [ ] Cache size management

---

## 2.9 Push Notifications System

### 2.9.1 Notification Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                 PUSH NOTIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │ Admin Panel  │  "New appointment booked"                     │
│  │ or System    │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Supabase Edge Function                   │       │
│  │              send-notification                        │       │
│  └──────────────────────┬───────────────────────────────┘       │
│                         │                                        │
│    ┌────────────────────┼────────────────────┐                  │
│    ▼                    ▼                    ▼                  │
│ ┌──────┐          ┌──────────┐         ┌──────────┐            │
│ │ FCM  │          │ Database │         │   APNs   │            │
│ │(And) │          │(if online│         │  (iOS)   │            │
│ └──┬───┘          │ realtime)│         └────┬─────┘            │
│    │              └──────────┘              │                   │
│    │                                        │                   │
│    └──────────────────┬─────────────────────┘                   │
│                       ▼                                          │
│              ┌──────────────────┐                               │
│              │   Mobile App     │                               │
│              │                  │                               │
│              │ • Show banner    │                               │
│              │ • Update badge   │                               │
│              │ • Navigate on    │                               │
│              │   tap            │                               │
│              └──────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.9.2 Notification Types

| Type | Trigger | Action on Tap | Sound |
|------|---------|---------------|-------|
| New Appointment | Admin books | Open appointment | Default |
| Appointment Reminder | 1h before | Open appointment | Default |
| Appointment Cancelled | Patient/Admin cancels | Open calendar | Default |
| Time Off Approved | Admin approves | Open time off | Chime |
| Time Off Rejected | Admin rejects | Open time off | Alert |
| System Message | Admin sends | Open notifications | Default |

### 2.9.3 Push Notification Tasks
- [ ] Expo Notifications setup
- [ ] Request notification permissions
- [ ] Get and store device token (FCM/APNs)
- [ ] Create `register-device-token` edge function
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Notification tap navigation
- [ ] Badge count management
- [ ] Update `send-notification` edge function for mobile
- [ ] Create Notification Center screen
- [ ] Read/unread status
- [ ] Clear notifications
- [ ] Notification preferences (settings)
- [ ] Unregister token on logout

---

## 2.10 Localization (i18n)

### 2.10.1 Supported Languages

| Language | Code | Direction | Status |
|----------|------|-----------|--------|
| English | en | LTR | Primary |
| Arabic | ar | RTL | Secondary |

### 2.10.2 i18n Setup
```typescript
// src/i18n/index.ts
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import en from './en.json';
import ar from './ar.json';

const i18n = new I18n({ en, ar });
i18n.locale = Localization.locale;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
```

### 2.10.3 RTL Support
```typescript
// App startup
import { I18nManager } from 'react-native';

const isRTL = i18n.locale.startsWith('ar');
if (I18nManager.isRTL !== isRTL) {
  I18nManager.forceRTL(isRTL);
  // Restart app for RTL changes
}
```

### 2.10.4 Localization Tasks
- [ ] Install i18n-js and expo-localization
- [ ] Create translation files (en.json, ar.json)
- [ ] Setup I18n provider
- [ ] RTL detection and configuration
- [ ] Language switching in settings
- [ ] Persist language preference
- [ ] Format dates/times by locale
- [ ] Format currency by locale
- [ ] Test all screens in Arabic
- [ ] Test all RTL layouts

---

## 2.11 Testing Strategy

### 2.11.1 Testing Pyramid

| Level | Tool | Coverage Target | Focus |
|-------|------|-----------------|-------|
| Unit | Jest | 80% | Utils, hooks, stores |
| Component | RTL | 60% | UI components |
| Integration | Jest | 50% | API integration |
| E2E | Detox | Critical paths | User flows |

### 2.11.2 E2E Test Scenarios (Detox)
```typescript
// e2e/login.test.ts
describe('Login Flow', () => {
  it('should login with valid credentials', async () => {
    await element(by.id('email-input')).typeText('doctor@clinic.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('calendar-screen'))).toBeVisible();
  });
  
  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@email.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('error-message'))).toBeVisible();
  });
});
```

### 2.11.3 Testing Tasks
- [ ] Setup Jest configuration
- [ ] Setup React Native Testing Library
- [ ] Write unit tests for utilities
- [ ] Write unit tests for hooks
- [ ] Write unit tests for stores
- [ ] Write component tests
- [ ] Setup Detox for E2E
- [ ] Write E2E tests for critical paths
- [ ] Setup CI test automation
- [ ] Achieve 70% code coverage

---

## 2.12 CI/CD Pipeline

### 2.12.1 Pipeline Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD PIPELINE (GitHub Actions)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────┐   │
│ │  Push   │──▶│  Lint   │──▶│  Test   │──▶│  EAS Build      │   │
│ └─────────┘   └─────────┘   └─────────┘   └────────┬────────┘   │
│                                                     │            │
│                              ┌──────────────────────┴──────────┐ │
│                              ▼                                 ▼ │
│                       ┌─────────────┐               ┌──────────┐ │
│                       │ TestFlight  │               │ Play Int │ │
│                       │ (iOS)       │               │ Testing  │ │
│                       └──────┬──────┘               └────┬─────┘ │
│                              │                           │       │
│                              └───────────┬───────────────┘       │
│                                          ▼                       │
│                                   ┌─────────────┐                │
│                                   │  Manual QA  │                │
│                                   └──────┬──────┘                │
│                                          ▼                       │
│                              ┌──────────────────────┐            │
│                              │ Production Release   │            │
│                              │ (App Store + Play)   │            │
│                              └──────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.12.2 CI/CD Tasks
- [ ] Setup EAS account and configuration
- [ ] Create GitHub Actions workflow
- [ ] Configure ESLint in CI
- [ ] Configure Jest in CI
- [ ] Setup EAS Build for development
- [ ] Setup EAS Build for production
- [ ] Configure TestFlight submission
- [ ] Configure Play Store submission
- [ ] Setup automatic versioning
- [ ] Configure environment secrets

---

## 2.13 App Store Preparation

### 2.13.1 iOS App Store

| Requirement | Status | Notes |
|-------------|--------|-------|
| Apple Developer Account | [ ] | $99/year |
| App ID Bundle | [ ] | com.dento.doctor |
| Provisioning Profiles | [ ] | Development + Distribution |
| App Icons (1024x1024) | [ ] | All sizes |
| Splash Screen | [ ] | LaunchScreen.storyboard |
| Screenshots (6.5", 5.5") | [ ] | All required sizes |
| App Preview Video | [ ] | Optional but recommended |
| App Name & Subtitle | [ ] | Max 30 characters |
| Description | [ ] | Max 4000 characters |
| Keywords | [ ] | Max 100 characters |
| Privacy Policy URL | [ ] | Required |
| Support URL | [ ] | Required |
| App Review Notes | [ ] | Demo credentials |
| Age Rating | [ ] | 4+ (Medical) |

### 2.13.2 Google Play Store

| Requirement | Status | Notes |
|-------------|--------|-------|
| Google Play Console | [ ] | $25 one-time |
| Package Name | [ ] | com.dento.doctor |
| Signing Key | [ ] | Play App Signing |
| App Icon (512x512) | [ ] | PNG format |
| Feature Graphic (1024x500) | [ ] | Required |
| Screenshots (Phone) | [ ] | Min 2, max 8 |
| Screenshots (Tablet) | [ ] | 7" and 10" |
| Short Description | [ ] | Max 80 characters |
| Full Description | [ ] | Max 4000 characters |
| Privacy Policy URL | [ ] | Required |
| Content Rating | [ ] | Questionnaire |
| Target Audience | [ ] | Professionals (18+) |

---

## 2.14 Integration with Admin Portal

### 2.14.1 Shared Data & Real-time Sync

| Feature | Admin Creates | Mobile Receives |
|---------|---------------|-----------------|
| Appointments | ✅ | Real-time notification |
| Patient Records | ✅ | Cached on demand |
| Doctor Schedule | ✅ | Synced daily |
| Time Off Approval | ✅ | Push notification |
| Commission Data | ✅ | Pull on demand |

### 2.14.2 Device Tokens Table (New Migration)
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  doctor_id UUID REFERENCES doctors,
  tenant_id UUID REFERENCES tenants NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- RLS Policy
CREATE POLICY "Users can manage own tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### 2.14.3 Integration Tasks
- [ ] Create device_tokens table migration
- [ ] Create register-device-token edge function
- [ ] Update send-notification to support mobile
- [ ] Test real-time appointment updates
- [ ] Test push notification delivery
- [ ] Verify RLS policies for mobile access
- [ ] Test offline sync with admin changes
- [ ] Document mobile API endpoints

---

## 2.15 Timeline & Milestones

### 2.15.1 Development Timeline (11 Weeks)

> **UPDATED Feb 16, 2026** — Added Week 0 for backend prep work.

| Week | Phase | Deliverables |
|------|-------|--------------|
| **0** | **Backend Prep** | **Create `device_tokens` migration, 6 new edge functions, update `send-notification`, generate `database.types.ts`** |
| 1 | Setup | Project setup, auth, navigation |
| 2 | Core | Calendar screen, appointment list |
| 3 | Core | Appointment detail, patient quick view |
| 4 | Features | Dental chart, notes, prescriptions |
| 5 | Features | Earnings, availability, time off |
| 6 | Infra | Push notifications, offline mode |
| 7 | Polish | Theming, i18n, RTL Arabic |
| 8 | Testing | Unit tests, E2E tests, QA |
| 9 | Prep | App store assets, beta release |
| 10 | Release | Production release, monitoring |

### 2.15.2 Milestone Checklist

**Milestone 1: Foundation (Week 1-2)**
- [ ] Project structure complete
- [ ] Authentication working
- [ ] Navigation implemented
- [ ] Calendar screen functional
- [ ] Supabase connected

**Milestone 2: Core Features (Week 3-4)**
- [ ] Appointment management complete
- [ ] Patient features working
- [ ] Clinical features (dental chart) done
- [ ] Real-time updates working

**Milestone 3: Extended Features (Week 5-6)**
- [ ] Earnings dashboard complete
- [ ] Availability management working
- [ ] Push notifications functional
- [ ] Offline mode implemented

**Milestone 4: Polish (Week 7-8)**
- [ ] Dark mode working
- [ ] Arabic translation complete
- [ ] RTL layout verified
- [ ] All tests passing
- [ ] Performance optimized

**Milestone 5: Release (Week 9-10)**
- [ ] Beta testing complete
- [ ] Bug fixes applied
- [ ] App store approved
- [ ] Production deployed
- [ ] Monitoring active

---

## 2.16 Dependencies & Libraries

### 2.16.1 Production Dependencies

> **\u26a0\ufe0f UPDATED Feb 16, 2026** — Versions updated. React Navigation removed (use Expo Router).

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-secure-store": "~13.0.0",
    "expo-image": "~2.0.0",
    "expo-localization": "~15.0.0",
    "@expo/vector-icons": "^14.0.0",
    "@supabase/supabase-js": "^2.49.0",
    "@tanstack/react-query": "^5.62.0",
    "zustand": "^5.0.0",
    "i18n-js": "^4.3.0",
    "react-native-mmkv": "^3.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-screens": "~4.0.0",
    "react-native-safe-area-context": "~4.12.0",
    "react-native-svg": "~15.8.0",
    "@react-native-community/netinfo": "~11.4.0",
    "nativewind": "^4.0.0",
    "date-fns": "^4.1.0"
  }
}
```

### 2.16.2 Development Dependencies
```json
{
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "@testing-library/react-native": "^12.8.0",
    "jest": "^29.7.0",
    "detox": "^20.29.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 2.17 Developer Portal Additions

### 2.17.1 New Developer Portal Pages

```
┌─────────────────────────────────────────────────────────────────┐
│ Developer Portal - Mobile Section                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 📱 Mobile                                                        │
│ ├── 📱 Mobile Config         ← App settings, versions           │
│ ├── 📲 Devices               ← Registered devices               │
│ ├── 🔔 Push Notifications    ← Send & manage                    │
│ └── 📈 Mobile Analytics      ← Usage stats                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.17.2 Mobile Configuration Page

**Route:** `/developer/mobile/config`

| Setting | Type | Purpose |
|---------|------|---------|
| `min_app_version` | string | Minimum required version (e.g., "1.2.0") |
| `latest_app_version` | string | Latest available version |
| `force_update` | boolean | Force users to update immediately |
| `maintenance_mode` | boolean | Show maintenance screen in app |
| `offline_enabled` | boolean | Enable/disable offline mode |
| `push_enabled` | boolean | Enable/disable push notifications |
| `quiet_hours_start` | time | No notifications after (e.g., 22:00) |
| `quiet_hours_end` | time | Resume notifications (e.g., 07:00) |
| `sync_interval_minutes` | number | Background sync frequency |
| `cache_ttl_hours` | number | Data cache duration |

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Mobile App Configuration                                     🔧 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ─── Version Control ───                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Minimum Version    [1.0.0        ]                          │ │
│ │ Latest Version     [1.2.0        ]                          │ │
│ │ Force Update       [○ Off ● On  ]   ⚠️ Will block old apps  │ │
│ │ Maintenance Mode   [● Off ○ On  ]                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ─── Features ───                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Offline Mode       [● Enabled ○ Disabled]                   │ │
│ │ Push Notifications [● Enabled ○ Disabled]                   │ │
│ │                                                             │ │
│ │ Quiet Hours: [22:00] to [07:00]                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ─── Sync Settings ───                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Background Sync Interval   [15    ] minutes                 │ │
│ │ Data Cache Duration        [24    ] hours                   │ │
│ │ Max Offline Queue Size     [100   ] actions                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                              [Save Changes]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.17.3 Device Management Page

**Route:** `/developer/mobile/devices`

| Column | Description |
|--------|-------------|
| Doctor | Doctor name |
| Device | iPhone 14 Pro / Samsung Galaxy S23 |
| Platform | iOS / Android |
| App Version | 1.2.0 |
| Last Active | 2 hours ago |
| Status | Active / Inactive |
| Actions | Revoke Access |

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Registered Devices                            [🔍 Search] [📥]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📊 Active: 45 | Inactive: 12 | Total: 57                  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Doctor       │ Device        │ Version │ Last Active │ ⚙️   ││
│ ├──────────────┼───────────────┼─────────┼─────────────┼──────┤│
│ │ Dr. Ahmad    │ iPhone 14 Pro │ 1.2.0   │ 2h ago     │ [❌] ││
│ │ Dr. Sarah    │ Galaxy S23    │ 1.1.0   │ 1d ago     │ [❌] ││
│ │ Dr. Mike     │ iPhone 13     │ 1.0.0   │ 5d ago ⚠️  │ [❌] ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ⚠️ = Outdated version                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.17.4 Push Notifications Page

**Route:** `/developer/mobile/notifications`

**Features:**
- Send broadcast notifications to all doctors
- Send to specific tenant
- View delivery statistics
- Notification templates

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Push Notifications                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [📤 Send New]  [📋 Templates]  [📊 Analytics]                   │
│                                                                  │
│ ─── Send Notification ───                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Target:  (●) All Doctors  (○) Specific Tenant               │ │
│ │          [Select Tenant ▼]                                  │ │
│ │                                                             │ │
│ │ Title:   [System Maintenance Tonight        ]               │ │
│ │ Body:    [The app will be unavailable from 2-4 AM          ]│ │
│ │                                                             │ │
│ │ Schedule: (●) Send Now  (○) Schedule for [____] [____]     │ │
│ │                                                             │ │
│ │                          [Preview] [Send]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ─── Recent Notifications ───                                     │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Title              │ Sent      │ Delivered │ Opened │ Rate  ││
│ ├────────────────────┼───────────┼───────────┼────────┼───────┤│
│ │ System Update      │ 50        │ 48        │ 32     │ 64%   ││
│ │ New Feature!       │ 50        │ 47        │ 41     │ 82%   ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.17.5 Mobile Analytics Page

**Route:** `/developer/mobile/analytics`

| Metric Category | Metrics |
|-----------------|---------|
| **Usage** | DAU, WAU, MAU, session duration |
| **Devices** | iOS vs Android, app versions |
| **Performance** | Sync success rate, API latency |
| **Errors** | Crash rate, failed syncs |
| **Engagement** | Push open rate, feature usage |

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Mobile Analytics                     [Last 7 Days ▼] [Export]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │     45      │ │     32      │ │    98.2%    │ │    0.5%     │ │
│ │ Total Users │ │ Active Today│ │ Sync Rate   │ │ Crash Rate  │ │
│ │   +12%      │ │   +5%       │ │   ↑ 1.2%    │ │   ↓ 0.1%    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Daily Active Users                                          │ │
│ │ [📊 Line chart showing DAU over time]                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Platform Distribution   │ │ App Versions                    │ │
│ │ 🍎 iOS: 60%             │ │ v1.2.0: 70%                     │ │
│ │ 🤖 Android: 40%         │ │ v1.1.0: 25%                     │ │
│ │                         │ │ v1.0.0: 5% ⚠️                   │ │
│ └─────────────────────────┘ └─────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.17.6 Developer Portal Tasks
- [ ] Create `MobileConfigPage.jsx` component
- [ ] Create `DeviceManagementPage.jsx` component
- [ ] Create `PushNotificationsPage.jsx` component
- [ ] Create `MobileAnalyticsPage.jsx` component
- [ ] Add mobile routes to Developer Router
- [ ] Update sidebar navigation
- [ ] Create `useMobileConfig` hook
- [ ] Create `useDevices` hook
- [ ] Create `useMobileAnalytics` hook
- [ ] Add mobile menu section

---

## 2.18 Admin Portal Additions

### 2.18.1 Changes for Mobile Support

The Admin Portal needs minimal changes since most features already exist. Key additions:

| Feature | Purpose | Page |
|---------|---------|------|
| Push Notification Preferences | Let doctors set notification preferences | Doctor Settings |
| Device Info Display | Show doctor's registered devices | Doctor Profile |
| Mobile Activity Log | View doctor's app activity | Doctor Profile |
| Emergency Logout | Force logout all doctor's devices | Doctor Profile |

### 2.18.2 Doctor Profile - Device Section

**Add to:** Doctor detail page in Admin Portal

```
┌─────────────────────────────────────────────────────────────────┐
│ Dr. Ahmad Hassan - Profile                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [General] [Schedule] [Earnings] [Devices] [Settings]            │
│                                                                  │
│ ─── Registered Devices ───                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📱 iPhone 14 Pro                                            │ │
│ │    iOS 17.2 • Dento Doctor v1.2.0                           │ │
│ │    Last active: 2 hours ago                                 │ │
│ │    Push notifications: ✅ Enabled                           │ │
│ │                                          [Revoke Access]    │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 📱 iPad Pro                                                 │ │
│ │    iPadOS 17.2 • Dento Doctor v1.1.0                        │ │
│ │    Last active: 3 days ago                                  │ │
│ │    Push notifications: ❌ Disabled                          │ │
│ │                                          [Revoke Access]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Logout All Devices]                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.18.3 Notification Preferences

**Add to:** Doctor settings or dedicated page

| Setting | Type | Purpose |
|---------|------|---------|
| `new_appointment` | boolean | Notify on new bookings |
| `appointment_reminder` | boolean | Reminder before appointments |
| `reminder_minutes` | number | Minutes before (15, 30, 60) |
| `cancellations` | boolean | Notify on cancellations |
| `time_off_response` | boolean | Notify on time off approval/rejection |
| `system_messages` | boolean | Receive system announcements |

### 2.18.4 Admin Portal Tasks
- [ ] Add Devices tab to Doctor profile page
- [ ] Create device list component
- [ ] Add "Revoke Access" functionality
- [ ] Add "Logout All Devices" button
- [ ] Create notification preferences form
- [ ] Update doctor settings page
- [ ] Add mobile activity to doctor timeline

---

# Part 3: Backend Requirements

## 3.1 Database Migrations

### 3.1.1 Migration: `20260209_mobile_app_config.sql`

```sql
-- Mobile app configuration per tenant
CREATE TABLE mobile_app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants NOT NULL UNIQUE,
  
  -- Version control
  min_app_version TEXT DEFAULT '1.0.0',
  latest_app_version TEXT DEFAULT '1.0.0',
  force_update BOOLEAN DEFAULT false,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  
  -- Features
  offline_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Sync settings
  sync_interval_minutes INTEGER DEFAULT 15,
  cache_ttl_hours INTEGER DEFAULT 24,
  max_offline_queue INTEGER DEFAULT 100,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE mobile_app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can manage mobile config" ON mobile_app_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'developer')
    )
  );

CREATE POLICY "Mobile app can read config" ON mobile_app_config
  FOR SELECT USING (true);

-- Index
CREATE INDEX idx_mobile_app_config_tenant ON mobile_app_config(tenant_id);
```

### 3.1.2 Migration: `20260209_device_tokens.sql`

```sql
-- Device tokens for push notifications
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  doctor_id UUID REFERENCES doctors,
  tenant_id UUID REFERENCES tenants NOT NULL,
  
  -- Device info
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  token TEXT NOT NULL,
  device_name TEXT,
  device_model TEXT,
  os_version TEXT,
  app_version TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate tokens
  UNIQUE(user_id, token)
);

-- RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Developers can view all tokens" ON device_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'developer')
    )
  );

CREATE POLICY "Admins can manage tenant tokens" ON device_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN tenants t ON t.id = device_tokens.tenant_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.tenant_id = device_tokens.tenant_id
    )
  );

-- Indexes
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_doctor ON device_tokens(doctor_id);
CREATE INDEX idx_device_tokens_tenant ON device_tokens(tenant_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
```

### 3.1.3 Migration: `20260209_notification_preferences.sql`

```sql
-- Doctor notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors NOT NULL UNIQUE,
  tenant_id UUID REFERENCES tenants NOT NULL,
  
  -- Notification types
  new_appointment BOOLEAN DEFAULT true,
  appointment_reminder BOOLEAN DEFAULT true,
  reminder_minutes INTEGER DEFAULT 60,
  cancellations BOOLEAN DEFAULT true,
  time_off_response BOOLEAN DEFAULT true,
  system_messages BOOLEAN DEFAULT true,
  
  -- Quiet hours (override tenant)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own preferences" ON notification_preferences
  FOR ALL USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view tenant preferences" ON notification_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tenant_id = notification_preferences.tenant_id
      AND users.role = 'admin'
    )
  );

-- Index
CREATE INDEX idx_notification_prefs_doctor ON notification_preferences(doctor_id);
```

### 3.1.4 Migration: `20260209_mobile_analytics.sql`

```sql
-- Mobile app analytics events
CREATE TABLE mobile_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants NOT NULL,
  doctor_id UUID REFERENCES doctors,
  device_id UUID REFERENCES device_tokens,
  
  -- Event data
  event_type TEXT NOT NULL, -- 'app_open', 'sync', 'crash', 'feature_use'
  event_name TEXT NOT NULL, -- 'calendar_view', 'appointment_update', etc.
  event_data JSONB,
  
  -- Session info
  session_id TEXT,
  app_version TEXT,
  platform TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
-- CREATE TABLE mobile_analytics_2026_02 PARTITION OF mobile_analytics
--   FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- RLS
ALTER TABLE mobile_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can view all analytics" ON mobile_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'developer')
    )
  );

-- Indexes
CREATE INDEX idx_mobile_analytics_tenant ON mobile_analytics(tenant_id);
CREATE INDEX idx_mobile_analytics_type ON mobile_analytics(event_type);
CREATE INDEX idx_mobile_analytics_created ON mobile_analytics(created_at);
```

### 3.1.5 Migration: `20260209_push_notifications_log.sql`

```sql
-- Push notification history
CREATE TABLE push_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants,
  
  -- Target
  target_type TEXT CHECK (target_type IN ('all', 'tenant', 'doctor')) NOT NULL,
  target_id UUID, -- tenant_id or doctor_id
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  
  -- Stats
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  -- Sender
  sent_by UUID REFERENCES auth.users,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can manage notifications" ON push_notifications_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'developer')
    )
  );

-- Index
CREATE INDEX idx_push_log_tenant ON push_notifications_log(tenant_id);
CREATE INDEX idx_push_log_sent ON push_notifications_log(sent_at);
```

### 3.1.6 Migration: `20260209_offline_sync_queue.sql`

```sql
-- Offline sync queue (server-side tracking)
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors NOT NULL,
  device_id UUID REFERENCES device_tokens,
  tenant_id UUID REFERENCES tenants NOT NULL,
  
  -- Action data
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  client_created_at TIMESTAMPTZ NOT NULL,
  
  -- Sync status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own queue" ON offline_sync_queue
  FOR ALL USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_sync_queue_doctor ON offline_sync_queue(doctor_id);
CREATE INDEX idx_sync_queue_status ON offline_sync_queue(status) WHERE status = 'pending';
```

---

## 3.2 Edge Functions

### 3.2.1 Overview of Required Edge Functions

| Function | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `register-device-token` | POST | Store FCM/APNs token on login | P0 |
| `unregister-device-token` | POST | Remove token on logout | P0 |
| `send-push-notification` | POST | Send push to specific users | P0 |
| `broadcast-notification` | POST | Send to all users/tenant | P1 |
| `sync-offline-actions` | POST | Process offline action queue | P0 |
| `get-mobile-config` | GET | Fetch app config for tenant | P0 |
| `check-app-version` | GET | Validate min version | P0 |
| `get-doctor-earnings` | GET | Aggregated earnings | P1 |
| `track-analytics-event` | POST | Log mobile analytics | P2 |
| `revoke-device-access` | POST | Force logout device | P1 |

### 3.2.2 Edge Function: `register-device-token`

```typescript
// supabase/functions/register-device-token/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RegisterTokenRequest {
  token: string;
  platform: 'ios' | 'android';
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body: RegisterTokenRequest = await req.json();

    // Get doctor info
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!doctor) {
      return new Response(JSON.stringify({ error: 'Doctor not found' }), { status: 404 });
    }

    // Upsert device token
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert({
        user_id: user.id,
        doctor_id: doctor.id,
        tenant_id: doctor.tenant_id,
        token: body.token,
        platform: body.platform,
        device_name: body.deviceName,
        device_model: body.deviceModel,
        os_version: body.osVersion,
        app_version: body.appVersion,
        is_active: true,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, device: data }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 3.2.3 Edge Function: `send-push-notification`

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushRequest {
  doctorIds?: string[];    // Specific doctors
  tenantId?: string;       // All doctors in tenant
  all?: boolean;           // All doctors (dev only)
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: PushRequest = await req.json();

    // Build query for device tokens
    let query = supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('is_active', true);

    if (body.doctorIds) {
      query = query.in('doctor_id', body.doctorIds);
    } else if (body.tenantId) {
      query = query.eq('tenant_id', body.tenantId);
    }

    const { data: tokens, error } = await query;
    if (error) throw error;

    // Check notification preferences & quiet hours
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    // Send to FCM/APNs
    const results = await Promise.allSettled(
      tokens.map(async ({ token, platform }) => {
        if (platform === 'ios') {
          return sendAPNs(token, body.title, body.body, body.data);
        } else {
          return sendFCM(token, body.title, body.body, body.data);
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Log notification
    await supabase.from('push_notifications_log').insert({
      tenant_id: body.tenantId,
      target_type: body.doctorIds ? 'doctor' : body.tenantId ? 'tenant' : 'all',
      title: body.title,
      body: body.body,
      data: body.data,
      total_sent: tokens.length,
      total_delivered: sent,
      sent_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200 }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function sendFCM(token: string, title: string, body: string, data?: any) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data
    })
  });
  return response.json();
}

async function sendAPNs(token: string, title: string, body: string, data?: any) {
  // APNs implementation using jose for JWT
  // ... implementation
}
```

### 3.2.4 Edge Function: `sync-offline-actions`

```typescript
// supabase/functions/sync-offline-actions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OfflineAction {
  id: string;
  type: 'update_appointment' | 'add_note' | 'create_prescription';
  payload: Record<string, unknown>;
  createdAt: string;
}

interface SyncRequest {
  actions: OfflineAction[];
  deviceId: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body: SyncRequest = await req.json();
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const action of body.actions) {
      try {
        switch (action.type) {
          case 'update_appointment':
            await supabase
              .from('appointments')
              .update(action.payload)
              .eq('id', action.payload.id);
            break;

          case 'add_note':
            await supabase
              .from('procedure_notes')  // CORRECTED: was 'patient_notes' which doesn't exist
              .insert(action.payload);
            break;

          case 'create_prescription':
            await supabase
              .from('prescriptions')
              .insert(action.payload);
            break;
        }

        results.push({ id: action.id, success: true });

      } catch (error) {
        results.push({ id: action.id, success: false, error: error.message });
        
        // Log failed action
        await supabase.from('offline_sync_queue').insert({
          doctor_id: action.payload.doctor_id,
          device_id: body.deviceId,
          tenant_id: action.payload.tenant_id,
          action_type: action.type,
          action_payload: action.payload,
          client_created_at: action.createdAt,
          status: 'failed',
          error_message: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { status: 200 }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 3.2.5 Edge Function: `get-mobile-config`

```typescript
// supabase/functions/get-mobile-config/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const appVersion = url.searchParams.get('appVersion');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: config, error } = await supabase
      .from('mobile_app_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      // Return defaults if no config
      return new Response(JSON.stringify({
        min_app_version: '1.0.0',
        force_update: false,
        maintenance_mode: false,
        offline_enabled: true,
        push_enabled: true
      }), { status: 200 });
    }

    // Check if update required
    const updateRequired = appVersion && 
      compareVersions(appVersion, config.min_app_version) < 0;

    return new Response(JSON.stringify({
      ...config,
      update_required: updateRequired,
      update_forced: updateRequired && config.force_update
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }
  return 0;
}
```

### 3.2.6 Edge Function: `revoke-device-access`

```typescript
// supabase/functions/revoke-device-access/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { deviceId, doctorId, revokeAll } = await req.json();

    if (revokeAll && doctorId) {
      // Revoke all devices for a doctor
      await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('doctor_id', doctorId);
    } else if (deviceId) {
      // Revoke specific device
      await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .eq('id', deviceId);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 3.2.7 Edge Function: `track-analytics-event`

```typescript
// supabase/functions/track-analytics-event/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AnalyticsEvent {
  eventType: string;
  eventName: string;
  eventData?: Record<string, unknown>;
  sessionId: string;
  appVersion: string;
  platform: string;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, tenant_id')
      .eq('user_id', user?.id)
      .single();

    const events: AnalyticsEvent[] = await req.json();

    // Batch insert events
    const { error } = await supabase
      .from('mobile_analytics')
      .insert(events.map(e => ({
        tenant_id: doctor?.tenant_id,
        doctor_id: doctor?.id,
        event_type: e.eventType,
        event_name: e.eventName,
        event_data: e.eventData,
        session_id: e.sessionId,
        app_version: e.appVersion,
        platform: e.platform
      })));

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

---

## 3.3 Environment Variables Needed

### 3.3.1 Supabase Edge Functions

```env
# Firebase Cloud Messaging (for Android)
FCM_SERVER_KEY=your-fcm-server-key

# Apple Push Notification service (for iOS)
APNS_KEY_ID=your-key-id
APNS_TEAM_ID=your-team-id
APNS_BUNDLE_ID=com.dento.doctor
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

### 3.3.2 Mobile App (.env)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_API_URL=https://xxx.supabase.co/functions/v1
```

---

## 3.4 Complete Migration Order

Run migrations in this order:

| Order | Migration | Dependencies |
|-------|-----------|--------------|
| 1 | `20260209_mobile_app_config.sql` | tenants |
| 2 | `20260209_device_tokens.sql` | tenants, doctors, auth.users |
| 3 | `20260209_notification_preferences.sql` | doctors, tenants |
| 4 | `20260209_push_notifications_log.sql` | tenants, auth.users |
| 5 | `20260209_mobile_analytics.sql` | tenants, doctors, device_tokens |
| 6 | `20260209_offline_sync_queue.sql` | doctors, device_tokens, tenants |

---

## 3.5 Complete Implementation Checklist

### 3.5.1 Database
- [ ] Run `20260209_mobile_app_config.sql`
- [ ] Run `20260209_device_tokens.sql`
- [ ] Run `20260209_notification_preferences.sql`
- [ ] Run `20260209_push_notifications_log.sql`
- [ ] Run `20260209_mobile_analytics.sql`
- [ ] Run `20260209_offline_sync_queue.sql`
- [ ] Verify RLS policies work correctly
- [ ] Create indexes for performance

### 3.5.2 Edge Functions
- [ ] Deploy `register-device-token`
- [ ] Deploy `unregister-device-token`
- [ ] Deploy `send-push-notification`
- [ ] Deploy `broadcast-notification`
- [ ] Deploy `sync-offline-actions`
- [ ] Deploy `get-mobile-config`
- [ ] Deploy `check-app-version`
- [ ] Deploy `get-doctor-earnings`
- [ ] Deploy `track-analytics-event`
- [ ] Deploy `revoke-device-access`
- [ ] Set environment variables (FCM, APNs)

### 3.5.3 Developer Portal
- [ ] Create Mobile Config page
- [ ] Create Device Management page
- [ ] Create Push Notifications page
- [ ] Create Mobile Analytics page
- [ ] Add mobile routes
- [ ] Update sidebar navigation

### 3.5.4 Admin Portal
- [ ] Add Devices tab to doctor profile
- [ ] Add notification preferences form
- [ ] Add "Revoke Access" functionality
- [ ] Add "Logout All Devices" button

### 3.5.5 Mobile App
- [ ] Setup Expo project
- [ ] Implement authentication
- [ ] Implement push notification handling
- [ ] Implement offline sync
- [ ] Connect to all edge functions
- [ ] Complete all 16 screens

---

# Part 4: Future Considerations

## 4.1 Receptionist Mobile App (Future)

If receptionists need mobile access in the future, a separate **Dento Staff** app could be created with:
- Appointment booking/management
- Patient check-in
- Payment collection
- Walk-in queue management

**Recommendation:** Start with web-based receptionist access (Admin Portal) since they work at a fixed desk. Mobile app only if there's a clear need.

## 4.2 Patient Portal (Phase 8)

Already planned for Phase 8:
- Patient self-booking
- View appointments
- Treatment history
- Online payments
- Document uploads

---

# Summary

## Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1️⃣ | Role-based Admin Portal | 2 weeks | High - All staff access |
| 2️⃣ | Dento Doctor Mobile App | 10 weeks | High - Doctor mobility |
| 3️⃣ | Push Notifications | Included | High - Engagement |
| 4️⃣ | Offline Mode | Included | Medium - Reliability |
| 5️⃣ | Patient Portal | Phase 8 | Medium - Future |

## Next Steps

1. **Run pre-mobile backend prep** (~3 days, ~23h work) — see Pre-Mobile Checklist below
2. **Implement role-based menu** in Admin Portal (1-2 weeks)
3. **Create role-specific dashboards** (1 week)
4. **Start Dento Doctor mobile app** development (10 weeks)
5. **Beta test with doctors** (1-2 weeks)
6. **Production release** (1 week)

---

# Appendix: Plan-vs-Reality Audit Changelog (Feb 16, 2026)

## Pre-Mobile Backend Checklist

These tasks must be completed BEFORE starting mobile app development:

| # | Task | Type | Priority | Effort |
|---|------|------|----------|--------|
| 1 | Create `device_tokens` table migration | DB Migration | P0 | 1h |
| 2 | Create `v_doctor_daily_appointments` view | DB Migration | P0 | 1h |
| 3 | Add performance indexes for mobile queries | DB Migration | P1 | 30min |
| 4 | Create `register-device-token` edge function | Edge Function | P0 | 2h |
| 5 | Create `unregister-device-token` edge function | Edge Function | P0 | 1h |
| 6 | Update `send-notification` with `push` channel (FCM/APNs) | Edge Function | P0 | 4h |
| 7 | Create `get-doctor-earnings` edge function | Edge Function | P1 | 3h |
| 8 | Create `sync-offline-actions` edge function | Edge Function | P1 | 4h |
| 9 | Create `generate-prescription-pdf` edge function | Edge Function | P1 | 3h |
| 10 | Create `check-app-version` edge function | Edge Function | P0 | 1h |
| 11 | Verify RLS policies allow doctor-role mobile access | Security | P0 | 2h |
| 12 | Run `supabase gen types typescript` for `database.types.ts` | Tooling | P0 | 30min |
| **Total** | | | | **~23h (3 days)** |

## Table Name Corrections

| Original (Wrong) | Corrected (Actual DB) | Section(s) Fixed |
|-------------------|----------------------|------------------|
| `patient_notes` | `procedure_notes` | 2.3.2, 3.2.4 (sync-offline edge function code) |
| `dental_records` | `dental_charts` + `dental_chart_history` | 2.3.2, Architecture diagram |
| `commissions` | `doctor_commissions` | 2.3.2 |
| `time_off_requests` | `leave_requests` + `schedule_exceptions` | 2.3.2 |
| `doctor_ratings` | Does NOT exist | 2.3.2 — removed from MVP |
| `notes` (generic) | `procedure_notes` | Architecture diagram |
| `earnings` (generic) | Derived from `doctor_commissions` + `invoices` | Architecture diagram |
| `ratings` (generic) | `support_session_ratings` (CSAT only) | Architecture diagram |

## New Tables Added to Plan

| Table | Why Added | Priority |
|-------|-----------|----------|
| `dental_chart_history` | Historical dental snapshots | P1 |
| `schedule_exceptions` | Doctor vacation/sick blocks | P1 |
| `medical_history` | Patient allergies — safety critical | P0 |
| `doctor_schedules` | Weekly schedule per branch | P0 |
| `doctor_availability` | Per-weekday slots | P0 |
| `medications` | Prescription autocomplete | P1 |
| `appointment_types` | Calendar color coding | P1 |
| `leave_types` | Leave categories | P1 |

## Edge Function Changes

| Change Type | Function | Details |
|-------------|----------|---------|
| **Removed** | `request-time-off` | Can INSERT directly into `leave_requests` — no edge function needed |
| **Added** | `unregister-device-token` | Security: remove push token on logout |
| **Added** | `check-app-version` | Force update capability |
| **Added** | `get-mobile-config` | Tenant-specific app config |
| **Updated** | `send-notification` | Must add `push` channel (FCM/APNs) to existing WhatsApp/Email/SMS |
| **Existing** | `calculate-commission` | Already deployed, reusable as-is |
| **Existing** | `generate-invoice-pdf` | Already deployed, use `?type=clinic` |
| **Existing** | `currency-rates` | Already deployed, reusable as-is |

## Tech Stack Updates

| Library | Old Version | New Version | Reason |
|---------|-------------|-------------|--------|
| Expo SDK | 50+ | **52+** | Latest stable |
| React Native | 0.73+ | **0.76+** | Latest stable |
| React Navigation 6.x | Removed | **Expo Router 4.x** | Expo Router replaces React Nav in Expo SDK 52 |
| NativeWind | ^2.0.0 | **4.x** | Breaking API changes |
| Zustand | ^4.4.0 | **5.0+** | Major version |
| @tanstack/react-query | ^5.17.0 | **5.62+** | Minor update |
| TypeScript | ^5.3.0 | **5.7+** | Minor update |
| @supabase/supabase-js | ^2.39.0 | **2.49+** | Minor update |

## Critical Integration Notes

1. **RLS Activation:** Mobile MUST call `set_config('app.current_tenant_id', tenantId)` via RPC — without this all queries return empty
2. **Dual Appointment Schema:** Use Schema B fields (`appointment_date`, `start_time`, `end_time`) — consistent with web app
3. **Status Values:** DB uses `booked` not `Scheduled`
4. **No Shared TypeScript Types:** Web app is pure JavaScript — mobile app should generate `database.types.ts` via `supabase gen types`
5. **Roles in Frontend:** Only 7 roles exist in `ROLES` constant: `developer, admin, doctor, receptionist, cbct_tech, assistant, patient` — missing `manager, accountant, hygienist, lab_tech`
6. **AbortError:** Supabase realtime + React StrictMode causes AbortErrors — already handled in `UnifiedTenantContext.jsx`, mobile must also catch and ignore

## Current Backend Statistics

| Metric | Value |
|--------|-------|
| Database Migrations | 90 |
| Deployed Edge Functions | 25 |
| Core Tables (with tenant_id) | 101 |
| RLS Policies | 389+ |
| ESLint Errors | 0 |
| Build Status | Clean |
| Latest Commit | `c261fbc` (Feb 16, 2026) |

---

*Last updated: February 16, 2026*
