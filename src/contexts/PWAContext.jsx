/**
 * PWA Context - Versao simplificada
 * Gerencia apenas estado basico do PWA (instalacao e conexao)
 * Sem funcionalidades de sync offline
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);

  // Verificar se esta instalado como PWA
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  // Monitorar conexao
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    online,
    isInstalled,
    isReady: true, // Sempre pronto (sem carregamento de dados offline)
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
