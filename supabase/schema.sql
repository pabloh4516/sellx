-- ============================================================================
-- SELLX ERP - Esquema do Banco de Dados Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELAS DE MULTI-TENANCY E AUTENTICACAO
-- ============================================================================

-- Organizacoes (Tenants - cada cliente SaaS)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    cnpj VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Configuracoes
    settings JSONB DEFAULT '{}',

    -- Plano/Assinatura
    plan VARCHAR(50) DEFAULT 'free',
    plan_started_at TIMESTAMPTZ,
    plan_expires_at TIMESTAMPTZ,
    max_users INTEGER DEFAULT 1,
    max_products INTEGER DEFAULT 100,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfis de Usuario (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),

    -- Role dentro da organizacao
    role VARCHAR(50) DEFAULT 'vendedor',
    -- owner: dono do SaaS (pode tudo + billing)
    -- admin: administrador (pode tudo exceto billing)
    -- gerente: gerente (acesso amplo)
    -- vendedor: vendedor (vendas e clientes)
    -- caixa: operador de caixa (PDV)
    -- estoquista: controle de estoque

    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convites pendentes
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'vendedor',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE CADASTROS
-- ============================================================================

-- Grupos de Produtos
CREATE TABLE product_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_group_id UUID REFERENCES product_groups(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    contact_name VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50),
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    group_id UUID REFERENCES product_groups(id),
    supplier_id UUID REFERENCES suppliers(id),
    unit VARCHAR(10) DEFAULT 'UN',
    cost_price DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) DEFAULT 0,
    min_price DECIMAL(15,2),
    stock_quantity DECIMAL(15,3) DEFAULT 0,
    min_stock DECIMAL(15,3) DEFAULT 0,
    max_stock DECIMAL(15,3),
    location VARCHAR(100),
    ncm VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, code),
    UNIQUE(organization_id, barcode)
);

-- Clientes
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cpf_cnpj VARCHAR(20),
    rg VARCHAR(20),
    birth_date DATE,
    phone VARCHAR(20),
    phone2 VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Credito
    credit_limit DECIMAL(15,2) DEFAULT 0,
    used_credit DECIMAL(15,2) DEFAULT 0,

    -- Fidelidade
    loyalty_points INTEGER DEFAULT 0,
    is_vip BOOLEAN DEFAULT false,
    vip_discount DECIMAL(5,2) DEFAULT 0,

    -- Status
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendedores
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    phone VARCHAR(20),
    email VARCHAR(255),
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_goal DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE VENDAS
-- ============================================================================

-- Formas de Pagamento
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- cash, credit_card, debit_card, pix, store_credit, check
    is_active BOOLEAN DEFAULT true,
    accepts_installments BOOLEAN DEFAULT false,
    max_installments INTEGER DEFAULT 1,
    fee_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sale_number SERIAL,
    customer_id UUID REFERENCES customers(id),
    seller_id UUID REFERENCES sellers(id),
    user_id UUID REFERENCES profiles(id),

    sale_date TIMESTAMPTZ DEFAULT NOW(),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,

    payment_method VARCHAR(50),
    payment_method_id UUID REFERENCES payment_methods(id),
    installments INTEGER DEFAULT 1,

    status VARCHAR(50) DEFAULT 'concluida', -- concluida, cancelada, pendente
    notes TEXT,

    -- PDV
    cash_register_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Venda
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcelas / Contas a Receber
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id),
    customer_id UUID REFERENCES customers(id),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(15,2),
    installment_number INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, atrasado, cancelado
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE ESTOQUE
-- ============================================================================

