import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para carregar dados com proteção contra tela branca infinita
 *
 * @param {Function} loadFunction - Função async que carrega os dados
 * @param {Array} dependencies - Array de dependências para recarregar
 * @param {Object} options - Opções adicionais
 * @param {number} options.timeout - Timeout máximo em ms (padrão: 20000)
 * @param {boolean} options.loadOnMount - Carregar automaticamente ao montar (padrão: true)
 * @param {any} options.initialData - Dados iniciais enquanto carrega
 *
 * @returns {Object} { data, loading, error, reload, isTimeout }
 */
export function useDataLoader(loadFunction, dependencies = [], options = {}) {
  const {
    timeout = 20000, // 20 segundos máximo
    loadOnMount = true,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(loadOnMount);
  const [error, setError] = useState(null);
  const [isTimeout, setIsTimeout] = useState(false);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  const load = useCallback(async () => {
    // Prevenir chamadas duplicadas
    if (loadingRef.current) {
      console.log('[useDataLoader] Já carregando, ignorando chamada duplicada');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setIsTimeout(false);

    // Timeout de segurança - nunca deixa loading infinito
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loadingRef.current) {
        console.warn('[useDataLoader] Timeout atingido, finalizando loading');
        setLoading(false);
        setIsTimeout(true);
        loadingRef.current = false;
      }
    }, timeout);

    try {
      const result = await loadFunction();

      // Limpar timeout se completou antes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      console.error('[useDataLoader] Erro ao carregar dados:', err);
      if (mountedRef.current) {
        setError(err.message || 'Erro ao carregar dados');
      }
    } finally {
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [loadFunction, timeout]);

  // Carregar ao montar e quando dependências mudarem
  useEffect(() => {
    mountedRef.current = true;

    if (loadOnMount) {
      load();
    }

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [...dependencies, loadOnMount]);

  return {
    data,
    loading,
    error,
    isTimeout,
    reload: load,
  };
}

/**
 * Hook para carregar múltiplas fontes de dados em paralelo
 *
 * @param {Object} loaders - Objeto com funções de carregamento { key: loadFunction }
 * @param {Array} dependencies - Array de dependências
 * @param {Object} options - Opções (timeout, loadOnMount)
 *
 * @returns {Object} { data: { key: value }, loading, error, reload }
 */
export function useMultiDataLoader(loaders, dependencies = [], options = {}) {
  const {
    timeout = 20000,
    loadOnMount = true,
  } = options;

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(loadOnMount);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  const load = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    // Timeout de segurança
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loadingRef.current) {
        console.warn('[useMultiDataLoader] Timeout atingido');
        setLoading(false);
        loadingRef.current = false;
      }
    }, timeout);

    try {
      const keys = Object.keys(loaders);
      const promises = keys.map(key => {
        // Wrap cada loader para capturar erros individualmente
        return loaders[key]()
          .then(result => ({ key, result, error: null }))
          .catch(err => ({ key, result: null, error: err.message }));
      });

      const results = await Promise.all(promises);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        const newData = {};
        results.forEach(({ key, result }) => {
          newData[key] = result;
        });
        setData(newData);
      }
    } catch (err) {
      console.error('[useMultiDataLoader] Erro:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [loaders, timeout]);

  useEffect(() => {
    mountedRef.current = true;

    if (loadOnMount) {
      load();
    }

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [...dependencies, loadOnMount]);

  return {
    data,
    loading,
    error,
    reload: load,
  };
}

export default useDataLoader;
