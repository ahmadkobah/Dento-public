# Dental Chart & Admin UI Implementation Plan

> **Date:** 2026-02-14  
> **Scope:** 6 tasks covering Admin Header, Dental Chart redesign, Treatment Plan integration

---

## Task 1: Admin Header — Search Bar Center + Clinic Name Left

### What the user wants
- Move the search bar from the left side to the **center** of the header
- Make the search bar **wider** (currently `w-64`)
- Add the **tenant/clinic name** on the **left side** of the header

### Current State
| Element | Location | File |
|---------|----------|------|
| Search bar | Left side, `w-64`, hidden on mobile | `src/admin/layouts/AdminLayout.jsx` lines 862-930 |
| Clinic name | **Not displayed** in header | — |
| `tenantName` | Available via `useTenant()` → `tenantName` from `UnifiedTenantContext` | `src/contexts/UnifiedTenantContext.jsx` line 350 |

### Current Header Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰]  [🔍 Search patients, doctors... w-64]     [🎧] [🔔] [👤] │
│       ← LEFT                                        RIGHT →    │
└─────────────────────────────────────────────────────────────────┘
```

### Target Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ [☰] Clinic Name      [🔍 Search patients, doctors... w-96+]   [🎧] [🔔] [👤] │
│  ← LEFT              ← CENTER (flex-1, max-w-xl)              RIGHT →         │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation
1. Import `tenantName` from `useTenant()` hook (already imported at line 412)
2. Add clinic name display after the mobile menu button (left side)
3. Move search `<div>` to a center flex container with `flex-1 max-w-xl mx-auto`
4. Increase search input width from `w-64` to `w-full` within its container

### Files to Change
- `src/admin/layouts/AdminLayout.jsx` — lines 850-935 (header section)

---

## Task 2: Dental Chart — Better Design & Tooth Handling

### What the user wants
- Better visual design for the dental chart (more realistic tooth shapes)
- Better interaction/handling when selecting and updating teeth

### Current State
| Aspect | Current | File |
|--------|---------|------|
| Tooth rendering | CSS `<div>` with `rounded-full` borders | `DentalChart.jsx` lines 61-137 |
| Tooth shape | Rectangle with rounded bottom/top | Same |
| Condition indicator | Small colored dot (`w-3 h-3 rounded-full`) | Same |
| Selection | Blue border highlight | Same |
| Sizing | molar `w-12`, premolar `w-10`, canine `w-9`, incisor `w-8` | Same |
| Tooth form panel | Right sidebar with condition dropdown, surface checkboxes, notes | Lines 480-600 |

### Chosen Library: `react-odontogram` (npm v0.4.1)
- **GitHub:** https://github.com/biomathcode/react-odontogram (19 stars, updated Feb 2026)
- **SVG-based** professional dental chart with realistic tooth silhouettes + shadows
- **FDI + Universal + Palmer** notation systems
- **Light/Dark mode** support
- **`readOnly`** prop — perfect for history views and treatment plan displays
- **`initialSelected`** prop — for pre-selecting teeth
- **`onChange`** callback — returns tooth ID, type, and all notations
- **Zero dependencies** — only React peer dependency
- **TypeScript** written, well-tested (Storybook demo available)

### Target Design (using react-odontogram + custom wrapper)
- **react-odontogram `<Odontogram>`** as base chart — professional SVG tooth rendering
- **Condition color overlay** per tooth (wrapper layer maps conditions → tooth colors)
- **5-surface mini-diagram** for surface selection (custom overlay on selected tooth)
- **Notice badge (⚠️)** on teeth with warnings
- **Quadrant labels** (UR, UL, LR, LL) provided by the library
- **Hover tooltip** with tooth name + current condition (custom wrapper)

### Implementation
1. Install `react-odontogram` package
2. Create `DentalChartWrapper` that wraps `<Odontogram>` with condition colors
3. Map tooth selections from FDI notation → Universal numbering (our DB uses 1-32)
4. Add condition color overlay per tooth based on `dental_charts` data
5. Add 5-surface clickable diagram for selected tooth (custom component)
6. Add hover tooltips showing condition + notes
7. Improve selected tooth panel layout (larger, clearer form)

### Files to Change
- `src/admin/pages/patients/DentalChart.jsx` — Major rewrite to use `react-odontogram`
- `package.json` — Add `react-odontogram` dependency

---

## Task 3: Dental Chart History — Save/Clear & History View

### What the user wants
1. After saving a tooth condition, the dental chart form should **clear/reset** (not keep showing the last tooth)
2. When clicking a history entry, it should **replace the dental chart view** to show that historical snapshot alone

### Current State
| Behavior | Current | Expected |
|----------|---------|----------|
| After save | Tooth stays selected, form shows saved data | Clear selection, reset form, show clean chart |
| History click | Sets `comparisonData` state but comparison rendering is broken (`_getToothChanges` is unused) | Replace current chart with historical snapshot, show "Viewing: [date]" banner |
| History panel | Shows date buttons + "Clear Comparison" + "Save Snapshot" | Should show "View" button per entry that switches chart to that snapshot |

### Current Flow
```
Save → applyToothCondition() → updates teethData[toothNum] → tooth stays selected
History click → loadComparisonChart(id) → sets comparisonData → (nothing visible happens)
```

### Target Flow  
```
Save → applyToothCondition() → updates teethData[toothNum] → setSelectedTooth(null) → form clears
History click → loadHistorySnapshot(id) → setViewingHistory(snapshot) → chart shows snapshot read-only
                                          → show "Viewing history from [date]" banner
                                          → "Back to Current" button to return
