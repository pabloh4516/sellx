/**
 * Servico de dados offline
 * Gerencia a transicao entre dados online (Supabase) e offline (IndexedDB)
 */

import {
  cacheData,
  getCachedData,
  queryCachedData,
  removeCachedData,
  addToSyncQueue,
  updateLastSync,
  isOnline,
  countPendingOperations
} from './offlineDb';
import { base44 } from '@/api/base44Client';

// Mapeamento de entidades para tabelas do cache
const ENTITY_TABLE_MAP = {
  Product: 'products',
  ProductGroup: 'productGroups',
  Customer: 'customers',
  Supplier: 'suppliers',
  Seller: 'sellers',
  PaymentMethod: 'paymentMethods',
  Sale: 'sales',
  SaleItem: 'saleItems',
  CashRegister: 'cashRegisters',
  CashMovement: 'cashMovements',
  Promotion: 'promotions',
  LoyaltyProgram: 'loyaltyPrograms',
  CustomerPoints: 'customerPoints',
  Installment: 'installments',
  Expense: 'expenses',
  Payable: 'payables',
  Quote: 'quotes',
  QuoteItem: 'quoteItems',
  FutureOrder: 'futureOrders',
  ServiceOrder: 'serviceOrders',
  Purchase: 'purchases',
  PurchaseItem: 'purchaseItems',
  Return: 'returns',
  ReturnItem: 'returnItems',
  StockMovement: 'stockMovements',
  StockLocation: 'stockLocations',
  StockBatch: 'stockBatches',
  StockTransfer: 'stockTransfers',
  StockAdjustment: 'stockAdjustments',
  BankAccount: 'bankAccounts',
  Check: 'checks',
  LoyaltyTransaction: 'loyaltyTransactions',
  Setting: 'settings',
};

// Entidades que podem ser criadas/editadas offline
const OFFLINE_WRITABLE_ENTITIES = [
  'Sale',
  'SaleItem',
  'CashRegister',
  'CashMovement',
  'Customer',
  'CustomerPoints',
];

/**
 * Gera um ID temporario para uso offline
 */
function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verifica se um ID e temporario
 */
export function isTempId(id) {
  return typeof id === 'string' && id.startsWith('temp_');
}

/**
 * Classe que encapsula operacoes de uma entidade com suporte offline
 */
class OfflineEntity {
  constructor(entityName) {
    this.entityName = entityName;
    this.tableName = ENTITY_TABLE_MAP[entityName] || entityName.toLowerCase() + 's';
    this.canWriteOffline = OFFLINE_WRITABLE_ENTITIES.includes(entityName);
  }

  /**
   * Lista todos os registros
   */
  async list() {
    try {
      if (isOnline()) {
        // Online: busca do servidor e atualiza cache
        const data = await base44.entities[this.entityName].list();
        await cacheData(this.tableName, data);
        await updateLastSync(this.entityName);
        return data;
      } else {
        // Offline: usa cache
        console.log(`[Offline] Usando cache para ${this.entityName}`);
        return await getCachedData(this.tableName);
      }
    } catch (error) {
      console.error(`Erro ao listar ${this.entityName}:`, error);
      // Em caso de erro (ex: timeout), tenta usar cache
      const cached = await getCachedData(this.tableName);
      if (cached && cached.length > 0) {
        console.log(`[Fallback] Usando cache para ${this.entityName}`);
        return cached;
      }
      throw error;
    }
  }

  /**
   * Busca um registro por ID
   */
  async get(id) {
    try {
      if (isOnline() && !isTempId(id)) {
        const data = await base44.entities[this.entityName].get(id);
        if (data) {
          await cacheData(this.tableName, data);
        }
        return data;
      } else {
        return await getCachedData(this.tableName, id);
      }
    } catch (error) {
      console.error(`Erro ao buscar ${this.entityName}:`, error);
      return await getCachedData(this.tableName, id);
    }
  }

