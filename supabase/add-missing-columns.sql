-- ============================================================================
-- SELLX ERP - Adicionar colunas faltantes
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Adicionar colunas faltantes na tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_total DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS use_wholesale_price BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Adicionar colunas faltantes na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS block_sale_no_stock BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_open_price BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subgroup_id UUID REFERENCES product_groups(id);

-- Adicionar colunas faltantes na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vip_discount_percent DECIMAL(5,2) DEFAULT 0;

-- Adicionar colunas faltantes na tabela installments
ALTER TABLE installments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Adicionar colunas faltantes na tabela expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Adicionar tabela de expenses se nao existir
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    paid_date DATE,
    status VARCHAR(50) DEFAULT 'pendente',
    payment_method_id UUID REFERENCES payment_methods(id),
    supplier_id UUID REFERENCES suppliers(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar tabela de checks se nao existir
CREATE TABLE IF NOT EXISTS checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- recebido, emitido
    check_number VARCHAR(50),
    bank VARCHAR(100),
    agency VARCHAR(20),
    account VARCHAR(30),
    amount DECIMAL(15,2) NOT NULL,
    issue_date DATE,
    due_date DATE,
    issuer_name VARCHAR(255),
    issuer_cpf_cnpj VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, compensado, devolvido
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar tabela de stock_movements se nao existir
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- entrada, saida, ajuste
    quantity DECIMAL(15,3) NOT NULL,
    previous_stock DECIMAL(15,3),
    new_stock DECIMAL(15,3),
    reference_type VARCHAR(50), -- venda, compra, ajuste, transferencia
    reference_id UUID,
    movement_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_sales_items ON sales USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_sales_payments ON sales USING GIN (payments);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(organization_id, expiry_date) WHERE expiry_date IS NOT NULL;

-- Atualizar RLS para as novas tabelas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies para expenses
DROP POLICY IF EXISTS "expenses_org_isolation" ON expenses;
CREATE POLICY "expenses_org_isolation" ON expenses
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policies para checks
DROP POLICY IF EXISTS "checks_org_isolation" ON checks;
CREATE POLICY "checks_org_isolation" ON checks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policies para stock_movements
DROP POLICY IF EXISTS "stock_movements_org_isolation" ON stock_movements;
CREATE POLICY "stock_movements_org_isolation" ON stock_movements
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );
