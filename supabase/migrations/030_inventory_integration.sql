-- =====================================================
-- INVENTORY INTEGRATION MIGRATION
-- Integrates inventory tracking with procedures, treatments, and services
-- =====================================================

-- =====================================================
-- 1. SERVICE MATERIALS (Default materials per service)
-- =====================================================
CREATE TABLE IF NOT EXISTS service_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    default_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_service_materials_service ON service_materials(service_id);
CREATE INDEX IF NOT EXISTS idx_service_materials_item ON service_materials(inventory_item_id);

COMMENT ON TABLE service_materials IS 'Maps services to their default required materials from inventory';

-- =====================================================
-- 2. PROCEDURE TEMPLATE MATERIALS (Template defaults)
-- =====================================================
CREATE TABLE IF NOT EXISTS procedure_template_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES procedure_note_templates(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    default_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ptm_template ON procedure_template_materials(template_id);
CREATE INDEX IF NOT EXISTS idx_ptm_item ON procedure_template_materials(inventory_item_id);

COMMENT ON TABLE procedure_template_materials IS 'Default materials for procedure note templates';

-- =====================================================
-- 3. PROCEDURE MATERIAL USAGE (Actual materials used)
-- =====================================================
CREATE TABLE IF NOT EXISTS procedure_material_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links to clinical records (at least one should be filled)
    procedure_note_id UUID REFERENCES procedure_notes(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Inventory tracking
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2), -- Snapshot at time of use
    total_cost DECIMAL(10,2), -- Calculated: quantity * unit_cost
    
    -- Branch for stock deduction
    branch_id UUID NOT NULL REFERENCES branches(id),
    
    -- Link to movement record (for audit trail)
    movement_id UUID REFERENCES inventory_movements(id),
    
    -- Billing info
    is_billable BOOLEAN DEFAULT false,
    selling_price DECIMAL(10,2), -- Price charged to patient if billable
    invoice_item_id UUID REFERENCES invoice_items(id),
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmu_procedure ON procedure_material_usage(procedure_note_id);
CREATE INDEX IF NOT EXISTS idx_pmu_treatment ON procedure_material_usage(treatment_id);
CREATE INDEX IF NOT EXISTS idx_pmu_appointment ON procedure_material_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_pmu_item ON procedure_material_usage(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_pmu_branch ON procedure_material_usage(branch_id);
CREATE INDEX IF NOT EXISTS idx_pmu_movement ON procedure_material_usage(movement_id);
CREATE INDEX IF NOT EXISTS idx_pmu_created_at ON procedure_material_usage(created_at);

COMMENT ON TABLE procedure_material_usage IS 'Tracks actual materials used in procedures, treatments, and appointments';

-- =====================================================
-- 4. FUNCTION: Deduct inventory stock
-- =====================================================
CREATE OR REPLACE FUNCTION deduct_inventory_stock(
    p_item_id UUID,
    p_branch_id UUID,
    p_quantity DECIMAL,
    p_reference_type VARCHAR,
    p_reference_id UUID,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_current_stock DECIMAL;
    v_unit_cost DECIMAL;
BEGIN
    -- Get current stock
    SELECT quantity INTO v_current_stock
    FROM inventory_stock 
    WHERE item_id = p_item_id AND branch_id = p_branch_id;
    
    -- Get unit cost from inventory item
    SELECT unit_cost INTO v_unit_cost
    FROM inventory_items 
    WHERE id = p_item_id;
    
    -- Check if sufficient stock (allow negative for adjustment flexibility)
    IF v_current_stock IS NULL THEN
        -- Create stock record if it doesn't exist
        INSERT INTO inventory_stock (item_id, branch_id, quantity)
        VALUES (p_item_id, p_branch_id, 0);
        v_current_stock := 0;
    END IF;
    
    -- Create movement record (negative quantity for deduction)
    INSERT INTO inventory_movements (
        item_id, 
        branch_id, 
        movement_type, 
        quantity, 
        unit_cost, 
        total_cost, 
        reference_type, 
        reference_id, 
        created_by,
        notes
    ) VALUES (
        p_item_id, 
        p_branch_id, 
        'sale', 
        -p_quantity,
        v_unit_cost, 
        v_unit_cost * p_quantity, 
        p_reference_type, 
        p_reference_id, 
        p_user_id,
        'Material usage deduction'
    ) RETURNING id INTO v_movement_id;
    
    -- Update stock
    UPDATE inventory_stock 
    SET quantity = quantity - p_quantity,
        updated_at = NOW()
    WHERE item_id = p_item_id AND branch_id = p_branch_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_inventory_stock IS 'Deducts stock and creates movement record, returns movement_id';

-- =====================================================
-- 5. FUNCTION: Add inventory stock (for returns/adjustments)
-- =====================================================
CREATE OR REPLACE FUNCTION add_inventory_stock(
    p_item_id UUID,
    p_branch_id UUID,
    p_quantity DECIMAL,
    p_movement_type VARCHAR DEFAULT 'adjustment',
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_unit_cost DECIMAL DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_unit_cost DECIMAL;
BEGIN
    -- Get unit cost from inventory item if not provided
    IF p_unit_cost IS NULL THEN
        SELECT unit_cost INTO v_unit_cost
        FROM inventory_items 
        WHERE id = p_item_id;
    ELSE
        v_unit_cost := p_unit_cost;
    END IF;
    
    -- Ensure stock record exists
    INSERT INTO inventory_stock (item_id, branch_id, quantity)
    VALUES (p_item_id, p_branch_id, 0)
    ON CONFLICT (item_id, branch_id) DO NOTHING;
    
    -- Create movement record (positive quantity for addition)
    INSERT INTO inventory_movements (
        item_id, 
        branch_id, 
        movement_type, 
        quantity, 
        unit_cost, 
        total_cost, 
        reference_type, 
        reference_id, 
        created_by,
        notes
    ) VALUES (
        p_item_id, 
        p_branch_id, 
        p_movement_type, 
        p_quantity,
        v_unit_cost, 
        v_unit_cost * p_quantity, 
        p_reference_type, 
        p_reference_id, 
        p_user_id,
        COALESCE(p_notes, 'Stock addition')
    ) RETURNING id INTO v_movement_id;
    
    -- Update stock
    UPDATE inventory_stock 
    SET quantity = quantity + p_quantity,
        updated_at = NOW()
    WHERE item_id = p_item_id AND branch_id = p_branch_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_inventory_stock IS 'Adds stock and creates movement record, returns movement_id';

-- =====================================================
-- 6. FUNCTION: Get available stock for an item at a branch
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_stock(
    p_item_id UUID,
    p_branch_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_quantity DECIMAL;
BEGIN
    SELECT COALESCE(quantity, 0) - COALESCE(reserved_quantity, 0) INTO v_quantity
    FROM inventory_stock 
    WHERE item_id = p_item_id AND branch_id = p_branch_id;
    
    RETURN COALESCE(v_quantity, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_stock IS 'Returns available (unreserved) stock for an item at a branch';

-- =====================================================
-- 7. FUNCTION: Check if stock is sufficient
-- =====================================================
CREATE OR REPLACE FUNCTION check_stock_availability(
    p_item_id UUID,
    p_branch_id UUID,
    p_required_quantity DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    v_available DECIMAL;
BEGIN
    v_available := get_available_stock(p_item_id, p_branch_id);
    RETURN v_available >= p_required_quantity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_stock_availability IS 'Checks if sufficient stock is available';

-- =====================================================
-- 8. VIEW: Low stock items
-- =====================================================
CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
    ii.id,
    ii.sku,
    ii.name_en,
    ii.name_ar,
    ii.unit,
    ii.reorder_level,
    ii.reorder_quantity,
    b.id as branch_id,
    b.name_en as branch_name,
    COALESCE(ist.quantity, 0) as current_stock,
    COALESCE(ist.reserved_quantity, 0) as reserved_quantity,
    COALESCE(ist.quantity, 0) - COALESCE(ist.reserved_quantity, 0) as available_stock,
    CASE 
        WHEN COALESCE(ist.quantity, 0) <= 0 THEN 'out_of_stock'
        WHEN COALESCE(ist.quantity, 0) <= ii.reorder_level THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM inventory_items ii
CROSS JOIN branches b
LEFT JOIN inventory_stock ist ON ii.id = ist.item_id AND b.id = ist.branch_id
WHERE ii.is_active = true AND b.is_active = true
  AND COALESCE(ist.quantity, 0) <= ii.reorder_level;

COMMENT ON VIEW v_low_stock_items IS 'Shows all items that are at or below reorder level';

-- =====================================================
-- 9. VIEW: Material usage summary
-- =====================================================
CREATE OR REPLACE VIEW v_material_usage_summary AS
SELECT 
    pmu.inventory_item_id,
    ii.name_en as item_name,
    ii.sku,
    pmu.branch_id,
    b.name_en as branch_name,
    DATE_TRUNC('month', pmu.created_at) as month,
    SUM(pmu.quantity) as total_quantity_used,
    SUM(pmu.total_cost) as total_cost,
    COUNT(*) as usage_count,
    COUNT(DISTINCT pmu.procedure_note_id) as procedure_count,
    COUNT(DISTINCT pmu.treatment_id) as treatment_count
FROM procedure_material_usage pmu
JOIN inventory_items ii ON pmu.inventory_item_id = ii.id
JOIN branches b ON pmu.branch_id = b.id
GROUP BY 
    pmu.inventory_item_id, 
    ii.name_en, 
    ii.sku,
    pmu.branch_id, 
    b.name_en,
    DATE_TRUNC('month', pmu.created_at);

COMMENT ON VIEW v_material_usage_summary IS 'Monthly summary of material usage by item and branch';

-- =====================================================
-- 10. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE service_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_template_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_material_usage ENABLE ROW LEVEL SECURITY;

-- Service materials policies (admin/manager can manage, all authenticated can view)
CREATE POLICY "service_materials_select" ON service_materials
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_materials_insert" ON service_materials
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "service_materials_update" ON service_materials
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "service_materials_delete" ON service_materials
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager')
        )
    );

-- Procedure template materials policies
CREATE POLICY "ptm_select" ON procedure_template_materials
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ptm_insert" ON procedure_template_materials
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'doctor')
        )
    );

CREATE POLICY "ptm_update" ON procedure_template_materials
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'doctor')
        )
    );

