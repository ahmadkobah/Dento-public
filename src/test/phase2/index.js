/**
 * Phase 2 Clinical Modules Test Suite
 * 
 * This file exports all Phase 2 tests for easy import and provides
 * an overview of the testing coverage for clinical modules.
 * 
 * Modules Tested:
 * 1. Treatment Plans - Patient treatment planning with cost calculations
 * 2. Prescriptions - Medication prescriptions with dosage validation
 * 3. X-Rays - Dental radiograph management and file uploads
 * 4. CBCT - Cone Beam CT scan management with DICOM support
 * 5. Consent Forms - Digital consent with signature capture
 * 6. Procedure Notes - Clinical procedure documentation
 * 7. Lab Orders - Dental lab work tracking
 * 
 * Additional Test Categories:
 * 8. Components - React component rendering and interactions
 * 9. Integration - API flows and data transformation
 * 10. Error Handling - Network, validation, and database errors
 * 11. Accessibility - ARIA labels, keyboard navigation
 * 12. Cross-Module - Module interaction tests
 * 13. Edge Cases - Empty states, pagination, special characters
 * 14. Security - RBAC, data isolation, input sanitization
 * 15. Performance - Large data, file uploads, memoization
 * 
 * Run all Phase 2 tests: npx vitest run src/test/phase2
 * Run specific module: npx vitest run src/test/phase2/treatmentPlans
 */

// Clinical Module Tests
export * from './treatmentPlans.test.jsx';
export * from './prescriptions.test.jsx';
export * from './xrays.test.jsx';
export * from './cbct.test.jsx';
export * from './consentForms.test.jsx';
export * from './procedureNotes.test.jsx';
export * from './labOrders.test.jsx';

// Additional Test Categories
export * from './components.test.jsx';
export * from './integration.test.jsx';
export * from './errorHandling.test.jsx';
export * from './accessibility.test.jsx';
export * from './crossModule.test.jsx';
export * from './edgeCases.test.jsx';
export * from './security.test.jsx';
export * from './performance.test.jsx';