```

### Implementation
1. After `applyToothCondition()` succeeds → `setSelectedTooth(null)` and `setToothForm({ condition: 'healthy', surface: '', notes: '' })`
2. Add `viewingHistory` state — when set, chart renders that data read-only
3. History click loads full `chart_data` JSONB and sets `viewingHistory`
4. Add banner "Viewing dental chart from [date]" with "Back to Current" button
5. Remove unused `_getToothChanges` function

### Files to Change
- `src/admin/pages/patients/DentalChart.jsx` — lines 157-162 (form reset), 225-240 (history load), 307-340 (save), 603-660 (history panel)

---

## Task 4: Dental Chart — Add Case & Notice Fields

### What the user wants
- Add a **case** field to the dental chart (clinical case classification/diagnosis)
- Add a **notice** field (alerts/warnings about the patient's dental status)

### Current State
| Field | Exists? | Where |
|-------|---------|-------|
| `notes` | ✅ Per tooth | `dental_charts.notes`, `toothForm.notes` |
| `case` | ❌ | Nowhere |
| `notice` | ❌ | Nowhere |

### Current `dental_charts` table columns
```sql
id, patient_id, tooth_number, condition, surface, notes, updated_by, created_at, updated_at, tenant_id
```

### Target
Add two new concepts:
1. **Case**: A clinical case/diagnosis label per tooth entry (e.g., "Class II Cavity", "Periapical Abscess", "Fractured Cusp")
2. **Notice**: A highlighted alert/warning per tooth (e.g., "Patient allergic to amalgam", "Tooth sensitive to cold", "Watch for abscess")

### Implementation

#### Database Migration (075)
```sql
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS case_label TEXT;
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS notice TEXT;

