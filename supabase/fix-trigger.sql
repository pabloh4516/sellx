-- ============================================================================
-- SELLX - Remover trigger problematico e corrigir signup
-- ============================================================================

-- 1. Remover o trigger que esta causando erro 500
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Permitir INSERT na tabela profiles para usuarios autenticados
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON profiles;

CREATE POLICY "Users can create own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- 3. Garantir que profiles aceita INSERT sem organization_id inicialmente
-- (o organization_id sera adicionado depois pelo frontend)

-- 4. Verificar se a policy de SELECT esta correta
DROP POLICY IF EXISTS "Users can view own profile or organization profiles" ON profiles;
CREATE POLICY "Users can view own profile or organization profiles"
    ON profiles FOR SELECT
    USING (
        id = auth.uid()
        OR organization_id IS NOT NULL AND organization_id = (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 5. Permitir UPDATE do proprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());
