import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Mail,
  Clock,
  AlertCircle,
  Home,
  RefreshCw,
} from 'lucide-react';
import { checkPaymentStatus } from '@/services/infinitypay';

export default function CheckoutRetornoPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, pending, error
  const [orderData, setOrderData] = useState(null);

  // Parametros retornados pela InfinityPay
  const orderNsu = searchParams.get('order') || searchParams.get('order_nsu');
  const transactionNsu = searchParams.get('transaction_nsu');
  const slug = searchParams.get('slug');
  const receiptUrl = searchParams.get('receipt_url');

  useEffect(() => {
    const verifyPayment = async () => {
      // Recuperar dados do pedido do localStorage
      const savedOrder = localStorage.getItem(`order_${orderNsu}`);
      if (savedOrder) {
        setOrderData(JSON.parse(savedOrder));
      }

      // Se temos transaction_nsu, significa que o pagamento foi processado
      if (transactionNsu) {
        try {
          const result = await checkPaymentStatus({
            orderNsu,
            transactionNsu,
            slug,
          });

          if (result.success && result.status === 'approved') {
            setStatus('success');
            // Limpar dados do localStorage apos sucesso
            localStorage.removeItem(`order_${orderNsu}`);
          } else if (result.status === 'pending') {
            setStatus('pending');
          } else {
            setStatus('error');
          }
        } catch {
          // Se houver erro na verificacao mas temos transaction_nsu,
          // assumimos que foi aprovado (webhook confirmara)
          setStatus('success');
        }
      } else if (orderNsu) {
        // Usuario voltou sem completar o pagamento
        setStatus('pending');
      } else {
        setStatus('error');
      }
    };

    verifyPayment();
  }, [orderNsu, transactionNsu, slug]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#1e3a5f]">Sellx</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <Loader2 className="w-16 h-16 text-amber-500 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verificando Pagamento
            </h1>
            <p className="text-gray-600">
              Aguarde enquanto confirmamos seu pagamento...
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-green-600 mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-gray-600 mb-8">
              Obrigado pela sua compra do Sellx Offline.
            </p>

            {orderData && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">Detalhes do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pedido:</span>
                    <span className="font-mono text-gray-900">{orderNsu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Produto:</span>
                    <span className="text-gray-900">{orderData.product?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor:</span>
                    <span className="text-gray-900 font-semibold">
                      R$ {orderData.product?.price?.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-900">{orderData.customer?.email}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Verifique seu Email</h3>
              </div>
              <p className="text-sm text-blue-700">
                Enviamos o link de download para <strong>{orderData?.customer?.email}</strong>.
                Verifique tambem a pasta de spam.
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-6 h-6 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Proximos Passos</h3>
              </div>
              <ol className="text-sm text-amber-800 space-y-2 text-left">
                <li>1. Abra seu email e localize a mensagem do Sellx</li>
                <li>2. Clique no link para baixar o instalador</li>
                <li>3. Execute o arquivo .exe para instalar</li>
                <li>4. Pronto! Comece a usar o sistema</li>
              </ol>
            </div>

            {receiptUrl && (
              <Button
                variant="outline"
                className="mb-4 w-full"
                onClick={() => window.open(receiptUrl, '_blank')}
              >
                Ver Comprovante
              </Button>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1 bg-amber-500 hover:bg-amber-600">
                <a href={`mailto:${orderData?.customer?.email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Abrir Email
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Inicio
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pending State */}
        {status === 'pending' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>

            <h1 className="text-2xl font-bold text-amber-600 mb-2">
              Pagamento Pendente
            </h1>
            <p className="text-gray-600 mb-8">
              Seu pagamento ainda nao foi confirmado. Se voce ja efetuou o pagamento,
              aguarde alguns instantes e atualize esta pagina.
            </p>

            {orderData && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">Dados do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pedido:</span>
                    <span className="font-mono text-gray-900">{orderNsu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-900">{orderData.customer?.email}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-4 mb-8">
              <p className="text-sm text-blue-700">
                Pagamentos via PIX sao confirmados em segundos.
                Se voce pagou com cartao, pode levar ate 1 minuto.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Novamente
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/checkout-offline">
                  Voltar ao Checkout
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Erro no Pagamento
            </h1>
            <p className="text-gray-600 mb-8">
              Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente.
            </p>

            <div className="bg-red-50 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 text-left">
                  Se o valor foi debitado da sua conta, entre em contato conosco
                  pelo email suporte@sellx.com.br informando o numero do pedido.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1 bg-amber-500 hover:bg-amber-600">
                <Link to="/checkout-offline">
                  Tentar Novamente
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/">
                  Voltar ao Inicio
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Suporte */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Precisa de ajuda? Entre em contato: suporte@sellx.com.br
        </p>
      </div>
    </div>
  );
}
