-- ============================================
-- CONFIGURACAO DE BLOQUEIOS POR INADIMPLENCIA
-- Super Admin configura o que bloquear
-- ============================================

-- Tabela de configuracao de bloqueios (global, controlada pelo super_admin)
CREATE TABLE IF NOT EXISTS subscription_block_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dias de graca apos vencimento antes de bloquear
  grace_period_days INTEGER DEFAULT 7,

  -- Dias apos bloqueio para bloqueio total (nao entra no sistema)
  total_block_days INTEGER DEFAULT 30,

  -- Lista de features bloqueadas (array de strings)
  blocked_features JSONB DEFAULT '["open_cash", "start_sale", "create_product", "create_customer", "create_expense", "emit_invoice"]',

  -- Mensagem personalizada para o modal
  block_message TEXT DEFAULT 'Sua assinatura esta vencida. Regularize para continuar usando todas as funcionalidades.',

  -- Titulo do modal
  block_title TEXT DEFAULT 'Assinatura Pendente',

  -- Se deve mostrar botao de pagar no modal
  show_pay_button BOOLEAN DEFAULT true,

  -- Se deve mostrar dias em atraso
  show_days_overdue BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que so existe um registro
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_block_settings_singleton
  ON subscription_block_settings ((true));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_subscription_block_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_block_settings_updated_at ON subscription_block_settings;
CREATE TRIGGER subscription_block_settings_updated_at
  BEFORE UPDATE ON subscription_block_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_block_settings_updated_at();

-- RLS
ALTER TABLE subscription_block_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer usuario autenticado pode ler (para verificar bloqueios)
DROP POLICY IF EXISTS "subscription_block_settings_read" ON subscription_block_settings;
CREATE POLICY "subscription_block_settings_read" ON subscription_block_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas super_admin pode modificar
DROP POLICY IF EXISTS "subscription_block_settings_admin_write" ON subscription_block_settings;
CREATE POLICY "subscription_block_settings_admin_write" ON subscription_block_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- DADOS INICIAIS - Configuracao padrao
-- ============================================

INSERT INTO subscription_block_settings (
  grace_period_days,
  total_block_days,
  blocked_features,
  block_message,
  block_title,
  show_pay_button,
  show_days_overdue
) VALUES (
  7,
  30,
  '["open_cash", "start_sale", "create_product", "create_customer", "create_expense", "emit_invoice", "create_order", "create_quote"]',
  'Sua assinatura esta vencida. Regularize seu pagamento para continuar usando todas as funcionalidades do sistema.',
  'Assinatura Pendente',
  true,
  true
) ON CONFLICT DO NOTHING;

-- ============================================
-- LISTA DE FEATURES DISPONIVEIS PARA BLOQUEIO
-- ============================================
-- open_cash          - Abrir caixa
-- close_cash         - Fechar caixa
-- start_sale         - Iniciar venda no PDV
-- create_product     - Cadastrar produto
-- edit_product       - Editar produto
-- create_customer    - Cadastrar cliente
-- edit_customer      - Editar cliente
-- create_expense     - Registrar despesa
-- create_income      - Registrar receita
-- emit_invoice       - Emitir nota fiscal
-- create_order       - Criar pedido/encomenda
-- create_quote       - Criar orcamento
-- create_purchase    - Registrar compra
-- create_supplier    - Cadastrar fornecedor
-- view_reports       - Ver relatorios
-- export_data        - Exportar dados
-- manage_users       - Gerenciar usuarios
-- ============================================