  /**
   * Filtra registros
   */
  async filter(filterObj) {
    try {
      if (isOnline()) {
        const data = await base44.entities[this.entityName].filter(filterObj);
        // Atualiza cache com os dados filtrados
        if (data && data.length > 0) {
          await cacheData(this.tableName, data);
        }
        return data;
      } else {
        return await queryCachedData(this.tableName, filterObj);
      }
    } catch (error) {
      console.error(`Erro ao filtrar ${this.entityName}:`, error);
      return await queryCachedData(this.tableName, filterObj);
    }
  }

  /**
   * Cria um novo registro
   */
  async create(data) {
    try {
      if (isOnline()) {
        // Online: cria no servidor
        const created = await base44.entities[this.entityName].create(data);
        await cacheData(this.tableName, created);
        return created;
      } else if (this.canWriteOffline) {
        // Offline: cria localmente com ID temporario
        console.log(`[Offline] Criando ${this.entityName} localmente`);
        const tempData = {
          ...data,
          id: generateTempId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _offline: true,
          synced: false,
        };

        await cacheData(this.tableName, tempData);
        await addToSyncQueue(this.entityName, 'create', tempData.id, tempData);

        return tempData;
      } else {
        throw new Error(`Sem conexao. ${this.entityName} nao pode ser criado offline.`);
      }
    } catch (error) {
      if (!isOnline() && this.canWriteOffline) {
        // Tenta criar offline em caso de erro de rede
        const tempData = {
          ...data,
          id: generateTempId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _offline: true,
          synced: false,
        };

        await cacheData(this.tableName, tempData);
        await addToSyncQueue(this.entityName, 'create', tempData.id, tempData);

        return tempData;
      }
      throw error;
    }
  }

  /**
   * Atualiza um registro
   */
  async update(id, data) {
    try {
      if (isOnline() && !isTempId(id)) {
        const updated = await base44.entities[this.entityName].update(id, data);
        await cacheData(this.tableName, { ...updated, id });
        return updated;
      } else if (this.canWriteOffline) {
        console.log(`[Offline] Atualizando ${this.entityName} localmente`);
        const existing = await getCachedData(this.tableName, id);
        const updatedData = {
          ...existing,
          ...data,
          id,
          updated_at: new Date().toISOString(),
          _offline: true,
          synced: false,
        };

        await cacheData(this.tableName, updatedData);

        if (!isTempId(id)) {
          // So adiciona na fila se nao for um registro temporario
          await addToSyncQueue(this.entityName, 'update', id, data);
        }

        return updatedData;
      } else {
        throw new Error(`Sem conexao. ${this.entityName} nao pode ser atualizado offline.`);
      }
    } catch (error) {
      if (!isOnline() && this.canWriteOffline) {
        const existing = await getCachedData(this.tableName, id);
        const updatedData = {
          ...existing,
          ...data,
          id,
          updated_at: new Date().toISOString(),
          _offline: true,
          synced: false,
        };

        await cacheData(this.tableName, updatedData);
        if (!isTempId(id)) {
          await addToSyncQueue(this.entityName, 'update', id, data);
        }

        return updatedData;
      }
      throw error;
    }
  }

  /**
   * Remove um registro
   */
  async delete(id) {
    try {
      if (isOnline() && !isTempId(id)) {
        await base44.entities[this.entityName].delete(id);
        await removeCachedData(this.tableName, id);
        return true;
      } else if (this.canWriteOffline) {
        console.log(`[Offline] Removendo ${this.entityName} localmente`);
        await removeCachedData(this.tableName, id);

        if (!isTempId(id)) {
          await addToSyncQueue(this.entityName, 'delete', id, null);
        }

        return true;
      } else {
        throw new Error(`Sem conexao. ${this.entityName} nao pode ser removido offline.`);
      }
    } catch (error) {
      if (!isOnline() && this.canWriteOffline) {
        await removeCachedData(this.tableName, id);
        if (!isTempId(id)) {
          await addToSyncQueue(this.entityName, 'delete', id, null);
        }
        return true;
      }
      throw error;
    }
  }
}

