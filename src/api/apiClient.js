// ============================================================================
// API CLIENT - Usa Supabase como backend
// ============================================================================

import { isSupabaseConfigured } from '@/lib/supabase';
import { supabaseApi } from './supabaseClient';
import { mockClient } from './mockClient';

// Verificar se Supabase esta configurado
const useSupabase = isSupabaseConfigured();

// Exportar o cliente apropriado
export const api = useSupabase ? supabaseApi : mockClient;

// Exportar flag para verificar qual cliente esta sendo usado
export const isUsingSupabase = useSupabase;

// Log para debug
if (typeof window !== 'undefined') {
  console.log(`[Sellx] Using ${useSupabase ? 'Supabase' : 'Mock'} client`);
}

// Manter export de base44 para compatibilidade durante migracao
export const base44 = api;

export default api;
