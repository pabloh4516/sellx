-- ============================================================================
-- SELLX ERP - Correcao de Campos Faltantes
-- Execute este script no SQL Editor do Supabase para adicionar campos
-- que o codigo espera mas nao existem no schema original
-- ============================================================================

-- ============================================================================
-- TABELA SALES - Campos adicionais para o Dashboard
-- ============================================================================

-- Campo para armazenar nome do cliente diretamente na venda (desnormalizado para performance)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Campo para armazenar lucro da venda (calculado: total - custo)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit DECIMAL(15,2) DEFAULT 0;

-- Atualizar vendas existentes com nome do cliente
UPDATE sales s
SET customer_name = c.name
FROM customers c
WHERE s.customer_id = c.id
AND s.customer_name IS NULL;

-- ============================================================================
-- TABELA CUSTOMERS - Campo is_active se nao existir
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- TABELA ORGANIZATIONS - Campos extras para limites
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_customers INTEGER DEFAULT 100;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_sales_month INTEGER DEFAULT 100;

-- ============================================================================
-- TABELA INSTALLMENTS - Campo customer_name para facilitar queries
-- ============================================================================

ALTER TABLE installments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Atualizar parcelas existentes com nome do cliente
UPDATE installments i
SET customer_name = c.name
FROM customers c
WHERE i.customer_id = c.id
AND i.customer_name IS NULL;

-- ============================================================================
-- INDICES ADICIONAIS PARA PERFORMANCE DO DASHBOARD
-- ============================================================================

-- Indice para vendas por status e data (muito usado no dashboard)
CREATE INDEX IF NOT EXISTS idx_sales_status_sale_date
ON sales(organization_id, status, sale_date DESC);

-- Indice para parcelas pendentes com vencimento
CREATE INDEX IF NOT EXISTS idx_installments_pending
ON installments(organization_id, status, due_date)
WHERE status = 'pendente';

-- Indice para despesas pendentes
CREATE INDEX IF NOT EXISTS idx_expenses_status_due
ON expenses(organization_id, status, due_date)
WHERE status = 'pendente';

-- Indice para produtos ativos ordenados por estoque
CREATE INDEX IF NOT EXISTS idx_products_active_stock
ON products(organization_id, is_active, stock_quantity)
WHERE is_active = true;

-- Indice para caixa aberto
CREATE INDEX IF NOT EXISTS idx_cash_registers_open
ON cash_registers(organization_id, status)
WHERE status = 'aberto';

-- ============================================================================
-- TRIGGER PARA PREENCHER customer_name AUTOMATICAMENTE
-- ============================================================================

-- Funcao para preencher customer_name em sales
CREATE OR REPLACE FUNCTION fill_sale_customer_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL AND NEW.customer_name IS NULL THEN
        SELECT name INTO NEW.customer_name
        FROM customers
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sales
DROP TRIGGER IF EXISTS fill_sale_customer_name_trigger ON sales;
CREATE TRIGGER fill_sale_customer_name_trigger
    BEFORE INSERT OR UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION fill_sale_customer_name();

-- Funcao para preencher customer_name em installments
CREATE OR REPLACE FUNCTION fill_installment_customer_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL AND NEW.customer_name IS NULL THEN
        SELECT name INTO NEW.customer_name
        FROM customers
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para installments
DROP TRIGGER IF EXISTS fill_installment_customer_name_trigger ON installments;
CREATE TRIGGER fill_installment_customer_name_trigger
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION fill_installment_customer_name();

-- ============================================================================
-- ANALISAR TABELAS PARA ATUALIZAR ESTATISTICAS
-- ============================================================================

ANALYZE sales;
ANALYZE customers;
ANALYZE installments;
ANALYZE expenses;
ANALYZE products;
ANALYZE cash_registers;
