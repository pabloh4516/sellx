/**
 * Helper para carregar configuracoes do sistema
 * Busca do banco de dados e usa localStorage como cache/fallback
 */

import { base44 } from '@/api/base44Client';

// Valores padrao das configuracoes
const defaultSettings = {
  autoBackup: false,
  blockSaleNoStock: true,
  requireCustomer: false,
  printAutomatically: false,
  pdvWaitingMode: true,
  pdvSoundEnabled: true,
  scannerPrefix: '',
  scannerSuffix: '',
  scannerMinLength: 3,
  scannerTimeout: 100,
  scannerEnterAsSubmit: true,
  cashRegisterMode: 'shared', // 'shared' ou 'per_operator'
  permissions: {
    discountLimits: {
      owner: 100,
      admin: 50,
      manager: 30,
      seller: 10,
      cashier: 5,
    },
    canEditSale: {
      owner: true, admin: true, manager: true, seller: false, cashier: false,
    },
    canCancelSale: {
      owner: true, admin: true, manager: true, seller: false, cashier: false,
    },
    canApplyDiscount: {
      owner: true, admin: true, manager: true, seller: true, cashier: false,
    },
    canOpenPrice: {
      owner: true, admin: true, manager: true, seller: true, cashier: true,
    },
    canViewCost: {
      owner: true, admin: true, manager: true, seller: false, cashier: false,
    },
    canViewProfit: {
      owner: true, admin: true, manager: true, seller: false, cashier: false,
    },
  }
};

// Cache em memoria para evitar multiplas requisicoes
let cachedSettings = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 segundos

/**
 * Carrega configuracoes do banco de dados
 * @param {boolean} forceRefresh - Forca recarregar do banco mesmo com cache valido
 * @returns {Promise<Object>} Configuracoes do sistema
 */
export async function loadSystemSettings(forceRefresh = false) {
  const now = Date.now();

  // Retorna cache se ainda valido
  if (!forceRefresh && cachedSettings && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settingsList = await base44.entities.Setting.list();
    // Busca o registro de configuracoes do sistema pela key
    const systemSettingsRecord = settingsList.find(s => s.key === 'system_settings');

    if (systemSettingsRecord) {
      // Parse o valor JSON
      let savedSettings = {};
      try {
        savedSettings = typeof systemSettingsRecord.value === 'string'
          ? JSON.parse(systemSettingsRecord.value)
          : systemSettingsRecord.value || {};
      } catch {
        savedSettings = {};
      }

      const mergedSettings = {
        ...defaultSettings,
        ...savedSettings,
        permissions: {
          ...defaultSettings.permissions,
          ...(savedSettings.permissions || {})
        }
      };

      // Atualiza cache
      cachedSettings = mergedSettings;
      cacheTimestamp = now;

      // Atualiza localStorage como backup
      localStorage.setItem('systemSettings', JSON.stringify(mergedSettings));

      return mergedSettings;
    }
  } catch (error) {
    console.warn('[SettingsHelper] Erro ao carregar do banco, usando fallback:', error);
  }

  // Fallback para localStorage
  const saved = localStorage.getItem('systemSettings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      cachedSettings = { ...defaultSettings, ...parsed };
      cacheTimestamp = now;
      return cachedSettings;
    } catch {
      // continua para retornar valores padrao
    }
  }

  return defaultSettings;
}

/**
 * Obtem o modo do caixa (sincrono, usa cache/localStorage)
 * Para uso em contextos onde nao pode ser async
 * @returns {string} 'shared' ou 'per_operator'
 */
export function getCashRegisterMode() {
  // Primeiro tenta o cache em memoria
  if (cachedSettings) {
    return cachedSettings.cashRegisterMode || 'shared';
  }

  // Fallback para localStorage
  try {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.cashRegisterMode || 'shared';
    }
  } catch (e) {
    console.error('[SettingsHelper] Erro ao ler modo do caixa:', e);
  }

  return 'shared';
}

/**
 * Invalida o cache para forcar recarregamento
 */
export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

/**
 * Retorna os valores padrao das configuracoes
 */
export function getDefaultSettings() {
  return { ...defaultSettings };
}

export default {
  loadSystemSettings,
  getCashRegisterMode,
  invalidateSettingsCache,
  getDefaultSettings,
};
