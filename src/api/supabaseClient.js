// ============================================================================
// SUPABASE CLIENT - Cliente real com banco de dados
// ============================================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Mapeamento de entidades para tabelas
const ENTITY_TABLE_MAP = {
  Product: 'products',
  Customer: 'customers',
  ProductGroup: 'product_groups',
  Supplier: 'suppliers',
  Sale: 'sales',
  SaleItem: 'sale_items',
  Installment: 'installments',
  CashRegister: 'cash_registers',
  CashMovement: 'cash_movements',
  Expense: 'expenses',
  Seller: 'sellers',
  Company: 'organizations',
  PaymentMethod: 'payment_methods',
  Promotion: 'promotions',
  LoyaltyConfig: 'loyalty_programs',
  LoyaltyProgram: 'loyalty_programs',
  LoyaltyTransaction: 'loyalty_transactions',
  User: 'profiles',
  Profile: 'profiles', // Alias para compatibilidade
  FutureOrder: 'future_orders',
  Quote: 'quotes',
  QuoteItem: 'quote_items',
  Return: 'returns',
  ReturnItem: 'return_items',
  ServiceOrder: 'service_orders',
  Purchase: 'purchases',
  PurchaseItem: 'purchase_items',
  StockMovement: 'stock_movements',
  StockLocation: 'stock_locations',
  StockBatch: 'stock_batches',
  StockTransfer: 'stock_transfers',
  StockAdjustment: 'stock_adjustments',
  BankAccount: 'bank_accounts',
  Check: 'checks',
  Payable: 'payables',
  Receivable: 'installments', // Usa a mesma tabela de installments
  Setting: 'settings',
  ThemeSettings: 'theme_settings',
  AuditLog: 'audit_logs',
  Plan: 'plans',
  Subscription: 'subscriptions',
  BillingHistory: 'billing_history',
  Invitation: 'invitations',
  SellerGoal: 'seller_goals',
  CommissionPayment: 'commission_payments',
  CustomerPoints: 'customer_points',
  BackupLog: 'audit_logs', // Usa audit_logs para backups
  SystemSettings: 'settings', // Usa settings para configuracoes do sistema
  SaleCancellation: 'sale_cancellations', // Cancelamentos de vendas
};

// Helper para obter organization_id do usuario logado
const getOrganizationId = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Supabase] getOrganizationId: sem usuario autenticado');
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[Supabase] getOrganizationId erro ao buscar profile:', error.message);
      return null;
    }

    console.log('[Supabase] getOrganizationId:', profile?.organization_id || 'null');
    return profile?.organization_id;
  } catch (e) {
    console.error('[Supabase] getOrganizationId erro:', e);
    return null;
  }
};

// Cache do organization_id para evitar queries repetidas
let cachedOrgId = null;
let cachedOrgIdTimestamp = 0;
const ORG_ID_CACHE_TTL = 300000; // 5 minutos (aumentado de 1 minuto)

const getCachedOrganizationId = async () => {
  const now = Date.now();
  if (cachedOrgId && (now - cachedOrgIdTimestamp) < ORG_ID_CACHE_TTL) {
    return cachedOrgId;
  }

  // Tentar obter o organization_id
  cachedOrgId = await getOrganizationId();
  cachedOrgIdTimestamp = now;

  // Se ainda nao tem, tentar novamente apos pequeno delay (auth pode estar carregando)
  if (!cachedOrgId) {
    console.log('[Supabase] organization_id nulo, tentando novamente em 500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));
    cachedOrgId = await getOrganizationId();
    cachedOrgIdTimestamp = Date.now();
  }

  return cachedOrgId;
};

// Limpar cache quando usuario muda
supabase.auth.onAuthStateChange(() => {
  cachedOrgId = null;
  cachedOrgIdTimestamp = 0;
  staticDataCache.clear(); // Limpar cache de dados estaticos tambem
});

// ============================================================================
// CACHE E OTIMIZACOES DE PERFORMANCE
// ============================================================================

// Timeout para queries - evita tela branca infinita
const QUERY_TIMEOUT = 30000; // 30 segundos (aumentado para conexoes lentas)

// Helper para adicionar timeout em promises com retry
const withTimeout = async (promise, ms = QUERY_TIMEOUT, fallback = null, retries = 1) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), ms)
        )
      ]);
      return result;
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        if (attempt < retries) {
          console.log(`[Supabase] Query lenta, tentando novamente... (${attempt + 1}/${retries + 1})`);
          continue;
        }
        console.warn(`[Supabase] Query timeout apos ${ms}ms - retornando fallback`);
        return fallback;
      }
      throw error;
    }
  }
  return fallback;
};

