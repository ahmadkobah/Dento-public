# Codebase Error Repair Plan

**Erstellt:** $(date)  
**ESLint Scan:** 118 Probleme (70 Fehler, 48 Warnungen)  
**Build Status:** ✅ Kompiliert erfolgreich  

---

## Zusammenfassung

| Priorität | Kategorie | Anzahl | Status |
|-----------|-----------|--------|--------|
| 🔴 KRITISCH | Rules of Hooks Verletzungen | 7 | ⏳ Zu beheben |
| 🟠 HOCH | Undefinierte Variablen (`toast`, `refetch`) | 18 | ⏳ Zu beheben |
| 🟡 MITTEL | Unbenutzte Variablen / Imports | 20 | ⏳ Zu beheben |
| 🟡 MITTEL | Leere Block-Anweisungen | 4 | ⏳ Zu beheben |
| 🔵 NIEDRIG | Missing Dependencies (exhaustive-deps) | 33 | ⏳ Zu bewerten |
| 🔵 NIEDRIG | React Compiler Memoization | 15 | ⏳ Zu bewerten |
| **GESAMT** | | **118** | |

---

## 🔴 KRITISCH — Rules of Hooks Verletzungen (7 Fehler)

Hooks dürfen NUR auf der obersten Ebene eines React-Komponenten oder Custom Hooks aufgerufen werden. Diese Fehler verursachen Laufzeit-Crashes oder unvorhersehbares Verhalten.

### 1. `src/admin/components/TenantSwitcher.jsx` (Zeile 67)
- **Fehler:** `useEffect` wird bedingt aufgerufen (innerhalb einer if-Bedingung)
- **Fix:** `useEffect` auf Komponentenebene verschieben, Bedingung in den Callback verlagern

### 2. `src/admin/pages/patients/DentalChart.jsx` (Zeile 79)
- **Fehler:** `useToast()` wird in der Funktion `generateConditionCSS` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen, `toast` als Parameter übergeben oder im Scope verfügbar machen

### 3. `src/admin/pages/subscription/MySubscription.jsx` (Zeile 136)
- **Fehler:** `useToast()` wird in der Funktion `handleDownload` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen, `toast` innerhalb der Funktion nutzen

### 4. `src/developer/pages/deployments/DeploymentList.jsx` (Zeile 42)
- **Fehler:** `useToast()` wird in der Funktion `mapTenantVersion` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen

### 5. `src/developer/pages/support/SupportSessions.jsx` (Zeile 191)
- **Fehler:** `useToast()` wird in der Funktion `formatTime` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen

### 6. `src/developer/pages/tenants/TenantCreate.jsx` (Zeile 98)
- **Fehler:** `useToast()` wird in der Funktion `updateFormData` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen

### 7. `src/developer/pages/tenants/TenantDetail.jsx` (Zeile 254)
- **Fehler:** `useToast()` wird in der Funktion `handleOpenIntegration` aufgerufen
- **Fix:** `useToast()` auf Komponentenebene aufrufen

---

## 🟠 HOCH — Undefinierte Variablen (18 Fehler)

Diese verursachen `ReferenceError` zur Laufzeit, da `toast` oder `refetch` nicht im Scope definiert ist.

### 8. `src/admin/pages/insurance/InsuranceCompanyList.jsx` (Zeile 283)
- **Fehler:** `toast` is not defined
- **Fix:** `useToast()` korrekt auf Komponentenebene einbinden

