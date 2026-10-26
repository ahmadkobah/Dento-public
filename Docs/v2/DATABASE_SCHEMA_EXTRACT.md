# Dento v2 — Vollständige Datenbank-Schema-Extraktion

> **Extrahiert aus:** `DENTO_V2_MASTER_PLAN.md` (8024 Zeilen)
> **Datum:** 2026-02-25
> **Datenbank:** MongoDB Atlas 7.x
> **Architektur:** Database-per-Tenant (`mongoose.connection.useDb()`)

---

## 1. Multi-Tenancy-Architektur

### Methode: Database-per-Tenant

```
MongoDB Atlas Cluster (M10-M30)
├── dento_platform          ← Payload CMS verwaltet (Platform-Level)
├── tenant_clinic_cairo     ← Isolierte Tenant-DB
├── tenant_clinic_riyadh    ← Isolierte Tenant-DB
├── tenant_clinic_dubai     ← Isolierte Tenant-DB
└── ...
```

- **Isolation:** `mongoose.connection.useDb(`tenant_${tenantSlug}`, { useCache: true })`
- **Backup:** `mongodump --db tenant_clinic_cairo` — nur Tenant-Daten
- **Löschung:** `dropDatabase()` — garantiert keine Datenreste
- **DSGVO-Export:** `mongodump --db tenant_x --archive=export.gz`
- **Gesamtzahl Collections:** ~45-50 (runter von ~140 Postgres-Tabellen in v1)

### Reduktion durch Embedding

- `patient + allergies + medical_history` = 1 Document
- `invoice + invoice_items` = 1 Document
- `prescription + prescription_items` = 1 Document
- `treatment_plan + treatment_plan_items` = 1 Document
- `installment_plan + installment_payments` = 1 Document
- `doctor + certificates` = 1 Document
- `purchase_order + purchase_order_items` = 1 Document

### Atlas Tier Empfehlung

| Tenants | Collections | Atlas Tier | Kosten/Monat |
|---------|-------------|------------|-------------|
| 50      | ~1.250      | M10        | $57          |
| 200     | ~5.000      | M20-M30    | $140-280     |
| 500     | ~12.500     | M30-M40    | $280-560     |

---

## 2. Platform-DB (`dento_platform`) — ~25 Collections

Verwaltet von **Payload CMS**. Enthält alle plattformweiten Daten.

### 2.1 `users` (Auth Accounts)
- Payload-managed Auth Collection
- Enthält JWT-basierte Authentifizierung
- Felder: `_id`, `email`, `role`, `tenantSlug`, `exp`, `iat`
- Rollen: `platform_admin`, `platform_support`, `tenant_admin`, `dentist`, `receptionist`, `assistant`, `accountant`, `lab_tech`, `hygienist`

### 2.2 `tenants` (Alle Kliniken)
- Alle registrierten Kliniken/Tenants
- Referenz zu Tenant-DB via `slug`

### 2.3 `modules` (Modul-Katalog)
- **Embedding:** `changelog[]`, `migrations[]`
- Felder: `slug`, `version` (SemVer), `status` (development|beta|active|deprecated|retired), `dependsOn[]`, `conflictsWith[]`
- Index: `{ slug: 1 }` unique

### 2.4 `tenant_modules` (Lizenzen pro Tenant)
- Felder: `tenantId`, `moduleSlug`, `installedVersion`, `availableVersion`, `updatePolicy` (auto|manual|pinned), `pinnedVersion`, `isCanary`, `priceOverride`, `discountPercent`, `discountExpiresAt`, `updateHistory[]`

### 2.5 `pricing_config` (Modul-Preise, dynamisch)
- **Embedding:** `modules[]`, `usageLimits{}`, `globalDiscounts[]`, `coupons[]`
- Felder pro Modul: `slug`, `basePrice`, `currency`, `billingCycle`, `yearlyDiscount`, `isActive`, `isFree`, `trialDays`
- Felder Coupons: `code`, `discountPercent`, `maxUses`, `usedCount`, `appliesTo`, `expiresAt`

### 2.6 `webhooks` (Platform-Webhooks)
- Platform-Level Webhook-URLs für Developer-Benachrichtigungen
- Events: `tenant.created`, `tenant.suspended`, `subscription.paid`, etc.

### 2.7 `webhook_logs`
- Delivery-Protokoll für Platform-Webhooks

### 2.8 `api_keys`
- API-Keys für Tenant-Level und Platform-Level Zugriff

### 2.9 `feature_flags`
- Feature-Toggles für Canary-Releases und A/B-Tests

### 2.10 `deployments`
- Deployment-Historie und Status

### 2.11 `domains`
- Custom-Domain-Zuordnungen pro Tenant

### 2.12 `saas_invoices`
- SaaS-Rechnungen für Tenant-Modul-Abonnements

### 2.13 `saas_payments`
- **Felder:** `invoiceId`, `tenantId`, `amount`, `currency`, `amountUSD`, `provider` (paymob|stripe), `providerPaymentId`, `providerTransactionId`, `method` (card|fawry|wallet|instapay|valu|bank_transfer), `methodDetails{}` (embedded: cardBrand, fawryReference, walletPhone, valuMonths), `status` (pending|completed|failed|refunded), `paidAt`, `failureReason`, `providerFee`, `netAmount`
- **Embedding:** `methodDetails{}`

### 2.14 `audit_logs`
- Platform-weite Audit-Protokolle

### 2.15 `error_logs`
- Fehler-Tracking (Sentry-Integration)

### 2.16 `login_attempts` (Brute-Force-Schutz, Redis-backed)
- **Felder:** `email`, `ip`, `userAgent`, `success`, `failureReason` (invalid_credentials|cooldown|ip_blocked|account_suspended), `tenantSlug`, `attemptNumber`, `cooldownApplied`, `createdAt`
- **Indexes:** `{ email: 1, createdAt: -1 }`, `{ ip: 1, createdAt: -1 }`, `{ createdAt: 1 }` TTL 90 Tage

### 2.17 `support_sessions`
- Remote-Support über Tailscale

### 2.18 `user_sessions` (Aktive Login-Sessions)
- **Felder:** `userId` (ref → users), `tenantSlug`, `deviceInfo{}` (embedded: browser, os, device), `ipAddress`, `userAgent`, `location{}` (embedded: country, city), `isActive`, `lastActivity`, `expiresAt`
- **Indexes:** `{ userId: 1, isActive: 1 }`, `{ expiresAt: 1 }` TTL-Index
- TTL-Index löscht abgelaufene Sessions automatisch

### 2.19 `backups` (Backup-Historie)
- **Felder:** `tenantSlug`, `type` (scheduled|manual|pre-migration|pre-delete), `status` (pending|running|completed|failed), `filePath` (S3/R2 Key), `fileSize`, `storageBucket`, `checksum` (SHA-256), `startedAt`, `completedAt`, `error`, `retentionDays`, `expiresAt`, `initiatedBy` (ref → users)
- **Indexes:** `{ tenantSlug: 1, createdAt: -1 }`, `{ status: 1, type: 1 }`, `{ expiresAt: 1 }` TTL-Index

