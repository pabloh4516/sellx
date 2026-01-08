/**
 * Hook para gerenciamento de limites do plano
 * Centraliza verificacao de limites e contagens de uso
 */

import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Definicao de todos os limites disponiveis no sistema
export const PLAN_LIMIT_DEFINITIONS = {
  users: {
    key: 'max_users',
    label: 'Usuarios',
    description: 'Quantidade de usuarios/operadores',
    icon: 'Users',
    entity: 'Profile',
    countMethod: 'profiles',
  },
  products: {
    key: 'max_products',
    label: 'Produtos',
    description: 'Quantidade de produtos no catalogo',
    icon: 'Package',
    entity: 'Product',
    countMethod: 'products',
  },
  customers: {
    key: 'max_customers',
    label: 'Clientes',
    description: 'Quantidade de clientes cadastrados',
    icon: 'Users',
    entity: 'Customer',
    countMethod: 'customers',
  },
  sales_per_month: {
    key: 'max_sales_per_month',
    label: 'Vendas/mes',
    description: 'Quantidade de vendas por mes',
    icon: 'ShoppingCart',
    entity: 'Sale',
    countMethod: 'sales_month',
  },
  pdv_terminals: {
    key: 'max_pdv_terminals',
    label: 'PDVs simultaneos',
    description: 'Caixas abertos ao mesmo tempo',
    icon: 'Monitor',
    entity: 'CashRegister',
    countMethod: 'open_registers',
  },
  service_orders: {
    key: 'max_service_orders',
    label: 'Ordens de Servico/mes',
    description: 'Ordens de servico por mes',
    icon: 'Wrench',
    entity: 'ServiceOrder',
    countMethod: 'service_orders_month',
  },
  quotes: {
    key: 'max_quotes',
    label: 'Orcamentos/mes',
    description: 'Orcamentos por mes',
    icon: 'FileText',
    entity: 'Quote',
    countMethod: 'quotes_month',
  },
  suppliers: {
    key: 'max_suppliers',
    label: 'Fornecedores',
    description: 'Quantidade de fornecedores',
    icon: 'Truck',
    entity: 'Supplier',
    countMethod: 'suppliers',
  },
  storage_mb: {
    key: 'max_storage_mb',
    label: 'Armazenamento (MB)',
    description: 'Espaco para fotos e anexos',
    icon: 'HardDrive',
    entity: null,
    countMethod: 'storage',
  },
  stores: {
    key: 'max_stores',
    label: 'Lojas/Filiais',
    description: 'Quantidade de unidades',
    icon: 'Store',
    entity: 'Store',
    countMethod: 'stores',
  },
};

// Planos padrao com limites pre-definidos
export const DEFAULT_PLANS = {
  free: {
    name: 'Gratuito',
    price_monthly: 0,
    price_yearly: 0,
    limits: {
      max_users: 1,
      max_products: 50,
      max_customers: 50,
      max_sales_per_month: 30,
      max_pdv_terminals: 1,
      max_service_orders: 10,
      max_quotes: 10,
      max_suppliers: 10,
      max_storage_mb: 100,
      max_stores: 1,
    },
    features: ['pdv_basic', 'reports_basic'],
  },
  starter: {
    name: 'Starter',
    price_monthly: 49.90,
    price_yearly: 479.00,
    limits: {
      max_users: 3,
      max_products: 500,
      max_customers: 500,
      max_sales_per_month: 500,
      max_pdv_terminals: 2,
      max_service_orders: 100,
      max_quotes: 100,
      max_suppliers: 50,
      max_storage_mb: 500,
      max_stores: 1,
    },
    features: ['pdv_complete', 'reports_basic', 'whatsapp', 'backup'],
  },
  professional: {
    name: 'Profissional',
    price_monthly: 99.90,
    price_yearly: 959.00,
    limits: {
      max_users: 10,
      max_products: 5000,
      max_customers: 5000,
      max_sales_per_month: 2000,
      max_pdv_terminals: 5,
      max_service_orders: 500,
      max_quotes: 500,
      max_suppliers: 200,
      max_storage_mb: 2000,
      max_stores: 3,
    },
    features: ['pdv_complete', 'reports_advanced', 'whatsapp', 'backup', 'api', 'multi_store'],
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 299.90,
    price_yearly: 2879.00,
    limits: {
      max_users: -1, // -1 = ilimitado
      max_products: -1,
      max_customers: -1,
      max_sales_per_month: -1,
      max_pdv_terminals: -1,
      max_service_orders: -1,
      max_quotes: -1,
      max_suppliers: -1,
      max_storage_mb: -1,
      max_stores: -1,
    },
    features: ['all'],
  },
};