// Cache para dados estaticos (grupos, formas de pagamento, etc)
const staticDataCache = new Map();
const STATIC_CACHE_TTL = 10 * 60 * 1000; // 10 minutos (aumentado de 5 minutos)

// Entidades que podem ser cacheadas (raramente mudam)
const CACHEABLE_ENTITIES = [
  'ProductGroup',
  'PaymentMethod',
  'Seller',
  'Supplier',
  'StockLocation',
  'BankAccount',
  'LoyaltyProgram',  // Adicionado
  'Promotion',       // Adicionado
  'Plan',            // Adicionado
];

// Limites padrao para queries - evita carregar dados demais
const DEFAULT_LIMITS = {
  Sale: 500,
  Product: 1000,
  Customer: 1000,
  Installment: 500,
  Expense: 500,
  StockMovement: 300,
  AuditLog: 200,
  default: 500
};

// Funcao para limpar cache de uma entidade especifica
export const clearEntityCache = (entityName) => {
  for (const key of staticDataCache.keys()) {
    if (key.startsWith(entityName)) {
      staticDataCache.delete(key);
    }
  }
};

// Funcao para limpar todo o cache
export const clearAllCache = () => {
  staticDataCache.clear();
  cachedOrgId = null;
  cachedOrgIdTimestamp = 0;
};

// Helper para adicionar campos legados (created_date, updated_date) como aliases
// Isso permite compatibilidade com codigo existente que usa os nomes antigos
const addLegacyFields = (data) => {
  if (!data) return data;

  const transform = (record) => {
    if (!record || typeof record !== 'object') return record;
    return {
      ...record,
      // Adicionar aliases para campos de data
      created_date: record.created_at || record.created_date,
      updated_date: record.updated_at || record.updated_date,
    };
  };

  if (Array.isArray(data)) {
    return data.map(transform);
  }
  return transform(data);
};

