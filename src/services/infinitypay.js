/**
 * InfinityPay Payment Service
 *
 * Documentacao: https://www.infinitepay.io/checkout
 *
 * Endpoints:
 * - Criar checkout: POST https://api.infinitepay.io/invoices/public/checkout/links
 * - Verificar pagamento: POST https://api.infinitepay.io/invoices/public/checkout/payment_check
 */

const INFINITYPAY_API_URL = 'https://api.infinitepay.io/invoices/public/checkout';

// Handle da conta InfinityPay (configurar no .env ou buscar do banco)
const INFINITYPAY_HANDLE = import.meta.env.VITE_INFINITYPAY_HANDLE || 'sellx';

// URL base do app (configurar no .env)
const APP_BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// URL do Supabase para webhook (configurar no .env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const WEBHOOK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/infinitypay-webhook` : '';

/**
 * Cria um link de checkout da InfinityPay
 *
 * @param {Object} params - Parametros do checkout
 * @param {string} params.orderNsu - ID do pedido no seu sistema
 * @param {Array} params.items - Lista de itens [{description, quantity, price}]
 * @param {Object} params.customer - Dados do cliente {name, email, phone}
 * @param {string} params.redirectUrl - URL de retorno apos pagamento
 * @param {string} params.webhookUrl - URL para receber notificacao de pagamento
 * @returns {Promise<Object>} - Dados do checkout criado
 */
export async function createCheckoutLink({
  orderNsu,
  items,
  customer,
  redirectUrl,
  webhookUrl,
  handle,
}) {
  try {
    const payload = {
      handle: handle || INFINITYPAY_HANDLE,
      order_nsu: orderNsu,
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        // Preco em centavos (R$ 69,90 = 6990)
        price: Math.round(item.price * 100),
      })),
      redirect_url: redirectUrl || `${APP_BASE_URL}/checkout-retorno`,
      webhook_url: webhookUrl || WEBHOOK_URL,
    };

    // Adicionar dados do cliente se fornecidos
    if (customer) {
      payload.customer = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone?.replace(/\D/g, ''),
      };
    }

    const response = await fetch(`${INFINITYPAY_API_URL}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      checkoutUrl: data.url || data.checkout_url,
      orderNsu: data.order_nsu || orderNsu,
      slug: data.slug,
    };
  } catch (error) {
    console.error('Erro ao criar checkout InfinityPay:', error);
    return {
      success: false,
      error: error.message || 'Erro ao criar link de pagamento',
    };
  }
}

/**
 * Verifica o status de um pagamento
 *
 * @param {Object} params - Parametros da verificacao
 * @param {string} params.orderNsu - ID do pedido
 * @param {string} params.transactionNsu - ID da transacao (retornado no redirect)
 * @param {string} params.slug - Slug do checkout (retornado no redirect)
 * @returns {Promise<Object>} - Status do pagamento
 */
export async function checkPaymentStatus({ orderNsu, transactionNsu, slug }) {
  try {
    const payload = {
      handle: INFINITYPAY_HANDLE,
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug: slug,
    };

    const response = await fetch(`${INFINITYPAY_API_URL}/payment_check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      status: data.status, // 'approved', 'pending', 'rejected'
      transactionId: data.transaction_nsu,
      paidAt: data.paid_at,
      paymentMethod: data.payment_method,
      amount: data.amount,
    };
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return {
      success: false,
      error: error.message || 'Erro ao verificar status do pagamento',
    };
  }
}

/**
 * Gera um ID de pedido unico
 * @param {string} prefix - Prefixo do ID (ex: 'OFFLINE', 'SUB')
 * @returns {string} - ID unico
 */
export function generateOrderId(prefix = 'ORDER') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Formata valor para exibicao
 * @param {number} cents - Valor em centavos
 * @returns {string} - Valor formatado (ex: "R$ 69,90")
 */
export function formatCurrency(cents) {
  const value = cents / 100;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default {
  createCheckoutLink,
  checkPaymentStatus,
  generateOrderId,
  formatCurrency,
  INFINITYPAY_HANDLE,
};
