-- Migration 075: Dental Chart Enhancements
-- Adds case_label, notice fields to dental_charts
-- Extends dental_chart_history with treatment plan linkage and source tracking
-- Adds notice and dental_chart_snapshot to treatments

-- Task 4: Case & Notice fields on dental_charts
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS case_label TEXT;
ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS notice TEXT;

-- Task 5: Link dental_chart_history to treatment plans + source tracking
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL;
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'treatment_plan', 'treatment'));
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS case_summary TEXT;
ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS notice TEXT;

-- Task 6: Treatment notice + chart snapshot
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS notice TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS dental_chart_snapshot JSONB;

-- Task 7: Procedure notes notice field
ALTER TABLE procedure_notes ADD COLUMN IF NOT EXISTS notice TEXT;

-- Phase 9 Fix 9.2a: Per-tooth treatment details (JSONB array of {toothNumber, procedureType, surface, notes})
ALTER TABLE procedure_notes ADD COLUMN IF NOT EXISTS teeth_details JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dental_chart_history_treatment_plan ON dental_chart_history(treatment_plan_id) WHERE treatment_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dental_chart_history_source ON dental_chart_history(source);
