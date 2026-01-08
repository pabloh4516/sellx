// ============================================================================
// ERROR MESSAGES - Mensagens de erro amigáveis e actionable
// ============================================================================

import { toast } from 'sonner';

// Mapeamento de códigos de erro para mensagens amigáveis
const errorMessages = {
  // Erros de rede
  'TIMEOUT': {
    title: 'Conexão lenta',
    description: 'O servidor demorou para responder. Verifique sua conexão e tente novamente.',
    action: 'Tentar novamente',
  },
  'NETWORK_ERROR': {
    title: 'Sem conexão',
    description: 'Não foi possível conectar ao servidor. Verifique sua internet.',
    action: 'Verificar conexão',
  },
  'FETCH_ERROR': {
    title: 'Erro de conexão',
    description: 'Houve um problema ao buscar os dados. Tente novamente.',
    action: 'Tentar novamente',
  },

  // Erros de autenticação
  'INVALID_CREDENTIALS': {
    title: 'Credenciais inválidas',
    description: 'Email ou senha incorretos. Verifique e tente novamente.',
    action: null,
  },
  'SESSION_EXPIRED': {
    title: 'Sessão expirada',
    description: 'Sua sessão expirou. Faça login novamente.',
    action: 'Fazer login',
  },
  'UNAUTHORIZED': {
    title: 'Acesso negado',
    description: 'Você não tem permissão para realizar esta ação.',
    action: null,
  },

  // Erros de validação
  'VALIDATION_ERROR': {
    title: 'Dados inválidos',
    description: 'Verifique os campos marcados e corrija os erros.',
    action: null,
  },
  'DUPLICATE_ENTRY': {
    title: 'Registro duplicado',
    description: 'Já existe um registro com esses dados.',
    action: null,
  },
  'REQUIRED_FIELD': {
    title: 'Campo obrigatório',
    description: 'Preencha todos os campos obrigatórios.',
    action: null,
  },

  // Erros de estoque
  'INSUFFICIENT_STOCK': {
    title: 'Estoque insuficiente',
    description: 'Não há quantidade suficiente deste produto em estoque.',
    action: 'Ver estoque',
  },
  'PRODUCT_NOT_FOUND': {
    title: 'Produto não encontrado',
    description: 'O produto buscado não existe ou foi removido.',
    action: null,
  },

  // Erros de caixa
  'CASH_NOT_OPEN': {
    title: 'Caixa fechado',
    description: 'Abra o caixa antes de realizar vendas.',
    action: 'Abrir caixa',
  },
  'CASH_ALREADY_OPEN': {
    title: 'Caixa já aberto',
    description: 'Já existe um caixa aberto. Feche-o antes de abrir outro.',
    action: null,
  },

  // Erros de pagamento
  'PAYMENT_FAILED': {
    title: 'Falha no pagamento',
    description: 'Não foi possível processar o pagamento. Tente outra forma.',
    action: null,
  },
  'INSUFFICIENT_PAYMENT': {
    title: 'Valor insuficiente',
    description: 'O valor pago é menor que o total da venda.',
    action: null,
  },

  // Erros do Supabase
  'PGRST116': {
    title: 'Registro não encontrado',
    description: 'O registro solicitado não foi encontrado.',
    action: null,
  },
  'PGRST301': {
    title: 'Erro de conexão',
    description: 'Não foi possível conectar ao banco de dados.',
    action: 'Tentar novamente',
  },
  '23505': {
    title: 'Registro duplicado',
    description: 'Já existe um registro com esses dados no sistema.',
    action: null,
  },
  '23503': {
    title: 'Referência inválida',
    description: 'Este registro está vinculado a outros dados e não pode ser alterado.',
    action: null,
  },
  '42501': {
    title: 'Sem permissão',
    description: 'Você não tem permissão para realizar esta operação.',
    action: null,
  },

  // Erro genérico
  'UNKNOWN': {
    title: 'Erro inesperado',
    description: 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.',
    action: 'Tentar novamente',
  },
};

