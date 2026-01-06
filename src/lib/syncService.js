/**
 * Servico de sincronizacao
 * Sincroniza dados offline com o servidor quando a conexao e restaurada
 */

import {
  getPendingSyncOperations,
  markAsSynced,
  markSyncError,
  cleanSyncQueue,
  isOnline,
  cacheData,
  removeCachedData,
} from './offlineDb';
import { base44 } from '@/api/base44Client';
import { isTempId, setLastFullSync, preloadOfflineData } from './offlineService';

// Estado da sincronizacao
let isSyncing = false;
let syncListeners = [];

// ============================================================================
// LISTENERS
// ============================================================================

/**
 * Adiciona listener para eventos de sincronizacao
 */
export function addSyncListener(callback) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
}

/**
 * Notifica listeners sobre evento de sincronizacao
 */
function notifySyncEvent(event, data = {}) {
  syncListeners.forEach(listener => {
    try {
      listener({ event, ...data });
    } catch (e) {
      console.error('Erro em listener de sync:', e);
    }
  });
}

// ============================================================================
// SINCRONIZACAO
// ============================================================================

/**
 * Sincroniza operacoes pendentes com o servidor
 */
export async function syncPendingOperations() {
  if (!isOnline()) {
    console.log('[Sync] Sem conexao, sincronizacao adiada');
    return { success: false, reason: 'offline' };
  }

  if (isSyncing) {
    console.log('[Sync] Sincronizacao ja em andamento');
    return { success: false, reason: 'already_syncing' };
  }

  isSyncing = true;
  notifySyncEvent('start');

  try {
    const pendingOps = await getPendingSyncOperations();

    if (pendingOps.length === 0) {
      console.log('[Sync] Nenhuma operacao pendente');
      isSyncing = false;
      notifySyncEvent('complete', { synced: 0, errors: 0 });
      return { success: true, synced: 0, errors: 0 };
    }

    console.log(`[Sync] Sincronizando ${pendingOps.length} operacoes...`);
    notifySyncEvent('progress', { total: pendingOps.length, current: 0 });

    let synced = 0;
    let errors = 0;

    // Ordenar operacoes: creates primeiro, depois updates, depois deletes
    const sortedOps = pendingOps.sort((a, b) => {
      const order = { create: 0, update: 1, delete: 2 };
      return order[a.operation] - order[b.operation];
    });

    for (let i = 0; i < sortedOps.length; i++) {
      const op = sortedOps[i];
      notifySyncEvent('progress', { total: sortedOps.length, current: i + 1, operation: op });

      try {
        await processSyncOperation(op);
        await markAsSynced(op.id);
        synced++;
      } catch (error) {
        console.error(`[Sync] Erro na operacao ${op.id}:`, error);
        await markSyncError(op.id, error);
        errors++;
      }
    }

    // Limpar operacoes sincronizadas antigas
    await cleanSyncQueue();

    // Recarregar dados do servidor
    await preloadOfflineData();
    setLastFullSync();

    console.log(`[Sync] Concluido: ${synced} sincronizados, ${errors} erros`);
    notifySyncEvent('complete', { synced, errors });

    isSyncing = false;
    return { success: true, synced, errors };

  } catch (error) {
    console.error('[Sync] Erro geral na sincronizacao:', error);
    notifySyncEvent('error', { error: error.message });
    isSyncing = false;
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Processa uma operacao de sincronizacao individual
 */
async function processSyncOperation(op) {
  const { entity, operation, entityId, data } = op;

  console.log(`[Sync] Processando: ${operation} ${entity} ${entityId}`);

  switch (operation) {
    case 'create':
      return await processCreate(entity, entityId, data);

    case 'update':
      return await processUpdate(entity, entityId, data);

    case 'delete':
      return await processDelete(entity, entityId);

    default:
      throw new Error(`Operacao desconhecida: ${operation}`);
  }
}

/**
 * Processa criacao
 */
async function processCreate(entity, tempId, data) {
  // Remover campos de controle offline
  const cleanData = { ...data };
  delete cleanData.id;
  delete cleanData._offline;
  delete cleanData.synced;
  delete cleanData.created_at;
  delete cleanData.updated_at;

  // Substituir referencias a IDs temporarios
  for (const key of Object.keys(cleanData)) {
    if (typeof cleanData[key] === 'string' && isTempId(cleanData[key])) {
      // Tentar encontrar o ID real
      const realId = await findRealId(cleanData[key]);
      if (realId) {
        cleanData[key] = realId;
      }
    }
  }

  // Criar no servidor
  const created = await base44.entities[entity].create(cleanData);

  // Atualizar cache com ID real
  const tableName = entity.toLowerCase() + 's';
  await removeCachedData(tableName, tempId);
  await cacheData(tableName, created);

  // Armazenar mapeamento de ID temporario para real
  storeTempIdMapping(tempId, created.id);

  return created;
}

/**
 * Processa atualizacao
 */
async function processUpdate(entity, entityId, data) {
  // Verificar se o ID foi mapeado (era temporario e foi sincronizado)
  const realId = await findRealId(entityId) || entityId;

  // Remover campos de controle
  const cleanData = { ...data };
  delete cleanData.id;
  delete cleanData._offline;
  delete cleanData.synced;

  // Substituir referencias a IDs temporarios
  for (const key of Object.keys(cleanData)) {
    if (typeof cleanData[key] === 'string' && isTempId(cleanData[key])) {
      const realRefId = await findRealId(cleanData[key]);
      if (realRefId) {
        cleanData[key] = realRefId;
      }
    }
  }

  const updated = await base44.entities[entity].update(realId, cleanData);

  // Atualizar cache
  const tableName = entity.toLowerCase() + 's';
  await cacheData(tableName, { ...updated, id: realId });

  return updated;
}

/**
 * Processa exclusao
 */
async function processDelete(entity, entityId) {
  // Verificar se o ID foi mapeado
  const realId = await findRealId(entityId) || entityId;

  await base44.entities[entity].delete(realId);

  // Remover do cache
  const tableName = entity.toLowerCase() + 's';
  await removeCachedData(tableName, realId);

  return true;
}

// ============================================================================
// MAPEAMENTO DE IDs TEMPORARIOS
// ============================================================================

const tempIdMap = new Map();
const MAX_TEMP_ID_MAPPINGS = 200; // Limite de mapeamentos para evitar localStorage cheio

function storeTempIdMapping(tempId, realId) {
  tempIdMap.set(tempId, realId);
  // Persistir no localStorage para sobreviver a recargas
  try {
    const mappings = JSON.parse(localStorage.getItem('tempIdMappings') || '{}');
    mappings[tempId] = { id: realId, timestamp: Date.now() };

    // Limitar quantidade de mapeamentos (manter apenas os mais recentes)
    const entries = Object.entries(mappings);
    if (entries.length > MAX_TEMP_ID_MAPPINGS) {
      // Ordenar por timestamp e manter apenas os mais recentes
      const sorted = entries
        .filter(([, v]) => v && typeof v === 'object' && v.timestamp)
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        .slice(0, MAX_TEMP_ID_MAPPINGS);
      const trimmed = Object.fromEntries(sorted);
      localStorage.setItem('tempIdMappings', JSON.stringify(trimmed));
    } else {
      localStorage.setItem('tempIdMappings', JSON.stringify(mappings));
    }
  } catch (e) {
    console.error('Erro ao salvar mapeamento de ID:', e);
    // Se falhar, limpar e tentar novamente
    try {
      localStorage.setItem('tempIdMappings', JSON.stringify({ [tempId]: { id: realId, timestamp: Date.now() } }));
    } catch (e2) {
      // Ignorar
    }
  }
}

async function findRealId(tempId) {
  // Verificar memoria primeiro (mais rapido)
  if (tempIdMap.has(tempId)) {
    return tempIdMap.get(tempId);
  }

  // Verificar localStorage
  try {
    const mappings = JSON.parse(localStorage.getItem('tempIdMappings') || '{}');
    const mapping = mappings[tempId];
    if (mapping) {
      // Suportar formato antigo (string) e novo (objeto com timestamp)
      const realId = typeof mapping === 'string' ? mapping : mapping.id;
      tempIdMap.set(tempId, realId); // Cache em memoria
      return realId;
    }
  } catch (e) {
    console.error('Erro ao buscar mapeamento de ID:', e);
  }

  return null;
}

// Limpar mapeamentos antigos (mais de 7 dias)
function cleanOldTempIdMappings() {
  try {
    const mappings = JSON.parse(localStorage.getItem('tempIdMappings') || '{}');
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    const cleaned = {};
    let hasChanges = false;

    Object.entries(mappings).forEach(([key, value]) => {
      if (typeof value === 'object' && value.timestamp && value.timestamp > sevenDaysAgo) {
        cleaned[key] = value;
      } else if (typeof value === 'string') {
        // Formato antigo - converter para novo formato
        cleaned[key] = { id: value, timestamp: now };
        hasChanges = true;
      } else {
        hasChanges = true; // Vai ser removido
      }
    });

    if (hasChanges || Object.keys(cleaned).length < Object.keys(mappings).length) {
      localStorage.setItem('tempIdMappings', JSON.stringify(cleaned));
      console.log('[Sync] Limpeza de tempIdMappings: removidos', Object.keys(mappings).length - Object.keys(cleaned).length, 'mapeamentos antigos');
    }
  } catch (e) {
    console.error('Erro ao limpar mapeamentos antigos:', e);
  }
}

// Executar limpeza ao carregar o modulo
setTimeout(cleanOldTempIdMappings, 5000);

// ============================================================================
// AUTO-SYNC
// ============================================================================

let autoSyncInterval = null;

/**
 * Inicia sincronizacao automatica
 */
export function startAutoSync(intervalMs = 30000) {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  // Sync inicial
  setTimeout(() => {
    if (isOnline()) {
      syncPendingOperations();
    }
  }, 5000);

  // Sync periodico
  autoSyncInterval = setInterval(() => {
    if (isOnline()) {
      syncPendingOperations();
    }
  }, intervalMs);

  // Sync quando voltar online
  window.addEventListener('online', handleOnline);

  console.log(`[Sync] Auto-sync iniciado (intervalo: ${intervalMs}ms)`);
}

/**
 * Para sincronizacao automatica
 */
export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
  window.removeEventListener('online', handleOnline);
  console.log('[Sync] Auto-sync parado');
}

/**
 * Handler para quando volta online
 */
function handleOnline() {
  console.log('[Sync] Conexao restaurada, iniciando sincronizacao...');
  // Pequeno delay para garantir que a conexao esta estavel
  setTimeout(() => {
    syncPendingOperations();
  }, 2000);
}

// ============================================================================
// STATUS
// ============================================================================

/**
 * Verifica se esta sincronizando
 */
export function isSyncInProgress() {
  return isSyncing;
}

export default {
  syncPendingOperations,
  startAutoSync,
  stopAutoSync,
  addSyncListener,
  isSyncInProgress,
};