// ============================================================================
// INSTANCIAS DAS ENTIDADES OFFLINE
// ============================================================================

export const offlineEntities = {
  Product: new OfflineEntity('Product'),
  ProductGroup: new OfflineEntity('ProductGroup'),
  Customer: new OfflineEntity('Customer'),
  Supplier: new OfflineEntity('Supplier'),
  Seller: new OfflineEntity('Seller'),
  PaymentMethod: new OfflineEntity('PaymentMethod'),
  Sale: new OfflineEntity('Sale'),
  SaleItem: new OfflineEntity('SaleItem'),
  CashRegister: new OfflineEntity('CashRegister'),
  CashMovement: new OfflineEntity('CashMovement'),
  Promotion: new OfflineEntity('Promotion'),
  LoyaltyProgram: new OfflineEntity('LoyaltyProgram'),
  CustomerPoints: new OfflineEntity('CustomerPoints'),
};

// ============================================================================
// FUNCOES UTILITARIAS
// ============================================================================

/**
 * Pre-carrega dados essenciais para uso offline
 * Otimizado para carregar apenas dados necessarios para operacao do PDV
 */
export async function preloadOfflineData() {
  if (!isOnline()) {
    console.log('[Offline] Sem conexao para pre-carregar dados');
    return false;
  }

  console.log('[Sync] Pre-carregando dados essenciais para offline...');

  try {
    // Carregar apenas entidades essenciais para o PDV em paralelo
    // Limitado para performance
    const promises = [];

    // Dados essenciais (sempre carregar)
    promises.push(
      offlineEntities.ProductGroup.list().catch(e => {
        console.warn('[Sync] Erro ao carregar ProductGroup:', e.message);
        return [];
      }),
      offlineEntities.Seller.list().catch(e => {
        console.warn('[Sync] Erro ao carregar Seller:', e.message);
        return [];
      }),
      offlineEntities.PaymentMethod.list().catch(e => {
        console.warn('[Sync] Erro ao carregar PaymentMethod:', e.message);
        return [];
      }),
      offlineEntities.Promotion.list().catch(e => {
        console.warn('[Sync] Erro ao carregar Promotion:', e.message);
        return [];
      }),
      offlineEntities.LoyaltyProgram.list().catch(e => {
        console.warn('[Sync] Erro ao carregar LoyaltyProgram:', e.message);
        return [];
      })
    );

    // Aguardar dados essenciais
    await Promise.all(promises);

    // Carregar produtos e clientes em segundo plano (nao bloqueia)
    setTimeout(async () => {
      try {
        console.log('[Sync] Carregando produtos em background...');
        await offlineEntities.Product.list();
        console.log('[Sync] Produtos carregados');
      } catch (e) {
        console.warn('[Sync] Erro ao carregar produtos:', e.message);
      }
    }, 1000);

    setTimeout(async () => {
      try {
        console.log('[Sync] Carregando clientes em background...');
        await offlineEntities.Customer.list();
        console.log('[Sync] Clientes carregados');
      } catch (e) {
        console.warn('[Sync] Erro ao carregar clientes:', e.message);
      }
    }, 2000);

    console.log('[Sync] Dados essenciais pre-carregados com sucesso');
    return true;
  } catch (error) {
    console.error('[Sync] Erro ao pre-carregar dados:', error);
    return false;
  }
}

/**
 * Obtem status da conexao e sincronizacao
 */
export async function getOfflineStatus() {
  const pendingCount = await countPendingOperations();

  return {
    isOnline: isOnline(),
    pendingOperations: pendingCount,
    lastSync: localStorage.getItem('lastFullSync') || null,
  };
}

/**
 * Atualiza timestamp de ultima sincronizacao completa
 */
export function setLastFullSync() {
  localStorage.setItem('lastFullSync', new Date().toISOString());
}

export default offlineEntities;
