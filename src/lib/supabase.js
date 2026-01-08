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

// Funcao para limpar tokens invalidos
const clearInvalidTokens = () => {
  if (import.meta.env.DEV) {
    console.log('[Supabase] Limpando tokens invalidos...');
  }
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// Verificar se ha tokens invalidos antes de criar o cliente
// Isso previne erros de refresh token na inicializacao
try {
  const authStorageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`;
  const storedSession = localStorage.getItem(authStorageKey);
  if (storedSession) {
    const parsed = JSON.parse(storedSession);
    // Se o token expirou ha mais de 7 dias, limpar
    if (parsed.expires_at && (parsed.expires_at * 1000) < (Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      if (import.meta.env.DEV) {
        console.log('[Supabase] Token expirado ha muito tempo, limpando...');
      }
      clearInvalidTokens();
    }
  }
} catch (e) {
  // Ignorar erros de parse - o Supabase vai lidar com isso
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

// Interceptar erros de auth para limpar tokens invalidos automaticamente
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh falhou, limpar tokens invalidos
    clearInvalidTokens();
  }
});

// Exportar funcao de limpeza para uso em outros lugares
export { clearInvalidTokens };

// Helper para verificar se o Supabase esta configurado
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://seu-projeto.supabase.co' &&
         supabaseAnonKey !== 'sua-anon-key';
};

// Export para uso em outros lugares
export default supabase;