// Criar metodos CRUD para cada entidade
const createEntityMethods = (entityName) => {
  const tableName = ENTITY_TABLE_MAP[entityName];

  if (!tableName) {
    console.warn(`Unknown entity: ${entityName}`);
    return null;
  }

  // Tabelas que nao precisam de organization_id (ou sao a propria tabela de org)
  // NOTA: 'profiles' foi removido pois deve filtrar por organization_id
  const globalTables = ['plans', 'organizations'];
  const needsOrgId = !globalTables.includes(tableName);

  return {
    // Listar registros com limite e cache otimizados
    list: async (orderBy, options = {}) => {
      try {
        // Verificar cache para entidades estaticas
        const cacheKey = `${entityName}_list_${orderBy || 'default'}`;
        if (CACHEABLE_ENTITIES.includes(entityName) && !options.noCache) {
          const cached = staticDataCache.get(cacheKey);
          if (cached && (Date.now() - cached.timestamp) < STATIC_CACHE_TTL) {
            return cached.data;
          }
        }

        let query = supabase.from(tableName).select('*');

        // Adicionar organization_id filter (RLS ja faz isso, mas e uma seguranca extra)
        if (needsOrgId) {
          const orgId = await getCachedOrganizationId();
          if (orgId && orgId !== 'undefined' && orgId !== null) {
            query = query.eq('organization_id', orgId);
          } else {
            console.warn(`[Supabase] ${entityName}.list: organization_id nao disponivel, RLS vai filtrar`);
          }
        }

        // Ordenacao
        if (orderBy && typeof orderBy === 'string') {
          const isDesc = orderBy.startsWith('-');
          let field = isDesc ? orderBy.substring(1) : orderBy;
          // Converter nomes de campo legados
          if (field === 'created_date') field = 'created_at';
          if (field === 'updated_date') field = 'updated_at';
          query = query.order(field, { ascending: !isDesc });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Aplicar limite para evitar carregar dados demais (exceto se noLimit=true)
        if (!options.noLimit) {
          const limit = options.limit || DEFAULT_LIMITS[entityName] || DEFAULT_LIMITS.default;
          query = query.limit(limit);
        }

        // Adicionar timeout para evitar tela branca infinita
        const queryResult = await withTimeout(query, QUERY_TIMEOUT, { data: [], error: null });
        const { data, error } = queryResult || { data: [], error: null };

        if (error) {
          console.error(`Error listing ${entityName}:`, error);
          return [];
        }

        const result = addLegacyFields(data) || [];

        // Armazenar em cache se for entidade estatica
        if (CACHEABLE_ENTITIES.includes(entityName)) {
          staticDataCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        return result;
      } catch (error) {
        console.error(`Error listing ${entityName}:`, error);
        return [];
      }
    },

    // Filtrar registros com limite otimizado
    filter: async (filters = {}, options = {}) => {
      try {
        let query = supabase.from(tableName).select('*');

        if (needsOrgId) {
          const orgId = await getCachedOrganizationId();
          if (orgId && orgId !== 'undefined' && orgId !== null) {
            query = query.eq('organization_id', orgId);
          }
        }

        // Aplicar filtros
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        // Ordenacao
        if (options.orderBy) {
          const isDesc = options.orderBy.startsWith('-');
          let field = isDesc ? options.orderBy.substring(1) : options.orderBy;
          if (field === 'created_date') field = 'created_at';
          if (field === 'updated_date') field = 'updated_at';
          query = query.order(field, { ascending: !isDesc });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        // Aplicar limite
        if (!options.noLimit) {
          const limit = options.limit || DEFAULT_LIMITS[entityName] || DEFAULT_LIMITS.default;
          query = query.limit(limit);
        }

        // Adicionar timeout para evitar tela branca infinita
        const queryResult = await withTimeout(query, QUERY_TIMEOUT, { data: [], error: null });
        const { data, error } = queryResult || { data: [], error: null };

        if (error) {
          console.error(`Error filtering ${entityName}:`, error);
          return [];
        }

        return addLegacyFields(data) || [];
      } catch (error) {
        console.error(`Error filtering ${entityName}:`, error);
        return [];
      }
    },

    // Obter um registro por ID
    get: async (id) => {
      try {
        const query = supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        // Adicionar timeout
        const queryResult = await withTimeout(query, QUERY_TIMEOUT, { data: null, error: null });
        const { data, error } = queryResult || { data: null, error: null };

        if (error) {
          console.error(`Error getting ${entityName}:`, error);
          return null;
        }

        return addLegacyFields(data);
      } catch (error) {
        console.error(`Error getting ${entityName}:`, error);
        return null;
      }
    },

    // Criar novo registro
    create: async (data) => {
      try {
        const insertData = { ...data };

        // Adicionar organization_id automaticamente
        if (needsOrgId && !insertData.organization_id) {
          const orgId = await getCachedOrganizationId();
          if (orgId) {
            insertData.organization_id = orgId;
          }
        }

        // Remover campos que o Supabase gera automaticamente
        delete insertData.id;
        delete insertData.created_at;

        // IMPORTANTE: Converter strings vazias em null para evitar erros de tipo
        Object.keys(insertData).forEach(key => {
          if (insertData[key] === '' || insertData[key] === undefined) {
            insertData[key] = null;
          }
        });

        const { data: created, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error(`Error creating ${entityName}:`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            status: error.status,
            fullError: error
          });
          // Adicionar info do erro ao objeto para facilitar tratamento
          error.status = error.status || (error.code === 'PGRST116' ? 409 : null);
          throw error;
        }

        // Limpar cache da entidade se for cacheavel
        if (CACHEABLE_ENTITIES.includes(entityName)) {
          clearEntityCache(entityName);
        }

        return addLegacyFields(created);
      } catch (error) {
        console.error(`Error creating ${entityName}:`, error);
        throw error;
      }
    },

    // Atualizar registro existente
    update: async (id, data) => {
      try {
        const updateData = { ...data };

        // Remover campos que nao devem ser atualizados
        delete updateData.id;
        delete updateData.created_at;
        delete updateData.organization_id;

        // IMPORTANTE: Converter strings vazias em null para evitar erros de tipo
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === '' || updateData[key] === undefined) {
            updateData[key] = null;
          }
        });

        // Adicionar updated_at se a tabela suportar
        updateData.updated_at = new Date().toISOString();

        const { data: updated, error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error(`Error updating ${entityName}:`, error);
          throw error;
        }

        // Limpar cache da entidade se for cacheavel
        if (CACHEABLE_ENTITIES.includes(entityName)) {
          clearEntityCache(entityName);
        }

        return addLegacyFields(updated);
      } catch (error) {
        console.error(`Error updating ${entityName}:`, error);
        throw error;
      }
    },

    // Deletar registro
    delete: async (id) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`Error deleting ${entityName}:`, error);
          throw error;
        }

        return true;
      } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        throw error;
      }
    },

    // Upsert (inserir ou atualizar)
    upsert: async (data, options = {}) => {
      try {
        const upsertData = { ...data };

        if (needsOrgId && !upsertData.organization_id) {
          const orgId = await getCachedOrganizationId();
          if (orgId) {
            upsertData.organization_id = orgId;
          }
        }

        const { data: result, error } = await supabase
          .from(tableName)
          .upsert(upsertData, options)
          .select()
          .single();

        if (error) {
          console.error(`Error upserting ${entityName}:`, error);
          throw error;
        }

        return addLegacyFields(result);
      } catch (error) {
        console.error(`Error upserting ${entityName}:`, error);
        throw error;
      }
    },

    // Contar registros
    count: async (filters = {}) => {
      try {
        let query = supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (needsOrgId) {
          const orgId = await getCachedOrganizationId();
          if (orgId) {
            query = query.eq('organization_id', orgId);
          }
        }

        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        // Adicionar timeout
        const queryResult = await withTimeout(query, QUERY_TIMEOUT, { count: 0, error: null });
        const { count, error } = queryResult || { count: 0, error: null };

        if (error) {
          console.error(`Error counting ${entityName}:`, error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error(`Error counting ${entityName}:`, error);
        return 0;
      }
    },
  };
};