// Função para obter mensagem de erro amigável
export function getErrorMessage(error) {
  if (!error) return errorMessages.UNKNOWN;

  // Se já é uma string, tentar encontrar no mapa
  if (typeof error === 'string') {
    return errorMessages[error] || errorMessages.UNKNOWN;
  }

  // Se é um objeto de erro
  const errorCode = error.code || error.status || error.name;
  const errorMsg = error.message || '';

  // Verificar códigos específicos
  if (errorCode && errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // Verificar mensagens específicas
  if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
    return errorMessages.TIMEOUT;
  }
  if (errorMsg.includes('network') || errorMsg.includes('Network')) {
    return errorMessages.NETWORK_ERROR;
  }
  if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
    return errorMessages.DUPLICATE_ENTRY;
  }
  if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
    return errorMessages.UNAUTHORIZED;
  }
  if (errorMsg.includes('not found')) {
    return errorMessages.PGRST116;
  }

  // Retornar erro genérico com mensagem original se disponível
  return {
    ...errorMessages.UNKNOWN,
    description: errorMsg || errorMessages.UNKNOWN.description,
  };
}

// Função helper para mostrar toast de erro com mensagem amigável
export function showErrorToast(error, options = {}) {
  const errorInfo = getErrorMessage(error);

  toast.error(errorInfo.title, {
    description: errorInfo.description,
    action: errorInfo.action && options.onAction ? {
      label: errorInfo.action,
      onClick: options.onAction,
    } : undefined,
    duration: options.duration || 5000,
  });

  return errorInfo;
}

// Função helper para mostrar toast de sucesso
export function showSuccessToast(title, description, options = {}) {
  toast.success(title, {
    description,
    duration: options.duration || 3000,
    ...options,
  });
}

// Função helper para mostrar toast de aviso
export function showWarningToast(title, description, options = {}) {
  toast.warning(title, {
    description,
    duration: options.duration || 4000,
    ...options,
  });
}

// Função helper para mostrar toast de loading (promise)
export function showLoadingToast(promise, messages = {}) {
  return toast.promise(promise, {
    loading: messages.loading || 'Processando...',
    success: messages.success || 'Operação concluída!',
    error: (err) => {
      const errorInfo = getErrorMessage(err);
      return `${errorInfo.title}: ${errorInfo.description}`;
    },
  });
}

// ============================================================================
// MENSAGENS POR CONTEXTO - Para uso em páginas específicas
// ============================================================================

export const contextErrorMessages = {
  // Vendas
  sales: {
    loadError: 'Não foi possível carregar as vendas. Tente atualizar a página.',
    createError: 'Não foi possível finalizar a venda. Verifique os dados e tente novamente.',
    cancelError: 'Não foi possível cancelar a venda. Tente novamente.',
  },

  // Produtos
  products: {
    loadError: 'Não foi possível carregar os produtos. Tente atualizar a página.',
    createError: 'Não foi possível cadastrar o produto. Verifique os dados.',
    updateError: 'Não foi possível atualizar o produto. Tente novamente.',
    deleteError: 'Não foi possível excluir o produto. Ele pode estar vinculado a vendas.',
  },

  // Clientes
  customers: {
    loadError: 'Não foi possível carregar os clientes. Tente atualizar a página.',
    createError: 'Não foi possível cadastrar o cliente. Verifique os dados.',
    updateError: 'Não foi possível atualizar o cliente. Tente novamente.',
    deleteError: 'Não foi possível excluir o cliente. Ele pode ter vendas vinculadas.',
  },

  // Caixa
  cashRegister: {
    loadError: 'Não foi possível carregar os dados do caixa.',
    openError: 'Não foi possível abrir o caixa. Tente novamente.',
    closeError: 'Não foi possível fechar o caixa. Verifique os valores.',
    movementError: 'Não foi possível registrar a movimentação.',
  },

  // Financeiro
  financial: {
    loadError: 'Não foi possível carregar os dados financeiros.',
    createError: 'Não foi possível criar o registro financeiro.',
    updateError: 'Não foi possível atualizar o registro.',
    paymentError: 'Não foi possível registrar o pagamento.',
  },
};

export default {
  getErrorMessage,
  showErrorToast,
  showSuccessToast,
  showWarningToast,
  showLoadingToast,
  contextErrorMessages,
};
