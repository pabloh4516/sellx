/**
 * Helper para lidar com datas e fuso horario
 * Resolve problemas de UTC vs horario local
 */

import { startOfDay, endOfDay, format, parseISO } from 'date-fns';

/**
 * Converte uma data ISO (UTC) para o inicio do dia no horario LOCAL
 * Util para filtros de data que precisam ignorar o horario
 * @param {string|Date} dateInput - Data em formato ISO ou objeto Date
 * @returns {Date} Data no inicio do dia local
 */
export function toLocalStartOfDay(dateInput) {
  if (!dateInput) return null;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return startOfDay(date);
}

/**
 * Converte uma data ISO (UTC) para o fim do dia no horario LOCAL
 * @param {string|Date} dateInput - Data em formato ISO ou objeto Date
 * @returns {Date} Data no fim do dia local
 */
export function toLocalEndOfDay(dateInput) {
  if (!dateInput) return null;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return endOfDay(date);
}

/**
 * Extrai apenas a data (YYYY-MM-DD) de uma data ISO, no horario LOCAL
 * @param {string|Date} dateInput - Data em formato ISO ou objeto Date
 * @returns {string} Data no formato YYYY-MM-DD
 */
export function toLocalDateString(dateInput) {
  if (!dateInput) return null;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Verifica se uma data esta dentro de um intervalo (comparando apenas as datas, ignorando horario)
 * @param {string|Date} dateInput - Data a verificar
 * @param {string} startDateStr - Data inicial (YYYY-MM-DD)
 * @param {string} endDateStr - Data final (YYYY-MM-DD)
 * @returns {boolean} True se a data esta no intervalo
 */
export function isDateInRange(dateInput, startDateStr, endDateStr) {
  if (!dateInput) return false;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  // Criar datas de inicio e fim no horario local
  const start = startOfDay(new Date(startDateStr + 'T00:00:00'));
  const end = endOfDay(new Date(endDateStr + 'T23:59:59'));

  return date >= start && date <= end;
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (horario local)
 * @returns {string} Data de hoje
 */
export function getTodayString() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Retorna o inicio do dia de hoje no horario local
 * @returns {Date} Inicio do dia de hoje
 */
export function getTodayStart() {
  return startOfDay(new Date());
}

/**
 * Retorna o fim do dia de hoje no horario local
 * @returns {Date} Fim do dia de hoje
 */
export function getTodayEnd() {
  return endOfDay(new Date());
}

/**
 * Cria uma data ISO string no horario local (para salvar no banco)
 * Isso garante que a data salva represente o dia correto no Brasil
 * @returns {string} Data ISO no horario local
 */
export function getNowLocalISO() {
  return new Date().toISOString();
}

/**
 * Verifica se uma data ISO e do dia de hoje (no horario local)
 * @param {string|Date} dateInput - Data a verificar
 * @returns {boolean} True se for hoje
 */
export function isToday(dateInput) {
  if (!dateInput) return false;

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dateStr = format(date, 'yyyy-MM-dd');

  return dateStr === todayStr;
}

export default {
  toLocalStartOfDay,
  toLocalEndOfDay,
  toLocalDateString,
  isDateInRange,
  getTodayString,
  getTodayStart,
  getTodayEnd,
  getNowLocalISO,
  isToday,
};