-- Locais de Estoque
CREATE TABLE stock_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lotes
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100),
    quantity DECIMAL(15,3) DEFAULT 0,
    cost_price DECIMAL(15,2),
    manufacture_date DATE,
    expiry_date DATE,
    location_id UUID REFERENCES stock_locations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimentacoes de Estoque
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    type VARCHAR(50) NOT NULL, -- entrada, saida, ajuste, transferencia
    quantity DECIMAL(15,3) NOT NULL,
    previous_quantity DECIMAL(15,3),
    new_quantity DECIMAL(15,3),
    reason VARCHAR(255),
    reference_type VARCHAR(50), -- sale, purchase, adjustment, transfer
    reference_id UUID,
    user_id UUID REFERENCES profiles(id),
    batch_id UUID REFERENCES stock_batches(id),
    location_id UUID REFERENCES stock_locations(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transferencias entre Locais
CREATE TABLE stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES stock_locations(id),
    to_location_id UUID REFERENCES stock_locations(id),
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajustes de Estoque
CREATE TABLE stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    type VARCHAR(50), -- gain, loss
    reason VARCHAR(255),
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS FINANCEIRAS
-- ============================================================================

-- Contas Bancarias
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bank VARCHAR(100),
    agency VARCHAR(20),
    account VARCHAR(30),
    account_type VARCHAR(50),
    balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caixas
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'fechado', -- aberto, fechado
    opening_date TIMESTAMPTZ,
    closing_date TIMESTAMPTZ,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2),
    expected_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    user_id UUID REFERENCES profiles(id),
    closed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimentacoes de Caixa
CREATE TABLE cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID REFERENCES cash_registers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- entrada, saida, sangria, suprimento
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    payment_method VARCHAR(50),
    sale_id UUID REFERENCES sales(id),
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Despesas
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(100),
    due_date DATE,
    paid_date DATE,
    status VARCHAR(50) DEFAULT 'pendente',
    supplier_id UUID REFERENCES suppliers(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    recurrence VARCHAR(50), -- none, monthly, yearly
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contas a Pagar
CREATE TABLE payables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pendente',
    purchase_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cheques
CREATE TABLE checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'received', -- received, issued
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    bank VARCHAR(100),
    agency VARCHAR(20),
    account VARCHAR(30),
    check_number VARCHAR(30),
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, compensado, devolvido
    sale_id UUID REFERENCES sales(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE COMPRAS
-- ============================================================================

-- Compras
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_number SERIAL,
    supplier_id UUID REFERENCES suppliers(id),
    purchase_date DATE DEFAULT CURRENT_DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    shipping DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, recebida, cancelada
    invoice_number VARCHAR(50),
    notes TEXT,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Compra
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE ORCAMENTOS E PEDIDOS
-- ============================================================================

-- Orcamentos
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    quote_number SERIAL,
    customer_id UUID REFERENCES customers(id),
    seller_id UUID REFERENCES sellers(id),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovado, rejeitado, convertido
    valid_until DATE,
    notes TEXT,
    converted_sale_id UUID REFERENCES sales(id),
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do Orcamento
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pedidos Futuros (Encomendas)
CREATE TABLE future_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    order_number SERIAL,
    customer_id UUID REFERENCES customers(id),
    seller_id UUID REFERENCES sellers(id),
    delivery_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    deposit_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, em_producao, pronto, entregue, cancelado
    notes TEXT,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordens de Servico
CREATE TABLE service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    order_number SERIAL,
    customer_id UUID REFERENCES customers(id),
    description TEXT,
    equipment TEXT,
    problem TEXT,
    diagnosis TEXT,
    solution TEXT,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'aberta', -- aberta, em_andamento, aguardando, concluida, entregue
    priority VARCHAR(50) DEFAULT 'normal',
    estimated_date DATE,
    completed_date DATE,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE PROMOCOES E FIDELIDADE
-- ============================================================================

-- Promocoes
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'discount_percent',
    discount_percent DECIMAL(5,2),
    discount_value DECIMAL(15,2),
    min_purchase DECIMAL(15,2),
    coupon_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    applies_to VARCHAR(50) DEFAULT 'all', -- all, products, groups, customers
    product_ids UUID[],
    group_ids UUID[],
    customer_ids UUID[],
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programa de Fidelidade
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Programa Fidelidade',
    points_per_real DECIMAL(10,2) DEFAULT 1,
    min_points_redeem INTEGER DEFAULT 100,
    point_value DECIMAL(10,4) DEFAULT 0.10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transacoes de Fidelidade
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id),
    type VARCHAR(50) NOT NULL, -- earned, redeemed, expired, adjusted
    points INTEGER NOT NULL,
    sale_id UUID REFERENCES sales(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE COMISSOES
-- ============================================================================

-- Metas de Vendedores
CREATE TABLE seller_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    goal_amount DECIMAL(15,2) NOT NULL,
    achieved_amount DECIMAL(15,2) DEFAULT 0,
    bonus_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seller_id, month, year)
);

