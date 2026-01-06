import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessPage,
  USER_ROLES,
  ROLE_LABELS,
  PERMISSIONS
} from '@/config/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Carregar operador do sessionStorage (persiste durante a sessao do navegador)
  const [operator, setOperator] = useState(() => {
    try {
      const savedOperator = sessionStorage.getItem('currentOperator');
      if (savedOperator) {
        return JSON.parse(savedOperator);
      }
    } catch (e) {
      console.warn('[Auth] Erro ao carregar operador salvo:', e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const isLoadingUserRef = useRef(false); // Previne chamadas duplicadas
  const loadedUserIdRef = useRef(null); // ID do usuario ja carregado

  // Salvar operador no sessionStorage quando mudar
  useEffect(() => {
    if (operator) {
      sessionStorage.setItem('currentOperator', JSON.stringify(operator));
    } else {
      sessionStorage.removeItem('currentOperator');
    }
  }, [operator]);

  // Carrega usuario ao iniciar
  useEffect(() => {
    // Verificar sessao existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Sessao:', session ? 'existe' : 'nao existe');
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listener para mudancas de auth
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Event:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOperator(null);
          setCompany(null);
          setSubscription(null);
          setLoading(false);
          loadedUserIdRef.current = null; // Reset para permitir novo login
        }
      }
    );

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  const loadUserData = async (authUser) => {
    // Prevenir chamadas duplicadas usando ref
    if (isLoadingUserRef.current) {
      console.log('[Auth] Ja carregando usuario, ignorando chamada duplicada');
      return;
    }

    // Se ja tem usuario carregado com mesmo ID, ignorar
    if (loadedUserIdRef.current === authUser.id) {
      console.log('[Auth] Usuario ja carregado, ignorando');
      setLoading(false);
      return;
    }

    try {
      isLoadingUserRef.current = true;
      setLoading(true);
      console.log('[Auth] Carregando dados do usuario:', authUser.email);

      // Helper para timeout mais curto para melhor UX
      const withTimeout = (promise, ms) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
          )
        ]);
      };

      let profile = null;
      let organization = null;

      try {
        // Buscar profile com timeout de 8 segundos (mais rapido)
        console.log('[Auth] Buscando profile...');
        const profileResult = await withTimeout(
          supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
          8000
        );

        if (profileResult.error) {
          console.error('[Auth] Erro ao buscar profile:', profileResult.error.message);
        } else if (profileResult.data) {
          profile = profileResult.data;
          console.log('[Auth] Profile encontrado:', profile?.full_name);

          // Buscar organization em paralelo se tiver (nao bloqueia o usuario)
          if (profile.organization_id) {
            // Buscar organization de forma assincrona - nao bloqueia
            withTimeout(
              supabase.from('organizations').select('*').eq('id', profile.organization_id).maybeSingle(),
              5000
            ).then(orgResult => {
              if (!orgResult.error && orgResult.data) {
                setCompany(orgResult.data);
                console.log('[Auth] Organization carregada:', orgResult.data?.name);
              }
            }).catch(() => {
              console.warn('[Auth] Organization nao carregada, continuando sem ela');
            });
          }
        } else {
          console.log('[Auth] Profile nao encontrado, usando dados basicos');
        }
      } catch (timeoutError) {
        console.warn('[Auth] Timeout nas queries, continuando com dados basicos');
      }

      // Montar objeto do usuario IMEDIATAMENTE (com ou sem profile completo)
      const currentUser = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.email,
        role: profile?.role || 'owner',
        avatar_url: profile?.avatar_url,
        organization_id: profile?.organization_id,
        organization: organization,
        ...(profile || {}),
      };

      setUser(currentUser);
      loadedUserIdRef.current = authUser.id; // Marcar usuario como carregado

      console.log('[Auth] Carregamento concluido');
    } catch (error) {
      console.error('[Auth] Error loading user:', error);
      // Garantir que o usuario basico existe
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.email,
        role: 'owner',
      });
      loadedUserIdRef.current = authUser.id; // Mesmo com erro, marcar como carregado
    } finally {
      setLoading(false);
      isLoadingUserRef.current = false;
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // O onAuthStateChange vai carregar os dados
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setOperator(null);
      setCompany(null);
      setSubscription(null);
      loadedUserIdRef.current = null; // Reset para permitir novo login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Login do operador no PDV
  const loginOperator = async (userId) => {
    try {
      if (!user?.organization_id) {
        return { success: false, error: 'Usuario sem organizacao' };
      }

      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', user.organization_id);

      const operatorUser = users?.find(u => u.id === userId);
      if (operatorUser) {
        setOperator(operatorUser);
        await logAuditAction('OPERATOR_LOGIN', {
          operator_id: operatorUser.id,
          operator_name: operatorUser.full_name,
        });
        return { success: true, operator: operatorUser };
      }
      return { success: false, error: 'Operador nao encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout do operador
  const logoutOperator = async () => {
    if (operator) {
      await logAuditAction('OPERATOR_LOGOUT', {
        operator_id: operator.id,
        operator_name: operator.full_name,
      });
    }
    setOperator(null);
  };

  // Registrar acao no log de auditoria
  const logAuditAction = async (action, details = {}) => {
    try {
      const logEntry = {
        action,
        user_id: user?.id,
        user_name: user?.full_name,
        operator_id: operator?.id,
        operator_name: operator?.full_name,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ip_address: '',
        timestamp: new Date().toISOString(),
      };

      // Salvar no Supabase (principal - nao bloqueia)
      supabase.from('audit_logs').insert({
        organization_id: user?.organization_id,
        action,
        user_id: user?.id,
        entity_type: details.entity_type,
        entity_id: details.entity_id,
        old_values: details.old_values,
        new_values: details.new_values,
      }).then(() => {}).catch(e => {
        console.log('Error saving audit log to Supabase:', e);
      });

      // Salvar no localStorage apenas se necessario (backup reduzido)
      // Limitado a 100 registros para evitar lentidao
      try {
        const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
        logs.unshift(logEntry);
        // Manter apenas os ultimos 100 logs (reduzido de 1000)
        const trimmedLogs = logs.slice(0, 100);
        localStorage.setItem('auditLogs', JSON.stringify(trimmedLogs));
      } catch (e) {
        // Se localStorage estiver cheio, limpar
        console.warn('Erro ao salvar audit log no localStorage, limpando...', e);
        try {
          localStorage.setItem('auditLogs', JSON.stringify([logEntry]));
        } catch (e2) {
          // Ignorar se ainda falhar
        }
      }

      return logEntry;
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  // Verificacao de permissoes
  const can = useCallback((permission) => {
    const role = operator?.role || user?.role;
    return hasPermission(role, permission);
  }, [user, operator]);

  const canAny = useCallback((permissions) => {
    const role = operator?.role || user?.role;
    return hasAnyPermission(role, permissions);
  }, [user, operator]);

  const canAll = useCallback((permissions) => {
    const role = operator?.role || user?.role;
    return hasAllPermissions(role, permissions);
  }, [user, operator]);

  const canAccess = useCallback((pageName) => {
    const role = operator?.role || user?.role;
    return canAccessPage(role, pageName);
  }, [user, operator]);

  const getCurrentRole = useCallback(() => {
    return operator?.role || user?.role || null;
  }, [user, operator]);

  const getCurrentRoleLabel = useCallback(() => {
    const role = getCurrentRole();
    return role ? ROLE_LABELS[role] : '';
  }, [getCurrentRole]);

  const isAdmin = useCallback(() => {
    const role = getCurrentRole();
    return role === USER_ROLES.ADMIN || role === USER_ROLES.OWNER;
  }, [getCurrentRole]);

  const isOwner = useCallback(() => {
    return getCurrentRole() === USER_ROLES.OWNER;
  }, [getCurrentRole]);

  const isSuperAdmin = useCallback(() => {
    return getCurrentRole() === USER_ROLES.SUPER_ADMIN;
  }, [getCurrentRole]);

  // Verificar limites do plano
  const checkPlanLimit = useCallback((feature, currentCount) => {
    if (!subscription || !company) return true;

    const limits = {
      users: company.max_users,
      products: company.max_products,
      customers: company.max_customers,
    };

    const limit = limits[feature];
    if (limit === -1) return true; // Ilimitado
    return currentCount < limit;
  }, [subscription, company]);

  // Verificar se feature esta disponivel no plano
  const hasFeature = useCallback((feature) => {
    if (!subscription) return true; // Se nao tem subscription (mock), permite tudo

    const plan = subscription.plan;
    if (!plan || !plan.features) return false;

    return plan.features.includes(feature) || plan.features.includes('tudo');
  }, [subscription]);

  // Recarregar dados do usuario
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserData(session.user);
    }
  };

  const value = {
    // Estado
    user,
    operator,
    company,
    subscription,
    loading,
    isAuthenticated: !!user,
    isUsingSupabase: true,

    // Autenticacao
    login,
    logout,
    loginOperator,
    logoutOperator,
    refreshUser,
    setOperator, // Expor para sincronizar com OperatorContext

    // Permissoes
    can,
    canAny,
    canAll,
    canAccess,
    getCurrentRole,
    getCurrentRoleLabel,
    isAdmin,
    isOwner,
    isSuperAdmin,

    // Plano/Limites
    checkPlanLimit,
    hasFeature,

    // Auditoria
    logAuditAction,

    // Constantes
    PERMISSIONS,
    USER_ROLES,
    ROLE_LABELS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook simplificado para verificar permissoes
export function usePermission(permission) {
  const { can } = useAuth();
  return can(permission);
}

// Componente para renderizacao condicional
export function CanAccess({ permission, permissions, requireAll = false, children, fallback = null }) {
  const { can, canAny, canAll } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  return hasAccess ? children : fallback;
}

// Componente para verificar se e owner
export function OwnerOnly({ children, fallback = null }) {
  const { isOwner } = useAuth();
  return isOwner() ? children : fallback;
}

export default AuthContext;
