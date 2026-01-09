-- ============================================
-- TABELA DE CONFIGURACOES DO SITE
-- Permite editar textos, precos e configs pelo admin
-- ============================================

-- Criar tabela de configuracoes do site (global, nao por organizacao)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT, -- Label amigavel para o admin
  description TEXT, -- Descricao do campo
  field_type TEXT DEFAULT 'text', -- text, number, textarea, image, boolean, json
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON site_settings(category);
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- RLS: Leitura publica, escrita apenas para super_admin
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (as configs sao publicas)
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (true);

-- Apenas super_admin pode modificar
DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write" ON site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ============================================
-- DADOS INICIAIS - Configuracoes padrao
-- ============================================

-- Limpar dados existentes para evitar duplicatas
DELETE FROM site_settings WHERE key LIKE 'offline_%' OR key LIKE 'landing_%' OR key LIKE 'plans_%' OR key LIKE 'payment_%' OR key LIKE 'general_%';

-- Configuracoes do Sistema Offline
INSERT INTO site_settings (key, value, category, label, description, field_type) VALUES
  ('offline_price', '69.90', 'offline', 'Preco do Sistema Offline', 'Valor em reais (ex: 69.90)', 'number'),
  ('offline_name', '"Sellx Offline"', 'offline', 'Nome do Produto', 'Nome exibido nas paginas', 'text'),
  ('offline_description', '"Sistema de gestao completo para desktop"', 'offline', 'Descricao Curta', 'Descricao resumida do produto', 'text'),
  ('offline_features', '["Licenca vitalicia", "Sem mensalidades", "Funciona 100% offline", "Dados armazenados localmente", "Atualizacoes gratuitas", "Suporte por email"]', 'offline', 'Lista de Beneficios', 'Array JSON com os beneficios', 'json'),
  ('offline_download_url', '""', 'offline', 'URL de Download', 'Link para download do instalador', 'text'),
  ('offline_active', 'true', 'offline', 'Sistema Ativo', 'Se o sistema offline esta disponivel para venda', 'boolean');

-- Configuracoes dos Planos Online
INSERT INTO site_settings (key, value, category, label, description, field_type) VALUES
  ('plans_starter_price', '79', 'plans', 'Preco Plano Starter', 'Valor mensal em reais', 'number'),
  ('plans_starter_name', '"Starter"', 'plans', 'Nome Plano Starter', 'Nome do plano', 'text'),
  ('plans_starter_features', '["1 usuario", "1 PDV", "Ate 500 produtos", "Relatorios basicos", "Suporte por email"]', 'plans', 'Features Starter', 'Lista de recursos do plano', 'json'),

  ('plans_professional_price', '149', 'plans', 'Preco Plano Professional', 'Valor mensal em reais', 'number'),
  ('plans_professional_name', '"Professional"', 'plans', 'Nome Plano Professional', 'Nome do plano', 'text'),
  ('plans_professional_features', '["5 usuarios", "3 PDVs", "Produtos ilimitados", "Relatorios avancados", "Suporte prioritario", "Integracao fiscal", "App mobile"]', 'plans', 'Features Professional', 'Lista de recursos do plano', 'json'),

  ('plans_enterprise_price', '299', 'plans', 'Preco Plano Enterprise', 'Valor mensal em reais', 'number'),
  ('plans_enterprise_name', '"Enterprise"', 'plans', 'Nome Plano Enterprise', 'Nome do plano', 'text'),
  ('plans_enterprise_features', '["Usuarios ilimitados", "PDVs ilimitados", "Produtos ilimitados", "Relatorios personalizados", "Suporte dedicado 24/7", "API completa", "Treinamento incluido"]', 'plans', 'Features Enterprise', 'Lista de recursos do plano', 'json'),

  ('plans_trial_days', '7', 'plans', 'Dias de Teste Gratis', 'Quantidade de dias do periodo trial', 'number'),
  ('plans_yearly_discount', '20', 'plans', 'Desconto Plano Anual (%)', 'Percentual de desconto para pagamento anual', 'number');

