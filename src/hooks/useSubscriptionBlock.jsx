import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Lista de features disponiveis para bloqueio
 */
export const BLOCKABLE_FEATURES = {
  open_cash: { label: 'Abrir Caixa', description: 'Abertura de caixa para operacoes' },
  close_cash: { label: 'Fechar Caixa', description: 'Fechamento de caixa' },
  start_sale: { label: 'Iniciar Venda (PDV)', description: 'Iniciar vendas no ponto de venda' },
  create_product: { label: 'Cadastrar Produto', description: 'Criar novos produtos' },
  edit_product: { label: 'Editar Produto', description: 'Modificar produtos existentes' },
  create_customer: { label: 'Cadastrar Cliente', description: 'Criar novos clientes' },
  edit_customer: { label: 'Editar Cliente', description: 'Modificar clientes existentes' },
  create_expense: { label: 'Registrar Despesa', description: 'Lancar despesas' },
  create_income: { label: 'Registrar Receita', description: 'Lancar receitas' },
  emit_invoice: { label: 'Emitir Nota Fiscal', description: 'Emissao de NF-e/NFC-e' },
  create_order: { label: 'Criar Pedido', description: 'Criar pedidos e encomendas' },
  create_quote: { label: 'Criar Orcamento', description: 'Criar orcamentos' },
  create_purchase: { label: 'Registrar Compra', description: 'Lancar compras de fornecedores' },
  create_supplier: { label: 'Cadastrar Fornecedor', description: 'Criar novos fornecedores' },
  view_reports: { label: 'Ver Relatorios', description: 'Acessar relatorios do sistema' },
  export_data: { label: 'Exportar Dados', description: 'Exportar dados em planilha/PDF' },
  manage_users: { label: 'Gerenciar Usuarios', description: 'Adicionar/remover usuarios' },
};

/**
 * Context para o sistema de bloqueio
 */
const SubscriptionBlockContext = createContext(null);

/**
 * Provider do sistema de bloqueio
 */
