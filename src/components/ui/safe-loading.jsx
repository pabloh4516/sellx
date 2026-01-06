import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

/**
 * Componente de loading seguro com timeout
 * Evita tela branca infinita mostrando opção de recarregar após timeout
 *
 * @param {boolean} loading - Estado de loading
 * @param {Function} onRetry - Função para tentar novamente
 * @param {number} timeout - Tempo em ms antes de mostrar botão de retry (padrão: 15000)
 * @param {React.ReactNode} children - Conteúdo a ser renderizado quando não está loading
 * @param {string} message - Mensagem durante loading
 */
export function SafeLoading({
  loading,
  onRetry,
  timeout = 15000,
  children,
  message = 'Carregando...',
}) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timer;

    if (loading) {
      setShowRetry(false);
      timer = setTimeout(() => {
        setShowRetry(true);
      }, timeout);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, timeout]);

  if (!loading) {
    return children;
  }

  if (showRetry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          O carregamento está demorando mais que o esperado
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Hook para loading com timeout de segurança
 * Automaticamente desativa loading após timeout
 *
 * @param {boolean} initialLoading - Estado inicial
 * @param {number} timeout - Tempo máximo de loading em ms
 * @returns {[boolean, Function, boolean]} [loading, setLoading, isTimeout]
 */
export function useSafeLoading(initialLoading = true, timeout = 20000) {
  const [loading, setLoadingState] = useState(initialLoading);
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    let timer;

    if (loading) {
      setIsTimeout(false);
      timer = setTimeout(() => {
        console.warn('[useSafeLoading] Timeout atingido, forçando fim do loading');
        setLoadingState(false);
        setIsTimeout(true);
      }, timeout);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, timeout]);

  const setLoading = (value) => {
    setLoadingState(value);
    if (value === false) {
      setIsTimeout(false);
    }
  };

  return [loading, setLoading, isTimeout];
}

export default SafeLoading;