CREATE POLICY "ptm_delete" ON procedure_template_materials
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'doctor')
        )
    );

-- Procedure material usage policies (all authenticated can view, clinical staff can create)
CREATE POLICY "pmu_select" ON procedure_material_usage
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "pmu_insert" ON procedure_material_usage
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'doctor', 'assistant', 'receptionist')
        )
    );

CREATE POLICY "pmu_update" ON procedure_material_usage
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'manager', 'doctor')
        )
    );

CREATE POLICY "pmu_delete" ON procedure_material_usage
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

-- Trigger to update total_cost when quantity or unit_cost changes
CREATE OR REPLACE FUNCTION update_material_usage_total_cost()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_cost, 0);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_material_usage_cost
    BEFORE INSERT OR UPDATE ON procedure_material_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_material_usage_total_cost();

-- Trigger to update service_materials timestamp
CREATE OR REPLACE FUNCTION update_service_materials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_service_materials_timestamp
    BEFORE UPDATE ON service_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_service_materials_timestamp();

-- =====================================================
-- 12. SEED DATA: Common dental materials categories
-- =====================================================

-- Insert common inventory categories if they don't exist
INSERT INTO inventory_categories (name_en, name_ar, description, is_active)
SELECT * FROM (VALUES
    ('Consumables', 'المستهلكات', 'Single-use items like gloves, masks, etc.', true),
    ('Dental Materials', 'مواد طب الأسنان', 'Composite, cement, impression materials', true),
    ('Anesthetics', 'المخدرات الموضعية', 'Local anesthetics and related supplies', true),
    ('Surgical Supplies', 'مستلزمات جراحية', 'Surgical blades, sutures, gauze', true),
    ('Endodontic Materials', 'مواد علاج الجذور', 'Files, gutta percha, sealers', true),
    ('Restorative Materials', 'مواد ترميمية', 'Filling materials, bonding agents', true),
    ('Prosthodontic Materials', 'مواد تركيبات', 'Crown & bridge materials, denture supplies', true),
    ('Orthodontic Supplies', 'مستلزمات تقويم', 'Brackets, wires, elastics', true),
    ('Preventive Materials', 'مواد وقائية', 'Fluoride, sealants, prophylaxis materials', true),
    ('Infection Control', 'مكافحة العدوى', 'Disinfectants, sterilization supplies', true)
) AS v(name_en, name_ar, description, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_categories WHERE name_en = v.name_en
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
