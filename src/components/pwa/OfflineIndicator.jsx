/**
 * Indicador de status online/offline
 * Mostra quando o sistema esta funcionando offline
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isOnline, onConnectionChange, countPendingOperations } from '@/lib/offlineDb';
import { syncPendingOperations, addSyncListener, isSyncInProgress } from '@/lib/syncService';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function OfflineIndicator({ className, showSyncButton = true }) {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error', null

  // Monitorar conexao
  useEffect(() => {
    const cleanup = onConnectionChange((status) => {
      setOnline(status);
    });

    return cleanup;
  }, []);

  // Contar operacoes pendentes
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await countPendingOperations();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listener de sincronizacao
  useEffect(() => {
    const cleanup = addSyncListener((event) => {
      if (event.event === 'start') {
        setSyncing(true);
        setSyncStatus(null);
      } else if (event.event === 'complete') {
        setSyncing(false);
        setSyncStatus(event.errors > 0 ? 'error' : 'success');
        // Atualizar contagem
        countPendingOperations().then(setPendingCount);
        // Limpar status apos 3 segundos
        setTimeout(() => setSyncStatus(null), 3000);
      } else if (event.event === 'error') {
        setSyncing(false);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus(null), 3000);
      }
    });

    return cleanup;
  }, []);

  const handleSync = () => {
    if (!syncing && online) {
      syncPendingOperations();
    }
  };

  // Se online e sem pendencias, nao mostrar nada
  if (online && pendingCount === 0 && !syncStatus) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Status de conexao */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                online
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive animate-pulse'
              )}
            >
              {online ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {online ? 'Conectado a internet' : 'Sem conexao - modo offline ativo'}
          </TooltipContent>
        </Tooltip>

        {/* Contador de pendencias */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                <CloudOff className="w-3.5 h-3.5" />
                <span>{pendingCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {pendingCount} operacao(oes) pendente(s) de sincronizacao
            </TooltipContent>
          </Tooltip>
        )}

        {/* Botao de sync */}
        {showSyncButton && pendingCount > 0 && online && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Status da ultima sincronizacao */}
        {syncStatus && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              syncStatus === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {syncStatus === 'success' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sincronizado</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Erro</span>
              </>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Componente simplificado para uso em barras menores
export function OfflineStatusDot({ className }) {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const cleanup = onConnectionChange(setOnline);
    return cleanup;
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-colors',
              online ? 'bg-success' : 'bg-destructive animate-pulse',
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          {online ? 'Online' : 'Offline'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
