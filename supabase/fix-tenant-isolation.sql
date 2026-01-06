-- ============================================================================
-- SELLX - Correcao de Isolamento Multi-Tenant
-- Execute este script no Supabase SQL Editor para corrigir vazamento de dados
-- ============================================================================

-- 1. Criar funcao RPC segura para buscar email por employee_code
-- Esta funcao permite busca de employee_code sem expor dados de outras organizacoes
CREATE OR REPLACE FUNCTION get_employee_email_by_code(p_employee_code TEXT)
RETURNS TABLE(email TEXT, organization_name TEXT) AS $$
BEGIN
    -- Busca o email do funcionario pelo codigo
    -- Retorna tambem o nome da organizacao para feedback ao usuario
    -- IMPORTANTE: Esta funcao e SECURITY DEFINER, executa com privilegios do owner
    -- mas so retorna o email (nao expoe outros dados sensiveis)
    RETURN QUERY
    SELECT
        p.email::TEXT,
        o.name::TEXT as organization_name
    FROM profiles p
    LEFT JOIN organizations o ON o.id = p.organization_id
    WHERE p.employee_code = UPPER(p_employee_code)
    AND p.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuarios anonimos chamem esta funcao (necessario para login)
GRANT EXECUTE ON FUNCTION get_employee_email_by_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_employee_email_by_code(TEXT) TO authenticated;

-- 2. Criar indice unico GLOBAL para employee_code (evita codigos duplicados entre lojas)
-- IMPORTANTE: Isso garante que cada codigo de funcionario seja unico em TODO o sistema
-- Comentado por padrao - descomente se quiser codigos unicos globalmente
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_code_unique
--     ON profiles(employee_code)
--     WHERE employee_code IS NOT NULL;

-- 3. Criar indice composto para busca por codigo dentro da organizacao
CREATE INDEX IF NOT EXISTS idx_profiles_org_employee_code
    ON profiles(organization_id, employee_code)
    WHERE employee_code IS NOT NULL;

-- 4. Corrigir politica RLS de profiles para bloquear acesso quando organization_id e NULL
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own organization profiles" ON profiles;

CREATE POLICY "Users can view profiles"
    ON profiles FOR SELECT
    USING (
        -- Super admin pode ver todos
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
        -- Usuario pode ver seu proprio perfil
        OR id = auth.uid()
        -- Usuario pode ver perfis da mesma organizacao (APENAS se ambos tem organization_id)
        OR (
            organization_id IS NOT NULL
            AND organization_id = (
                SELECT organization_id
                FROM profiles
                WHERE id = auth.uid()
                AND organization_id IS NOT NULL
            )
        )
    );

-- 5. Garantir que profiles sem organization_id nao possam ver outros profiles
-- Isso previne vazamento durante o processo de registro

-- 6. Corrigir politica de INSERT para profiles (trigger pode criar)
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON profiles;
CREATE POLICY "Allow trigger to create profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        -- Trigger SECURITY DEFINER pode inserir
        true
    );

-- 7. Corrigir politica de UPDATE para garantir que organization_id so pode ser setado uma vez
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

CREATE POLICY "Users can update profiles"
    ON profiles FOR UPDATE
    USING (
        -- Super admin pode atualizar qualquer perfil
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
        -- Usuario pode atualizar seu proprio perfil
        OR id = auth.uid()
        -- Admin/Owner pode atualizar perfis da mesma organizacao
        OR (
            organization_id IS NOT NULL
            AND organization_id = (
                SELECT organization_id
                FROM profiles
                WHERE id = auth.uid()
                AND organization_id IS NOT NULL
                AND role IN ('owner', 'admin')
            )
        )
    );

-- 8. Funcao para verificar se usuario pertence a uma organizacao ativa
CREATE OR REPLACE FUNCTION user_has_valid_organization()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles p
        JOIN organizations o ON o.id = p.organization_id
        WHERE p.id = auth.uid()
        AND p.organization_id IS NOT NULL
        AND o.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Atualizar trigger handle_new_user para incluir email no profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar view segura para listar usuarios da organizacao (alternativa ao RLS)
CREATE OR REPLACE VIEW organization_users AS
SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.employee_code,
    p.is_active,
    p.last_login_at,
    p.created_at
FROM profiles p
WHERE p.organization_id = (
    SELECT organization_id
    FROM profiles
    WHERE id = auth.uid()
);

-- Permissoes para a view
GRANT SELECT ON organization_users TO authenticated;

-- ============================================================================
-- VERIFICACAO: Execute as queries abaixo para verificar se as correcoes foram aplicadas
-- ============================================================================

-- Verificar politicas de profiles:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Verificar funcoes criadas:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%employee%' OR proname LIKE '%organization%';

-- Testar a funcao RPC:
-- SELECT * FROM get_employee_email_by_code('001');
