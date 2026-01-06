/**
 * Utilitarios para localStorage com protecao contra erros e limites
 */

// Limite maximo para cada item no localStorage (em caracteres)
const MAX_ITEM_SIZE = 500000; // ~500KB por item

/**
 * Salva dados no localStorage com protecao contra erros
 * @param {string} key - Chave do item
 * @param {any} value - Valor a ser salvo (sera stringificado)
 * @param {Object} options - Opcoes
 * @param {number} options.maxSize - Tamanho maximo em caracteres
 * @param {boolean} options.clearOnError - Limpar item se falhar
 * @returns {boolean} - true se salvou com sucesso
 */
export function safeSetItem(key, value, options = {}) {
  const { maxSize = MAX_ITEM_SIZE, clearOnError = true } = options;

  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Verificar tamanho
    if (stringValue.length > maxSize) {
      console.warn(`[Storage] Item "${key}" excede tamanho maximo (${stringValue.length} > ${maxSize})`);
      return false;
    }

    localStorage.setItem(key, stringValue);
    return true;
  } catch (e) {
    console.error(`[Storage] Erro ao salvar "${key}":`, e.message);

    // Se for erro de quota, tentar limpar espaco
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('[Storage] localStorage cheio, tentando limpar espaco...');
      cleanupStorage();

      // Tentar novamente
      try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return true;
      } catch (e2) {
        if (clearOnError) {
          try {
            localStorage.removeItem(key);
          } catch (e3) {
            // Ignorar
          }
        }
      }
    }

    return false;
  }
}

/**
 * Le dados do localStorage com protecao contra erros
 * @param {string} key - Chave do item
 * @param {any} defaultValue - Valor padrao se nao encontrar ou erro
 * @param {boolean} parse - Se deve fazer JSON.parse
 * @returns {any} - Valor lido ou defaultValue
 */
export function safeGetItem(key, defaultValue = null, parse = true) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;

    if (parse) {
      return JSON.parse(value);
    }
    return value;
  } catch (e) {
    console.error(`[Storage] Erro ao ler "${key}":`, e.message);
    return defaultValue;
  }
}

/**
 * Remove item do localStorage com protecao
 * @param {string} key - Chave do item
 */
export function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[Storage] Erro ao remover "${key}":`, e.message);
  }
}

/**
 * Limpa items antigos ou grandes do localStorage para liberar espaco
 */
export function cleanupStorage() {
  console.log('[Storage] Iniciando limpeza...');

  const itemsToClean = [
    'auditLogs',        // Logs de auditoria (podem ser grandes)
    'tempIdMappings',   // Mapeamentos temporarios
    'dashboard_cache',  // Cache do dashboard
  ];

  let freedSpace = 0;

  itemsToClean.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item && item.length > 10000) { // Se maior que 10KB
        freedSpace += item.length;
        localStorage.removeItem(key);
        console.log(`[Storage] Removido "${key}" (${item.length} chars)`);
      }
    } catch (e) {
      // Ignorar erros
    }
  });

  console.log(`[Storage] Limpeza concluida, liberados ~${Math.round(freedSpace / 1024)}KB`);
  return freedSpace;
}

/**
 * Retorna o uso atual do localStorage
 * @returns {Object} - { used, total, percentage }
 */
export function getStorageUsage() {
  try {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage.getItem(key).length * 2; // UTF-16
      }
    }

    // localStorage geralmente tem limite de 5MB
    const total = 5 * 1024 * 1024;
    const percentage = Math.round((used / total) * 100);

    return {
      used,
      usedFormatted: `${Math.round(used / 1024)}KB`,
      total,
      totalFormatted: '5MB',
      percentage,
    };
  } catch (e) {
    return { used: 0, usedFormatted: '0KB', total: 0, totalFormatted: '5MB', percentage: 0 };
  }
}

/**
 * Verifica se o localStorage esta proximo do limite
 * @returns {boolean}
 */
export function isStorageNearLimit() {
  const { percentage } = getStorageUsage();
  return percentage > 80;
}

export default {
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
  cleanupStorage,
  getStorageUsage,
  isStorageNearLimit,
};
