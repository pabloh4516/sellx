-- ============================================================================
-- SELLX ERP - Adicionar codigo de funcionario para login simplificado
-- Execute este script no SQL Editor do Supabase
-- ============================================================================

-- Adicionar campo de codigo do funcionario na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20);

-- Criar indice unico por organizacao (cada org pode ter seus proprios codigos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_code_org
ON profiles(organization_id, employee_code)
WHERE employee_code IS NOT NULL;

-- Adicionar campo de PIN (senha simplificada de 4-6 digitos)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin VARCHAR(10);

-- Comentarios
COMMENT ON COLUMN profiles.employee_code IS 'Codigo do funcionario para login simplificado (ex: 001, FUNC01)';
COMMENT ON COLUMN profiles.pin IS 'PIN numerico de 4-6 digitos para login rapido';

-- Funcao para gerar email interno automaticamente
-- Usada quando funcionario nao tem email real
CREATE OR REPLACE FUNCTION generate_internal_email(code TEXT, org_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(code) || '.' || SUBSTRING(org_id::TEXT, 1, 8) || '@internal.sellx.local';
END;
$$ LANGUAGE plpgsql;