-- Also add to history snapshot metadata
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS case_summary TEXT;
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS notice TEXT;
```

#### Frontend
1. Add `case_label` and `notice` to `toothForm` state
2. Add "Case" text input and "Notice" textarea to tooth detail panel
3. Save/load `case_label` and `notice` with tooth data
4. Show notice as a warning badge on the tooth (⚠️ icon)
5. Include in history snapshots

### Files to Change
- `supabase/migrations/075_dental_chart_enhancements.sql` — New migration
- `src/admin/pages/patients/DentalChart.jsx` — Form fields, save/load logic, tooth rendering

---

## Task 5: Treatment Plan ↔ Dental Chart Integration

### What the user wants
1. When creating a treatment plan, show a **dental chart** to select teeth visually
2. The treatment plan's dental chart should be **visible in dental chart history**
3. The chart should **update with progress** as treatment items are completed
4. The chart should be **viewable inside the treatment plan** detail page

### Current State
| Integration | Status |
|-------------|--------|
| `treatment_plan_items.tooth_number` | ✅ Exists (VARCHAR) — but entered as plain text |
| Visual chart in treatment plan form | ❌ No chart widget |
| Treatment plan → dental history | ❌ No connection |
| Progress updates to chart | ❌ No connection |

### Target Flow
```
Treatment Plan Form:
  ┌─────────────────────────────────────────┐
  │  📋 Treatment Plan: "Full Restoration"  │
  │                                          │
  │  [=========== DENTAL CHART ===========]  │
  │  Click teeth to add treatment items      │
  │                                          │
  │  Items:                                  │
  │  ✅ Tooth #14 — Crown (completed)       │
  │  🔄 Tooth #15 — RCT (in progress)       │
  │  ⏳ Tooth #30 — Filling (pending)        │
  └─────────────────────────────────────────┘

Dental Chart History:
  • Current Chart
  • 2026-02-14 — Treatment Plan "Full Restoration" (auto-saved)
  • 2026-02-10 — Manual snapshot
  • ...
