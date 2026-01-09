import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  Check,
  ShoppingCart,
  ArrowRight,
  Smartphone,
  Shield,
  Users,
  Zap,
  Star,
  ChevronRight,
  Package,
  BarChart3,
  Receipt,
  Warehouse,
  CreditCard,
  Clock,
  Headphones,
  RefreshCw,
  Lock,
  Globe,
  Laptop,
  Play,
} from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    description: 'Para pequenos negocios',
    price: 79,
    yearlyPrice: 63,
    features: [
      '1 usuario',
      '1 terminal PDV',
      'Ate 500 produtos',
      'Ate 500 clientes',
      '100 vendas/mes',
      'Relatorios basicos',
      'Suporte por email',
    ],
    highlighted: false,
    color: 'blue',
  },
  {
    name: 'Professional',
    description: 'Para negocios em crescimento',
    price: 149,
    yearlyPrice: 119,
    features: [
      '5 usuarios',
      '3 terminais PDV',
      'Produtos ilimitados',
      'Clientes ilimitados',
      'Vendas ilimitadas',
      'Relatorios avancados',
      'Suporte prioritario',
      'Integracao fiscal (NF-e)',
      'App mobile',
      'Multi-lojas (ate 3)',
    ],
    highlighted: true,
    color: 'primary',
  },
  {
    name: 'Enterprise',
    description: 'Para grandes operacoes',
    price: 299,
    yearlyPrice: 239,
    features: [
      'Usuarios ilimitados',
      'PDVs ilimitados',
      'Tudo ilimitado',
      'Relatorios personalizados',
      'Suporte 24/7',
      'Consultoria dedicada',
      'API completa',
      'Multi-lojas ilimitadas',
      'Backup em tempo real',
      'Treinamento incluso',
      'Gerente de conta',
    ],
    highlighted: false,
    color: 'amber',
  },
];

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'PDV Rapido e Intuitivo',
    description: 'Interface otimizada para vendas rapidas. Suporte a codigo de barras, multiplas formas de pagamento e impressao de cupons.',
  },
  {
    icon: Package,
    title: 'Gestao de Estoque Completa',
    description: 'Controle de entradas, saidas, transferencias, inventario, alertas de estoque minimo e rastreamento de lotes.',
  },
  {
    icon: Users,
    title: 'Cadastro de Clientes',
    description: 'Gerencie sua base de clientes com historico de compras, programa de fidelidade, aniversarios e muito mais.',
  },
  {
    icon: CreditCard,
    title: 'Financeiro Integrado',
    description: 'Controle de contas a pagar e receber, fluxo de caixa, DRE, conciliacao bancaria e gestao de cheques.',
  },
  {
    icon: BarChart3,
    title: 'Relatorios Avancados',
    description: 'Dashboards em tempo real, relatorios de vendas, comissoes, lucratividade e exportacao em PDF/Excel.',
  },
  {
    icon: Shield,
    title: 'Seguranca Total',
    description: 'Criptografia SSL, backups automaticos diarios, controle de acesso por usuario e auditoria de acoes.',
  },
];

export default function SystemOnlinePage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

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
              <Link to="/Register">
                <Button className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
                  Comecar Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
                <Cloud className="w-3 h-3 mr-1" />
                Sistema na Nuvem
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Sellx <span className="text-blue-600">Online</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Acesse seu sistema de gestao de qualquer lugar, a qualquer hora.
                Seus dados ficam seguros na nuvem com backup automatico e atualizacoes constantes.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-gray-700">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span>Acesso de qualquer lugar</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Laptop className="w-5 h-5 text-blue-600" />
                  <span>Qualquer dispositivo</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <span>Backup automatico</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/Register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                    Testar 14 Dias Gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  <Play className="w-5 h-5 mr-2" />
                  Ver Demonstracao
                </Button>
              </div>

              <div className="flex items-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Sem cartao de credito</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Cancele quando quiser</span>
                </div>
              </div>
            </div>

            {/* Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Dashboard Online</h3>
                    <Badge className="bg-green-100 text-green-700">Ao vivo</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Vendas Hoje</p>
                      <p className="text-2xl font-bold text-blue-600">R$ 4.580</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Clientes</p>
                      <p className="text-2xl font-bold text-green-600">1.247</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Cloud className="w-4 h-4" />
                    <span>Sincronizado em tempo real</span>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Acesso Mobile</span>
              </div>
              <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-lg p-3 hidden lg:flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">100% Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tudo que voce precisa para gerenciar seu negocio
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Funcionalidades completas pensadas para facilitar o dia a dia do seu comercio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
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

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Planos e Precos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Escolha o plano ideal para o tamanho do seu negocio
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-gray-200 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full transition-colors flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600'
                }`}
              >
                Anual
                <Badge className="bg-green-100 text-green-700 text-xs">-20%</Badge>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {PLANS.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-xl scale-105 relative'
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1 fill-white" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-1">{plan.description}</p>

                <div className="mt-6 mb-8">
                  <span className="text-4xl font-bold text-gray-900">
                    R$ {billingCycle === 'yearly' ? plan.yearlyPrice : plan.price}
                  </span>
                  <span className="text-gray-600">/mes</span>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Economia de R$ {(plan.price - plan.yearlyPrice) * 12}/ano
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/Register">
                  <Button
                    className={`w-full py-6 ${
                      plan.highlighted
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    Comecar Agora
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-8">
            Todos os planos incluem 14 dias gratis para testar. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Por que escolher o Sellx Online?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Acesse de Qualquer Lugar</h3>
                    <p className="text-gray-600">Celular, tablet, computador. Em casa, no trabalho ou viajando.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Seus Dados Sempre Seguros</h3>
                    <p className="text-gray-600">Backup automatico diario. Nunca mais perca informacoes importantes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Sempre Atualizado</h3>
                    <p className="text-gray-600">Novas funcionalidades e melhorias automaticamente, sem reinstalar nada.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Headphones className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Suporte Humanizado</h3>
                    <p className="text-gray-600">Equipe brasileira pronta para ajudar voce por email, chat ou telefone.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600">99.9%</div>
                  <div className="text-gray-600">Uptime garantido</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-green-600">5.000+</div>
                  <div className="text-gray-600">Empresas ativas</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-amber-600">4.9/5</div>
                  <div className="text-gray-600">Avaliacao dos clientes</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-purple-600">&lt;2min</div>
                  <div className="text-gray-600">Tempo medio de resposta</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pronto para comecar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Teste gratis por 14 dias. Sem compromisso, sem cartao de credito.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/Register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                Criar Minha Conta Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/sistemas">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                Comparar com Offline
              </Button>
            </Link>
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
