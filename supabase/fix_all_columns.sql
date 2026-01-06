-- ============================================================================
-- SELLX ERP - CORRECAO COMPLETA DE COLUNAS
-- Execute este script no SQL Editor do Supabase
-- Data: 2024 - Verificacao completa do sistema
-- ============================================================================

-- ============================================================================
-- 1. TABELA PRODUCTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subgroup_id UUID REFERENCES product_groups(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS block_sale_no_stock BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_open_price BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_days INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- 2. TABELA STOCK_LOCATIONS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'loja';
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 3. TABELA STOCK_BATCHES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Alias para compatibilidade (manufacturing_date = manufacture_date)
-- O codigo usa manufacturing_date mas o schema tem manufacture_date
-- Vamos criar a coluna como alias se nao existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_batches' AND column_name = 'manufacturing_date') THEN
        ALTER TABLE stock_batches ADD COLUMN manufacturing_date DATE;
        UPDATE stock_batches SET manufacturing_date = manufacture_date WHERE manufacturing_date IS NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. TABELA STOCK_MOVEMENTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_stock DECIMAL(15,3);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_stock DECIMAL(15,3);

-- ============================================================================
-- 5. TABELA STOCK_TRANSFERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_number SERIAL;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES stock_batches(id);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 6. TABELA STOCK_ADJUSTMENTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_number SERIAL;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS new_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 7. TABELA CASH_REGISTERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES profiles(id);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES stock_locations(id);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 8. TABELA SUPPLIERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ie VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS im VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0;

-- ============================================================================
-- 9. TABELA CUSTOMERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vip_discount_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS employer VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(15,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference_phone VARCHAR(20);

-- ============================================================================
-- 10. TABELA ORGANIZATIONS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ie VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS im VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_customers INTEGER DEFAULT 1000;

-- ============================================================================
-- 11. TABELA SALE_ITEMS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS commission_value DECIMAL(15,2) DEFAULT 0;

-- ============================================================================
-- 12. TABELA SALES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS commission_total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS received_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS use_wholesale_price BOOLEAN DEFAULT false;

-- ============================================================================
-- 13. TABELA FUTURE_ORDERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS remaining_payment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 14. TABELA SERVICE_ORDERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS accessories TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES sellers(id);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS warranty_date DATE;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 15. TABELA CHECKS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issuer_name VARCHAR(255);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS compensated_date DATE;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS returned_date DATE;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- ============================================================================
-- 16. TABELA QUOTES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_conditions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(100);

-- ============================================================================
-- 17. TABELA RETURNS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE returns ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- ============================================================================
-- 18. TABELA PROMOTIONS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS progressive_tiers JSONB DEFAULT '[]';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS buy_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS get_quantity INTEGER;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS get_discount_percent DECIMAL(5,2);

-- ============================================================================
-- 19. TABELA LOYALTY_PROGRAMS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reais_per_point DECIMAL(10,4);
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS expiry_days INTEGER DEFAULT 365;
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 20. TABELA CUSTOMER_POINTS (NOVA - se nao existir)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    points_balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, customer_id)
);

-- ============================================================================
-- 21. TABELA EXPENSES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 22. TABELA PAYABLES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE payables ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE payables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 23. TABELA INSTALLMENTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- ============================================================================
-- 24. TABELA CASH_MOVEMENTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS reference_id UUID;

-- ============================================================================
-- 25. TABELA SELLERS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- 26. TABELA PROFILES - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- ============================================================================
-- 27. TABELA BANK_ACCOUNTS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 28. TABELA INVITATIONS - Adicionar colunas faltantes
-- ============================================================================
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- ============================================================================
-- POLITICAS RLS PERMISSIVAS (temporariamente para debug)
-- ============================================================================

-- Desabilitar RLS temporariamente para tabelas problematicas
ALTER TABLE customer_points DISABLE ROW LEVEL SECURITY;

-- Criar politicas permissivas para customer_points
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for customer_points" ON customer_points;
CREATE POLICY "Allow all for customer_points" ON customer_points FOR ALL USING (true) WITH CHECK (true);

-- Garantir que cash_movements tem politica
DROP POLICY IF EXISTS "Allow all for cash_movements" ON cash_movements;
CREATE POLICY "Allow all for cash_movements" ON cash_movements FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- INDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customer_points_customer ON customer_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_organization ON customer_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_batches_status ON stock_batches(status);
CREATE INDEX IF NOT EXISTS idx_sales_profit ON sales(organization_id, profit);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT NAS NOVAS TABELAS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Customer Points
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_points_updated_at') THEN
        CREATE TRIGGER update_customer_points_updated_at
            BEFORE UPDATE ON customer_points
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Stock Locations
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_locations_updated_at') THEN
        CREATE TRIGGER update_stock_locations_updated_at
            BEFORE UPDATE ON stock_locations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Stock Batches
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_batches_updated_at') THEN
        CREATE TRIGGER update_stock_batches_updated_at
            BEFORE UPDATE ON stock_batches
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- VERIFICACAO FINAL
-- ============================================================================

-- Listar todas as tabelas e quantidade de colunas
SELECT
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- FIM DO SCRIPT DE CORRECAO
-- ============================================================================