export function SubscriptionBlockProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false); // Começa false para não bloquear
  const [organization, setOrganization] = useState(null);
  const [blockSettings, setBlockSettings] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isBlocked: false,
    isInGracePeriod: false,
    isTotallyBlocked: false,
    daysOverdue: 0,
    blockedFeatures: [],
    message: '',
    title: '',
  });

  // Carregar dados da organizacao e configuracoes de bloqueio
  // Executa em background, não bloqueia renderização
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Super admin pelo email - não precisa verificar bloqueio
    if (user.email?.toLowerCase() === 'pabloh4516@icloud.com' || user.role === 'super_admin') {
      return;
    }

    // Carregar em background
    loadData();
  }, [user?.id, user?.role, user?.email]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Buscar profile com organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .maybeSingle();

      // Se deu erro ou não tem profile/organization, não bloqueia nada
      if (profileError || !profile?.organization_id) {
        setLoading(false);
        return;
      }

      // Super admin nunca e bloqueado
      if (profile.role === 'super_admin') {
        setSubscriptionStatus({
          isBlocked: false,
          isInGracePeriod: false,
          isTotallyBlocked: false,
          daysOverdue: 0,
          blockedFeatures: [],
          message: '',
          title: '',
        });
        setLoading(false);
        return;
      }

      // Buscar organizacao
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (orgError || !org) {
        setLoading(false);
        return;
      }

      setOrganization(org);

      // Buscar configuracoes de bloqueio (pode não existir ainda)
      const { data: settings } = await supabase
        .from('subscription_block_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      setBlockSettings(settings);

      // Calcular status de bloqueio apenas se tiver settings
      if (org && settings) {
        calculateBlockStatus(org, settings);
      }

    } catch (error) {
      // Silencioso - não quebra o app se der erro
      console.warn('Aviso ao carregar dados de bloqueio:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateBlockStatus = (org, settings) => {
    const now = new Date();
    let isBlocked = false;
    let isInGracePeriod = false;
    let isTotallyBlocked = false;
    let daysOverdue = 0;

    const status = org.subscription_status;

    // Status que nao bloqueiam
    if (status === 'active') {
      setSubscriptionStatus({
        isBlocked: false,
        isInGracePeriod: false,
        isTotallyBlocked: false,
        daysOverdue: 0,
        blockedFeatures: [],
        message: '',
        title: '',
      });
      return;
    }

    // Trial - verificar se expirou
    if (status === 'trial') {
      if (org.trial_ends_at) {
        const trialEnd = new Date(org.trial_ends_at);
        if (now > trialEnd) {
          // Trial expirou
          daysOverdue = Math.floor((now - trialEnd) / (1000 * 60 * 60 * 24));

          if (daysOverdue <= settings.grace_period_days) {
            isInGracePeriod = true;
          } else if (daysOverdue <= settings.grace_period_days + settings.total_block_days) {
            isBlocked = true;
          } else {
            isTotallyBlocked = true;
          }
        }
      }
    }

    // Overdue - pagamento vencido
    if (status === 'overdue') {
      // Calcular dias de atraso (usar last_payment_at ou trial_ends_at como referencia)
      const referenceDate = org.last_payment_at
        ? new Date(new Date(org.last_payment_at).getTime() + 30 * 24 * 60 * 60 * 1000) // +30 dias do ultimo pagamento
        : org.trial_ends_at
          ? new Date(org.trial_ends_at)
          : now;

      if (now > referenceDate) {
        daysOverdue = Math.floor((now - referenceDate) / (1000 * 60 * 60 * 24));
      }

      if (daysOverdue <= settings.grace_period_days) {
        isInGracePeriod = true;
      } else if (daysOverdue <= settings.grace_period_days + settings.total_block_days) {
        isBlocked = true;
      } else {
        isTotallyBlocked = true;
      }
    }

    // Cancelled ou Expired - bloqueio total
    if (status === 'cancelled' || status === 'expired') {
      isTotallyBlocked = true;
    }

    // Definir features bloqueadas
    const blockedFeatures = isBlocked || isTotallyBlocked
      ? (settings.blocked_features || [])
      : [];

    setSubscriptionStatus({
      isBlocked,
      isInGracePeriod,
      isTotallyBlocked,
      daysOverdue,
      blockedFeatures,
      message: settings.block_message,
      title: settings.block_title,
      showPayButton: settings.show_pay_button,
      showDaysOverdue: settings.show_days_overdue,
    });
  };

  /**
   * Verifica se uma feature especifica esta bloqueada
   * @param {string} featureId - ID da feature (ex: 'open_cash', 'start_sale')
   * @returns {boolean}
   */
  const isFeatureBlocked = useCallback((featureId) => {
    if (!subscriptionStatus.isBlocked && !subscriptionStatus.isTotallyBlocked) {
      return false;
    }
    return subscriptionStatus.blockedFeatures.includes(featureId);
  }, [subscriptionStatus]);

  /**
   * Retorna informacoes para exibir no modal de bloqueio
   */
  const getBlockInfo = useCallback(() => {
    return {
      title: subscriptionStatus.title || 'Assinatura Pendente',
      message: subscriptionStatus.message || 'Regularize sua assinatura para continuar.',
      daysOverdue: subscriptionStatus.daysOverdue,
      showPayButton: subscriptionStatus.showPayButton,
      showDaysOverdue: subscriptionStatus.showDaysOverdue,
      plan: organization?.plan,
      isInGracePeriod: subscriptionStatus.isInGracePeriod,
      isTotallyBlocked: subscriptionStatus.isTotallyBlocked,
    };
  }, [subscriptionStatus, organization]);

  /**
   * Recarrega os dados de bloqueio
   */
  const refresh = useCallback(() => {
    loadData();
  }, [user]);

  const value = {
    loading,
    organization,
    blockSettings,
    subscriptionStatus,
    isFeatureBlocked,
    getBlockInfo,
    refresh,
    // Atalhos uteis
    isBlocked: subscriptionStatus.isBlocked || subscriptionStatus.isTotallyBlocked,
    isInGracePeriod: subscriptionStatus.isInGracePeriod,
    isTotallyBlocked: subscriptionStatus.isTotallyBlocked,
    daysOverdue: subscriptionStatus.daysOverdue,
  };

  return (
    <SubscriptionBlockContext.Provider value={value}>
      {children}
    </SubscriptionBlockContext.Provider>
  );
}

/**
 * Hook para usar o sistema de bloqueio
 */
export function useSubscriptionBlock() {
  const context = useContext(SubscriptionBlockContext);

  if (!context) {
    // Retornar valores padrao se nao estiver dentro do provider
    return {
      loading: false,
      organization: null,
      blockSettings: null,
      subscriptionStatus: {
        isBlocked: false,
        isInGracePeriod: false,
        isTotallyBlocked: false,
        daysOverdue: 0,
        blockedFeatures: [],
      },
      isFeatureBlocked: () => false,
      getBlockInfo: () => ({}),
      refresh: () => {},
      isBlocked: false,
      isInGracePeriod: false,
      isTotallyBlocked: false,
      daysOverdue: 0,
    };
  }

  return context;
}

export default useSubscriptionBlock;
