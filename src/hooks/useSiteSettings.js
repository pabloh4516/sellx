import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para buscar configuracoes do site
 * @param {string} category - Categoria das configs (optional)
 * @returns {Object} - { settings, loading, error, refetch, getSetting, updateSetting }
 */
export function useSiteSettings(category = null) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Converter array para objeto { key: value }
      const settingsObj = {};
      data?.forEach(item => {
        try {
          // Tentar parsear JSON, se falhar usar valor direto
          settingsObj[item.key] = JSON.parse(item.value);
        } catch {
          settingsObj[item.key] = item.value;
        }
      });

      setSettings(settingsObj);
    } catch (err) {
      console.error('Erro ao buscar configuracoes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /**
   * Busca uma configuracao especifica
   * @param {string} key - Chave da configuracao
   * @param {any} defaultValue - Valor padrao se nao encontrar
   */
  const getSetting = useCallback((key, defaultValue = null) => {
    return settings[key] ?? defaultValue;
  }, [settings]);

  /**
   * Atualiza uma configuracao
   * @param {string} key - Chave da configuracao
   * @param {any} value - Novo valor
   */
  const updateSetting = useCallback(async (key, value) => {
    try {
      const jsonValue = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);

      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ value: jsonValue })
        .eq('key', key);

      if (updateError) throw updateError;

      // Atualizar estado local
      setSettings(prev => ({ ...prev, [key]: value }));

      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar configuracao:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Atualiza multiplas configuracoes de uma vez
   * @param {Object} updates - Objeto { key: value, ... }
   */
  const updateSettings = useCallback(async (updates) => {
    try {
      const promises = Object.entries(updates).map(([key, value]) => {
        const jsonValue = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
        return supabase
          .from('site_settings')
          .update({ value: jsonValue })
          .eq('key', key);
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`${errors.length} erros ao salvar`);
      }

      // Atualizar estado local
      setSettings(prev => ({ ...prev, ...updates }));

      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar configuracoes:', err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    getSetting,
    updateSetting,
    updateSettings,
  };
}

/**
 * Hook para buscar todas as configuracoes com metadados (para admin)
 */
export function useSiteSettingsAdmin() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('site_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (fetchError) throw fetchError;

      // Agrupar por categoria
      const grouped = {};
      data?.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        // Parsear valor
        let parsedValue;
        try {
          parsedValue = JSON.parse(item.value);
        } catch {
          parsedValue = item.value;
        }
        grouped[item.category].push({
          ...item,
          parsedValue,
        });
      });

      setSettings(grouped);
    } catch (err) {
      console.error('Erro ao buscar configuracoes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key, value) => {
    try {
      const jsonValue = typeof value === 'string' && !value.startsWith('[') && !value.startsWith('{')
        ? `"${value}"`
        : typeof value === 'string'
          ? value
          : JSON.stringify(value);

      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ value: jsonValue })
        .eq('key', key);

      if (updateError) throw updateError;

      await fetchSettings();
      return { success: true };
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      return { success: false, error: err.message };
    }
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSetting,
  };
}

/**
 * Valores padrao caso o banco nao esteja disponivel
 */
export const DEFAULT_SETTINGS = {
  // Offline
  offline_price: 69.90,
  offline_name: 'Sellx Offline',
  offline_description: 'Sistema de gestao completo para desktop',
  offline_features: [
    'Licenca vitalicia',
    'Sem mensalidades',
    'Funciona 100% offline',
    'Dados armazenados localmente',
    'Atualizacoes gratuitas',
    'Suporte por email',
  ],
  offline_active: true,

  // Plans
  plans_starter_price: 79,
  plans_starter_name: 'Starter',
  plans_professional_price: 149,
  plans_professional_name: 'Professional',
  plans_enterprise_price: 299,
  plans_enterprise_name: 'Enterprise',
  plans_trial_days: 7,
  plans_yearly_discount: 20,

  // Landing
  landing_hero_title: 'Gestao completa para seu negocio',
  landing_hero_subtitle: 'Sistema de PDV, estoque, financeiro e muito mais. Tudo em um so lugar.',

  // General
  general_company_name: 'Sellx',
  general_support_email: 'suporte@sellx.com.br',

  // Payment
  payment_asaas_api_key: '',
  payment_asaas_environment: 'sandbox',
  payment_asaas_webhook_token: '',
  payment_asaas_active: true,
  payment_pix_active: true,
};

export default useSiteSettings;