### 2.20 `currencies` (Globale Währungsliste)
- **Felder:** `baseCurrency` (USD), `supported[]` (embedded: code, symbol, name{en,ar}, rate), `lastRateUpdate`, `rateProvider`
- 8 Währungen: USD, EGP, EUR, GBP, SAR, AED, TRY, KWD

### 2.21 `languages`
- **Felder:** `code`, `name{}` (en, native), `direction` (rtl|ltr), `isActive`

### 2.22 `translation_packs`
- **Felder:** `languageCode`, `moduleSlug`, `version`, `translations{}` (key-value Map), `completeness` (0-1), `releasedAt`

### 2.23 `country_config`
- **Felder:** `code` (ISO 3166-1 alpha-2), `name{}` (en, ar), `phoneCode`, `phoneMask`, `phoneLength`, `defaultCurrency`, `defaultLanguage`, `direction`, `taxRate`, `taxLabel{}`, `dateFormat`, `timeFormat`, `numberFormat{}`, `paymentProvider` (paymob|stripe), `isActive`, `flag`

### 2.24 `tenant_languages`
- **Felder:** `tenantId`, `enabledLanguages[]`, `defaultLanguage`, `canAdminChange`, `translationOverrides{}`

---

## 3. Tenant-DB (`tenant_{slug}`) — ~25-30 Collections pro Tenant

Jeder Tenant hat seine eigene isolierte Datenbank mit identischer Struktur.

---

### 3.1 `patients`
- **Embedding:** `allergies[]`, `medicalHistory[]`, `familyLinks[]`, `insurance[]` (optional, nur wenn Insurance-Modul aktiv)
- **Key Fields:** `_id`, `firstName`, `lastName`, `country`, `preferredCurrency`, `phoneCode`
- **Insurance Embedded Array:**
  - `insuranceCompanyId` (ref → `insurance_companies`)
  - `policyNumber`, `groupNumber`, `memberId`
  - `coverageType` (individual|family), `coveragePercentage`, `maxCoverage`
  - `deductible`, `deductibleMet`
  - `effectiveDate`, `expiryDate`, `isPrimary`, `isActive`
- **Referenzen:** Keine FK — ist Top-Level-Entity, wird von vielen referenziert

---

### 3.2 `appointments`
- **Key Fields:** `_id`, `patientId` (ref → patients), `doctorId` (ref → doctors), `branchId` (ref → branches), `serviceId`, `date`, `startTime`, `endTime`, `durationMinutes`, `status`
- **Status:** `scheduled`, `confirmed`, `arrived`, `called`, `in_chair`, `completed`, `cancelled`, `no_show`, `pending_confirmation` (Online-Booking)
- **Arrival Tracking (NEU):** `arrivedAt`, `arrivalStatus` (pending|arrived|no_show|late)
- **Queue Integration (NEU):** `queueNumber`, `chairId` (ref → chairs), `queueStatus` (waiting|called|in_chair|completed), `calledAt`, `inChairAt`, `completedAt`
- **No-Show (NEU):** `noShowAt`, `noShowReason`, `noShowNotified`
- **Recurring (NEU):** `recurringRuleId` (ref → recurring_rules), `isRecurring`, `occurrenceIndex`, `seriesTotal`, `isModified`, `originalDateTime`, `modificationNote`
- **Online-Booking:** `source` (walk_in|online|phone|etc.), `appointmentType` (walk_in_converted bei konvertierten Walk-ins)

---

### 3.3 `appointment_types`
- Termintypen-Katalog

---

### 3.4 `waitlist`
- Warteliste für Termine

---

### 3.5 `recurring_rules`
- **Key Fields:** `_id`, `branchId` (ref), `patientId` (ref), `doctorId` (ref), `serviceId` (ref)
- **Pattern:** `recurrenceType` (daily|weekly|biweekly|monthly|quarterly|biannual|annual), `preferredTime`, `durationMinutes`, `daysOfWeek[]`, `dayOfMonth`, `weekOfMonth`
- **Limits:** `startDate`, `endDate`, `maxOccurrences`
- **Status:** `status` (active|paused|completed|cancelled)
- **Tracking:** `occurrencesCreated`, `nextOccurrenceDate`, `lastGeneratedDate`
- **Options:** `autoConfirm`, `reminderDaysBefore`, `skipHolidays`, `skipIfConflict`, `allowPatientCancel`, `preferredChairId` (ref → chairs)
- **Indexes:** `{ patientId: 1, status: 1 }`, `{ doctorId: 1, status: 1 }`, `{ branchId: 1, status: 1, nextOccurrenceDate: 1 }`, `{ status: 1, nextOccurrenceDate: 1 }`

---

### 3.6 `dental_charts`
- **Key Fields:** `patientId` (ref → patients), `doctorId` (ref → doctors)
- Per-tooth conditions (FDI notation), uses `react-odontogram`

### 3.7 `dental_chart_history`
- Änderungsverlauf für Dental Charts

---

### 3.8 `treatment_plans`
- **Embedding:** `items[]` (embedded Array), `linkedXrays[]` (refs → xrays), `linkedCbcts[]` (refs → cbct_orders)
- **Key Fields:** `_id`, `patientId` (ref), `doctorId` (ref), `title`
- **Items Embedded Array:**
  - `_id` (eigene ObjectId für Referenzierung)
  - `serviceId` (ref), `toothNumber`, `surface`, `procedureName`, `description`, `cost`, `sequenceOrder`
  - `status`, `appointmentId` (ref), `completedAt`
  - `linkedXrays[]` (refs → xrays, pro Item)
  - `linkedCbcts[]` (refs → cbct_orders, pro Item)
  - `requiredImaging[]` (embedded: type, status, fulfilledByXrayId, fulfilledByCbctId, notes)
  - `materials[]` (MaterialSelector-Daten)

---

### 3.9 `procedure_notes`
- **Key Fields:** `_id`, `patientId` (ref), `doctorId` (ref), `appointmentId` (ref)
- **Cross-Links:** `treatmentPlanId` (ref → treatment_plans), `treatmentPlanItemId` (ref → treatment_plans.items[]._id)
- **Imaging Links (NEU):** `linkedXrays[]`, `linkedCbcts[]`, `preOpXrays[]`, `postOpXrays[]`
- **Fields:** `templateId` (ref), `procedureName`, `teethInvolved`, `procedurePerformed`, `materialsUsed`, `anesthesiaUsed`, `complications`, `postOpInstructions`, `followUpRequired`, `followUpDate`, `notes`, `notice`, `teethDetails`, `attachments[]`

### 3.10 `procedure_note_templates`
- Vorlagen für Procedure Notes

---

