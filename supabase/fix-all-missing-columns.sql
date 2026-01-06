-- ============================================================================
-- SELLX ERP - CORRECAO COMPLETA DE COLUNAS FALTANTES
-- Execute este script no SQL Editor do Supabase
-- Data: 2025-01-05
-- ============================================================================

-- ============================================================================
-- 1. TABELA: products (Produtos)
-- ============================================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS block_sale_no_stock BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_open_price BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subgroup_id UUID REFERENCES product_groups(id);

-- ============================================================================
-- 2. TABELA: customers (Clientes)
-- ============================================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vip_discount_percent DECIMAL(5,2) DEFAULT 0;

-- ============================================================================
-- 3. TABELA: suppliers (Fornecedores)
-- ============================================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ie VARCHAR(30);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- ============================================================================
-- 4. TABELA: sellers (Vendedores)
-- ============================================================================
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'vendedor';

-- ============================================================================
-- 5. TABELA: payment_methods (Formas de Pagamento)
-- ============================================================================
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS fee_fixed DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS days_to_receive INTEGER DEFAULT 0;

-- ============================================================================
-- 6. TABELA: sales (Vendas)
-- ============================================================================
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS use_wholesale_price BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS validity_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'value';

-- ============================================================================
-- 7. TABELA: installments (Parcelas/Contas a Receber)
-- ============================================================================
ALTER TABLE installments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE installments ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE installments ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- ============================================================================
-- 8. TABELA: expenses (Despesas)
-- ============================================================================
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrent BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(50);

-- ============================================================================
-- 9. TABELA: checks (Cheques)
-- ============================================================================
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issuer_name VARCHAR(255);
ALTER TABLE checks ADD COLUMN IF NOT EXISTS issuer_cpf_cnpj VARCHAR(20);

-- ============================================================================
-- 10. TABELA: stock_locations (Locais de Estoque)
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
-- 11. TABELA: stock_batches (Lotes)
-- ============================================================================
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS manufacturing_date DATE;
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo';
ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- 12. TABELA: stock_adjustments (Ajustes de Estoque)
-- ============================================================================
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_number SERIAL;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES stock_locations(id);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES stock_batches(id);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS previous_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS new_quantity DECIMAL(15,3);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15,2);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 13. TABELA: stock_transfers (Transferencias)
-- ============================================================================
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_number SERIAL;
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS received_by VARCHAR(255);
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS transfer_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE stock_transfers ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;

-- ============================================================================
-- 14. TABELA: stock_movements (Movimentacoes)
-- ============================================================================
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS previous_stock DECIMAL(15,3);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS new_stock DECIMAL(15,3);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS movement_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 15. TABELA: bank_accounts (Contas Bancarias)
-- ============================================================================
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_number VARCHAR(30);

-- ============================================================================
-- 16. TABELA: cash_registers (Caixas)
-- ============================================================================
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by VARCHAR(255);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opened_by_id UUID REFERENCES profiles(id);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(255);

-- ============================================================================
-- 17. TABELA: cash_movements (Movimentacoes de Caixa)
-- ============================================================================
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- ============================================================================
-- 18. TABELA: future_orders (Pedidos Futuros)
-- ============================================================================
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS advance_payment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS remaining_payment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS expected_date DATE;
ALTER TABLE future_orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 19. TABELA: service_orders (Ordens de Servico)
-- ============================================================================
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES sellers(id);
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
-- 20. TABELA: organizations (Empresas)
-- ============================================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ie VARCHAR(30);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS im VARCHAR(30);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- ============================================================================
-- 21. TABELA: promotions (Promocoes)
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
-- 22. TABELA: loyalty_programs (Programas de Fidelidade)
-- ============================================================================
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS reais_per_point DECIMAL(10,4) DEFAULT 0.01;
ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS min_purchase_for_points DECIMAL(15,2) DEFAULT 0;

-- ============================================================================
-- 23. TABELA: theme_settings (Configuracoes de Tema)
-- ============================================================================
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS header_style VARCHAR(50) DEFAULT 'default';
-- Os campos ja existem com snake_case, o codigo deve ser ajustado

-- ============================================================================
-- 24. TABELA: profiles (Perfis de Usuario)
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ============================================================================
-- 25. TABELA: payables (Contas a Pagar) - Correcoes
-- ============================================================================
ALTER TABLE payables ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE payables ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- ============================================================================
-- INDICES PARA AS NOVAS COLUNAS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(organization_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_service ON products(organization_id, is_service) WHERE is_service = true;
CREATE INDEX IF NOT EXISTS idx_sales_items ON sales USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_sales_payments ON sales USING GIN (payments);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON service_orders(organization_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_future_orders_expected ON future_orders(organization_id, expected_date);

-- ============================================================================
-- ATUALIZAR DADOS EXISTENTES (se necessario)
-- ============================================================================

-- Copiar dados de campos existentes para novos campos (se houver dados)
UPDATE stock_batches SET manufacturing_date = manufacture_date WHERE manufacturing_date IS NULL AND manufacture_date IS NOT NULL;
UPDATE stock_movements SET previous_stock = previous_quantity WHERE previous_stock IS NULL AND previous_quantity IS NOT NULL;
UPDATE stock_movements SET new_stock = new_quantity WHERE new_stock IS NULL AND new_quantity IS NOT NULL;
UPDATE bank_accounts SET account_number = account WHERE account_number IS NULL AND account IS NOT NULL;
UPDATE future_orders SET advance_payment = deposit_amount WHERE advance_payment IS NULL AND deposit_amount IS NOT NULL;
UPDATE future_orders SET expected_date = delivery_date WHERE expected_date IS NULL AND delivery_date IS NOT NULL;
UPDATE stock_locations SET is_main = is_default WHERE is_main IS NULL;
UPDATE customers SET vip_discount_percent = vip_discount WHERE vip_discount_percent IS NULL AND vip_discount IS NOT NULL;

-- ============================================================================
-- VERIFICACAO FINAL
-- ============================================================================
-- Execute esta query para verificar se todas as colunas foram criadas:
/*
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('products', 'sales', 'customers', 'service_orders', 'future_orders')
ORDER BY table_name, ordinal_position;
*/

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
