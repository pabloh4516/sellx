/**
 * PWA Context
 * Gerencia estado do PWA, sincronizacao e funcionalidades offline
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isOnline, onConnectionChange, countPendingOperations } from '@/lib/offlineDb';
import { preloadOfflineData, getOfflineStatus } from '@/lib/offlineService';
import { startAutoSync, stopAutoSync, syncPendingOperations, addSyncListener } from '@/lib/syncService';
import { toast } from 'sonner';

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const [online, setOnline] = useState(isOnline());
  const [pendingOperations, setPendingOperations] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Inicializar PWA
  useEffect(() => {
    console.log('[PWA] Inicializando...');

    // Verificar se esta instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      console.log('[PWA] Executando como app instalado');
    }

    // Marcar como pronto imediatamente - dados serao carregados sob demanda
    setIsReady(true);
    console.log('[PWA] Inicializado com sucesso');

    // Carregar status offline em background (nao bloqueia)
    getOfflineStatus()
      .then(status => {
        setPendingOperations(status.pendingOperations);
        setLastSync(status.lastSync);
      })
      .catch(err => console.warn('[PWA] Erro ao obter status offline:', err));

    // Pre-carregar dados essenciais em background (apos 3 segundos)
    const preloadTimeout = setTimeout(() => {
      if (navigator.onLine) {
        preloadOfflineData().catch(err =>
          console.warn('[PWA] Erro ao pre-carregar dados:', err)
        );
      }
    }, 3000);

    // Iniciar auto-sync a cada 2 minutos (120000ms)
    // Intervalo maior para reduzir carga no servidor
    startAutoSync(120000);

    return () => {
      clearTimeout(preloadTimeout);
      stopAutoSync();
    };
  }, []);

  // Monitorar conexao
  useEffect(() => {
    const cleanup = onConnectionChange((status) => {
      setOnline(status);

      if (status) {
        toast.success('Conexao restaurada', {
          description: 'Sincronizando dados...',
          duration: 3000,
        });
      } else {
        toast.warning('Modo offline ativado', {
          description: 'Suas alteracoes serao sincronizadas quando a conexao voltar',
          duration: 5000,
        });
      }
    });

    return cleanup;
  }, []);

  // Atualizar contagem de pendencias periodicamente (a cada 60 segundos, nao 10)
  useEffect(() => {
    const updatePending = async () => {
      try {
        const count = await countPendingOperations();
        setPendingOperations(count);
      } catch (e) {
        console.warn('[PWA] Erro ao contar operacoes pendentes:', e);
      }
    };

    // Delay inicial de 5 segundos para nao competir com o carregamento inicial
    const initialTimeout = setTimeout(updatePending, 5000);
    // Intervalo de 60 segundos (era 10 segundos - muito agressivo)
    const interval = setInterval(updatePending, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Listener de sincronizacao
  useEffect(() => {
    const cleanup = addSyncListener((event) => {
      if (event.event === 'start') {
        setSyncing(true);
      } else if (event.event === 'complete') {
        setSyncing(false);
        setLastSync(new Date().toISOString());
        countPendingOperations().then(setPendingOperations);

        if (event.synced > 0) {
          toast.success(`${event.synced} item(ns) sincronizado(s)`, {
            duration: 3000,
          });
        }

        if (event.errors > 0) {
          toast.error(`${event.errors} erro(s) na sincronizacao`, {
            description: 'Algumas operacoes nao foram sincronizadas',
            duration: 5000,
          });
        }
      } else if (event.event === 'error') {
        setSyncing(false);
        toast.error('Erro na sincronizacao', {
          description: event.error,
          duration: 5000,
        });
      }
    });

    return cleanup;
  }, []);

  // Funcao para forcar sincronizacao
  const forceSync = useCallback(async () => {
    if (!online) {
      toast.error('Sem conexao');
      return false;
    }

    const result = await syncPendingOperations();
    return result.success;
  }, [online]);

  // Funcao para pre-carregar dados
  const refreshOfflineData = useCallback(async () => {
    if (!online) {
      toast.error('Sem conexao');
      return false;
    }

    try {
      await preloadOfflineData();
      toast.success('Dados offline atualizados');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar dados offline');
      return false;
    }
  }, [online]);

  const value = {
    // Estado
    online,
    pendingOperations,
    syncing,
    lastSync,
    isReady,
    isInstalled,

    // Funcoes
    forceSync,
    refreshOfflineData,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
}

// Hook para usar o contexto
export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

export default PWAContext;