```

### Implementation

#### Database
```sql
-- Link dental_chart_history to treatment plans
ALTER TABLE dental_chart_history 
  ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES treatment_plans(id),
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'treatment_plan', 'treatment'));
```

#### Frontend — Treatment Plan Form
1. Extract `DentalChartMini` — a reusable mini dental chart component (read-only + click-to-select mode)
2. Embed `DentalChartMini` in `TreatmentPlanForm.jsx` above the items list
3. Clicking a tooth in the mini chart pre-fills `tooth_number` when adding a new item
4. Teeth with existing items are color-coded by status (green=completed, blue=in_progress, gray=pending)

#### Frontend — Treatment Plan View
1. Embed `DentalChartMini` in `TreatmentPlanView.jsx` showing teeth involved
2. Color teeth by item status

#### Frontend — Dental Chart History
1. When a treatment plan is created/updated, auto-save a `dental_chart_history` entry with `treatment_plan_id`
2. In history list, show treatment plan entries with a different icon/label
3. Clicking a treatment plan history entry shows the chart state at that point

#### Auto-Progress Sync
1. When a `treatment_plan_item` status changes to `completed`:
   - Update `dental_charts` table for that tooth (condition → based on procedure: filling, crown, implant, etc.)
   - Save new history snapshot with `source='treatment_plan'`

### Files to Change
- `supabase/migrations/075_dental_chart_enhancements.sql` — Add columns
- `src/admin/pages/patients/DentalChart.jsx` — History list (show treatment plan entries)
- `src/admin/pages/treatment-plans/TreatmentPlanForm.jsx` — Embed mini chart
- `src/admin/pages/treatment-plans/TreatmentPlanView.jsx` — Embed mini chart
- **NEW** `src/admin/components/DentalChartMini.jsx` — Reusable mini dental chart

---

## Task 6: Treatment Records — Dental Chart + Notice

### What the user wants
1. When recording a treatment (procedure), attach a **dental chart** showing where the treatment was done
2. Add a **notice** field for extra notes about the treatment

### Current State
| Field | Exists? | Table |
|-------|---------|-------|
| `tooth_number` | ✅ TEXT | `treatments` |
| `treatment_notes` | ✅ TEXT | `treatments` |
| `diagnosis` | ✅ TEXT | `treatments` |
| Visual dental chart | ❌ | None |
| `notice` | ❌ (but `treatment_notes` is similar) | — |
| `procedure_notes.teeth_involved` | ✅ VARCHAR | `procedure_notes` |

### Target
1. When completing/recording a treatment, embed `DentalChartMini` to visually select teeth
2. Add a dedicated `notice` field (separate from `treatment_notes` — for warnings, follow-up alerts)
3. Treatment saves a `dental_chart_history` entry with `source='treatment'`
4. Treatment history page shows which teeth were treated visually

### Implementation

#### Database
```sql
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS notice TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS dental_chart_snapshot JSONB;
```

#### Frontend
1. Add `DentalChartMini` to treatment recording form — click teeth to set `tooth_number`
2. Add "Notice" textarea below treatment notes
3. On save, capture current chart state for involved teeth as `dental_chart_snapshot`
4. Auto-save `dental_chart_history` entry with `source='treatment'`
5. In TreatmentHistory.jsx, show mini chart visualization per treatment entry

### Files to Change
- `supabase/migrations/075_dental_chart_enhancements.sql` — Add columns
- Treatment form component (recording new treatment)
- `src/admin/pages/patients/TreatmentHistory.jsx` — Show mini chart per entry
- **REUSE** `src/admin/components/DentalChartMini.jsx` from Task 5

---

## Codebase Analysis — What Exists vs What Must Change

### Existing Files Inventory

| File | Lines | Relevant For | Status |
|------|-------|-------------|--------|
| `src/admin/layouts/AdminLayout.jsx` | 1288 | Task 1 (Header) | Modify header section |
| `src/admin/pages/patients/DentalChart.jsx` | 1020 | Tasks 2, 3, 4 | Major rewrite |
| `src/admin/pages/treatment-plans/TreatmentPlanForm.jsx` | 921 | Task 5 | Add chart integration |
| `src/admin/pages/treatment-plans/TreatmentPlanView.jsx` | 581 | Task 5 | Add chart display |
| `src/admin/pages/treatment-plans/TreatmentPlanList.jsx` | 413 | Task 5 | Minor (no change needed) |
| `src/admin/pages/patients/TreatmentHistory.jsx` | ~350 | Task 6 | Add chart visualization |
| `src/contexts/UnifiedTenantContext.jsx` | ~350 | Task 1 | Read only (provides `tenantName`) |
| `src/admin/contexts/TenantContext.jsx` | 299 | Task 1 | Read only (re-exports) |
| `supabase/migrations/001_foundation.sql` | — | Tasks 2-6 | Read only (defines `dental_charts`) |
| `supabase/migrations/018_phase1_remaining_features.sql` | — | Task 3 | Read only (defines `dental_chart_history`) |
| `supabase/migrations/021_phase2_clinical_tables.sql` | — | Tasks 5-6 | Read only (defines `treatment_plans`, `treatments`) |

### New Files to Create

| File | Purpose | Used By |
|------|---------|---------|
| `src/admin/components/DentalChartMini.jsx` | Reusable mini dental chart (select mode + display mode) | Tasks 5, 6 |
| `supabase/migrations/075_dental_chart_enhancements.sql` | DB schema changes for case, notice, treatment plan link | Tasks 4, 5, 6 |

### Database Schema Changes Summary

```sql
-- Migration 075: Dental Chart Enhancements

-- Task 4: Case & Notice on dental_charts
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS case_label TEXT;
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS notice TEXT;

-- Task 5: Link history to treatment plans
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES treatment_plans(id);
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' 
  CHECK (source IN ('manual', 'treatment_plan', 'treatment'));
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS case_summary TEXT;
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS notice TEXT;