### 3.11 `invoices`
- **Embedding:** `items[]` (embedded Array)
- **Key Fields:** `_id`, `patientId` (ref), `appointmentId` (ref), `branchId` (ref)
- **Items:** `serviceId`, `description`, `quantity`, `unitPrice`, `totalPrice`, `doctorId` (intern)
- **Currency Override:** `currency`, `exchangeRate`, `originalAmount`, `originalCurrency`
- **Tax:** `subtotal`, `taxPercent`, `taxAmount`, `total`, `balanceDue`
- **Status:** `draft`, `sent`, `paid`, `overdue`, `partially_paid`, `cancelled`
- **Referenzen:** `patientId`, `appointmentId` (→ appointments)

---

### 3.12 `payments`
- **Key Fields:** `_id`, `invoiceId` (ref), `patientId` (ref), `amount`, `method`, `status`
- KEIN Embedding — separates Tracking pro Zahlung

### 3.13 `reconciliation`
- Tägliche Kassenabrechnungen

---

### 3.14 `prescriptions`
- **Embedding:** `items[]` (embedded Array)
- **Key Fields:** `_id`, `patientId` (ref), `doctorId` (ref)
- **Items:** Medikament-Name, Dosage, Frequency, Duration, Instructions

### 3.15 `medications` (Medikamenten-Katalog)
- **Key Fields:** `_id`, `nameEn`, `nameAr`, `genericName`, `category` (antibiotic|analgesic|anti_inflammatory|antifungal|antiseptic|anesthetic|vitamin|other), `dosageForm` (tablet|capsule|syrup|injection|cream|gel|mouthwash|drops|spray|powder|other), `strength`
- **Defaults:** `defaultDosage`, `defaultFrequency`, `defaultDuration`, `instructionsEn`, `instructionsAr`
- **Safety:** `warnings[]`, `contraindications[]`
- **Status:** `isActive`, `isCustom` (false = Seed, true = Tenant-hinzugefügt), `sortOrder`
- **Indexes:** `{ nameEn: 1, strength: 1 }` unique, `{ category: 1, isActive: 1 }`, `{ genericName: 1 }`
- **Seed:** ~100 häufige Dental-Medikamente (nicht-löschbar wenn isCustom=false)

---

### 3.16 `doctors`
- **Embedding:** `certificates[]` (embedded Array)
- **Key Fields:** `userId` (ref → users), `name{}` (en, ar), `title{}`, `specialty{}`, `bio{}`, `photoUrl`, `gender`
- **Professionelle Daten:** `licenseNumber`, `specializations[]`, `qualifications[]`, `experienceYears`
- **Certificates Embedded:** `name`, `issuedAt`, `fileUrl`
- **Finanzen:** `consultationFee`, `commissionRate`
- **Branches:** `assignedBranches[]` (refs → branches), `primaryBranch` (ref)
- **Status:** `isActive`, `isFeatured`, `displayOrder`
- **ENTFERNT:** `workingHours` JSONB — ersetzt durch `doctor_schedules`

---

### 3.17 `doctor_schedules` (SINGLE SOURCE OF TRUTH für Arzt-Verfügbarkeit)
- **Key Fields:** `doctorId` (ref), `branchId` (ref), `scheduleType` (recurring|override), `dayOfWeek` (0-6 bei recurring), `specificDate` (bei override), `startTime`, `endTime`
- **Break:** `breakStart`, `breakEnd`
- **Status:** `isActive`, `notes`
- **Constraints:** startTime < endTime, muss innerhalb Branch workHours liegen, kein Overlap

### 3.18 `doctor_availability`
- Zusätzliche Verfügbarkeits-Informationen

### 3.19 `schedule_exceptions`
- **Key Fields:** `doctorId` (ref), `branchId` (ref | null = alle Branches), `exceptionType` (vacation|sick_leave|day_off|conference|special_hours|other), `startDate`, `endDate`
- **Special Hours:** `specialStartTime`, `specialEndTime` (nur bei type=special_hours)
- **Genehmigung:** `status` (pending|approved|rejected), `approvedBy`, `approvedAt`, `rejectionReason`

---

### 3.20 `staff_schedules`
- **Key Fields:** `userId` (ref → users), `branchId` (ref), `shiftTemplateId` (ref → shift_templates), `scheduleDate`, `startTime`, `endTime`
- **Break:** `breakStart`, `breakEnd`
- **Status:** `status` (scheduled|confirmed|swapped|cancelled), `isPublished`

### 3.21 `shift_templates`
- **Key Fields:** `name`, `startTime`, `endTime`, `breakDuration`, `shiftType` (morning|afternoon|evening|night|full_day|split), `color`, `branchId` (ref | null = global), `isDefault`, `isActive`
- **Seed:** Morning (08-16), Evening (14-22), Night (22-06), Half Day AM (08-12), Half Day PM (13-17)

---

### 3.22 `branches`
- **Embedding:** `workHours{}` (7 Tage), `ramadanHours{}` (7 Tage), `holidays[]` (embedded), `slotConfig{}`, `onlineBookingConfig{}`
- **Key Fields:** `_id`, `name{}` (en, ar), `address`, `phone`
- **workHours:** Pro Wochentag: `{ start: "10:00", end: "22:00" }` oder `null` (geschlossen)
- **ramadanHours:** Alternatives Schema für Ramadan, `isRamadanMode` Toggle
- **holidays[]:** `{ date, name{en, ar} }`
- **slotConfig:** `defaultDuration` (30), `minDuration` (15), `maxDuration` (180), `bufferBetween` (0), `bookingLeadTime` (60), `bookingWindowDays` (60)
- **onlineBookingConfig:** `autoConfirm`, `autoConfirmLeadTimeHours`, `requirePatientPhone`, `allowDoctorSelection`, `enabledServices[]`, `confirmationMessage{}`

### 3.23 `chairs`
- **Key Fields:** `branchId` (ref), `name{}` (en, ar), `chairNumber`, `chairType` (standard|pediatric|surgery|hygiene), `floor`, `isActive`, `notes`
- **Indexes:** `{ branchId: 1, isActive: 1, chairNumber: 1 }`, `{ branchId: 1, chairNumber: 1 }` unique

---

### 3.24 `services`
- **Embedding:** `defaultMaterials[]` (NEU), `requiredImaging[]`
- **Key Fields:** `_id`, `nameEn`, `nameAr`, `categoryId` (ref → service_categories)
- **defaultMaterials[]:** `materialId` (ref → inventory_items), `materialName`, `quantity`, `unit`, `isRequired`
- **requiredImaging[]:** `type` (xray|cbct|panoramic|periapical|bitewing), `description`, `mandatory`

### 3.25 `service_categories`
- Service-Kategorie-Katalog

---

