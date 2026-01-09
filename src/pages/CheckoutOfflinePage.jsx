import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Monitor,
  CreditCard,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Check,
  Lock,
  Shield,
  Download,
  Loader2,
  QrCode,
  CheckCircle2,
  WifiOff,
  HardDrive,
  Star,
  Copy,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { createFullPixPayment, getPaymentStatus, generateExternalReference } from '@/services/asaas';
import { useSiteSettings, DEFAULT_SETTINGS } from '@/hooks/useSiteSettings';

// Mask helpers
const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const validateCPF = (cpf) => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(numbers[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(numbers[10]);
};

export default function CheckoutOfflinePage() {
  // Buscar configuracoes do banco
  const { settings } = useSiteSettings('offline');
  const { settings: paymentSettings } = useSiteSettings('payment');

  // Produto com valores do banco ou defaults
  const PRODUCT = {
    name: settings.offline_name || DEFAULT_SETTINGS.offline_name,
    description: settings.offline_description || DEFAULT_SETTINGS.offline_description,
    price: parseFloat(settings.offline_price) || DEFAULT_SETTINGS.offline_price,
    features: settings.offline_features || DEFAULT_SETTINGS.offline_features,
  };

  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Dados, 2: Pagamento PIX, 3: Sucesso
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollingRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    phone: '',
    cpf: '',
  });

  const [pixData, setPixData] = useState({
    paymentId: '',
    qrCodeImage: '',
    qrCodePayload: '',
    externalReference: '',
  });

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Informe seu nome completo');
      return false;
    }
    if (formData.name.trim().split(' ').length < 2) {
      toast.error('Informe nome e sobrenome');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Informe seu email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email invalido');
      return false;
    }
    if (formData.email !== formData.confirmEmail) {
      toast.error('Os emails nao conferem');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('Informe seu telefone');
      return false;
    }
    if (formData.phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone invalido');
      return false;
    }
    if (!formData.cpf.trim()) {
      toast.error('Informe seu CPF');
      return false;
    }
    if (!validateCPF(formData.cpf)) {
      toast.error('CPF invalido');
      return false;
    }
    if (!acceptTerms) {
      toast.error('Voce precisa aceitar os termos de uso');
      return false;
    }
    return true;
  };

  const handleGeneratePix = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const externalRef = generateExternalReference('OFFLINE');

      // Pegar API Key das configuracoes (banco ou env)
      const asaasApiKey = paymentSettings?.payment_asaas_api_key || import.meta.env.VITE_ASAAS_API_KEY;

      if (!asaasApiKey) {
        throw new Error('API Key do Asaas nao configurada. Configure nas configuracoes de pagamento.');
      }

      // Criar cobranca PIX no Asaas
      const result = await createFullPixPayment({
        customerName: formData.name,
        customerEmail: formData.email,
        customerCpf: formData.cpf,
        customerPhone: formData.phone,
        value: PRODUCT.price,
        description: `${PRODUCT.name} - Licenca Vitalicia`,
        externalReference: externalRef,
      }, asaasApiKey);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Salvar dados do pedido no localStorage
      const orderData = {
        externalReference: externalRef,
        paymentId: result.paymentId,
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
        },
        product: PRODUCT,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(`order_${externalRef}`, JSON.stringify(orderData));

      setPixData({
        paymentId: result.paymentId,
        qrCodeImage: result.qrCode.image,
        qrCodePayload: result.qrCode.payload,
        externalReference: externalRef,
      });

      setStep(2);
      toast.success('PIX gerado! Escaneie o QR Code para pagar.');

      // Iniciar polling para verificar pagamento
      startPaymentPolling(result.paymentId);

    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      toast.error(error.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Polling para verificar status do pagamento
  const startPaymentPolling = (paymentId) => {
    // Limpar polling anterior se existir
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    // Pegar API Key
    const asaasApiKey = paymentSettings?.payment_asaas_api_key || import.meta.env.VITE_ASAAS_API_KEY;

    // Verificar a cada 5 segundos
    pollingRef.current = setInterval(async () => {
      try {
        const result = await getPaymentStatus(paymentId, asaasApiKey);

        if (result.success && (result.status === 'RECEIVED' || result.status === 'CONFIRMED')) {
          // Pagamento confirmado!
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          // Limpar localStorage
          localStorage.removeItem(`order_${pixData.externalReference}`);

          setStep(3);
          toast.success('Pagamento confirmado!');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 5000);
  };

  // Verificar pagamento manualmente
  const handleCheckPayment = async () => {
    if (!pixData.paymentId) return;

    const asaasApiKey = paymentSettings?.payment_asaas_api_key || import.meta.env.VITE_ASAAS_API_KEY;

    setCheckingPayment(true);
    try {
      const result = await getPaymentStatus(pixData.paymentId, asaasApiKey);

      if (result.success) {
        if (result.status === 'RECEIVED' || result.status === 'CONFIRMED') {
          clearInterval(pollingRef.current);
          localStorage.removeItem(`order_${pixData.externalReference}`);
          setStep(3);
          toast.success('Pagamento confirmado!');
        } else if (result.status === 'PENDING') {
          toast.info('Pagamento ainda pendente. Aguarde a confirmacao.');
        } else {
          toast.warning(`Status: ${result.status}`);
        }
      }
    } catch (error) {
      toast.error('Erro ao verificar pagamento');
    } finally {
      setCheckingPayment(false);
    }
  };

  // Copiar codigo PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixData.qrCodePayload);
    toast.success('Codigo PIX copiado!');
  };

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

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4 text-green-600" />
              <span>Pagamento Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Seus Dados' },
              { num: 2, label: 'Pagamento' },
              { num: 3, label: 'Confirmacao' },
            ].map((s, index) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.num
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`hidden sm:block text-sm ${step >= s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${step > s.num ? 'bg-amber-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Customer Data */}
            {step === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Seus Dados</h2>
                    <p className="text-sm text-gray-500">Preencha seus dados para continuar</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Seu nome completo"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="seu@email.com"
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">O link sera enviado para este email</p>
                    </div>

                    <div>
                      <Label htmlFor="confirmEmail">Confirmar Email *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="confirmEmail"
                          type="email"
                          value={formData.confirmEmail}
                          onChange={(e) => handleInputChange('confirmEmail', e.target.value)}
                          placeholder="Confirme seu email"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                          placeholder="(00) 00000-0000"
                          className="pl-10"
                          maxLength={15}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <div className="relative mt-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                          placeholder="000.000.000-00"
                          className="pl-10"
                          maxLength={14}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-4">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={setAcceptTerms}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 leading-tight">
                      Li e aceito os{' '}
                      <Link to="/terms" className="text-amber-600 hover:underline">
                        Termos de Uso
                      </Link>{' '}
                      e{' '}
                      <Link to="/privacy" className="text-amber-600 hover:underline">
                        Politica de Privacidade
                      </Link>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/sistema-offline')}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 py-6"
                    onClick={handleGeneratePix}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>
                        Continuar para Pagamento
                        <CreditCard className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Payment - QR Code PIX */}
            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Pague com PIX</h2>
                    <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o codigo</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* QR Code */}
                  <div className="text-center">
                    <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 inline-block">
                      {pixData.qrCodeImage ? (
                        <img
                          src={pixData.qrCodeImage}
                          alt="QR Code PIX"
                          className="w-48 h-48 mx-auto"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                      Abra o app do seu banco e escaneie
                    </p>
                  </div>

                  {/* Info e Copia/Cola */}
                  <div className="space-y-4">
                    {/* Valor */}
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-amber-700">Valor a pagar</p>
                      <p className="text-3xl font-bold text-amber-600">
                        R$ {PRODUCT.price.toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    {/* Copia e Cola */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700">PIX Copia e Cola:</Label>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-mono text-gray-600 break-all line-clamp-2">
                          {pixData.qrCodePayload || 'Carregando...'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={handleCopyPix}
                        disabled={!pixData.qrCodePayload}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Codigo PIX
                      </Button>
                    </div>

                    {/* Timer */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Aguardando pagamento...</p>
                          <p className="text-xs text-blue-600 mt-1">
                            O QR Code expira em 24 horas. Apos o pagamento, a confirmacao e automatica.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seguranca */}
                    <div className="flex items-center gap-4 justify-center text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-green-600" />
                        <span>Pagamento Seguro</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-600" />
                        <span>Dados Protegidos</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      setStep(1);
                    }}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 py-6"
                    onClick={handleCheckPayment}
                    disabled={checkingPayment}
                  >
                    {checkingPayment ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Ja paguei, verificar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Pagamento Confirmado!
                </h2>
                <p className="text-gray-600 mb-8">
                  Obrigado pela sua compra. Enviamos o link de download para <strong>{formData.email}</strong>
                </p>

                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Download className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Proximos Passos</h3>
                  <ol className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      Verifique seu email (inclusive a pasta de spam)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      Clique no link para baixar o instalador
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      Execute o instalador e siga as instrucoes
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                      Pronto! Comece a usar o Sellx Offline
                    </li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={() => window.open('mailto:' + formData.email, '_blank')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Abrir Email
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/">
                      Voltar ao Inicio
                    </Link>
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-8">
                  Nao recebeu o email? Entre em contato: suporte@sellx.com.br
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>

              {/* Product */}
              <div className="flex gap-4 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-8 h-8 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{PRODUCT.name}</h4>
                  <p className="text-sm text-gray-500">{PRODUCT.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <WifiOff className="w-3 h-3 text-amber-600" />
                    <span className="text-xs text-gray-500">Funciona offline</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="py-4 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Incluso:</p>
                <ul className="space-y-2">
                  {PRODUCT.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">R$ {PRODUCT.price.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Desconto</span>
                  <span className="text-green-600">- R$ 0,00</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-amber-600">R$ {PRODUCT.price.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>Pagamento 100% seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Download imediato</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>Licenca vitalicia</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