export function usePlanLimits() {
  const { company, user } = useAuth();
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar contagens de uso
  const fetchUsage = useCallback(async () => {
    // Tentar pegar organization_id do user ou buscar diretamente
    let orgId = user?.organization_id;

    if (!orgId) {
      // Buscar do profile diretamente
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', authUser.id)
          .single();
        orgId = profile?.organization_id;
      }
    }

    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Data do inicio do mes atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Buscar todas as contagens em paralelo
      const [
        profiles,
        products,
        customers,
        allSales,
        openRegisters,
        allServiceOrders,
        allQuotes,
        suppliers,
        stores,
      ] = await Promise.all([
        base44.entities.Profile?.filter?.({ organization_id: orgId }).catch(() => []),
        base44.entities.Product?.list?.().catch(() => []),
        base44.entities.Customer?.list?.().catch(() => []),
        base44.entities.Sale?.list?.().catch(() => []),
        base44.entities.CashRegister?.filter?.({ status: 'aberto' }).catch(() => []),
        base44.entities.ServiceOrder?.list?.().catch(() => []),
        base44.entities.Quote?.list?.().catch(() => []),
        base44.entities.Supplier?.list?.().catch(() => []),
        base44.entities.Store?.list?.().catch(() => []),
      ]);

      // Filtrar vendas do mes atual no cliente
      const salesMonth = Array.isArray(allSales)
        ? allSales.filter(s => s.sale_date && new Date(s.sale_date) >= startOfMonth)
        : [];

      // Filtrar OS do mes atual
      const serviceOrdersMonth = Array.isArray(allServiceOrders)
        ? allServiceOrders.filter(s => s.created_at && new Date(s.created_at) >= startOfMonth)
        : [];

      // Filtrar orcamentos do mes atual
      const quotesMonth = Array.isArray(allQuotes)
        ? allQuotes.filter(q => q.created_at && new Date(q.created_at) >= startOfMonth)
        : [];

      const usageData = {
        users: Array.isArray(profiles) ? profiles.length : 0,
        products: Array.isArray(products) ? products.length : 0,
        customers: Array.isArray(customers) ? customers.length : 0,
        sales_per_month: Array.isArray(salesMonth) ? salesMonth.length : 0,
        pdv_terminals: Array.isArray(openRegisters) ? openRegisters.length : 0,
        service_orders: Array.isArray(serviceOrdersMonth) ? serviceOrdersMonth.length : 0,
        quotes: Array.isArray(quotesMonth) ? quotesMonth.length : 0,
        suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
        storage_mb: 0, // TODO: calcular uso de storage
        stores: Array.isArray(stores) ? stores.length : 0,
      };

      setUsage(usageData);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar uso do plano:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, company]);

  // Buscar uso ao montar e quando mudar a organizacao
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Obter limite de uma feature
  const getLimit = useCallback((limitKey) => {
    const definition = PLAN_LIMIT_DEFINITIONS[limitKey];
    if (!definition) {
      console.warn('[PlanLimits] Definicao nao encontrada para:', limitKey);
      return -1;
    }

    const dbKey = definition.key;

    // Se a empresa tem limites customizados, usar os da empresa
    if (company?.custom_limits && company[dbKey] !== undefined && company[dbKey] !== null) {
      return company[dbKey];
    }

    // Se a empresa tem o campo definido (mesmo sem custom_limits), usar
    if (company && company[dbKey] !== undefined && company[dbKey] !== null) {
      return company[dbKey];
    }

    // Se nao tiver, usa o plano padrao
    const planKey = company?.plan || 'free';
    const defaultPlan = DEFAULT_PLANS[planKey];

    if (defaultPlan?.limits?.[dbKey] !== undefined) {
      return defaultPlan.limits[dbKey];
    }

    // Se o plano nao existe em DEFAULT_PLANS, usar 'free' como fallback
    const freePlan = DEFAULT_PLANS.free;
    if (freePlan?.limits?.[dbKey] !== undefined) {
      return freePlan.limits[dbKey];
    }

    return -1; // Ilimitado como fallback
  }, [company]);

  // Verificar se pode criar mais de algo
  const canCreate = useCallback((limitKey) => {
    const limit = getLimit(limitKey);
    if (limit === -1) return true; // Ilimitado

    const currentUsage = usage[limitKey] || 0;
    return currentUsage < limit;
  }, [getLimit, usage]);

  // Verificar e mostrar erro se limite atingido
  const checkLimitAndNotify = useCallback((limitKey, customMessage) => {
    if (canCreate(limitKey)) {
      return true;
    }

    const definition = PLAN_LIMIT_DEFINITIONS[limitKey];
    const limit = getLimit(limitKey);
    const message = customMessage ||
      `Limite de ${definition?.label || limitKey} atingido (${limit}). Faca upgrade do seu plano para continuar.`;

    toast.error(message, {
      duration: 5000,
      action: {
        label: 'Ver Planos',
        onClick: () => window.location.href = '/Billing',
      },
    });

    return false;
  }, [canCreate, getLimit]);

  // Obter porcentagem de uso
  const getUsagePercent = useCallback((limitKey) => {
    const limit = getLimit(limitKey);
    if (limit === -1) return 0;

    const currentUsage = usage[limitKey] || 0;
    return Math.min((currentUsage / limit) * 100, 100);
  }, [getLimit, usage]);

  // Verificar se esta proximo do limite (>80%)
  const isNearLimit = useCallback((limitKey) => {
    return getUsagePercent(limitKey) >= 80;
  }, [getUsagePercent]);

  // Verificar se atingiu o limite
  const isAtLimit = useCallback((limitKey) => {
    return getUsagePercent(limitKey) >= 100;
  }, [getUsagePercent]);

  // Obter resumo de uso para exibicao
  const getUsageSummary = useCallback((limitKey) => {
    const definition = PLAN_LIMIT_DEFINITIONS[limitKey];
    const limit = getLimit(limitKey);
    const currentUsage = usage[limitKey] || 0;
    const percent = getUsagePercent(limitKey);

    return {
      key: limitKey,
      label: definition?.label || limitKey,
      description: definition?.description || '',
      icon: definition?.icon || 'Circle',
      current: currentUsage,
      limit: limit,
      limitDisplay: limit === -1 ? '∞' : limit,
      percent: percent,
      isUnlimited: limit === -1,
      isNearLimit: percent >= 80,
      isAtLimit: percent >= 100,
      canCreate: limit === -1 || currentUsage < limit,
    };
  }, [getLimit, usage, getUsagePercent]);

  // Obter todos os resumos de uso
  const getAllUsageSummaries = useCallback(() => {
    return Object.keys(PLAN_LIMIT_DEFINITIONS).map(key => getUsageSummary(key));
  }, [getUsageSummary]);

  return {
    // Estado
    usage,
    loading,
    error,

    // Funcoes de verificacao
    getLimit,
    canCreate,
    checkLimitAndNotify,
    getUsagePercent,
    isNearLimit,
    isAtLimit,

    // Funcoes de exibicao
    getUsageSummary,
    getAllUsageSummaries,

    // Atualizar dados
    refreshUsage: fetchUsage,

    // Constantes
    LIMIT_DEFINITIONS: PLAN_LIMIT_DEFINITIONS,
    DEFAULT_PLANS,
  };
}

export default usePlanLimits;