-- Task 6: Treatment notice + chart snapshot
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS notice TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS dental_chart_snapshot JSONB;
```

---

## Implementation TODO — Ordered by Dependencies

### Phase 1: Foundation (No dependencies)

- [x] **1.1** Admin Header: Add clinic name left, center search bar, widen search — `AdminLayout.jsx` ✅
- [x] **1.2** Create DB migration `075_dental_chart_enhancements.sql` — All schema changes ✅
- [x] **1.3** Apply migration to Supabase ✅

### Phase 2: Dental Chart Core (Depends on 1.2)

- [x] **2.1** Redesign with `react-odontogram` SVG chart — `DentalChart.jsx` ✅
- [x] **2.2** Add 5-surface interactive SVG diagram (B/L/M/D/O clickable paths) — `DentalChart.jsx` ✅
- [x] **2.3** Add condition color fill via dynamic CSS (per-tooth `fill`, `stroke`, `opacity`) — `DentalChart.jsx` ✅
- [x] **2.4** Add hover tooltips with condition + case + notice — `DentalChart.jsx` ✅
- [x] **2.5** Improve tooth detail panel layout — `DentalChart.jsx` ✅

### Phase 3: Chart Behavior (Depends on Phase 2)

- [x] **3.1** Fix: Clear selection + reset form after saving a tooth — `DentalChart.jsx` ✅
- [x] **3.2** Fix: History click replaces chart with historical snapshot view — `DentalChart.jsx` ✅
- [x] **3.3** Add "Viewing history from [date]" banner + "Back to Current" button — `DentalChart.jsx` ✅
- [x] **3.4** Remove unused `_getToothChanges` function — `DentalChart.jsx` ✅

### Phase 4: Case & Notice (Depends on 1.2 + Phase 2)

- [x] **4.1** Add case_label + notice fields to tooth form — `DentalChart.jsx` ✅
- [x] **4.2** Save/load case_label + notice from DB — `DentalChart.jsx` ✅
- [x] **4.3** Show notice warning badge (CSS glow + pulse animation) on teeth — `DentalChart.jsx` ✅
- [x] **4.4** Include case_label + notice in history snapshots — `DentalChart.jsx` ✅

### Phase 5: Reusable Mini Chart (Depends on Phase 2)

- [x] **5.1** Create `DentalChartMini.jsx` — Compact chart with select mode + display mode ✅
- [x] **5.2** Support props: `teethData`, `selectedTeeth`, `onSelectTooth`, `readOnly`, `highlightTeeth` ✅

### Phase 6: Treatment Plan Integration (Depends on Phase 5)

- [x] **6.1** Embed `DentalChartMini` in `TreatmentPlanForm.jsx` — Click tooth to add item ✅
- [x] **6.2** Color teeth by item status in form (green=done, blue=in progress, gray=pending) ✅
- [x] **6.3** Embed `DentalChartMini` in `TreatmentPlanView.jsx` — Read-only display ✅
- [x] **6.4** Auto-save `dental_chart_history` when treatment plan is saved (with `source='treatment_plan'`) ✅
- [x] **6.5** Show treatment plan entries with source-specific icons (ClipboardList/Stethoscope/Clock) ✅

### Phase 7: Treatment Records Integration (Depends on Phase 5)

- [x] **7.1** Add `DentalChartMini` to ProcedureNoteForm — visual tooth selection ✅
- [x] **7.2** Add "Notice" field to ProcedureNoteForm + DB column `procedure_notes.notice` ✅
- [x] **7.3** Auto-save `dental_chart_history` on procedure save (with `source='treatment'`) ✅
- [x] **7.4** Show color-coded per-tooth badges in `TreatmentHistory.jsx` entries ✅

### Phase 8: Final Verification

- [x] **8.1** Build verification — succeeded (14.77s, no errors) ✅
- [ ] **8.2** Test dental chart save → clear → history → view flow
- [ ] **8.3** Test treatment plan ↔ chart bidirectional integration
- [ ] **8.4** Test treatment record → chart history flow

---

### Phase 9: Critical Bug Fixes (2026-02-14)

> **Reported Issues:**
> 1. Dental Chart page shows only 2-4 teeth instead of 32
> 2. ProcedureNoteForm: all selected teeth get the same treatment — no individual per-tooth procedures
> 3. New treatment shows old chart data instead of fresh session; no per-tooth history on click

#### Fix 9.1 — Dental Chart shows only 2 teeth
**Root Cause:** `maxTeeth={1}` in Odontogram component. The `react-odontogram` library uses `maxTeeth` as "tooth types per quadrant" (8 types × 4 quadrants = 32 teeth). With `maxTeeth=1`, only Central Incisors render (1 × 4 = 4 teeth).
**Fix:** Change `maxTeeth={1}` → `maxTeeth={8}` in `DentalChart.jsx` line ~833.
- [ ] **9.1** Fix `maxTeeth={8}` in `DentalChart.jsx` Odontogram

#### Fix 9.2 — Per-Tooth Individual Treatments
**Root Cause:** ProcedureNoteForm has one `procedure_name` for ALL selected teeth. No way to assign different procedures per tooth (e.g., tooth 10 = Root Canal, tooth 12 = Extraction).
**Fix:** Add `toothEntries[]` system — each selected tooth gets its own entry with procedure type, surface, and notes.
- [ ] **9.2a** Add `teeth_details JSONB` column to `procedure_notes` table (DB migration)
- [ ] **9.2b** Add `toothEntries[]` state array: `{ toothNumber, procedureType, surface, notes }`
- [ ] **9.2c** Chart click → adds new entry for that tooth (or removes if already selected)
- [ ] **9.2d** Entry list UI: tooth number badge + procedure dropdown + surface selector + notes + delete button
- [ ] **9.2e** Save: `teeth_involved` = comma string (backward compat), `teeth_details` = full JSONB array

#### Fix 9.3 — Fresh Session + Per-Tooth History
**Root Cause:** When creating a new procedure, the chart loads the patient's *current* dental condition as active state, confusing the user into thinking old treatments are part of the new session.
**Fix:** Chart shows patient teeth as read-only baseline reference. New treatments start with an empty selection. History is viewable via dropdown and per-tooth click.
- [ ] **9.3a** Chart shows patient conditions as faded baseline (read-only reference layer)
- [ ] **9.3b** New treatment starts with zero selected teeth — user clicks to add
- [ ] **9.3c** "View History" dropdown: lists all past procedure_notes with dates, select one to view its entries
- [ ] **9.3d** Tooth click on a previously treated tooth → shows treatment history for THAT specific tooth below the chart
- [ ] **9.3e** History panel: query `procedure_notes` where `teeth_involved` contains clicked tooth number

#### Fix 9.4 — DentalChartMini maxTeeth fix
**Same root cause as 9.1** — DentalChartMini also uses `maxTeeth={0}` in readOnly mode which may cause issues.
- [ ] **9.4** Fix `maxTeeth` in `DentalChartMini.jsx` — use 8 always

#### Files Changed
| File | Fixes |
|------|-------|
| `src/admin/pages/patients/DentalChart.jsx` | 9.1 |
| `src/admin/components/DentalChartMini.jsx` | 9.4 |
| `src/admin/pages/procedure-notes/ProcedureNoteForm.jsx` | 9.2, 9.3 |
| `supabase/migrations/075_dental_chart_enhancements.sql` | 9.2a |
| DB (Supabase live) | 9.2a |

---

## Estimated Complexity

| Task | Complexity | Estimated Changes |
|------|-----------|-------------------|
| 1. Header layout | 🟢 Easy | ~30 lines in 1 file |
| 2. Chart redesign | 🔴 Complex | ~400 lines rewrite in 1 file |
| 3. History fix | 🟡 Medium | ~80 lines in 1 file |
| 4. Case + Notice | 🟢 Easy | ~50 lines + migration |
| 5. Treatment Plan integration | 🔴 Complex | New component + 2 files modified |
| 6. Treatment records | 🟡 Medium | ~100 lines across 2 files |

**Total: ~28 TODOs across 7 files + 1 new component + 1 migration**