### 3.26 `xrays`
- **Key Fields:** `patientId` (ref, PFLICHT), `doctorId` (ref), `appointmentId` (ref), `branchId` (ref)
- **Imaging:** `xrayTypeId`, `toothNumbers[]` (Array für Multi-Tooth), `imageUrl` (S3/R2), `thumbnailUrl`, `title`, `notes`, `capturedAt`, `capturedBy` (ref → users)
- **Cross-Links (NEU):** `treatmentPlanId` (ref), `treatmentPlanItemId` (ref), `procedureNoteId` (ref), `dentalChartEntryId` (ref)
- **Klinischer Kontext (NEU):** `clinicalPurpose` (diagnostic|pre_treatment|post_treatment|follow_up|emergency|routine_screening), `region` (upper_left|upper_right|lower_left|lower_right|full_mouth|anterior|posterior), `findings`
- **Vergleich (NEU):** `comparedToXrayId` (ref → xrays), `comparisonNotes`
- **Indexes:** `{ patientId: 1, createdAt: -1 }`, `{ treatmentPlanId: 1 }`, `{ procedureNoteId: 1 }`, `{ appointmentId: 1 }`, `{ toothNumbers: 1 }` (Multi-key)

---

### 3.27 `cbct_orders`
- **Embedding:** `scan{}` (embedded Object), `report{}` (embedded Object — ersetzt separate `cbct_reports` Tabelle aus v1)
- **Key Fields:** `orderNumber` (auto: CBCT-2026-001), `patientId` (ref, PFLICHT), `requestingDoctorId` (ref, PFLICHT), `scanRegionId`, `branchId` (ref)
- **Cross-Links (NEU):** `treatmentPlanId` (ref), `treatmentPlanItemId` (ref), `procedureNoteId` (ref), `appointmentId` (ref)
- **Clinical Purpose (NEU):** `clinicalPurpose` (implant_planning|endo_evaluation|ortho_assessment|tmj_evaluation|pathology|trauma|surgical_planning|other)
- **Status:** `status` (requested|scheduled|completed|reported|cancelled)
- **Scan (embedded):** `scanReferenceId`, `technicianId`, `scanLocation`, `thumbnailUrl`, `dicomPath`, `scanParameters`, `scannedAt`, `notes`
- **Report (embedded):** `reportingDoctorId`, `findings`, `measurements`, `recommendations`, `reportPdfUrl`, `status` (draft|final|amended), `reportedAt`
- **Indexes:** `{ patientId: 1, createdAt: -1 }`, `{ treatmentPlanId: 1 }`, `{ procedureNoteId: 1 }`, `{ orderNumber: 1 }` unique, `{ status: 1, scheduledDate: 1 }`

### 3.28 `cbct_scans`
- S3 Storage-Referenzen für CBCT-Scans

---

### 3.29 `lab_orders`
- **Key Fields:** `patientId` (ref), `doctorId` (ref), `labOrderTypeId` (ref → lab_order_types), `expectedDeliveryDate`
- Referenzen: `patientId`, `doctorId`

### 3.30 `dental_labs`
- Labore für Lab-Aufträge

### 3.31 `lab_order_types` (Lookup-Collection)
- **Key Fields:** `nameEn`, `nameAr`, `category` (crown|bridge|denture|guard|retainer|implant|veneer|inlay|onlay|other), `defaultTurnaroundDays`
- **Status:** `isActive`, `isCustom` (false = Seed, true = Tenant), `sortOrder`
- **Indexes:** `{ nameEn: 1 }` unique, `{ category: 1, isActive: 1 }`
- **Seed:** 14 Standard-Typen (Crown PFM, Crown Zirconia, Crown E-Max, Bridge 3-unit, Bridge 4+, Full Denture Upper/Lower, Partial Denture, Night Guard, Retainer Hawley/Clear, Implant Abutment, Veneer Porcelain, Inlay/Onlay)

---

### 3.32 `insurance_claims`
- Versicherungsansprüche

### 3.33 `insurance_companies`
- Versicherungsgesellschaften-Katalog

---

### 3.34 `inventory_categories`
- **Key Fields:** `nameEn`, `nameAr`, `slug`, `parentId` (ref | null für Hierarchie), `description`, `icon`, `sortOrder`, `isActive`
- **Indexes:** `{ slug: 1 }` unique, `{ parentId: 1 }`
- **Seed (10):** Consumables, Dental Materials, Anesthetics, Surgical Supplies, Endodontic, Restorative, Prosthodontic, Orthodontic, Preventive, Infection Control

### 3.35 `inventory_items`
- **Key Fields:** `sku` (unique), `nameEn`, `nameAr`, `categoryId` (ref → inventory_categories), `description`
- **Einheit:** `unit` (piece|box|pack|bottle|tube|ml|liter|gram|kg|unit|syringe|capsule), `unitsPerPackage`
- **Preise:** `unitCost`, `sellingPrice`, `marginPercent` (berechnet)
- **Bestandsregeln:** `reorderLevel`, `reorderQuantity`, `minStockLevel`, `maxStockLevel`
- **Eigenschaften:** `isConsumable`, `requiresPrescription`, `isActive`
- **NEU:** `imageUrl` (S3/R2), `barcode`, `barcodeType` (ean13|code128|qr|datamatrix), `manufacturer`, `manufacturerRef`, `defaultSupplierId` (ref → suppliers)
- **Statistik:** `totalConsumed`, `avgMonthlyUsage`, `lastPurchaseDate`, `lastPurchasePrice`
- **Indexes:** `{ sku: 1 }` unique, `{ categoryId: 1 }`, `{ barcode: 1 }` unique sparse, `{ isActive: 1, nameEn: 1 }`, `{ defaultSupplierId: 1 }`

### 3.36 `inventory_stock` (pro Branch, pro Item)
- **Embedding:** `batches[]` (embedded Array)
- **Key Fields:** `itemId` (ref → inventory_items), `branchId` (ref → branches), `quantity`, `reservedQuantity`, `availableQuantity` (berechnet)
- **Batches Embedded:** `batchNumber`, `lotNumber`, `expiryDate`, `quantity`, `receivedDate`, `purchaseOrderId` (ref), `unitCost`, `status` (active|expired|recalled|quarantine)
- **Bewertung:** `stockValue`, `valuationMethod` (fifo|weighted_average|last_purchase), `weightedAvgCost`
- **Inventur:** `lastCountedAt`, `lastCountedBy` (ref → users), `lastCountResult` (match|surplus|deficit), `countDiscrepancy`
- **Indexes:** `{ itemId: 1, branchId: 1 }` unique, `{ "batches.expiryDate": 1 }`, `{ availableQuantity: 1 }`

### 3.37 `inventory_movements`
- **Key Fields:** `itemId` (ref), `branchId` (ref), `movementType` (purchase|sale|adjustment_add|adjustment_remove|transfer_in|transfer_out|expired|damaged|return_supplier|return_patient|consumed|reserved|unreserved)
- **Tracking:** `quantity`, `previousQuantity`, `newQuantity`, `unitCost`, `totalCost`
- **Referenz:** `referenceType` (invoice|purchase_order|transfer|procedure_note|treatment_plan|appointment|manual|stock_count|expiry_check), `referenceId`
- **Batch:** `batchNumber`, `lotNumber`, `expiryDate`
- **Transfer:** `transferId`, `fromBranchId`, `toBranchId`
- **Indexes:** `{ itemId: 1, createdAt: -1 }`, `{ branchId: 1, movementType: 1 }`, `{ referenceType: 1, referenceId: 1 }`, `{ transferId: 1 }`, `{ createdAt: -1 }`

