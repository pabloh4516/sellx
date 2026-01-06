-- ============================================================================
-- SELLX - Configuracao do Super Admin
-- Execute este script para configurar seu usuario como Super Admin
-- ============================================================================

-- 1. Atualizar seu usuario para super_admin
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email de cadastro
UPDATE profiles
SET role = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'SEU_EMAIL_AQUI'
);

-- OU, se voce foi o primeiro usuario cadastrado:
-- UPDATE profiles
-- SET role = 'super_admin'
-- WHERE id = (
--   SELECT id FROM profiles
--   ORDER BY created_at ASC
--   LIMIT 1
-- );

-- ============================================================================
-- POLITICAS RLS PARA SUPER ADMIN
-- Super Admin pode ver TODAS as organizacoes e dados
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

-- Atualizar politica de organizations para super admin
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
CREATE POLICY "Users can view organizations"
    ON organizations FOR SELECT
    USING (
        is_super_admin()
        OR id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Owners can update organization" ON organizations;
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

-- Super admin pode criar organizacoes
CREATE POLICY "Super admin can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (is_super_admin() OR auth.uid() IS NOT NULL);

-- Super admin pode deletar organizacoes
CREATE POLICY "Super admin can delete organizations"
    ON organizations FOR DELETE
    USING (is_super_admin());

-- Atualizar politica de profiles para super admin
DROP POLICY IF EXISTS "Users can view own profile or organization profiles" ON profiles;
CREATE POLICY "Users can view profiles"
    ON profiles FOR SELECT
    USING (
        is_super_admin()
        OR id = auth.uid()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Super admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update profiles"
    ON profiles FOR UPDATE
    USING (
        is_super_admin()
        OR id = auth.uid()
    );

-- Super admin pode ver todos os produtos
DROP POLICY IF EXISTS "Users can view own organization products" ON products;
CREATE POLICY "Users can view products"
    ON products FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Super admin pode ver todos os clientes
DROP POLICY IF EXISTS "Users can view customers" ON customers;
CREATE POLICY "Users can view customers"
    ON customers FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Super admin pode ver todas as vendas
DROP POLICY IF EXISTS "Users can view sales" ON sales;
CREATE POLICY "Users can view sales"
    ON sales FOR SELECT
    USING (
        is_super_admin()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Super admin pode ver todas as assinaturas
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON subscriptions;
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

CREATE POLICY "Super admin can manage subscriptions"
    ON subscriptions FOR ALL
    USING (is_super_admin());

-- Super admin pode ver todo o billing
DROP POLICY IF EXISTS "Owners can view billing_history" ON billing_history;
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

CREATE POLICY "Super admin can manage billing_history"
    ON billing_history FOR ALL
    USING (is_super_admin());

-- Super admin pode gerenciar planos
CREATE POLICY "Super admin can manage plans"
    ON plans FOR ALL
    USING (is_super_admin());

-- ============================================================================
-- VERIFICAR CONFIGURACAO
-- ============================================================================

-- Verificar se voce e super admin
SELECT
    p.full_name,
    p.role,
    CASE WHEN p.role = 'super_admin' THEN 'SIM - Voce e Super Admin!' ELSE 'NAO - Execute o UPDATE acima com seu email' END as status
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'SEU_EMAIL_AQUI';
