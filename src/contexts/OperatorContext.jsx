/**
 * Contexto de Operador
 * Gerencia o operador ativo (funcionario logado no terminal)
 * Separado do usuario autenticado (sessao do sistema)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { getCashRegisterMode, loadSystemSettings } from '@/utils/settingsHelper';

const OperatorContext = createContext(null);

// Chave para persistir operador no sessionStorage
// IMPORTANTE: Deve ser a mesma chave usada no AuthContext para sincronizacao
const OPERATOR_KEY = 'currentOperator';

// Limpar chave antiga que era usada antes (migracao)
const OLD_OPERATOR_KEY = 'sellx_active_operator';
if (typeof sessionStorage !== 'undefined') {
  const oldData = sessionStorage.getItem(OLD_OPERATOR_KEY);
  if (oldData) {
    // Migrar para nova chave se a nova nao existir
    if (!sessionStorage.getItem(OPERATOR_KEY)) {
      sessionStorage.setItem(OPERATOR_KEY, oldData);
    }
    sessionStorage.removeItem(OLD_OPERATOR_KEY);
    console.log('[Operator] Migrado de chave antiga para nova');
  }
}

export function OperatorProvider({ children }) {
  const { user, isAuthenticated, setOperator: setAuthOperator } = useAuth();
  const [operator, setOperator] = useState(null);
  const [operatorLoading, setOperatorLoading] = useState(true);
  const [showOperatorSelect, setShowOperatorSelect] = useState(false);
  const [showCashWarning, setShowCashWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [openCashRegister, setOpenCashRegister] = useState(null);

  // Carregar operador do sessionStorage ao iniciar ou quando usuario muda
  useEffect(() => {
    const initOperator = async () => {
      // Se nao esta autenticado, limpa tudo
      if (!isAuthenticated || !user) {
        setOperator(null);
        setShowOperatorSelect(false);
        setOperatorLoading(false);
        sessionStorage.removeItem(OPERATOR_KEY);
        return;
      }

      // Usuario esta autenticado, verificar operador salvo
      const savedOperator = sessionStorage.getItem(OPERATOR_KEY);

      if (savedOperator) {
        try {
          const parsed = JSON.parse(savedOperator);

          // Primeiro, definir operador imediatamente para evitar flash
          // Isso evita que a tela de selecao apareca brevemente
          setOperator(parsed);
          setAuthOperator(parsed); // Sincronizar com AuthContext
          setShowOperatorSelect(false);
          setOperatorLoading(false);

          // Validar em background - se invalido, forcara nova selecao
          validateOperator(parsed).then(isValid => {
            if (!isValid) {
              console.warn('[Operator] Operador salvo invalido, solicitando nova selecao');
              sessionStorage.removeItem(OPERATOR_KEY);
              setOperator(null);
              setAuthOperator(null);
              setShowOperatorSelect(true);
            }
          }).catch(e => {
            console.warn('[Operator] Erro na validacao, mantendo operador:', e);
            // Em caso de erro de rede, manter o operador
          });
          return;
        } catch (e) {
          console.error('Erro ao carregar operador:', e);
          sessionStorage.removeItem(OPERATOR_KEY);
        }
      }

      // Nenhum operador salvo ou erro ao carregar, mostrar selecao
      setOperator(null);
      setShowOperatorSelect(true);
      setOperatorLoading(false);
    };

    setOperatorLoading(true);
    initOperator();
  }, [isAuthenticated, user?.id, setAuthOperator]);

  // Validar se operador ainda existe e esta ativo
  const validateOperator = async (op) => {
    if (!op?.id) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_active')
        .eq('id', op.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao validar operador:', error);
        return false;
      }

      return data?.is_active !== false;
    } catch (e) {
      console.error('Erro ao validar operador:', e);
      return false;
    }
  };

  // Verificar se operador tem caixa aberto
  const checkOpenCashRegister = useCallback(async (operatorId) => {
    if (!operatorId) return null;

    try {
      // Buscar caixa aberto
      const { data: cashRegister, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('opened_by_id', operatorId)
        .eq('status', 'aberto')
        .order('opening_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar caixa:', error);
      }

      if (!cashRegister) return null;

      // Buscar vendas do caixa para calcular totais (incluindo payments para vendas em dinheiro)
      const { data: sales } = await supabase
        .from('sales')
        .select('total, payment_method, payments')
        .eq('cash_register_id', cashRegister.id)
        .eq('status', 'concluida');

      // Buscar movimentações (sangrias/suprimentos)
      const { data: movements } = await supabase
        .from('cash_movements')
        .select('amount, type')
        .eq('cash_register_id', cashRegister.id);

      // Helper para parsear payments
      const parsePayments = (sale) => {
        if (!sale.payments) return [];
        let payments = sale.payments;
        if (typeof payments === 'string') {
          try { payments = JSON.parse(payments); } catch { return []; }
        }
        return Array.isArray(payments) ? payments : [];
      };

      // Verificar se pagamento é em dinheiro (pelo method_name que é salvo diretamente)
      const isCashPayment = (payment) => {
        const methodName = (payment.method_name || '').toLowerCase();
        return methodName === 'dinheiro' || methodName.includes('dinheiro');
      };

      // Calcular totais
      const totalSales = (sales || []).reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

      // Calcular vendas em dinheiro (descontando troco)
      // Se cliente pagou R$100 para venda de R$76, fica R$76 no caixa (R$24 voltou como troco)
      let cashSales = 0;

      (sales || []).forEach((sale) => {
        const payments = parsePayments(sale);
        const saleTotal = parseFloat(sale.total) || 0;

        if (payments.length > 0) {
          // Calcular total pago e total em dinheiro
          let totalPaid = 0;
          let cashPaid = 0;

          payments.forEach(payment => {
            const amount = parseFloat(payment.amount) || 0;
            totalPaid += amount;
            if (isCashPayment(payment)) {
              cashPaid += amount;
            }
          });

          // O troco vem do dinheiro
          const change = Math.max(0, totalPaid - saleTotal);
          // Dinheiro que fica no caixa = dinheiro pago - troco
          const cashInRegister = Math.max(0, cashPaid - change);

          cashSales += cashInRegister;
        } else if (sale.payment_method) {
          const pm = (sale.payment_method || '').toLowerCase();
          const isCash = pm === 'cash' || pm === 'dinheiro' || pm.includes('dinheiro');
          if (isCash) {
            // No formato antigo, usamos o total da venda (já sem troco)
            cashSales += saleTotal;
          }
        }
      });

      const totalWithdrawals = (movements || [])
        .filter(m => m.type === 'sangria' || m.type === 'withdrawal')
        .reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
      const totalDeposits = (movements || [])
        .filter(m => m.type === 'suprimento' || m.type === 'deposit')
        .reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

      return {
        ...cashRegister,
        total_sales: totalSales,
        cash_sales: cashSales,
        total_withdrawals: totalWithdrawals,
        total_deposits: totalDeposits,
        sales_count: (sales || []).length
      };
    } catch (e) {
      console.error('Erro ao verificar caixa:', e);
      return null;
    }
  }, []);

  // Login do operador
  const loginOperator = useCallback(async (operatorData, password) => {
    try {
      // Primeiro, obter o organization_id do usuario autenticado
      const { data: currentProfile, error: orgError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      if (orgError || !currentProfile?.organization_id) {
        console.error('Erro ao obter organization_id:', orgError);
        toast.error('Erro ao verificar organizacao');
        return false;
      }

      // Buscar operador pelo codigo ou email - APENAS da mesma organizacao
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', currentProfile.organization_id)
        .eq('is_active', true);

      if (operatorData.employee_code) {
        query = query.eq('employee_code', operatorData.employee_code.toUpperCase());
      } else if (operatorData.id) {
        query = query.eq('id', operatorData.id);
      } else {
        toast.error('Operador invalido');
        return false;
      }

      const { data: profile, error: profileError } = await query.single();

      if (profileError || !profile) {
        toast.error('Operador nao encontrado ou inativo');
        return false;
      }

      // Verificar PIN para troca de operador
      // Todos os usuarios precisam ter PIN configurado para seguranca
      if (!profile.pin) {
        toast.error('Este usuario nao possui PIN configurado. Configure um PIN no cadastro de usuarios.', {
          duration: 5000,
        });
        return false;
      }

      // Verificar PIN
      if (password !== profile.pin) {
        toast.error('PIN incorreto');
        return false;
      }

      // Definir operador ativo
      const operatorInfo = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        employee_code: profile.employee_code,
        avatar_url: profile.avatar_url,
        logged_at: new Date().toISOString(),
      };

      setOperator(operatorInfo);
      setAuthOperator(operatorInfo); // Sincronizar com AuthContext para permissoes
      sessionStorage.setItem(OPERATOR_KEY, JSON.stringify(operatorInfo));
      setShowOperatorSelect(false);

      toast.success(`Bem-vindo, ${profile.full_name}!`);
      return true;

    } catch (error) {
      console.error('Erro no login do operador:', error);
      toast.error('Erro ao fazer login');
      return false;
    }
  }, [user, setAuthOperator]);

  // Logout do operador (trocar operador)
  const logoutOperator = useCallback(async (force = false) => {
    if (!operator) return true;

    // Verificar se tem caixa aberto APENAS no modo per_operator
    // No modo compartilhado, permite trocar operador mesmo com caixa aberto
    const cashRegisterMode = getCashRegisterMode();

    if (!force && cashRegisterMode === 'per_operator') {
      const cashRegister = await checkOpenCashRegister(operator.id);

      if (cashRegister) {
        setOpenCashRegister(cashRegister);
        setShowCashWarning(true);
        setPendingAction('logout');
        return false;
      }
    }

    // Limpar operador
    setOperator(null);
    setAuthOperator(null); // Sincronizar com AuthContext
    sessionStorage.removeItem(OPERATOR_KEY);
    setShowOperatorSelect(true);
    setOpenCashRegister(null);

    return true;
  }, [operator, checkOpenCashRegister, setAuthOperator]);

  // Confirmar fechamento do caixa antes de trocar
  const confirmLogoutWithOpenCash = useCallback(async (action = 'close') => {
    // Sempre redirecionar para fechar caixa - não permite transferir
    setShowCashWarning(false);
    // O componente que chamar isso deve redirecionar para /caixa
    return { action: 'close_cash', cashRegister: openCashRegister };
  }, [openCashRegister]);

  // Cancelar troca
  const cancelLogout = useCallback(() => {
    setShowCashWarning(false);
    setPendingAction(null);
  }, []);

  // Abrir seletor de operador manualmente
  const openOperatorSelect = useCallback(async () => {
    if (operator) {
      // Verificar caixa antes de abrir seletor APENAS no modo per_operator
      const cashRegisterMode = getCashRegisterMode();

      if (cashRegisterMode === 'per_operator') {
        const cashRegister = await checkOpenCashRegister(operator.id);

        if (cashRegister) {
          setOpenCashRegister(cashRegister);
          setShowCashWarning(true);
          setPendingAction('switch');
          return;
        }
      }
    }

    setShowOperatorSelect(true);
  }, [operator, checkOpenCashRegister]);

  // Fechar seletor de operador
  const closeOperatorSelect = useCallback(() => {
    // So pode fechar se ja tem operador
    if (operator) {
      setShowOperatorSelect(false);
    }
  }, [operator]);

  const value = {
    // Estado
    operator,
    operatorLoading,
    showOperatorSelect,
    showCashWarning,
    openCashRegister,

    // Acoes
    loginOperator,
    logoutOperator,
    confirmLogoutWithOpenCash,
    cancelLogout,
    openOperatorSelect,
    closeOperatorSelect,
    checkOpenCashRegister,

    // Helpers
    isOperatorLoggedIn: !!operator,
    operatorName: operator?.full_name || '',
    operatorRole: operator?.role || '',
    operatorCode: operator?.employee_code || '',
  };

  return (
    <OperatorContext.Provider value={value}>
      {children}
    </OperatorContext.Provider>
  );
}

export function useOperator() {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperator deve ser usado dentro de OperatorProvider');
  }
  return context;
}

export default OperatorContext;