### 3.38 `suppliers`
- **Embedding:** `address{}` (embedded Object)
- **Key Fields:** `name`, `nameAr`, `contactPerson`, `phone`, `email`, `taxNumber`, `commercialRegister`, `paymentTerms`
- **Bewertung (NEU):** `rating` (1-5), `avgDeliveryDays`, `totalOrders`, `lastOrderDate`
- **Indexes:** `{ name: 1 }`, `{ isActive: 1 }`

### 3.39 `purchase_orders`
- **Embedding:** `items[]` (embedded Array), `attachments[]` (embedded Array)
- **Key Fields:** `orderNumber` (auto: PO-2026-001), `supplierId` (ref → suppliers), `branchId` (ref → branches)
- **Status:** `status` (draft|submitted|confirmed|shipped|partially_received|received|cancelled)
- **Items Embedded:** `itemId` (ref), `quantity`, `unitCost`, `totalCost`, `receivedQuantity`, `batchNumber`, `expiryDate`, `notes`
- **Attachments Embedded:** `name`, `url`, `type` (invoice|delivery_note|certificate)
- **Beträge:** `subtotal`, `taxPercent`, `taxAmount`, `discount`, `total`
- **Empfang:** `receivingNotes`, `receivedBy` (ref → users), `qualityCheck` (passed|partial|failed)
- **Indexes:** `{ orderNumber: 1 }` unique, `{ supplierId: 1, status: 1 }`, `{ status: 1, expectedDate: 1 }`

### 3.40 `stock_transfers` (NEU)
- **Embedding:** `items[]` (embedded Array)
- **Key Fields:** `transferNumber` (auto: TRF-2026-001), `fromBranchId` (ref), `toBranchId` (ref)
- **Status:** `status` (draft|in_transit|received|cancelled)
- **Items Embedded:** `itemId` (ref), `quantity`, `batchNumber`, `notes`
- **Workflow:** `requestedBy`, `approvedBy`, `receivedBy` (refs → users), `requestedAt`, `approvedAt`, `shippedAt`, `receivedAt`
- **Indexes:** `{ transferNumber: 1 }` unique, `{ fromBranchId: 1, status: 1 }`, `{ toBranchId: 1, status: 1 }`

### 3.41 `stock_counts` (NEU — Inventur-Tracking)
- **Embedding:** `items[]` (embedded Array), `summary{}` (embedded Object)
- **Key Fields:** `countNumber` (auto: SC-2026-001), `branchId` (ref), `status` (in_progress|completed|cancelled), `countType` (full|partial|spot_check)
- **Items Embedded:** `itemId` (ref), `systemQuantity`, `countedQuantity`, `discrepancy`, `notes`, `adjustmentApplied`
- **Summary Embedded:** `totalItems`, `matchCount`, `surplusCount`, `deficitCount`, `totalDiscrepancyValue`
- **Workflow:** `countedBy`, `approvedBy` (refs → users)
- **Indexes:** `{ branchId: 1, status: 1 }`, `{ countNumber: 1 }` unique

---

### 3.42 `users` (Tenant-Level Users)
- **Embedding:** `profile{}` (embedded Sub-Document)
- **Key Fields:** `_id`, `email`, `role` (dentist|receptionist|assistant|accountant|lab_tech|hygienist)
- **Profile Embedded:** `firstName{}` (en, ar), `lastName{}` (en, ar), `displayName`, `phone`, `gender`, `bio{}` (en, ar), `avatarUrl`, `languagePreference`
- **Status:** `status` (invited|pending_activation|active|suspended|deactivated), `isProfileComplete`, `activatedAt`, `lastLoginAt`
- **Verknüpfungen:** `doctorId` (ref → doctors, nur bei role=dentist), `branchId` (ref → branches), `payloadUserId` (ref → Payload Auth)

---

### 3.43 `walk_in_queue`
- **Key Fields:** `branchId` (ref, PFLICHT), `queueNumber` (auto, pro Branch/Tag), `date` (ISO)
- **Patient:** `patientId` (ref | null), `patientName` (PFLICHT), `phone`, `reason`
- **Triage:** `priority` (low|normal|high|emergency), `chiefComplaint`
- **Assignment:** `assignedDoctorId` (ref → doctors), `chairId` (ref → chairs)
- **Status:** `status` (waiting|called|in_chair|completed|cancelled|no_show)
- **Timestamps:** `checkInAt`, `calledAt`, `inChairAt`, `completedAt`, `cancelledAt`
- **Wait-Time:** `estimatedWaitMinutes`, `actualWaitMinutes` (calledAt - checkInAt)
- **Konvertierung:** `convertedToAppointmentId` (ref), `convertedAt`
- **Indexes:** `{ branchId: 1, date: 1, status: 1 }`, `{ branchId: 1, date: 1, queueNumber: 1 }`, `{ patientId: 1, date: 1 }`, `{ status: 1, priority: -1, checkInAt: 1 }`

### 3.44 `queue_counters`
- **Key Fields:** `branchId` (ref), `date` (ISO), `lastNumber` (atomarer Counter via `$inc`)
- **Index:** `{ branchId: 1, date: 1 }` unique

---

### 3.45 `leave_requests`
- **Key Fields:** `userId` (ref → users), `leaveTypeId` (ref → leave_types), `startDate`, `endDate`, `daysCount`, `reason`
- **Status:** `status` (pending|approved|rejected|cancelled), `approvedBy` (ref), `approvedAt`, `rejectionReason`

### 3.46 `leave_types`
- **Key Fields:** `name{}` (en, ar), `daysPerYear`, `isPaid`, `requiresApproval`, `maxDaysPerRequest`, `color`, `isActive`
- **Seed:** Annual (21d), Sick (14d), Emergency (5d), Maternity (90d), Unpaid

### 3.47 `leave_balances`
- **Key Fields:** `userId` (ref), `leaveTypeId` (ref), `year`, `entitledDays`, `usedDays`, `carryForward`
- remainingDays berechnet: entitledDays + carryForward - usedDays

---

### 3.48 `attendance` (time_attendance)
- **Key Fields:** `userId` (ref), `branchId` (ref), `attendanceDate`
- **Times:** `clockIn`, `clockOut`, `breakStart`, `breakEnd`, `scheduledStart`, `scheduledEnd`
- **Computed:** `actualHours`, `overtimeHours`, `lateMinutes`, `earlyLeaveMinutes`
- **Status:** `status` (present|absent|late|half_day|on_leave)

---

### 3.49 `doctor_commissions`
- Provisionen nach Arzt, Status (pending/paid)