-- Configuracoes da Landing Page
INSERT INTO site_settings (key, value, category, label, description, field_type) VALUES
  ('landing_hero_title', '"Gestao completa para seu negocio"', 'landing', 'Titulo Principal', 'Titulo da hero section', 'text'),
  ('landing_hero_subtitle', '"Sistema de PDV, estoque, financeiro e muito mais. Tudo em um so lugar."', 'landing', 'Subtitulo', 'Subtitulo da hero section', 'textarea'),
  ('landing_cta_primary', '"Comecar Gratis"', 'landing', 'Texto Botao Principal', 'Texto do botao de CTA principal', 'text'),
  ('landing_cta_secondary', '"Ver Demo"', 'landing', 'Texto Botao Secundario', 'Texto do botao secundario', 'text'),
  ('landing_video_url', '""', 'landing', 'URL do Video Demo', 'Link do video de demonstracao (YouTube)', 'text');

-- Configuracoes Gerais
INSERT INTO site_settings (key, value, category, label, description, field_type) VALUES
  ('general_company_name', '"Sellx"', 'general', 'Nome da Empresa', 'Nome exibido no site', 'text'),
  ('general_support_email', '"suporte@sellx.com.br"', 'general', 'Email de Suporte', 'Email para contato', 'text'),
  ('general_whatsapp', '""', 'general', 'WhatsApp', 'Numero do WhatsApp com DDD', 'text'),
  ('general_instagram', '""', 'general', 'Instagram', 'Usuario do Instagram (sem @)', 'text'),
  ('general_facebook', '""', 'general', 'Facebook', 'URL da pagina do Facebook', 'text');

-- Configuracoes de Pagamento (Asaas)
INSERT INTO site_settings (key, value, category, label, description, field_type) VALUES
  ('payment_asaas_api_key', '""', 'payment', 'API Key Asaas', 'Chave de API do Asaas (obtida em Minha Conta > Integrações)', 'text'),
  ('payment_asaas_environment', '"sandbox"', 'payment', 'Ambiente Asaas', 'sandbox para testes, production para producao', 'text'),
  ('payment_asaas_webhook_token', '""', 'payment', 'Token Webhook', 'Token secreto para validar webhooks (crie um token forte)', 'text'),
  ('payment_asaas_active', 'true', 'payment', 'Asaas Ativo', 'Se a integracao com Asaas esta ativa', 'boolean'),
  ('payment_pix_active', 'true', 'payment', 'PIX Ativo', 'Aceitar pagamentos via PIX', 'boolean');

-- ============================================
-- TABELA DE PEDIDOS DO SISTEMA OFFLINE
-- Para rastrear vendas do sistema desktop
-- ============================================

CREATE TABLE IF NOT EXISTS offline_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_nsu TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_cpf TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, cancelled, refunded
  payment_method TEXT, -- pix, credit_card, debit_card
  payment_id TEXT, -- ID da transacao no gateway
  paid_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  download_token TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_offline_orders_status ON offline_orders(status);
CREATE INDEX IF NOT EXISTS idx_offline_orders_email ON offline_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_offline_orders_nsu ON offline_orders(order_nsu);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS offline_orders_updated_at ON offline_orders;
CREATE TRIGGER offline_orders_updated_at
  BEFORE UPDATE ON offline_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- RLS para offline_orders
ALTER TABLE offline_orders ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin pode ver/modificar pedidos
DROP POLICY IF EXISTS "offline_orders_admin_all" ON offline_orders;
CREATE POLICY "offline_orders_admin_all" ON offline_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Service role pode fazer tudo (para webhooks)
DROP POLICY IF EXISTS "offline_orders_service_role" ON offline_orders;
CREATE POLICY "offline_orders_service_role" ON offline_orders
  FOR ALL USING (auth.role() = 'service_role');
