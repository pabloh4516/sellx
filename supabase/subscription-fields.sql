-- ============================================
-- CAMPOS DE ASSINATURA PARA ORGANIZATIONS
-- Integração com Asaas para cobrança recorrente
-- ============================================

-- Adicionar campos de assinatura na tabela organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'; -- trial, active, overdue, cancelled, expired
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Indices para busca
CREATE INDEX IF NOT EXISTS idx_organizations_asaas_customer ON organizations(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_asaas_subscription ON organizations(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);

-- Comentarios
COMMENT ON COLUMN organizations.asaas_customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN organizations.asaas_subscription_id IS 'ID da assinatura no Asaas';
COMMENT ON COLUMN organizations.subscription_status IS 'Status: trial, active, overdue, cancelled, expired';
COMMENT ON COLUMN organizations.trial_ends_at IS 'Data de termino do periodo trial';
COMMENT ON COLUMN organizations.subscription_ends_at IS 'Data de termino da assinatura (se cancelada)';
COMMENT ON COLUMN organizations.last_payment_at IS 'Data do ultimo pagamento confirmado';
COMMENT ON COLUMN organizations.billing_email IS 'Email para cobrancas (pode ser diferente do owner)';

-- ============================================
-- TABELA DE HISTORICO DE PAGAMENTOS
-- Para rastrear todas as cobrancas
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  asaas_payment_id TEXT UNIQUE,
  asaas_subscription_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, overdue, refunded, cancelled
  billing_type TEXT, -- PIX, BOLETO, CREDIT_CARD
  due_date DATE,
  payment_date TIMESTAMPTZ,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_subscription_payments_org ON subscription_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_asaas ON subscription_payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- RLS para subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Owner pode ver pagamentos da sua organizacao
DROP POLICY IF EXISTS "subscription_payments_owner_read" ON subscription_payments;
CREATE POLICY "subscription_payments_owner_read" ON subscription_payments
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Super admin pode ver tudo
DROP POLICY IF EXISTS "subscription_payments_admin_all" ON subscription_payments;
CREATE POLICY "subscription_payments_admin_all" ON subscription_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Service role pode fazer tudo (para webhooks)
DROP POLICY IF EXISTS "subscription_payments_service_role" ON subscription_payments;
CREATE POLICY "subscription_payments_service_role" ON subscription_payments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNÇÃO PARA VERIFICAR SE ORGANIZACAO ESTA ATIVA
-- Pode ser usada em RLS policies ou no app
-- ============================================

CREATE OR REPLACE FUNCTION is_organization_active(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  org_status TEXT;
  trial_end TIMESTAMPTZ;
  sub_end TIMESTAMPTZ;
BEGIN
  SELECT
    subscription_status,
    trial_ends_at,
    subscription_ends_at
  INTO org_status, trial_end, sub_end
  FROM organizations
  WHERE id = org_id;

  -- Se nao encontrou, retorna false
  IF org_status IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Status ativos
  IF org_status IN ('active', 'trial') THEN
    -- Verificar se trial nao expirou
    IF org_status = 'trial' AND trial_end IS NOT NULL AND trial_end < NOW() THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  -- Status overdue tem periodo de graca de 7 dias
  IF org_status = 'overdue' THEN
    RETURN TRUE; -- Permitir uso durante periodo de graca
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER PARA ATUALIZAR STATUS AUTOMATICAMENTE
-- Verifica trials expirados
-- ============================================

CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Se esta em trial e trial expirou, mudar para expired
  IF NEW.subscription_status = 'trial'
     AND NEW.trial_ends_at IS NOT NULL
     AND NEW.trial_ends_at < NOW() THEN
    NEW.subscription_status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_trial_on_update ON organizations;
CREATE TRIGGER check_trial_on_update
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION check_trial_expiration();
