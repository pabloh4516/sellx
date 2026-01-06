/**
 * Banco de dados offline usando Dexie (IndexedDB)
 * Armazena dados localmente para funcionamento offline
 */

import Dexie from 'dexie';

// Criar instancia do banco
const db = new Dexie('SellxOfflineDB');

// Definir schema do banco (versao 2 - adicionadas tabelas faltantes)
db.version(2).stores({
  // Produtos
  products: 'id, code, barcode, name, group_id, supplier_id, is_active, updated_at',

  // Grupos de produtos
  productGroups: 'id, name, parent_id',

  // Clientes
  customers: 'id, name, cpf_cnpj, phone, email, is_active, updated_at',

  // Fornecedores
  suppliers: 'id, name, cnpj, is_active',

  // Vendedores
  sellers: 'id, name, is_active',

  // Metodos de pagamento
  paymentMethods: 'id, name, is_active',

  // Vendas
  sales: 'id, customer_id, seller_id, status, sale_date, created_at, synced',

  // Itens de venda
  saleItems: 'id, sale_id, product_id',

  // Caixa
  cashRegisters: 'id, status, opening_date, closing_date',

  // Movimentacoes de caixa
  cashMovements: 'id, cash_register_id, type, created_at',

  // Promocoes
  promotions: 'id, is_active, start_date, end_date',

  // Programa de fidelidade
  loyaltyPrograms: 'id, is_active',

  // Pontos de clientes
  customerPoints: 'id, customer_id',

  // Parcelas / Contas a Receber
  installments: 'id, sale_id, customer_id, status, due_date',

  // Despesas
  expenses: 'id, status, due_date, category',

  // Contas a Pagar
  payables: 'id, supplier_id, status, due_date',

  // Orcamentos
  quotes: 'id, customer_id, seller_id, status, created_at',

  // Itens do Orcamento
  quoteItems: 'id, quote_id, product_id',

  // Pedidos Futuros
  futureOrders: 'id, customer_id, seller_id, status, delivery_date',

  // Ordens de Servico
  serviceOrders: 'id, customer_id, status, created_at',

  // Compras
  purchases: 'id, supplier_id, status, purchase_date',

  // Itens de Compra
  purchaseItems: 'id, purchase_id, product_id',

  // Devolucoes
  returns: 'id, sale_id, customer_id, status, created_at',

  // Itens de Devolucao
  returnItems: 'id, return_id, product_id',

  // Movimentacoes de Estoque
  stockMovements: 'id, product_id, type, created_at',

  // Locais de Estoque
  stockLocations: 'id, name, is_active',

  // Lotes de Estoque
  stockBatches: 'id, product_id, batch_number, expiry_date',

  // Transferencias de Estoque
  stockTransfers: 'id, from_location_id, to_location_id, status',

  // Ajustes de Estoque
  stockAdjustments: 'id, product_id, type, created_at',

  // Contas Bancarias
  bankAccounts: 'id, name, is_active',

  // Cheques
  checks: 'id, customer_id, supplier_id, status, due_date',

  // Transacoes de Fidelidade
  loyaltyTransactions: 'id, customer_id, type, created_at',

  // Configuracoes
  settings: 'id, key',

  // Fila de sincronizacao
  syncQueue: '++id, entity, operation, entityId, data, createdAt, status',

  // Metadados de sincronizacao
  syncMeta: 'entity, lastSync',

  // Cache do Dashboard (novo)
  dashboardCache: 'id, type, data, timestamp',
});

// ============================================================================
// FUNCOES DE CACHE/OFFLINE
// ============================================================================

/**
 * Salva dados no cache local
 */
export async function cacheData(table, data) {
  try {
    if (Array.isArray(data)) {
      await db[table].bulkPut(data);
    } else {
      await db[table].put(data);
    }
    return true;
  } catch (error) {
    console.error(`Erro ao cachear ${table}:`, error);
    return false;
  }
}

/**
 * Obtem dados do cache local
 */
export async function getCachedData(table, id = null) {
  try {
    if (id) {
      return await db[table].get(id);
    }
    return await db[table].toArray();
  } catch (error) {
    console.error(`Erro ao obter cache ${table}:`, error);
    return id ? null : [];
  }
}

