import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function safeFormatDate(dateStr, formatStr = 'dd/MM/yyyy', fallback = '-') {
  if (!dateStr) return fallback;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr, { locale: ptBR });
  } catch {
    return fallback;
  }
}

export function formatCurrency(value, options = {}) {
  const { locale = 'pt-BR', currency = 'BRL' } = options;
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(Number(value));
}

/**
 * Limpa dados de formulario antes de enviar ao banco
 * Converte strings vazias em null para evitar erros no Supabase
 * @param {Object} data - Dados do formulario
 * @param {Object} options - Opcoes de limpeza
 * @returns {Object} - Dados limpos
 */
export function cleanFormData(data, options = {}) {
  const {
    nullableFields = [],
    numericFields = [],
    dateFields = [],
    booleanFields = []
  } = options;

  const cleanData = { ...data };

  // Converter strings vazias em null para campos especificados
  nullableFields.forEach(field => {
    if (cleanData[field] === '' || cleanData[field] === undefined) {
      cleanData[field] = null;
    }
  });

  // Campos de data - converter string vazia em null
  dateFields.forEach(field => {
    if (cleanData[field] === '' || cleanData[field] === undefined) {
      cleanData[field] = null;
    }
  });

  // Garantir que numeros sao numeros
  numericFields.forEach(field => {
    if (cleanData[field] === '' || cleanData[field] === undefined || cleanData[field] === null) {
      cleanData[field] = 0;
    } else {
      cleanData[field] = parseFloat(cleanData[field]) || 0;
    }
  });

  // Garantir que booleanos sao booleanos
  booleanFields.forEach(field => {
    cleanData[field] = Boolean(cleanData[field]);
  });

  // Limpar campos vazios genericos (strings vazias para campos de texto)
  Object.keys(cleanData).forEach(key => {
    // Se e uma string vazia e nao foi tratado, converter para null
    if (cleanData[key] === '' && !numericFields.includes(key)) {
      cleanData[key] = null;
    }
  });

  return cleanData;
} 