### 3.50 `commission_payouts`
- Provisionszahlungen

---

### 3.51 `installment_plans`
- **Embedding:** `payments[]` (embedded Array)
- Ratenzahlungspläne

---

### 3.52 `consent_forms`
- Einverständniserklärungen

### 3.53 `consent_templates`
- Vorlagen für Einverständniserklärungen

---

### 3.54 `notification_templates` (Tenant-DB)
- **Embedding:** `channels{}` (embedded: email, sms, whatsapp, push, inApp — jeweils mit enabled + templates), `variables[]`, `schedule{}`
- **Key Fields:** `key` (unique pro Tenant), `name{}` (en, ar), `description`, `category` (appointment|payment|clinical|inventory|system|marketing|recall), `trigger` (automatic|manual|scheduled)
- **Schedule:** `beforeMinutes`, `afterMinutes`, `cronExpression`
- **Indexes:** `{ key: 1, tenantId: 1 }` unique, `{ category: 1, trigger: 1, isActive: 1 }`
- **Seed:** 16 Standard-Templates (appointment_reminder, payment_receipt, recall_reminder, etc.)

### 3.55 `notifications` (In-App Notifications)
- **Key Fields:** `userId` (ref, PFLICHT), `recipientRole`, `title{}` (en, ar), `body{}` (en, ar), `icon`, `variant` (info|success|warning|error)
- **Action:** `actionUrl`, `actionLabel{}` (en, ar)
- **Kontext:** `category` (appointment|payment|clinical|inventory|system|queue), `relatedEntity{}` (embedded: type, id)
- **Status:** `isRead`, `readAt`, `isDismissed`
- **Indexes:** `{ userId: 1, isRead: 1, createdAt: -1 }`, `{ userId: 1, category: 1, createdAt: -1 }`, `{ createdAt: 1, expiresAt: 1 }` TTL, `{ tenantId: 1, createdAt: -1 }`

### 3.56 `notification_logs` (Zustellungsprotokoll)
- **Key Fields:** `templateKey`, `channel` (email|sms|whatsapp|push), `recipient`, `patientId` (ref), `userId` (ref)
- **Inhalt:** `subject`, `body`, `variables{}` (archiviert)
- **Zustellung:** `status` (pending|sent|delivered|failed|bounced), `sentAt`, `deliveredAt`, `failedAt`, `errorMessage`
- **Retry:** `retryCount`, `maxRetries` (3), `nextRetryAt`
- **Provider:** `providerMessageId`, `providerResponse{}`
- **Indexes:** `{ tenantId: 1, createdAt: -1 }`, `{ channel: 1, status: 1 }`, `{ patientId: 1, createdAt: -1 }`, `{ templateKey: 1, status: 1, createdAt: -1 }`

### 3.57 `notification_preferences`
- **Key Fields:** `userId` (ref | null), `patientId` (ref | null)
- **Channels:** `channels{}` (email, sms, whatsapp, push, inApp — jeweils enabled + override address/phone)
- **Categories:** `categories{}` (appointment, payment, clinical, inventory, system, marketing, recall — pro Kategorie enabled + channels[])
- **Timing:** `quietHoursStart`, `quietHoursEnd`, `timezone`
- **Digest:** `digestMode` (realtime|daily|weekly), `digestTime`
- **Indexes:** `{ userId: 1, tenantId: 1 }` unique, `{ patientId: 1, tenantId: 1 }` unique

### 3.58 `device_tokens` (Push Notification Tokens)
- **Key Fields:** `userId` (ref, PFLICHT), `token`, `platform` (web|ios|android), `deviceName`, `isActive`, `lastUsedAt`
- **Indexes:** `{ userId: 1, platform: 1 }`, `{ token: 1 }` unique, `{ isActive: 1, lastUsedAt: 1 }`

---

### 3.59 `alert_rules` (Konfigurierbare Alerts)
- **Key Fields:** `name`, `description`, `isActive`, `triggerType` (inventory_low_stock|inventory_expiring|invoice_overdue|no_show_rate_high|revenue_drop|appointment_utilization_low|payment_pending|custom)
- **Condition (embedded):** `metric`, `operator` (lt|lte|gt|gte|eq), `threshold`, `timeWindowDays`
- **Scope (embedded):** `branchId`, `categoryId`, `doctorId`
- **Actions (embedded Array):** `type` (notify_roles|notify_users|webhook|email), `target[]`, `channel`
- **Throttling:** `cooldownMinutes`, `lastTriggeredAt`, `triggerCount`
- **Indexes:** `{ triggerType: 1, isActive: 1 }`, `{ lastTriggeredAt: 1 }`
- **Seed:** 5 Regeln (Low Stock, Expiring Items, Overdue Invoice, High No-Show, Revenue Drop)

---

### 3.60 `webhooks` (Tenant-eigene Webhooks)
- Tenant kann eigene Webhook-URLs registrieren
- Events: patient.*, appointment.*, invoice.*, treatment.*, device.*, etc.
- Auto-Disable nach 10 konsekutiven Fehlern

### 3.61 `webhook_logs` (Tenant)
- Delivery-Protokoll der Tenant-Webhooks

---

### 3.62 `settings` (Tenant-spezifisch)
- Enthält verschiedene Setting-Typen als separate Documents
- **Branding-Document (type="branding"):**
  - `logoUrl`, `logoDarkUrl`, `faviconUrl`
  - `clinicName{}` (en, ar), `address{}` (main mit branchId), `phone`, `email`, `website`
  - `primaryColor`, `accentColor`, `customCss`
- **Locale-Settings:**
  - `country`, `language`, `currency`, `timezone`, `dateFormat`, `timeFormat`, `direction`
  - `billingCurrency`, `paymentProvider`, `taxRate`, `taxLabel`
  - `clinicCurrency`, `clinicCurrencyOverridable`
- **Inventory-Settings:**
  - `allowNegativeStock`, `stockWarningThreshold`, `autoReserveOnTreatmentPlan`, `requireBatchOnReceive`, `requireExpiryOnReceive`, `defaultValuationMethod`, `autoReorderEnabled`
- **Auto-No-Show Settings:**
  - `autoNoShowMinutes`, `autoNoShowEnabled`, `noShowNotification`
- **Chat Settings:**
  - `chat.retentionDays` (TTL-Konfiguration)

---

### 3.63 `chat_channels` (Staff Chat)
- **Embedding:** `members[]` (embedded Array), `lastMessage{}` (embedded, denormalisiert)
- **Key Fields:** `type` (direct|branch|role|custom|announcement), `name{}` (en, ar), `description`, `avatarUrl`
- **Members Embedded:** `userId` (ref → users), `role` (admin|member), `joinedAt`, `mutedUntil`, `lastReadAt`
- **Auto-Channel:** `branchId` (ref, bei type=branch), `roleFilter` (bei type=role), `dmParticipants[]` (bei type=direct)
- **Status:** `messageCount`, `isArchived`, `isPinned`
- **Indexes:** `{ 'members.userId': 1, type: 1 }`, `{ dmParticipants: 1 }` unique pair, `{ branchId: 1, type: 1 }`, `{ 'lastMessage.sentAt': -1 }`