// Criar proxy para acessar entidades dinamicamente
const entitiesProxy = new Proxy({}, {
  get: (target, entityName) => {
    if (!target[entityName]) {
      target[entityName] = createEntityMethods(entityName);
    }
    return target[entityName];
  }
});

// Cliente Supabase exportado
export const supabaseApi = {
  auth: {
    // Obter usuario atual
    me: async () => {
      console.log('[supabaseApi.me] Iniciando...');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[supabaseApi.me] getUser:', user ? 'OK' : 'null', userError?.message || '');

      if (!user) return null;

      // Buscar profile sem join para evitar problemas de RLS
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('[supabaseApi.me] Profile:', profile ? 'OK' : 'null', profileError?.message || '');

      // Se tem organization_id, buscar organization separadamente
      let organization = null;
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        organization = org;
        console.log('[supabaseApi.me] Organization:', org ? 'OK' : 'null');
      }

      // Se nao tem role no perfil, assumir 'owner' para o primeiro usuario
      const userRole = profile?.role || 'owner';

      console.log('[supabaseApi.me] Concluido');

      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.email,
        role: userRole,
        avatar_url: profile?.avatar_url,
        organization_id: profile?.organization_id,
        organization: organization,
        ...profile,
      };
    },

    // Login
    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Atualizar last_login
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return supabaseApi.auth.me();
    },

    // Logout
    logout: async () => {
      cachedOrgId = null;
      cachedOrgIdTimestamp = 0;
      await supabase.auth.signOut();
    },

    // Registrar
    signUp: async (email, password, metadata = {}) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;
      return data;
    },

    // Recuperar senha
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return true;
    },

    // Atualizar senha
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return true;
    },

    // Obter sessao
    getSession: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },

    // Listener de mudanca de auth
    onAuthStateChange: (callback) => {
      return supabase.auth.onAuthStateChange(callback);
    },
  },

  entities: entitiesProxy,

  integrations: {
    Core: {
      // Upload de arquivo
      UploadFile: async ({ file, bucket = 'uploads', path = '' }) => {
        try {
          const orgId = await getCachedOrganizationId();
          const fileName = `${orgId}/${path}${Date.now()}-${file.name}`;

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

          return { file_url: publicUrl };
        } catch (error) {
          console.error('Error uploading file:', error);
          throw error;
        }
      },
    },
  },

  // Acesso direto ao cliente Supabase para queries complexas
  raw: supabase,

  // Helper para queries complexas com joins
  query: (table) => supabase.from(table),

  // Verificar se esta configurado
  isConfigured: isSupabaseConfigured,

  // Helper para obter organization_id (util para importacao em lote)
  getOrganizationId: getCachedOrganizationId,

  // Helper para limpar cache (util apos importacao)
  clearCache: clearAllCache,
};

export default supabaseApi;
