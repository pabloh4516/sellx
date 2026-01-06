-- ============================================================================
-- SELLX ERP - COLUNAS RESTANTES QUE AINDA FALTAM
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- ============================================================================
-- TABELA: sales - Coluna faltante
-- ============================================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS use_wholesale_price BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS validity_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'value';

-- ============================================================================
-- TABELA: installments - Colunas faltantes
-- ============================================================================
ALTER TABLE installments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE installments ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE installments ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_method_id UUID;

-- ============================================================================
-- TABELA: expenses - Colunas faltantes
-- ============================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrent BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(50);

-- ============================================================================
-- TABELA: checks - Colunas faltantes
-- ============================================================================
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issuer_name VARCHAR(255);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issuer_cpf_cnpj VARCHAR(20);

-- ============================================================================
-- TABELA: stock_locations - Colunas faltantes
-- ============================================================================
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'loja';
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE stock_locations ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;

-- ============================================================================
-- TABELA: stock_batches - Colunas faltantes
-- ============================================================================
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS manufacturing_date DATE;
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- TABELA: stock_adjustments - Colunas faltantes
-- ============================================================================
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_number SERIAL;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS new_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15,2);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- TABELA: stock_transfers - Colunas faltantes
-- ============================================================================
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_number SERIAL;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS received_by VARCHAR(255);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;

-- ============================================================================
-- TABELA: stock_movements - Colunas faltantes
-- ============================================================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_stock DECIMAL(15,3);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_stock DECIMAL(15,3);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- TABELA: bank_accounts - Colunas faltantes
-- ============================================================================
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_number VARCHAR(30);

-- ============================================================================
-- TABELA: cash_registers - Colunas faltantes
-- ============================================================================
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by VARCHAR(255);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by_id UUID;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(255);

-- ============================================================================
-- TABELA: cash_movements - Colunas faltantes
-- ============================================================================
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================================================
-- TABELA: service_orders - Colunas faltantes
-- ============================================================================
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS technician_id UUID;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS accessories TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(15,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS entry_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS warranty_until DATE;

-- ============================================================================
-- TABELA: organizations - Colunas faltantes
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ie VARCHAR(30);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS im VARCHAR(30);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- ============================================================================
-- TABELA: suppliers - Colunas faltantes
-- ============================================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ie VARCHAR(30);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- ============================================================================
-- TABELA: sellers - Colunas faltantes
-- ============================================================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'vendedor';

-- ============================================================================
-- TABELA: payment_methods - Colunas faltantes
-- ============================================================================
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS fee_fixed DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS days_to_receive INTEGER DEFAULT 0;

-- ============================================================================
-- TABELA: promotions - Colunas faltantes
-- ============================================================================
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS buy_quantity INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS get_quantity INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_purchase_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS max_discount_value DECIMAL(15,2);
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'all';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS combo_items JSONB DEFAULT '[]';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS combo_price DECIMAL(15,2);
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS progressive_tiers JSONB DEFAULT '[]';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS loyalty_min_points INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT false;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';

-- ============================================================================
-- TABELA: loyalty_programs - Colunas faltantes
-- ============================================================================
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reais_per_point DECIMAL(10,4) DEFAULT 0.01;
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS min_purchase_for_points DECIMAL(15,2) DEFAULT 0;

-- ============================================================================
-- TABELA: theme_settings - Colunas faltantes
-- ============================================================================
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS header_style VARCHAR(50) DEFAULT 'default';

-- ============================================================================
-- TABELA: profiles - Colunas faltantes
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ============================================================================
-- TABELA: payables - Colunas faltantes
-- ============================================================================
ALTER TABLE payables ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE payables ADD COLUMN IF NOT EXISTS payment_method_id UUID;

-- ============================================================================
-- TABELA: quotes - Verificar se existe e adicionar colunas
-- ============================================================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'value';

-- ============================================================================
-- FIM - Execute e teste o sistema
-- ============================================================================