### 3.64 `chat_messages` (Chat-Nachrichten)
- **Embedding:** `attachments[]` (embedded Array), `replyPreview{}` (denormalisiert), `readBy[]` (embedded Array)
- **Key Fields:** `channelId` (ref → chat_channels), `senderId` (ref → users), `senderName`, `senderRole`, `senderAvatarUrl`
- **Inhalt:** `type` (text|image|file|voice|system), `text`
- **Attachments Embedded:** `filename`, `url` (S3/R2), `mimeType`, `size`, `thumbnailUrl`
- **Reply:** `replyToId` (ref → chat_messages), `replyPreview{}` (text, senderName)
- **ReadBy Embedded:** `userId`, `readAt`
- **Status:** `isEdited`, `editedAt`, `isDeleted` (Soft-Delete), `deletedAt`
- **Indexes:** `{ channelId: 1, createdAt: -1 }`, `{ channelId: 1, senderId: 1, createdAt: -1 }`, `{ createdAt: 1 }` TTL 365 Tage (optional)

---

### 3.65 `report_schedules` (Scheduled Reports)
- **Key Fields:** `reportType`, `reportParams{}` (embedded: period, branchId, doctorId, dateRange)
- **Schedule:** `frequency` (daily|weekly|monthly), `dayOfWeek`, `dayOfMonth`, `time`, `timezone`
- **Delivery:** `deliveryMethod` (email|in_app|both), `recipients[]` (refs → users), `emailAddresses[]`, `format` (pdf|csv|excel)
- **Meta:** `name`, `isActive`, `lastRunAt`, `nextRunAt`

---

## 4. Referenz-Strategie (Collection A → Collection B)

| Collection A           | Feld                   | → Collection B                |
|------------------------|------------------------|-------------------------------|
| `appointments`         | `patientId`, `doctorId`| `patients`, `doctors`         |
| `dental_charts`        | `patientId`            | `patients`                    |
| `invoices`             | `patientId`, `appointmentId` | `patients`, `appointments` |
| `lab_orders`           | `patientId`, `doctorId`| `patients`, `doctors`         |
| `xrays`                | `patientId`, `treatmentPlanId`, `procedureNoteId` | `patients`, `treatment_plans`, `procedure_notes` |
| `cbct_orders`          | `patientId`, `treatmentPlanId`, `procedureNoteId` | `patients`, `treatment_plans`, `procedure_notes` |
| `inventory_stock`      | `itemId`, `branchId`   | `inventory_items`, `branches` |
| `inventory_movements`  | `itemId`, `branchId`, `referenceId` | `inventory_items`, `branches`, diverse |
| `stock_transfers`      | `fromBranchId`, `toBranchId` | `branches`               |
| `stock_counts`         | `branchId`, `countedBy`, `approvedBy` | `branches`, `users` |
| `doctor_schedules`     | `doctorId`, `branchId` | `doctors`, `branches`         |
| `schedule_exceptions`  | `doctorId`, `branchId` | `doctors`, `branches`         |
| `staff_schedules`      | `userId`, `branchId`   | `users`, `branches`           |
| `walk_in_queue`        | `branchId`, `patientId`, `assignedDoctorId`, `chairId` | `branches`, `patients`, `doctors`, `chairs` |
| `recurring_rules`      | `branchId`, `patientId`, `doctorId` | `branches`, `patients`, `doctors` |
| `chat_channels`        | `members[].userId`, `branchId` | `users`, `branches`     |
| `chat_messages`        | `channelId`, `senderId`| `chat_channels`, `users`      |
| `notifications`        | `userId`               | `users`                       |
| `doctors`              | `userId`               | `users`                       |

---

## 5. Alle Indexes (Zusammenfassung)

### Platform-DB Indexes
| Collection         | Index                                      | Type    |
|-------------------|--------------------------------------------|---------|
| `login_attempts`  | `{ email: 1, createdAt: -1 }`             | Normal  |
| `login_attempts`  | `{ ip: 1, createdAt: -1 }`                | Normal  |
| `login_attempts`  | `{ createdAt: 1 }`                         | TTL 90d |
| `user_sessions`   | `{ userId: 1, isActive: 1 }`              | Normal  |
| `user_sessions`   | `{ expiresAt: 1 }`                         | TTL     |
| `backups`         | `{ tenantSlug: 1, createdAt: -1 }`        | Normal  |
| `backups`         | `{ status: 1, type: 1 }`                  | Normal  |
| `backups`         | `{ expiresAt: 1 }`                         | TTL     |

