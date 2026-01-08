-- ============================================================================
-- SELLX - Configuracao do Super Admin
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- ============================================================================
-- PASSO 1: Promover usuario para super_admin
-- Email: pabloh4516@icloud.com
-- ============================================================================

UPDATE profiles
SET role = 'super_admin'
WHERE id = (
    SELECT id FROM auth.users
    WHERE email = 'pabloh4516@icloud.com'
);

-- ============================================================================
-- PASSO 2: Verificar se funcionou
-- ============================================================================

SELECT
    p.full_name,
    p.email,
    p.role,
    CASE
        WHEN p.role = 'super_admin' THEN 'SUCESSO - Voce e Super Admin!'
        ELSE 'ERRO - Role nao foi atualizado'
    END as status
FROM profiles p
WHERE p.email = 'pabloh4516@icloud.com';

-- ============================================================================
-- POLITICAS RLS PARA SUPER ADMIN (Execute apenas uma vez)
-- ============================================================================

-- Funcao para verificar se e super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- POLITICAS PARA ORGANIZATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations" ON organizations;
CREATE POLICY "Users can view organizations"
    ON organizations FOR SELECT
    USING (
        is_super_admin()
        OR id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update organization" ON organizations;
DROP POLICY IF EXISTS "Users can update organizations" ON organizations;
CREATE POLICY "Users can update organizations"
    ON organizations FOR UPDATE
    USING (
        is_super_admin()
        OR (
            id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                AND role IN ('owner', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Super admin can insert organizations" ON organizations;
CREATE POLICY "Super admin can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (is_super_admin() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;
CREATE POLICY "Super admin can delete organizations"
    ON organizations FOR DELETE
    USING (is_super_admin());

-- ============================================================================
-- POLITICAS PARA PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile or organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles"
    ON profiles FOR SELECT
    USING (
        is_super_admin()
        OR id = auth.uid()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
CREATE POLICY "Users can update profiles"
    ON profiles FOR UPDATE
    USING (
        is_super_admin()
        OR id = auth.uid()
    );

-- ============================================================================
-- POLITICAS PARA PRODUTOS, CLIENTES, VENDAS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own organization products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;
CREATE POLICY "Users can view products"
    ON products FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can view customers" ON customers;
CREATE POLICY "Users can view customers"
    ON customers FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can view sales" ON sales;
CREATE POLICY "Users can view sales"
    ON sales FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- POLITICAS PARA ASSINATURAS E BILLING
-- ============================================================================

DROP POLICY IF EXISTS "Owners can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions" ON subscriptions;
CREATE POLICY "Users can view subscriptions"
    ON subscriptions FOR SELECT
    USING (
        is_super_admin()
        OR (
            organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            AND EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
            )
        )
    );

DROP POLICY IF EXISTS "Super admin can manage subscriptions" ON subscriptions;
CREATE POLICY "Super admin can manage subscriptions"
    ON subscriptions FOR ALL
    USING (is_super_admin());

DROP POLICY IF EXISTS "Owners can view billing_history" ON billing_history;
DROP POLICY IF EXISTS "Users can view billing_history" ON billing_history;
CREATE POLICY "Users can view billing_history"
    ON billing_history FOR SELECT
    USING (
        is_super_admin()
        OR (
            organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
            AND EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
            )
        )
    );

DROP POLICY IF EXISTS "Super admin can manage billing_history" ON billing_history;
CREATE POLICY "Super admin can manage billing_history"
    ON billing_history FOR ALL
    USING (is_super_admin());

DROP POLICY IF EXISTS "Super admin can manage plans" ON plans;
CREATE POLICY "Super admin can manage plans"
    ON plans FOR ALL
    USING (is_super_admin());

-- ============================================================================
-- TABELA PLATFORM_SETTINGS - Configurações da Plataforma
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Apenas super admin pode gerenciar configuracoes
DROP POLICY IF EXISTS "Super admin can manage platform_settings" ON platform_settings;
CREATE POLICY "Super admin can manage platform_settings"
    ON platform_settings FOR ALL
    USING (is_super_admin());

-- Inserir configuracoes padrao se nao existirem
INSERT INTO platform_settings (settings)
SELECT '{
    "platform_name": "Sellx",
    "platform_url": "https://sellx.com.br",
    "support_email": "suporte@sellx.com.br",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "notify_new_org": true,
    "notify_new_subscription": true,
    "notify_cancelation": true,
    "allow_registration": true,
    "require_email_verification": true,
    "allow_google_login": false,
    "maintenance_mode": false,
    "stripe_secret_key": "",
    "stripe_publishable_key": "",
    "stripe_webhook_secret": "",
    "whatsapp_token": "",
    "whatsapp_phone": ""
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- ============================================================================
-- PRONTO!
-- Agora voce pode acessar o painel admin em:
-- - admin.seudominio.com (subdominio)
-- - localhost:5173?subdomain=admin (desenvolvimento)
-- ============================================================================