### 9-11. `src/admin/pages/patients/DentalChart.jsx` (Zeilen 354, 357, 446)
- **Fehler:** `toast` is not defined (3×)
- **Fix:** `toast` aus dem Komponentenscope nutzen (nach Fix von #2)

### 12-13. `src/admin/pages/subscription/MySubscription.jsx` (Zeilen 128, 224)
- **Fehler:** `toast` is not defined (2×)
- **Fix:** `toast` aus dem Komponentenscope nutzen (nach Fix von #3)

### 14-16. `src/developer/pages/deployments/DeploymentList.jsx` (Zeilen 115, 118, 120)
- **Fehler:** `toast` is not defined (2×), `refetch` is not defined (1×)
- **Fix:** `useToast()` auf Komponentenebene, `refetch` korrekt einbinden

### 17-18. `src/developer/pages/support/SupportSessions.jsx` (Zeilen 161, 182)
- **Fehler:** `toast` is not defined (2×)
- **Fix:** `toast` aus dem Komponentenscope nutzen (nach Fix von #5)

### 19. `src/developer/pages/tenants/TenantCreate.jsx` (Zeile 200)
- **Fehler:** `toast` is not defined
- **Fix:** `toast` aus dem Komponentenscope nutzen (nach Fix von #6)

### 20-26. `src/developer/pages/tenants/TenantDetail.jsx` (Zeilen 328, 1393, 1411, 2258, 2260, 2266, 2268)
- **Fehler:** `toast` is not defined (7×)
- **Fix:** `toast` aus dem Komponentenscope nutzen (nach Fix von #7)

---

## 🟡 MITTEL — Unbenutzte Variablen / Imports (20 Fehler)

Dead Code der entfernt oder mit `_` Prefix versehen werden sollte.

| # | Datei | Zeile | Variable | Fix |
|---|-------|-------|----------|-----|
| 27 | `InsuranceCompanyList.jsx` | 12 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #8 ersetzt) |
| 28 | `DentalChart.jsx` | 79 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #2 ersetzt) |
| 29 | `DentalChart.jsx` | 204 | `printRef` (nie benutzt) | Entfernen oder `_printRef` |
| 30 | `MySubscription.jsx` | 136 | `toast` (innerhalb handleDownload) | Entfernen (wird durch Fix #3 ersetzt) |
| 31 | `MySubscription.jsx` | 248 | `otherInvoices` (nie benutzt) | `_otherInvoices` oder entfernen |
| 32 | `MySubscription.jsx` | 333 | `isDowngrade` (nie benutzt) | `_isDowngrade` oder entfernen |
| 33 | `TreatmentPlanView.jsx` | 1 | `useMemo` (importiert, nie benutzt) | Aus Import entfernen |
| 34 | `DeploymentList.jsx` | 42 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #4 ersetzt) |
| 35 | `DomainList.jsx` (dev) | 95 | `error` (nie benutzt) | `_error` |
| 36 | `DomainList.jsx` (dev) | 260 | `result` (nie benutzt) | `_result` |
| 37 | `RevenueDashboard.jsx` | 101 | `allPayments` (nie benutzt) | `_allPayments` oder entfernen |
| 38 | `SupportSessions.jsx` | 79 | `request` (nie benutzt) | `_request` |
| 39 | `SupportSessions.jsx` | 83 | `newSession` (nie benutzt) | `_newSession` |
| 40 | `SupportSessions.jsx` | 83 | `oldSession` (nie benutzt) | `_oldSession` |
| 41 | `SupportSessions.jsx` | 191 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #5 ersetzt) |
| 42 | `TenantCreate.jsx` | 98 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #6 ersetzt) |
| 43 | `TenantDetail.jsx` | 254 | `toast` (zugewiesen, nie benutzt) | Entfernen (wird durch Fix #7 ersetzt) |
| 44 | `devApi.js` | 1292 | `data` (nie benutzt) | `_data` oder destructuring entfernen |
| 45 | `devApi.js` | 1300 | `data` (nie benutzt) | `_data` oder destructuring entfernen |
| 46 | `devApi.js` | 1307 | `data` (nie benutzt) | `_data` oder destructuring entfernen |

---

## 🟡 MITTEL — Unbenutzte Catch-Variablen (2 Fehler)

| # | Datei | Zeile | Variable | Fix |
|---|-------|-------|----------|-----|
| 47 | `currencyConverter.js` | 60 | `e` | `_e` oder entfernen |
| 48 | `currencyConverter.js` | 81 | `e` | `_e` oder entfernen |

---

## 🟡 MITTEL — Leere Block-Anweisungen (4 Fehler)

| # | Datei | Zeile | Fix |
|---|-------|-------|-----|
| 49 | `TenantSwitcher.jsx` | 55 | Kommentar `// intentionally empty` hinzufügen |
| 50 | `TenantSwitcher.jsx` | 76 | Kommentar `// intentionally empty` hinzufügen |
| 51 | `UnifiedTenantContext.jsx` | 217 | Kommentar `// intentionally empty` hinzufügen |
| 52 | `useSupportNotifications.js` | 162 | Kommentar `// intentionally empty` hinzufügen |

---

## 🔵 NIEDRIG — Missing Dependencies in useEffect/useCallback (33 Warnungen)

Diese sind Warnungen, keine Fehler. Sie können zu Stale-Closure-Bugs führen, aber das blinde Hinzufügen aller Dependencies kann Endlosschleifen verursachen. Einzeln bewerten.

| # | Datei | Zeile | Missing Deps |
|---|-------|-------|-------------|
| 53 | `useAdminSupport.js` | 548 | `enabled` |
| 54 | `useSessionManager.js` | 232 | `tenantId` |
| 55 | `AdminLayout.jsx` | 700 | `tenantId` |
| 56 | `WalkInQueue.jsx` | 182 | `newEntry.branch_id` |
| 57 | `WalkInQueue.jsx` | 212 | `tenantId` |
| 58 | `AttendanceList.jsx` | 64 | `loadData`, `loadMyAttendanceToday` |
| 59 | `BranchForm.jsx` | 80 | `formData.work_hours` |
| 60 | `ChairList.jsx` | 88 | `loadData` |
| 61 | `ConsentFormList.jsx` | 29 | `loadForms`, `loadTemplates` |
| 62 | `DoctorForm.jsx` | 202 | `tenantId` |
| 63 | `DoctorList.jsx` | 71 | `fetchDoctors` |
| 64 | `InvoicePrint.jsx` | 37 | `loadData` |
| 65 | `LabOrderList.jsx` | 47 | `loadLabs`, `loadOrders` |
| 66 | `LeaveRequestForm.jsx` | 53 | `isEditing`, `loadData`, `loadLeaveRequest` |
| 67 | `LeaveRequestForm.jsx` | 59 | `loadLeaveBalance` |
| 68 | `LeaveRequestList.jsx` | 62 | `loadData` |
| 69 | `LeaveRequestView.jsx` | 40 | `loadLeaveRequest` |
| 70 | `DentalChart.jsx` | 234 | `viewingCurrentState` |
| 71 | `PatientForm.jsx` | 230 | `checkDuplicatePatient` |
| 72 | `PatientList.jsx` | 58 | `fetchPatients` |
| 73 | `PatientView.jsx` | 347 | `searchPatients` |
| 74 | `PrescriptionPrint.jsx` | 51 | `loadData` |
| 75 | `ProcedureNoteList.jsx` | 46 | `loadDoctors`, `loadNotes`, `loadPatientName` |
| 76 | `DailyReconciliationForm.jsx` | 99 | `isEditing`, `loadBranches`, `loadReconciliation` |
| 77 | `ScheduleExceptionForm.jsx` | 127 | `tenantId` |
| 78 | `SiteSettings.jsx` | 558 | `loadSettings` |
| 79 | `UserList.jsx` | 74 | `fetchUsers` |
| 80 | `XrayList.jsx` | 95 | `fetchXrayTypes` |
| 81 | `UniversalLogin.jsx` | 61 | `handlePostLogin` |
| 82-93 | `useDevApi.js` | diverse | `filters`, `options` (12 Instanzen) |

---

## 🔵 NIEDRIG — React Compiler Memoization (15 Fehler)

Der React Compiler kann die manuelle Memoization in diesen Dateien nicht optimieren, weil `filterKey` als Dependency angegeben wird, aber `filters` die tatsächliche Dependency ist.

| # | Datei | Zeilen | Betroffene Hooks |
|---|-------|--------|------------------|
| 94-96 | `RegionalContext.jsx` | 437, 444, 473 | `useMemo` (3×) |
| 97-108 | `useDevApi.js` | 49, 106, 112, 139, 145, 155, 200, 210, 257, 300, 312, 348, 367, 449, 502 | `useCallback` (15×) |

---

## 🟣 RUNTIME — Bekannte Konsolen-Fehler

### AbortError in `UnifiedTenantContext.jsx`
- **Symptom:** `AbortError: signal is aborted without reason` bei Laden
- **Ursache:** React 19 StrictMode mounted/unmounted Komponenten doppelt, `onAuthStateChange` wird beim Cleanup abgebrochen
- **Fix:** AbortError im catch-Block abfangen und ignorieren

### Unbenutzte Test-Variablen
| # | Datei | Zeile | Variable |
|---|-------|-------|----------|
| 109 | `UnifiedScheduleSystem.test.js` | 6 | `beforeAll` |
| 110 | `UnifiedScheduleSystem.test.js` | 6 | `afterAll` |
| 111 | `UnifiedScheduleSystem.test.js` | 6 | `beforeEach` |
| 112 | `UnifiedScheduleSystem.test.js` | 1513 | `scheduledEnd` |

---

## Reparatur-Plan — Reihenfolge

### Phase 1: KRITISCH (sofort) — Rules of Hooks
1. ✅ `TenantSwitcher.jsx` — Bedingten `useEffect` fixen
2. ✅ `DentalChart.jsx` — `useToast()` aus `generateConditionCSS` entfernen
3. ✅ `MySubscription.jsx` — `useToast()` aus `handleDownload` entfernen
4. ✅ `DeploymentList.jsx` — `useToast()` aus `mapTenantVersion` entfernen
5. ✅ `SupportSessions.jsx` — `useToast()` aus `formatTime` entfernen
6. ✅ `TenantCreate.jsx` — `useToast()` aus `updateFormData` entfernen
7. ✅ `TenantDetail.jsx` — `useToast()` aus `handleOpenIntegration` entfernen

### Phase 2: HOCH — Toast/Refetch Undefiniert
8. Alle `toast is not defined` Fehler durch korrekte Komponentenebene-Deklaration lösen

### Phase 3: MITTEL — Aufräumen
9. Unbenutzte Variablen entfernen oder mit `_` Prefix versehen
10. Leere Blöcke mit Kommentaren versehen
11. Catch-Variablen mit `_` Prefix versehen

### Phase 4: NIEDRIG — Dependency Warnings
12. Jede exhaustive-deps Warnung einzeln bewerten
13. Stabile Referenzen mit `useCallback` wrappen wo nötig
14. `// eslint-disable-next-line react-hooks/exhaustive-deps` wo bewusst gewollt

### Phase 5: React Compiler Kompatibilität
15. `useDevApi.js` Memoization-Pattern überarbeiten (filters statt filterKey)
16. `RegionalContext.jsx` useMemo Dependencies anpassen

---

## Notizen

- **Build:** Kompiliert trotz ESLint-Fehler, da Vite kein ESLint erzwingt
- **Runtime-Crashes:** Nur Rules-of-Hooks Fehler verursachen tatsächliche Crashes
- **Toast-Fehler:** Verursachen `ReferenceError` in der Konsole wenn die betroffenen Code-Pfade ausgeführt werden
- **Warnings:** Verursachen keine Crashes, können aber zu Stale-Data oder Performance-Problemen führen
