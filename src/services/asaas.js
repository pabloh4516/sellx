/**
 * Asaas Payment Service
 *
 * Documentacao: https://docs.asaas.com
 *
 * Fluxo PIX:
 * 1. Criar/buscar cliente
 * 2. Criar cobranca PIX
 * 3. Buscar QR Code
 * 4. Webhook confirma pagamento
 *
 * IMPORTANTE: Todas as chamadas passam pela Edge Function (proxy) para evitar CORS
 */

// Ambiente padrao: 'sandbox' para testes, 'production' para producao
const DEFAULT_ENV = import.meta.env.VITE_ASAAS_ENV || 'sandbox';

// URL da Edge Function proxy
const getProxyUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qsvrivahwfzlwznwraes.supabase.co';
  return `${supabaseUrl}/functions/v1/asaas-proxy`;
};

/**
 * Retorna URL da API baseado no ambiente (para referencia, nao usado diretamente)
 * @param {string} env - 'sandbox' ou 'production'
 */
const getApiUrl = (env) => {
  const environment = env || DEFAULT_ENV;
  return environment === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
};

// Exportar constantes para compatibilidade
export const ASAAS_ENV = DEFAULT_ENV;
export const ASAAS_API_URL = getApiUrl(DEFAULT_ENV);

/**
 * Faz chamada para API do Asaas via proxy
 * @param {string} endpoint - Endpoint da API (ex: '/customers')
 * @param {string} method - Metodo HTTP (GET, POST, PUT, DELETE)
 * @param {Object} data - Dados para enviar no body (POST/PUT)
 */
async function callAsaasApi(endpoint, method = 'GET', data = null) {
  const proxyUrl = getProxyUrl();

  // Usar anon key do Supabase para autenticacao
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY nao configurada');
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      endpoint,
      method,
      data,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.errors?.[0]?.description || result.error?.message || 'Erro na API do Asaas');
  }

  return result;
}

/**
 * Cria ou busca um cliente no Asaas
 * @param {Object} customer - Dados do cliente
 * @param {string} apiKey - API Key (ignorado, usa proxy)
 */
export async function createOrGetCustomer({ name, email, cpf, phone }, apiKey) {
  try {
    // Primeiro, tentar buscar cliente pelo CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const searchData = await callAsaasApi(`/customers?cpfCnpj=${cpfLimpo}`, 'GET');

      if (searchData.data && searchData.data.length > 0) {
        // Cliente ja existe, retornar o primeiro
        return {
          success: true,
          customer: searchData.data[0],
          customerId: searchData.data[0].id,
        };
      }
    } catch (e) {
      // Cliente nao encontrado, continuar para criar
      console.log('Cliente nao encontrado, criando novo...');
    }

    // Cliente nao existe, criar novo
    const customerData = await callAsaasApi('/customers', 'POST', {
      name,
      email,
      cpfCnpj: cpfLimpo,
      phone: phone?.replace(/\D/g, ''),
      notificationDisabled: false,
    });

    return {
      success: true,
      customer: customerData,
      customerId: customerData.id,
    };
  } catch (error) {
    console.error('Erro ao criar/buscar cliente Asaas:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar cliente',
    };
  }
}

/**
 * Cria uma cobranca PIX
 * @param {Object} params - Parametros da cobranca
 * @param {string} apiKey - API Key (ignorado, usa proxy)
 */
export async function createPixPayment({
  customerId,
  value,
  description,
  externalReference,
  dueDate,
}, apiKey) {
  try {
    // Data de vencimento (hoje + 1 dia se nao informado)
    const due = dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const paymentData = await callAsaasApi('/payments', 'POST', {
      customer: customerId,
      billingType: 'PIX',
      value: parseFloat(value),
      dueDate: due,
      description: description || 'Pagamento Sellx',
      externalReference: externalReference || undefined,
    });

    return {
      success: true,
      payment: paymentData,
      paymentId: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      dueDate: paymentData.dueDate,
      invoiceUrl: paymentData.invoiceUrl,
    };
  } catch (error) {
    console.error('Erro ao criar cobranca PIX:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar cobranca',
    };
  }
}

/**
 * Busca o QR Code PIX de uma cobranca
 * @param {string} paymentId - ID da cobranca no Asaas
 * @param {string} apiKey - API Key (ignorado, usa proxy)
 */
export async function getPixQrCode(paymentId, apiKey) {
  try {
    const qrData = await callAsaasApi(`/payments/${paymentId}/pixQrCode`, 'GET');

    return {
      success: true,
      encodedImage: qrData.encodedImage, // Base64 da imagem
      payload: qrData.payload, // Codigo copia e cola
      expirationDate: qrData.expirationDate,
    };
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar QR Code',
    };
  }
}

/**
 * Verifica o status de uma cobranca
 * @param {string} paymentId - ID da cobranca
 * @param {string} apiKey - API Key (ignorado, usa proxy)
 */
export async function getPaymentStatus(paymentId, apiKey) {
  try {
    const paymentData = await callAsaasApi(`/payments/${paymentId}`, 'GET');

    return {
      success: true,
      status: paymentData.status, // PENDING, RECEIVED, CONFIRMED, OVERDUE, etc
      value: paymentData.value,
      paymentDate: paymentData.paymentDate,
      confirmedDate: paymentData.confirmedDate,
    };
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar status',
    };
  }
}

/**
 * Fluxo completo: Criar cliente + cobranca + QR Code
 * @param {Object} params - Todos os parametros necessarios
 * @param {string} apiKey - API Key (ignorado, usa proxy)
 */
export async function createFullPixPayment({
  customerName,
  customerEmail,
  customerCpf,
  customerPhone,
  value,
  description,
  externalReference,
}, apiKey) {
  try {
    // 1. Criar/buscar cliente
    const customerResult = await createOrGetCustomer({
      name: customerName,
      email: customerEmail,
      cpf: customerCpf,
      phone: customerPhone,
    }, apiKey);

    if (!customerResult.success) {
      throw new Error(customerResult.error);
    }

    // 2. Criar cobranca PIX
    const paymentResult = await createPixPayment({
      customerId: customerResult.customerId,
      value,
      description,
      externalReference,
    }, apiKey);

    if (!paymentResult.success) {
      throw new Error(paymentResult.error);
    }

    // 3. Buscar QR Code
    const qrResult = await getPixQrCode(paymentResult.paymentId, apiKey);

    if (!qrResult.success) {
      throw new Error(qrResult.error);
    }

    return {
      success: true,
      customerId: customerResult.customerId,
      paymentId: paymentResult.paymentId,
      status: paymentResult.status,
      value: paymentResult.value,
      invoiceUrl: paymentResult.invoiceUrl,
      qrCode: {
        image: `data:image/png;base64,${qrResult.encodedImage}`,
        payload: qrResult.payload,
        expirationDate: qrResult.expirationDate,
      },
    };
  } catch (error) {
    console.error('Erro no fluxo de pagamento:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar pagamento',
    };
  }
}

/**
 * Gera ID unico para referencia externa
 */
export function generateExternalReference(prefix = 'SELLX') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export default {
  createOrGetCustomer,
  createPixPayment,
  getPixQrCode,
  getPaymentStatus,
  createFullPixPayment,
  generateExternalReference,
  getApiUrl,
  ASAAS_API_URL,
  ASAAS_ENV,
};
