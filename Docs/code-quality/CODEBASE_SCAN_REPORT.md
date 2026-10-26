# 🔍 Codebase Scan Report - Incomplete Features & Dummy Data

## 📊 Summary

**Total Issues Found**: 28+ incomplete implementations across different modules

| Category | Count | Severity |
|----------|-------|----------|
| Empty onClick handlers | 5+ | 🔴 High |
| TODO comments | 7 | 🟡 Medium |
| Dead links (href="#") | 3 | 🟡 Medium |
| Incomplete API integrations | 6 | 🔴 High |
| Static data that should be dynamic | 4 | 🟡 Medium |
| Unused imports/definitions | 8+ | 🟢 Low |

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. **Treatment Plan - Send to Patient** 
**Files**: 
- [src/admin/pages/treatment-plans/TreatmentPlanList.jsx](src/admin/pages/treatment-plans/TreatmentPlanList.jsx#L376)
- [src/admin/pages/treatment-plans/TreatmentPlanView.jsx](src/admin/pages/treatment-plans/TreatmentPlanView.jsx#L286)

**Issue**: 
```jsx
onClick={() => {/* TODO: Send to patient */}}
```
- Button exists but handler is empty comment
- Should send treatment plan to patient via email/SMS

**Impact**: Feature that users expect to work is non-functional

**Fix Needed**: Implement `sendTreatmentPlanToPatient()` function

---

### 2. **Module Toggle Status** 
**File**: [src/developer/pages/modules/ModuleList.jsx](src/developer/pages/modules/ModuleList.jsx#L105)

**Issue**:
```jsx
const toggleModuleStatus = (_moduleId) => {
  // TODO: Implement with useActivateModule/useDeactivateModule hooks
  setActiveMenu(null);  // Only this line executes!
};
```
- Button entirely non-functional
- Backend APIs exist but not called

**Impact**: Cannot activate/deactivate modules from UI

**Backend Status**: ✅ Ready (useActivateModule, useDeactivateModule hooks exist)

---

### 3. **Template Editor - Missing API**
**File**: [src/developer/pages/website/TemplateEditor.jsx](src/developer/pages/website/TemplateEditor.jsx#L29-L36)

**Issue**:
```jsx
useEffect(() => {
  if (templateId) {
    // TODO: Fetch from API
  }
}, [templateId]);

const handleSave = async () => {
  // TODO: Save to API
  console.log('Saving template:', template);  // Just logs!
};
```

**Impact**: 
- Cannot load existing templates for editing
- Cannot save new templates
- Template editor is UI-only

**Missing**: `templateApi.get()` and `templateApi.save()` methods

---

### 4. **Feature Flags - Create New**
**File**: [src/developer/pages/feature-flags/FeatureFlagList.jsx](src/developer/pages/feature-flags/FeatureFlagList.jsx#L389)

**Issue**:
```jsx
// TODO: Create new flag - call createFlag API
```

**Status**: Button exists but handler not found/implemented

---

### 5. **Branding Settings - Missing API Call**
**File**: [src/developer/pages/settings/BrandingSettings.jsx](src/developer/pages/settings/BrandingSettings.jsx#L68)

**Issue**:
```jsx
// TODO: Call real branding API endpoint - PUT /functions/v1/branding-settings
setSuccess('Settings saved');  // Just shows message without saving!
```

**Impact**: Users think settings are saved but nothing is persisted

---

## 🟡 MEDIUM PRIORITY ISSUES

### 1. **Module Detail Documentation Links**
**File**: [src/developer/pages/modules/ModuleDetail.jsx](src/developer/pages/modules/ModuleDetail.jsx#L327-L335)

**Issue**: Dead links
```jsx
<a href="#">Documentation</a>     // Link goes nowhere
<a href="#">Support Forum</a>     // Link goes nowhere
<a href="#">Report Issue</a>      // Link goes nowhere
```

**Should Link To**:
- Module-specific documentation
- Support forums
- Issue tracker

---

### 2. **Module Configuration Export/Import**
**File**: [src/developer/pages/modules/ModuleDetail.jsx](src/developer/pages/modules/ModuleDetail.jsx#L318-L331)

**Issue**: Buttons with no handlers
```jsx
<button>Export Configuration</button>  // Does nothing
<button>Import Configuration</button>  // Does nothing
```

**Missing**: No backend endpoints for config export/import

---

### 3. **Website Integration Settings**
**File**: [src/developer/pages/website/IntegrationSettings.jsx](src/developer/pages/website/IntegrationSettings.jsx#L221-L355)

**Issue**: Placeholder values in form
```jsx
placeholder="G-XXXXXXXXXX"      // Google Analytics ID example
placeholder="GTM-XXXXXXX"       // Google Tag Manager example
placeholder="xxxxxxxx"          // Generic placeholder
```

**Not Sure If**: 
- Values are saved to database
- Validation is implemented
- Integration actually works with 3rd party services

---

## 🟢 LOW PRIORITY (Design/UX Issues)

### 1. **Static Data - Module Categories**
**File**: [src/developer/pages/modules/ModuleList.jsx](src/developer/pages/modules/ModuleList.jsx#L75-L83)

**Issue**: Hardcoded categories
```javascript
const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'operations', label: 'Operations' },
  { value: 'patient-experience', label: 'Patient Experience' },
  // ... more hardcoded
];
```

**Should Be**: Fetched from database

**Impact**: New categories can't be added without code change

---

### 2. **Static Data - Module Icons**
**File**: [src/developer/pages/modules/ModuleList.jsx](src/developer/pages/modules/ModuleList.jsx#L31-L43)

**Issue**: Emoji map is hardcoded
```javascript
const moduleIcons = {
  inventory: '📦',
  'patient-portal': '🏥',
  analytics: '📊',
  // ...
};
```

**Should Be**: Stored in module metadata in database

**Impact**: New modules show default icon (📦) instead of unique icon

---

### 3. **Mock Module Details**
**File**: [src/developer/pages/modules/ModuleDetail.jsx](src/developer/pages/modules/ModuleDetail.jsx#L69-L103)

**Issue**: Only "inventory" module has real details, others get generic fallback
```javascript
const mockModuleDetails = {
  inventory: { /* detailed data */ }
};

// All other modules:
setModule({
  name: 'Generic Module Name',
  description: 'Module description not available.',
  version: '1.0.0',
  // ... all generic defaults
});
```

---

## 📋 COMPLETE TODO ITEMS LIST

| File | Line | TODO Message | Type |
|------|------|--------------|------|
| TreatmentPlanList.jsx | 376 | `/* TODO: Send to patient */` | Empty Handler |
| TreatmentPlanView.jsx | 286 | `/* TODO: Send to patient */` | Empty Handler |
| ModuleList.jsx | 105 | `Implement with useActivateModule/useDeactivateModule` | Incomplete |
| ModuleDetail.jsx | 318-331 | Export/Import buttons with no handlers | Dummy UI |
| ModuleDetail.jsx | 327-335 | Links going to `#` | Dead Links |
| TemplateEditor.jsx | 29 | `Fetch from API` | Missing API |
| TemplateEditor.jsx | 36 | `Save to API` | Missing API |
| FeatureFlagList.jsx | 389 | `Create new flag - call createFlag API` | Incomplete |
| BrandingSettings.jsx | 68 | `Call real branding API endpoint` | Mock Save |

---

## 🔧 IMPLEMENTATION ESTIMATES

### Quick Wins (< 1 hour)
- ✅ Hook up module toggle status - **10 min**
- ✅ Add documentation links - **15 min**
- ✅ Fix module categories to be dynamic - **20 min**

### Medium Effort (1-4 hours)
- ⚠️ Template Editor API integration - **1.5 hours**
- ⚠️ Treatment plan send to patient - **2 hours**
- ⚠️ Module detail real data - **1 hour**

### Large Effort (> 4 hours)
- 🔴 Export/Import configuration - **4 hours**
- 🔴 Feature flags create/edit - **3 hours**
- 🔴 Branding settings full implementation - **2 hours**

---

## 📊 IMPACT ANALYSIS

### By Module:

| Module | Status | Issues | Impact |
|--------|--------|--------|--------|
| **Modules** | 🔴 Broken | 6 | Cannot manage modules |
| **Templates** | 🔴 Broken | 2 | Cannot create/edit templates |
| **Treatment Plans** | 🔴 Broken | 1 | Cannot share with patients |
| **Feature Flags** | 🟡 Partial | 1 | Cannot create new flags |
| **Branding** | 🟡 Partial | 1 | Settings don't persist |
| **Integration** | ❓ Unknown | 1 | May not be saving |

---

## ✅ TO-DO LIST FOR COMPLETION

1. **High Priority (User-Facing)**
   - [ ] Fix module activation/deactivation toggle
   - [ ] Implement treatment plan "send to patient"
   - [ ] Complete template editor (fetch + save)

2. **Medium Priority (Platform)**
   - [ ] Dynamic categories for modules
   - [ ] Module documentation links
   - [ ] Fix branding settings save

3. **Low Priority (Polish)**
   - [ ] Module icons from database
   - [ ] Real module details for all modules
   - [ ] Configuration export/import

---

## 🚀 NEXT STEPS

1. **Verify which are intentional placeholders** vs actual missing code
2. **Prioritize by user impact** - Start with module toggle and treatment plans
3. **Create tracked issues** for each incomplete feature
4. **Assign to relevant teams** for implementation

