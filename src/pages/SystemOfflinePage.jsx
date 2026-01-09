import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  ShoppingCart,
  Shield,
  Zap,
  Star,
  CreditCard,
  HardDrive,
  WifiOff,
  Lock,
  Play,
  Cpu,
  Database,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useSiteSettings, DEFAULT_SETTINGS } from '@/hooks/useSiteSettings';

const FEATURES = [
  {
    icon: WifiOff,
    title: 'Funciona 100% Offline',
    description: 'Nao precisa de internet para funcionar. Seus dados ficam armazenados localmente no seu computador.',
  },
  {
    icon: Zap,
    title: 'Ultra Rapido',
    description: 'Como os dados estao no seu PC, tudo e instantaneo. PDV rapido mesmo em computadores simples.',
  },
  {
    icon: Lock,
    title: 'Dados 100% Seus',
    description: 'Total privacidade. Seus dados nao saem do seu computador. Voce tem controle total.',
  },
  {
    icon: CreditCard,
    title: 'Pagamento Unico',
    description: 'Pague uma vez e use para sempre. Sem mensalidades, sem surpresas, sem taxas ocultas.',
  },
  {
    icon: ShoppingCart,
    title: 'PDV Completo',
    description: 'Mesmo PDV poderoso da versao online. Codigo de barras, multiplos pagamentos, impressao.',
  },
  {
    icon: Shield,
    title: 'Licenca Vitalicia',
    description: 'A licenca e permanente. O sistema e seu para sempre, sem data de validade.',
  },
];

const REQUIREMENTS = [
  { label: 'Sistema Operacional', value: 'Windows 10 ou superior (64 bits)' },
  { label: 'Processador', value: 'Intel Core i3 ou equivalente' },
  { label: 'Memoria RAM', value: 'Minimo 4GB (recomendado 8GB)' },
  { label: 'Espaco em Disco', value: '500MB para instalacao' },
  { label: 'Resolucao', value: 'Minimo 1280x720' },
];

const ALL_FEATURES = [
  'PDV completo com codigo de barras',
  'Cadastro de produtos ilimitados',
  'Cadastro de clientes ilimitados',
  'Controle de estoque completo',
  'Contas a pagar e receber',
  'Controle de caixa',
  'Relatorios e graficos',
  'Multiplas formas de pagamento',
  'Sistema de permissoes por usuario',
  'Backup local dos dados',
  'Impressao de cupons',
  'Dashboard com indicadores',
];

export default function SystemOfflinePage() {
  // Buscar configuracoes do banco
  const { settings, loading } = useSiteSettings('offline');

  // Valores do banco ou defaults
  const price = parseFloat(settings.offline_price) || DEFAULT_SETTINGS.offline_price;

  // Formatar preco
  const formatPrice = (value) => {
    return value.toFixed(2).replace('.', ',');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#1e3a5f]">Sellx</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Inicio
              </Link>
              <Link to="/sistemas" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Sistemas
              </Link>
              <Link to="/Login" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Entrar
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Button asChild className="bg-amber-500 hover:bg-amber-600">
                <Link to="/checkout-offline">
                  Comprar Agora - R$ {formatPrice(price)}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-amber-100 text-amber-700 hover:bg-amber-100">
                <Monitor className="w-3 h-3 mr-1" />
                Sistema Desktop
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Sellx <span className="text-amber-600">Offline</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Sistema de gestao completo para instalar no seu computador.
                Funciona sem internet, com seus dados armazenados localmente.
                Pague uma vez e use para sempre!
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-gray-700">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                  <span>Sem internet</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <HardDrive className="w-5 h-5 text-amber-600" />
                  <span>Dados locais</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span>Pague uma vez</span>
                </div>
              </div>

              {/* Price Box */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">Preco unico</p>
                    <p className="text-4xl font-bold">R$ {formatPrice(price)}</p>
                    <p className="text-amber-100 text-sm">Licenca vitalicia</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/20 text-white mb-2">
                      <Star className="w-3 h-3 mr-1 fill-white" />
                      Sem mensalidade
                    </Badge>
                    <p className="text-sm text-amber-100">Pague uma vez, use sempre</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-lg px-8 py-6"
                  asChild
                >
                  <Link to="/checkout-offline">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Comprar Agora
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  <Play className="w-5 h-5 mr-2" />
                  Ver Video
                </Button>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Sellx Offline</h3>
                    <Badge className="bg-green-100 text-green-700">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Vendas Hoje</p>
                      <p className="text-2xl font-bold text-amber-600">R$ 2.340</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Produtos</p>
                      <p className="text-2xl font-bold text-green-600">1.847</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Database className="w-4 h-4" />
                    <span>Dados salvos localmente</span>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">Ultra Rapido</span>
              </div>
              <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Dados Locais</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              O que esta incluso
            </h2>
            <p className="text-gray-600">
              Sistema completo com todas as funcionalidades que voce precisa
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {ALL_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Por que escolher o Sellx Offline?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ideal para quem tem internet instavel ou prefere ter total controle dos dados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
                  <feature.icon className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Requisitos do Sistema
            </h2>
            <p className="text-gray-600">
              Verifique se seu computador atende aos requisitos minimos
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {REQUIREMENTS.map((req, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 ${
                  index !== REQUIREMENTS.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-gray-900">{req.label}</span>
                </div>
                <span className="text-gray-600">{req.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-gray-600">
              Em poucos minutos voce esta usando o sistema
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-amber-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Compre</h3>
              <p className="text-gray-600">Faca o pagamento via PIX e receba o link de download imediatamente</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-amber-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Baixe e Instale</h3>
              <p className="text-gray-600">Download rapido. Instalacao simples em menos de 5 minutos</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-amber-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Use!</h3>
              <p className="text-gray-600">Sistema pronto para usar. Cadastre seus produtos e comece a vender</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-500 to-amber-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Adquira agora por apenas R$ {formatPrice(price)}
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Pagamento unico. Licenca vitalicia. Sem mensalidades.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-amber-600 hover:bg-gray-100 text-lg px-8 py-6"
              asChild
            >
              <Link to="/checkout-offline">
                <CreditCard className="w-5 h-5 mr-2" />
                Comprar Agora
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6" asChild>
              <Link to="/sistemas">
                Comparar com Online
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Sellx</span>
            </div>
            <p className="text-sm">
              2024 Sellx. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
