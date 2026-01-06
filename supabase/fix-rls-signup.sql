-- ============================================================================
-- SELLX - Correcao RLS para Signup
-- Execute este script APOS o schema.sql principal
-- ============================================================================

-- Permitir que o trigger crie profiles para novos usuarios
CREATE POLICY "Allow trigger to create profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- Usuarios podem ver seu proprio perfil mesmo sem organization ainda
DROP POLICY IF EXISTS "Users can view own organization profiles" ON profiles;
CREATE POLICY "Users can view own profile or organization profiles"
    ON profiles FOR SELECT
    USING (
        id = auth.uid()
        OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Permitir novos usuarios criarem organizacoes
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir usuarios atualizarem seu perfil (adicionar organization_id)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Permitir criar registros em tabelas auxiliares para novos usuarios
CREATE POLICY "Authenticated users can create theme_settings"
    ON theme_settings FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create loyalty_programs"
    ON loyalty_programs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create payment_methods"
    ON payment_methods FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Politicas SELECT para tabelas auxiliares
CREATE POLICY "Users can view own organization theme_settings"
    ON theme_settings FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own organization loyalty_programs"
    ON loyalty_programs FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view own organization payment_methods"
    ON payment_methods FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Politicas UPDATE para tabelas auxiliares
CREATE POLICY "Users can update own organization theme_settings"
    ON theme_settings FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization loyalty_programs"
    ON loyalty_programs FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own organization payment_methods"
    ON payment_methods FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Politicas para outras tabelas importantes (INSERT)
CREATE POLICY "Users can create customers"
    ON customers FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view customers"
    ON customers FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update customers"
    ON customers FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete customers"
    ON customers FOR DELETE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Sales
CREATE POLICY "Users can create sales"
    ON sales FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view sales"
    ON sales FOR SELECT
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update sales"
    ON sales FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Sale Items (baseado no sale_id)
CREATE POLICY "Users can manage sale_items"
    ON sale_items FOR ALL
    USING (
        sale_id IN (
            SELECT id FROM sales
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Suppliers
CREATE POLICY "Users can manage suppliers"
    ON suppliers FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Product Groups
CREATE POLICY "Users can manage product_groups"
    ON product_groups FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Sellers
CREATE POLICY "Users can manage sellers"
    ON sellers FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Installments
CREATE POLICY "Users can manage installments"
    ON installments FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Stock tables
CREATE POLICY "Users can manage stock_locations"
    ON stock_locations FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage stock_batches"
    ON stock_batches FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage stock_movements"
    ON stock_movements FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage stock_transfers"
    ON stock_transfers FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage stock_adjustments"
    ON stock_adjustments FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Financial tables
CREATE POLICY "Users can manage bank_accounts"
    ON bank_accounts FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage cash_registers"
    ON cash_registers FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage cash_movements"
    ON cash_movements FOR ALL
    USING (
        cash_register_id IN (
            SELECT id FROM cash_registers
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can manage expenses"
    ON expenses FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage payables"
    ON payables FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage checks"
    ON checks FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Purchases
CREATE POLICY "Users can manage purchases"
    ON purchases FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage purchase_items"
    ON purchase_items FOR ALL
    USING (
        purchase_id IN (
            SELECT id FROM purchases
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Quotes
CREATE POLICY "Users can manage quotes"
    ON quotes FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage quote_items"
    ON quote_items FOR ALL
    USING (
        quote_id IN (
            SELECT id FROM quotes
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Orders
CREATE POLICY "Users can manage future_orders"
    ON future_orders FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage service_orders"
    ON service_orders FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Promotions & Loyalty
CREATE POLICY "Users can manage promotions"
    ON promotions FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage loyalty_transactions"
    ON loyalty_transactions FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Commissions
CREATE POLICY "Users can manage seller_goals"
    ON seller_goals FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage commission_payments"
    ON commission_payments FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Returns
CREATE POLICY "Users can manage returns"
    ON returns FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage return_items"
    ON return_items FOR ALL
    USING (
        return_id IN (
            SELECT id FROM returns
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Settings & Logs
CREATE POLICY "Users can manage settings"
    ON settings FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage audit_logs"
    ON audit_logs FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Invitations
CREATE POLICY "Users can manage invitations"
    ON invitations FOR ALL
    USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Subscriptions & Billing (apenas owners)
CREATE POLICY "Owners can manage subscriptions"
    ON subscriptions FOR ALL
    USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Owners can view billing_history"
    ON billing_history FOR SELECT
    USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Plans sao publicos (todos podem ver)
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
