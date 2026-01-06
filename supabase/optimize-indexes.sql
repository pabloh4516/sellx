-- ============================================================================
-- SELLX ERP - Indices de Performance Adicionais
-- Execute este script no SQL Editor do Supabase para melhorar a performance
-- ============================================================================

-- ============================================================================
-- INDICES PARA VENDAS (tabela mais consultada)
-- ============================================================================

-- Indice para buscar vendas por status e data (Dashboard e relatorios)
CREATE INDEX IF NOT EXISTS idx_sales_status_date
ON sales(organization_id, status, sale_date DESC);

-- Indice para vendas do mes atual
CREATE INDEX IF NOT EXISTS idx_sales_org_date
ON sales(organization_id, sale_date DESC);

-- Indice para vendas por vendedor
CREATE INDEX IF NOT EXISTS idx_sales_seller
ON sales(organization_id, seller_id, sale_date DESC);

-- ============================================================================
-- INDICES PARA PARCELAS/CONTAS A RECEBER
-- ============================================================================

-- Indice para parcelas pendentes por vencimento
CREATE INDEX IF NOT EXISTS idx_installments_pending_due
ON installments(organization_id, status, due_date)
WHERE status = 'pendente';

-- Indice para parcelas por cliente
CREATE INDEX IF NOT EXISTS idx_installments_customer
ON installments(organization_id, customer_id, status);

-- ============================================================================
-- INDICES PARA PRODUTOS
-- ============================================================================

-- Indice para produtos ativos com estoque baixo
CREATE INDEX IF NOT EXISTS idx_products_low_stock
ON products(organization_id, stock_quantity, min_stock)
WHERE is_active = true;

-- Indice para produtos por grupo
CREATE INDEX IF NOT EXISTS idx_products_group
ON products(organization_id, group_id)
WHERE is_active = true;

-- Indice para busca por nome (texto)
CREATE INDEX IF NOT EXISTS idx_products_name_search
ON products(organization_id, name varchar_pattern_ops);

-- ============================================================================
-- INDICES PARA CLIENTES
-- ============================================================================

-- Indice para busca por nome
CREATE INDEX IF NOT EXISTS idx_customers_name_search
ON customers(organization_id, name varchar_pattern_ops);

-- Indice para clientes com credito
CREATE INDEX IF NOT EXISTS idx_customers_credit
ON customers(organization_id, credit_limit, used_credit);

-- ============================================================================
-- INDICES PARA DESPESAS
-- ============================================================================

-- Indice para despesas pendentes
CREATE INDEX IF NOT EXISTS idx_expenses_pending
ON expenses(organization_id, status, due_date)
WHERE status = 'pendente';

-- ============================================================================
-- INDICES PARA CAIXA
-- ============================================================================

-- Indice para caixa aberto
CREATE INDEX IF NOT EXISTS idx_cash_register_open
ON cash_registers(organization_id, status)
WHERE status = 'aberto';

-- ============================================================================
-- INDICES PARA MOVIMENTACOES DE ESTOQUE
-- ============================================================================

-- Indice para movimentacoes por produto e data
CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements(organization_id, product_id, created_at DESC);

-- ============================================================================
-- INDICES PARA PERFIS (LOGIN)
-- ============================================================================

-- Indice para buscar perfil por organization
CREATE INDEX IF NOT EXISTS idx_profiles_organization
ON profiles(organization_id);

-- ============================================================================
-- ANALISE DE TABELAS (rodar periodicamente para manter estatisticas)
-- ============================================================================

-- Executar ANALYZE nas tabelas mais usadas
ANALYZE sales;
ANALYZE products;
ANALYZE customers;
ANALYZE installments;
ANALYZE expenses;
ANALYZE cash_registers;
ANALYZE profiles;

-- ============================================================================
-- CONFIGURACOES DE PERFORMANCE SUGERIDAS
-- ============================================================================

-- Verificar se RLS esta habilitado mas com policies eficientes
-- As policies devem usar indices sempre que possivel

-- Dica: Para monitorar queries lentas, use:
-- SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
