-- Migration: Add treatment_plan_id to invoices table
-- This allows invoices to be linked to treatment plans for tracking

-- Add treatment_plan_id column to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL;

-- Add total_amount column if it doesn't exist (some versions use 'total' instead)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10,2);
        
        -- Copy existing 'total' values to 'total_amount' if 'total' exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'total'
        ) THEN
            UPDATE invoices SET total_amount = total WHERE total_amount IS NULL;
        END IF;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_treatment_plan ON invoices(treatment_plan_id);

-- Comment
COMMENT ON COLUMN invoices.treatment_plan_id IS 'Reference to the treatment plan this invoice was generated from';