/**
 * Busca dados no cache com filtro
 */
export async function queryCachedData(table, filter = {}) {
  try {
    let collection = db[table].toCollection();

    // Aplicar filtros simples
    const results = await collection.toArray();

    if (Object.keys(filter).length === 0) {
      return results;
    }

    // Filtrar manualmente (IndexedDB tem limitacoes de query)
    return results.filter(item => {
      return Object.entries(filter).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return item[key] === value;
      });
    });
  } catch (error) {
    console.error(`Erro ao buscar cache ${table}:`, error);
    return [];
  }
}

/**
 * Remove dados do cache
 */
export async function removeCachedData(table, id) {
  try {
    await db[table].delete(id);
    return true;
  } catch (error) {
    console.error(`Erro ao remover cache ${table}:`, error);
    return false;
  }
}

/**
 * Limpa todo o cache de uma tabela
 */
export async function clearCache(table) {
  try {
    await db[table].clear();
    return true;
  } catch (error) {
    console.error(`Erro ao limpar cache ${table}:`, error);
    return false;
  }
}

// ============================================================================
// FILA DE SINCRONIZACAO
// ============================================================================

/**
 * Adiciona operacao na fila de sincronizacao
 */
export async function addToSyncQueue(entity, operation, entityId, data) {
  try {
    await db.syncQueue.add({
      entity,
      operation, // 'create', 'update', 'delete'
      entityId,
      data,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    return true;
  } catch (error) {
    console.error('Erro ao adicionar na fila de sync:', error);
    return false;
  }
}

/**
 * Obtem operacoes pendentes
 */
export async function getPendingSyncOperations() {
  try {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();
  } catch (error) {
    console.error('Erro ao obter operacoes pendentes:', error);
    return [];
  }
}

/**
 * Marca operacao como sincronizada
 */
export async function markAsSynced(id) {
  try {
    await db.syncQueue.update(id, { status: 'synced' });
    return true;
  } catch (error) {
    console.error('Erro ao marcar como sincronizado:', error);
    return false;
  }
}

/**
 * Marca operacao como erro
 */
export async function markSyncError(id, error) {
  try {
    await db.syncQueue.update(id, {
      status: 'error',
      error: error.message || 'Erro desconhecido'
    });
    return true;
  } catch (error) {
    console.error('Erro ao marcar erro de sync:', error);
    return false;
  }
}

/**
 * Remove operacoes sincronizadas antigas
 */
export async function cleanSyncQueue() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.syncQueue
      .where('status')
      .equals('synced')
      .and(item => item.createdAt < oneDayAgo)
      .delete();
    return true;
  } catch (error) {
    console.error('Erro ao limpar fila de sync:', error);
    return false;
  }
}

/**
 * Conta operacoes pendentes
 */
export async function countPendingOperations() {
  try {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .count();
  } catch (error) {
    console.error('Erro ao contar operacoes pendentes:', error);
    return 0;
  }
}

// ============================================================================
// METADADOS DE SINCRONIZACAO
// ============================================================================

/**
 * Atualiza timestamp de ultima sincronizacao
 */
export async function updateLastSync(entity) {
  try {
    await db.syncMeta.put({
      entity,
      lastSync: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar lastSync:', error);
    return false;
  }
}

/**
 * Obtem timestamp de ultima sincronizacao
 */
export async function getLastSync(entity) {
  try {
    const meta = await db.syncMeta.get(entity);
    return meta?.lastSync || null;
  } catch (error) {
    console.error('Erro ao obter lastSync:', error);
    return null;
  }
}

// ============================================================================
// VERIFICACAO DE STATUS
// ============================================================================

/**
 * Verifica se esta online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Listener para mudancas de conexao
 */
export function onConnectionChange(callback) {
  // Criar handlers nomeados para poder remover corretamente
  const onlineHandler = () => callback(true);
  const offlineHandler = () => callback(false);

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  // Retorna funcao para remover listeners
  return () => {
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  };
}

// Exportar instancia do banco para uso direto se necessario
export { db };

export default db;