-- Pagamentos de Comissoes
CREATE TABLE commission_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id),
    period_start DATE,
    period_end DATE,
    total_sales DECIMAL(15,2) DEFAULT 0,
    commission_percent DECIMAL(5,2),
    commission_amount DECIMAL(15,2) NOT NULL,
    bonus_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE DEVOLUCOES
-- ============================================================================

-- Devolucoes
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    return_number SERIAL,
    sale_id UUID REFERENCES sales(id),
    customer_id UUID REFERENCES customers(id),
    return_date TIMESTAMPTZ DEFAULT NOW(),
    total DECIMAL(15,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovada, rejeitada
    refund_method VARCHAR(50), -- cash, credit, store_credit
    user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da Devolucao
CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    condition VARCHAR(50), -- good, damaged, defective
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE CONFIGURACAO E LOG
-- ============================================================================

-- Configuracoes
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, key)
);

-- Configuracoes de Tema
CREATE TABLE theme_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'system',
    primary_color VARCHAR(20) DEFAULT '#3b82f6',
    border_radius INTEGER DEFAULT 8,
    font_size VARCHAR(20) DEFAULT 'medium',
    sidebar_style VARCHAR(50) DEFAULT 'default',
    compact_mode BOOLEAN DEFAULT false,
    show_animations BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de Auditoria
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE ASSINATURA/BILLING
-- ============================================================================

-- Planos
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(15,2) NOT NULL,
    price_yearly DECIMAL(15,2),
    max_users INTEGER DEFAULT 1,
    max_products INTEGER DEFAULT 100,
    max_customers INTEGER DEFAULT 100,
    max_sales_month INTEGER DEFAULT 100,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assinaturas
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, trialing
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historico de Pagamentos
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed
    payment_method VARCHAR(50),
    invoice_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Planos padrao
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_users, max_products, max_customers, max_sales_month, features) VALUES
('Gratuito', 'free', 'Para comecar', 0, 0, 1, 50, 50, 50, '["pdv_basico", "relatorios_simples"]'),
('Starter', 'starter', 'Para pequenos negocios', 49.90, 479.00, 3, 500, 500, 500, '["pdv_completo", "relatorios", "whatsapp", "backup"]'),
('Profissional', 'professional', 'Para negocios em crescimento', 99.90, 959.00, 10, 5000, 5000, 5000, '["pdv_completo", "relatorios_avancados", "whatsapp", "backup", "api", "multilojas"]'),
('Enterprise', 'enterprise', 'Para grandes operacoes', 299.90, 2879.00, -1, -1, -1, -1, '["tudo", "suporte_prioritario", "personalizacao"]');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Funcao para obter organization_id do usuario atual
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politicas RLS para cada tabela (usuario so ve dados da sua organizacao)
-- Exemplo para products (repetir para outras tabelas)
CREATE POLICY "Users can view own organization products"
    ON products FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert own organization products"
    ON products FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own organization products"
    ON products FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete own organization products"
    ON products FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Profiles: usuarios podem ver membros da mesma organizacao
CREATE POLICY "Users can view own organization profiles"
    ON profiles FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Organizations: usuarios podem ver sua propria organizacao
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = get_user_organization_id());

CREATE POLICY "Owners can update organization"
    ON organizations FOR UPDATE
    USING (
        id = get_user_organization_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'owner'
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Funcao para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas relevantes
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Funcao para criar perfil automaticamente apos signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'owner'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil apos signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- INDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_code ON products(organization_id, code);
CREATE INDEX idx_products_barcode ON products(organization_id, barcode);
CREATE INDEX idx_products_name ON products(organization_id, name);

CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_customers_cpf_cnpj ON customers(organization_id, cpf_cnpj);
CREATE INDEX idx_customers_name ON customers(organization_id, name);

CREATE INDEX idx_sales_organization ON sales(organization_id);
CREATE INDEX idx_sales_date ON sales(organization_id, sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);

CREATE INDEX idx_installments_organization ON installments(organization_id);
CREATE INDEX idx_installments_due_date ON installments(organization_id, due_date);
CREATE INDEX idx_installments_status ON installments(organization_id, status);

CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(organization_id, created_at);