### Tenant-DB Indexes
| Collection             | Index                                                    | Type          |
|-----------------------|----------------------------------------------------------|---------------|
| `medications`         | `{ nameEn: 1, strength: 1 }`                            | Unique        |
| `medications`         | `{ category: 1, isActive: 1 }`                          | Normal        |
| `medications`         | `{ genericName: 1 }`                                    | Normal        |
| `lab_order_types`     | `{ nameEn: 1 }`                                         | Unique        |
| `lab_order_types`     | `{ category: 1, isActive: 1 }`                          | Normal        |
| `inventory_categories`| `{ slug: 1 }`                                           | Unique        |
| `inventory_categories`| `{ parentId: 1 }`                                       | Normal        |
| `inventory_items`     | `{ sku: 1 }`                                            | Unique        |
| `inventory_items`     | `{ categoryId: 1 }`                                     | Normal        |
| `inventory_items`     | `{ barcode: 1 }`                                        | Unique sparse |
| `inventory_items`     | `{ isActive: 1, nameEn: 1 }`                            | Normal        |
| `inventory_items`     | `{ defaultSupplierId: 1 }`                              | Normal        |
| `inventory_stock`     | `{ itemId: 1, branchId: 1 }`                            | Unique        |
| `inventory_stock`     | `{ "batches.expiryDate": 1 }`                           | Normal        |
| `inventory_stock`     | `{ availableQuantity: 1 }`                               | Normal        |
| `inventory_movements` | `{ itemId: 1, createdAt: -1 }`                          | Normal        |
| `inventory_movements` | `{ branchId: 1, movementType: 1 }`                      | Normal        |
| `inventory_movements` | `{ referenceType: 1, referenceId: 1 }`                  | Normal        |
| `inventory_movements` | `{ transferId: 1 }`                                     | Normal        |
| `inventory_movements` | `{ createdAt: -1 }`                                     | Normal        |
| `suppliers`           | `{ name: 1 }`                                           | Normal        |
| `suppliers`           | `{ isActive: 1 }`                                       | Normal        |
| `purchase_orders`     | `{ orderNumber: 1 }`                                    | Unique        |
| `purchase_orders`     | `{ supplierId: 1, status: 1 }`                          | Normal        |
| `purchase_orders`     | `{ status: 1, expectedDate: 1 }`                        | Normal        |
| `stock_transfers`     | `{ transferNumber: 1 }`                                 | Unique        |
| `stock_transfers`     | `{ fromBranchId: 1, status: 1 }`                        | Normal        |
| `stock_transfers`     | `{ toBranchId: 1, status: 1 }`                          | Normal        |
| `stock_counts`        | `{ branchId: 1, status: 1 }`                            | Normal        |
| `stock_counts`        | `{ countNumber: 1 }`                                    | Unique        |
| `xrays`               | `{ patientId: 1, createdAt: -1 }`                       | Normal        |
| `xrays`               | `{ treatmentPlanId: 1 }`                                | Normal        |
| `xrays`               | `{ procedureNoteId: 1 }`                                | Normal        |
| `xrays`               | `{ appointmentId: 1 }`                                  | Normal        |
| `xrays`               | `{ toothNumbers: 1 }`                                   | Multi-key     |
| `cbct_orders`         | `{ patientId: 1, createdAt: -1 }`                       | Normal        |
| `cbct_orders`         | `{ treatmentPlanId: 1 }`                                | Normal        |
| `cbct_orders`         | `{ procedureNoteId: 1 }`                                | Normal        |
| `cbct_orders`         | `{ orderNumber: 1 }`                                    | Unique        |
| `cbct_orders`         | `{ status: 1, scheduledDate: 1 }`                       | Normal        |
| `walk_in_queue`       | `{ branchId: 1, date: 1, status: 1 }`                   | Normal        |
| `walk_in_queue`       | `{ branchId: 1, date: 1, queueNumber: 1 }`              | Unique        |
| `walk_in_queue`       | `{ patientId: 1, date: 1 }`                             | Normal        |
| `walk_in_queue`       | `{ status: 1, priority: -1, checkInAt: 1 }`             | Normal        |
| `queue_counters`      | `{ branchId: 1, date: 1 }`                              | Unique        |
| `chairs`              | `{ branchId: 1, isActive: 1, chairNumber: 1 }`          | Normal        |
| `chairs`              | `{ branchId: 1, chairNumber: 1 }`                       | Unique        |
| `recurring_rules`     | `{ patientId: 1, status: 1 }`                           | Normal        |
| `recurring_rules`     | `{ doctorId: 1, status: 1 }`                            | Normal        |
| `recurring_rules`     | `{ branchId: 1, status: 1, nextOccurrenceDate: 1 }`     | Normal        |
| `recurring_rules`     | `{ status: 1, nextOccurrenceDate: 1 }`                  | Normal        |
| `notification_templates` | `{ key: 1, tenantId: 1 }`                            | Unique        |
| `notification_templates` | `{ category: 1, trigger: 1, isActive: 1 }`           | Normal        |
| `notifications`       | `{ userId: 1, isRead: 1, createdAt: -1 }`               | Normal        |
| `notifications`       | `{ userId: 1, category: 1, createdAt: -1 }`             | Normal        |
| `notifications`       | `{ createdAt: 1, expiresAt: 1 }`                        | TTL           |
| `notifications`       | `{ tenantId: 1, createdAt: -1 }`                        | Normal        |
| `notification_logs`   | `{ tenantId: 1, createdAt: -1 }`                        | Normal        |
| `notification_logs`   | `{ channel: 1, status: 1 }`                             | Normal        |
| `notification_logs`   | `{ patientId: 1, createdAt: -1 }`                       | Normal        |
| `notification_logs`   | `{ templateKey: 1, status: 1, createdAt: -1 }`          | Normal        |
| `notification_preferences` | `{ userId: 1, tenantId: 1 }`                       | Unique        |
| `notification_preferences` | `{ patientId: 1, tenantId: 1 }`                    | Unique        |
| `device_tokens`       | `{ userId: 1, platform: 1 }`                            | Normal        |
| `device_tokens`       | `{ token: 1 }`                                          | Unique        |
| `device_tokens`       | `{ isActive: 1, lastUsedAt: 1 }`                        | Normal        |
| `alert_rules`         | `{ triggerType: 1, isActive: 1 }`                       | Normal        |
| `alert_rules`         | `{ lastTriggeredAt: 1 }`                                | Normal        |
| `chat_channels`       | `{ 'members.userId': 1, type: 1 }`                      | Normal        |
| `chat_channels`       | `{ dmParticipants: 1 }`                                 | Unique pair   |
| `chat_channels`       | `{ branchId: 1, type: 1 }`                              | Normal        |
| `chat_channels`       | `{ 'lastMessage.sentAt': -1 }`                          | Normal        |
| `chat_messages`       | `{ channelId: 1, createdAt: -1 }`                       | Normal        |
| `chat_messages`       | `{ channelId: 1, senderId: 1, createdAt: -1 }`          | Normal        |
| `chat_messages`       | `{ createdAt: 1 }`                                      | TTL 365d (optional) |

---

## 6. Collection Count Zusammenfassung

### Platform-DB: ~24 Collections
`users`, `tenants`, `modules`, `tenant_modules`, `pricing_config`, `webhooks`, `webhook_logs`, `api_keys`, `feature_flags`, `deployments`, `domains`, `saas_invoices`, `saas_payments`, `audit_logs`, `error_logs`, `login_attempts`, `support_sessions`, `user_sessions`, `backups`, `currencies`, `languages`, `translation_packs`, `country_config`, `tenant_languages`

### Tenant-DB: ~35 Collections (pro Tenant)
`patients`, `appointments`, `appointment_types`, `waitlist`, `recurring_rules`, `dental_charts`, `dental_chart_history`, `treatment_plans`, `procedure_notes`, `procedure_note_templates`, `invoices`, `payments`, `reconciliation`, `prescriptions`, `medications`, `doctors`, `doctor_schedules`, `doctor_availability`, `schedule_exceptions`, `staff_schedules`, `shift_templates`, `branches`, `chairs`, `services`, `service_categories`, `xrays`, `cbct_orders`, `cbct_scans`, `lab_orders`, `dental_labs`, `lab_order_types`, `insurance_claims`, `insurance_companies`, `inventory_categories`, `inventory_items`, `inventory_stock`, `inventory_movements`, `suppliers`, `purchase_orders`, `stock_transfers`, `stock_counts`, `users`, `walk_in_queue`, `queue_counters`, `leave_requests`, `leave_types`, `leave_balances`, `attendance`, `doctor_commissions`, `commission_payouts`, `installment_plans`, `consent_forms`, `consent_templates`, `notification_templates`, `notifications`, `notification_logs`, `notification_preferences`, `device_tokens`, `alert_rules`, `webhooks`, `webhook_logs`, `settings`, `chat_channels`, `chat_messages`, `report_schedules`

### Gesamt: ~59 distinct Collection-Definitionen
(~24 Platform + ~35 Tenant, einige existieren in beiden wie `users`, `webhooks`, `webhook_logs`)
