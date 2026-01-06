import { createClient } from '@supabase/supabase-js';

// Configuracao do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: verificar se as variaveis estao carregando (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('[Supabase] URL:', supabaseUrl ? 'OK' : 'MISSING');
  console.log('[Supabase] Key:', supabaseAnonKey ? 'OK' : 'MISSING');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] ERRO: Variaveis de ambiente nao configuradas!');
  console.error('[Supabase] Verifique o arquivo .env na raiz do projeto');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Mais seguro e rapido
  },
  // Configuracoes de performance
  global: {
    headers: {
      'x-client-info': 'sellx-app'
    }
  },
  // Configuracao de realtime (desabilitado para melhor performance se nao usar)
  realtime: {
    params: {
      eventsPerSecond: 2 // Limitar eventos para nao sobrecarregar
    }
  }
});

// Helper para verificar se o Supabase esta configurado
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://seu-projeto.supabase.co' &&
         supabaseAnonKey !== 'sua-anon-key';
};

// Export para uso em outros lugares
export default supabase;
