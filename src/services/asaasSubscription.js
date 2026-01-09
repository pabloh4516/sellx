/**
 * Asaas Subscription Service
 *
 * Documentacao: https://docs.asaas.com/reference/criar-nova-assinatura
 *
 * Fluxo de Assinatura com Trial:
 * 1. Criar cliente no Asaas
 * 2. Criar assinatura com nextDueDate = hoje + dias de trial
 * 3. Asaas gera cobranças automaticamente após o trial
 * 4. Webhook notifica sobre pagamentos/cancelamentos
 *
 * IMPORTANTE: Todas as chamadas passam pela Edge Function (proxy) para evitar CORS
 */

import { supabase } from '@/lib/supabase';

// URL da Edge Function proxy
const getProxyUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qsvrivahwfzlwznwraes.supabase.co';
  return `${supabaseUrl}/functions/v1/asaas-proxy`;
};

/**
 * Faz chamada para API do Asaas via proxy
 */
async function callAsaasApi(endpoint, method = 'GET', data = null) {
  const proxyUrl = getProxyUrl();

  // Usar anon key do Supabase para autenticação
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY não configurada');
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
 */
export async function createOrGetCustomer({ name, email, cpf, phone }) {
  try {
    // Primeiro, tentar buscar cliente pelo CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
      const searchData = await callAsaasApi(`/customers?cpfCnpj=${cpfLimpo}`, 'GET');

      if (searchData.data && searchData.data.length > 0) {
        return {
          success: true,
          customer: searchData.data[0],
          customerId: searchData.data[0].id,
          isNew: false,
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
      isNew: true,
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
 * Cria uma assinatura no Asaas
 * @param {Object} params - Parametros da assinatura
 * @param {string} params.customerId - ID do cliente no Asaas
 * @param {string} params.billingType - Tipo de cobranca (PIX, BOLETO, CREDIT_CARD)
 * @param {number} params.value - Valor mensal
 * @param {string} params.cycle - Ciclo (MONTHLY, YEARLY)
 * @param {string} params.description - Descricao da assinatura
 * @param {number} params.trialDays - Dias de trial (0 para sem trial)
 * @param {string} params.externalReference - Referencia externa (organization_id)
 */
export async function createSubscription({
  customerId,
  billingType = 'PIX',
  value,
  cycle = 'MONTHLY',
  description,
  trialDays = 0,
  externalReference,
}) {
  try {
    // Calcular data da primeira cobranca (apos trial)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (trialDays || 0));
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    const subscriptionData = {
      customer: customerId,
      billingType,
      value: parseFloat(value),
      cycle,
      description: description || 'Assinatura Sellx',
      nextDueDate: dueDateStr,
      externalReference: externalReference || undefined,
    };

    console.log('Criando assinatura:', subscriptionData);

    const subscription = await callAsaasApi('/subscriptions', 'POST', subscriptionData);

    return {
      success: true,
      subscription,
      subscriptionId: subscription.id,
      status: subscription.status,
      nextDueDate: subscription.nextDueDate,
      value: subscription.value,
    };
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar assinatura',
    };
  }
}

/**
 * Busca detalhes de uma assinatura
 */
export async function getSubscription(subscriptionId) {
  try {
    const subscription = await callAsaasApi(`/subscriptions/${subscriptionId}`, 'GET');

    return {
      success: true,
      subscription,
      status: subscription.status, // ACTIVE, INACTIVE, EXPIRED
      nextDueDate: subscription.nextDueDate,
      value: subscription.value,
    };
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar assinatura',
    };
  }
}

/**
 * Cancela uma assinatura
 */
export async function cancelSubscription(subscriptionId) {
  try {
    await callAsaasApi(`/subscriptions/${subscriptionId}`, 'DELETE');

    return {
      success: true,
      message: 'Assinatura cancelada com sucesso',
    };
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return {
      success: false,
      error: error.message || 'Erro ao cancelar assinatura',
    };
  }
}

/**
 * Atualiza uma assinatura (ex: mudar plano)
 */
export async function updateSubscription(subscriptionId, { value, billingType, cycle }) {
  try {
    const updateData = {};
    if (value !== undefined) updateData.value = parseFloat(value);
    if (billingType) updateData.billingType = billingType;
    if (cycle) updateData.cycle = cycle;

    const subscription = await callAsaasApi(`/subscriptions/${subscriptionId}`, 'PUT', updateData);

    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    return {
      success: false,
      error: error.message || 'Erro ao atualizar assinatura',
    };
  }
}

/**
 * Lista cobranças de uma assinatura
 */
export async function getSubscriptionPayments(subscriptionId) {
  try {
    const data = await callAsaasApi(`/subscriptions/${subscriptionId}/payments`, 'GET');

    return {
      success: true,
      payments: data.data || [],
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error('Erro ao buscar cobrancas:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar cobrancas',
    };
  }
}

/**
 * Fluxo completo: Criar cliente + assinatura com trial
 */
export async function createFullSubscription({
  customerName,
  customerEmail,
  customerCpf,
  customerPhone,
  planName,
  planValue,
  trialDays = 7,
  organizationId,
  billingType = 'PIX',
  cycle = 'MONTHLY',
}) {
  try {
    // 1. Criar/buscar cliente
    const customerResult = await createOrGetCustomer({
      name: customerName,
      email: customerEmail,
      cpf: customerCpf,
      phone: customerPhone,
    });

    if (!customerResult.success) {
      throw new Error(customerResult.error);
    }

    // 2. Criar assinatura com trial
    const subscriptionResult = await createSubscription({
      customerId: customerResult.customerId,
      billingType,
      value: planValue,
      cycle,
      description: `Plano ${planName} - Sellx`,
      trialDays,
      externalReference: organizationId,
    });

    if (!subscriptionResult.success) {
      throw new Error(subscriptionResult.error);
    }

    return {
      success: true,
      customerId: customerResult.customerId,
      subscriptionId: subscriptionResult.subscriptionId,
      status: subscriptionResult.status,
      nextDueDate: subscriptionResult.nextDueDate,
      trialEndsAt: subscriptionResult.nextDueDate,
      value: subscriptionResult.value,
    };
  } catch (error) {
    console.error('Erro no fluxo de assinatura:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar assinatura',
    };
  }
}

export default {
  createOrGetCustomer,
  createSubscription,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  getSubscriptionPayments,
  createFullSubscription,
};
