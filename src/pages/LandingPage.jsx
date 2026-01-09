import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  CreditCard,
  Smartphone,
  Shield,
  Zap,
  Check,
  ChevronRight,
  Menu,
  X,
  Star,
  ArrowRight,
  Play,
  Clock,
  TrendingUp,
  Receipt,
  Warehouse,
  FileText,
  HeadphonesIcon,
  Cloud,
  Lock,
  Download,
  Monitor,
  Share,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'PDV Completo',
    description: 'Sistema de ponto de venda rapido e intuitivo. Venda presencial com suporte a codigo de barras, multiplas formas de pagamento e impressao de cupons.',
  },
  {
    icon: Package,
    title: 'Gestao de Estoque',
    description: 'Controle total do seu estoque com alertas de reposicao, rastreamento de lotes, movimentacoes e inventario automatizado.',
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
    icon: Smartphone,
    title: 'App Mobile',
    description: 'Instale o app no celular ou computador para acesso rapido e experiencia de aplicativo nativo.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    description: 'Para pequenos negocios',
    price: 79,
    features: [
      '1 usuario',
      '1 PDV',
      'Ate 500 produtos',
      'Relatorios basicos',
      'Suporte por email',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'Para negocios em crescimento',
    price: 149,
    features: [
      '5 usuarios',
      '3 PDVs',
      'Produtos ilimitados',
      'Relatorios avancados',
      'Suporte prioritario',
      'Integracao fiscal',
      'App mobile',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'Para grandes operacoes',
    price: 299,
    features: [
      'Usuarios ilimitados',
      'PDVs ilimitados',
      'Multi-lojas',
      'API completa',
      'Suporte 24/7',
      'Consultoria dedicada',
      'Backup em tempo real',
      'Treinamento incluso',
    ],
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Carlos Silva',
    role: 'Dono de Mercado',
    company: 'Mercado Bom Preco',
    image: null,
    text: 'O Sellx transformou meu negocio. Antes eu perdia horas com controle manual, agora tenho tudo na palma da mao. As vendas aumentaram 30% no primeiro mes!',
    rating: 5,
  },
  {
    name: 'Maria Santos',
    role: 'Gerente',
    company: 'Loja Fashion Store',
    image: null,
    text: 'Sistema completo e facil de usar. Minha equipe aprendeu em menos de uma hora. O suporte e excelente e sempre resolve nossas duvidas rapidamente.',
    rating: 5,
  },
  {
    name: 'Pedro Oliveira',
    role: 'Proprietario',
    company: 'Pet Shop Amigo Fiel',
    image: null,
    text: 'O sistema e muito rapido e facil de usar! Consigo fazer tudo pelo celular. Recomendo para todos os comerciantes.',
    rating: 5,
  },
];

const FAQS = [
  {
    question: 'Preciso instalar alguma coisa?',
    answer: 'Nao! O Sellx funciona direto no navegador. Basta acessar e comecar a usar. Voce tambem pode instalar como app no celular ou computador para acesso rapido.',
  },
  {
    question: 'O sistema e seguro?',
    answer: 'Sim! Utilizamos criptografia SSL, backups automaticos e seguimos as melhores praticas de seguranca. Seus dados estao protegidos em servidores de alta disponibilidade.',
  },
  {
    question: 'Posso migrar meus dados de outro sistema?',
    answer: 'Sim! Oferecemos importacao de dados via planilha Excel/CSV. Nossa equipe tambem pode ajudar na migracao sem custo adicional.',
  },
  {
    question: 'O sistema emite nota fiscal?',
    answer: 'Sim, nos planos Professional e Enterprise. Emitimos NF-e, NFC-e e integramos com os principais sistemas fiscais do Brasil.',
  },
  {
    question: 'Tem contrato de fidelidade?',
    answer: 'Nao! Voce pode cancelar a qualquer momento. Acreditamos que voce deve ficar porque gosta do servico, nao por obrigacao.',
  },
  {
    question: 'Quantos usuarios posso ter?',
    answer: 'Depende do plano escolhido. O Starter permite 1 usuario, o Professional ate 5, e o Enterprise tem usuarios ilimitados.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showIOSDialog, setShowIOSDialog] = useState(false);
  const navigate = useNavigate();

  // PWA Install
  const { isInstallable, isInstalled, isIOS, installApp, getIOSInstructions } = usePWAInstall();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else if (isInstallable) {
      const result = await installApp();
      if (result.success) {
        // App instalado com sucesso
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#1e3a5f]">Sellx</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/sistemas" className="text-gray-600 hover:text-[#1e3a5f] transition-colors font-medium">
                Sistemas
              </Link>
              <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Precos
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Depoimentos
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                FAQ
              </button>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {/* Botão Instalar App */}
              {(isInstallable || isIOS) && !isInstalled && (
                <Button
                  variant="outline"
                  onClick={handleInstallClick}
                  className="gap-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                >
                  <Download className="w-4 h-4" />
                  Instalar App
                </Button>
              )}
              <Link to="/Login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/Register">
                <Button className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
                  Criar Conta Gratis
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="px-4 space-y-4">
              <Link to="/sistemas" className="block w-full text-left py-2 text-[#1e3a5f] font-medium">
                Sistemas
              </Link>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-600">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left py-2 text-gray-600">
                Precos
              </button>
              <button onClick={() => scrollToSection('testimonials')} className="block w-full text-left py-2 text-gray-600">
                Depoimentos
              </button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-2 text-gray-600">
                FAQ
              </button>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                {/* Botão Instalar App Mobile */}
                {(isInstallable || isIOS) && !isInstalled && (
                  <Button
                    variant="outline"
                    onClick={handleInstallClick}
                    className="w-full gap-2 border-[#1e3a5f] text-[#1e3a5f]"
                  >
                    <Download className="w-4 h-4" />
                    Instalar App
                  </Button>
                )}
                <Link to="/Login" className="block">
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link to="/Register" className="block">
                  <Button className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]">Criar Conta Gratis</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                <span>Novo: Instale como App!</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Sistema de Gestao
                <span className="text-[#1e3a5f]"> Completo</span> para seu Negocio
              </h1>

              <p className="text-xl text-gray-600 max-w-xl">
                PDV, estoque, financeiro, clientes e muito mais em uma unica plataforma.
                Simples de usar, poderoso nos resultados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/Register">
                  <Button size="lg" className="bg-[#1e3a5f] hover:bg-[#2d5a87] text-lg px-8 py-6 w-full sm:w-auto">
                    Comecar Gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => scrollToSection('demo')}>
                  <Play className="w-5 h-5 mr-2" />
                  Ver Demonstracao
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">14 dias gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Sem cartao</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Suporte incluso</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Dashboard</h3>
                    <span className="text-xs text-gray-500">Hoje</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Vendas Hoje</p>
                      <p className="text-2xl font-bold text-green-600">R$ 4.580</p>
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +12% vs ontem
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Pedidos</p>
                      <p className="text-2xl font-bold text-blue-600">47</p>
                      <p className="text-xs text-blue-600">8 pendentes</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Ticket Medio</span>
                      <span className="font-semibold">R$ 97,44</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Produtos Vendidos</span>
                      <span className="font-semibold">156 itens</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Venda Finalizada</p>
                    <p className="text-xs text-gray-500">R$ 245,00</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-lg p-4 hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Estoque Atualizado</p>
                    <p className="text-xs text-gray-500">+50 unidades</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-white">5.000+</p>
              <p className="text-blue-200 mt-2">Empresas Ativas</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">R$ 2bi+</p>
              <p className="text-blue-200 mt-2">Em Vendas Processadas</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">99.9%</p>
              <p className="text-blue-200 mt-2">Uptime Garantido</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-white">4.9/5</p>
              <p className="text-blue-200 mt-2">Avaliacao dos Clientes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Tudo que voce precisa em um so lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Funcionalidades pensadas para facilitar o dia a dia do seu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-shadow group"
              >
                <div className="w-14 h-14 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center mb-6 group-hover:bg-[#1e3a5f] transition-colors">
                  <feature.icon className="w-7 h-7 text-[#1e3a5f] group-hover:text-white transition-colors" />
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

          {/* Additional Features List */}
          <div className="mt-16 bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-center mb-8">E muito mais...</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Receipt, text: 'Emissao de NF-e/NFC-e' },
                { icon: Warehouse, text: 'Multi-lojas' },
                { icon: FileText, text: 'Orcamentos' },
                { icon: Clock, text: 'Pedidos Futuros' },
                { icon: HeadphonesIcon, text: 'Suporte Humanizado' },
                { icon: Cloud, text: 'Backup Automatico' },
                { icon: Lock, text: 'Seguranca SSL' },
                { icon: Smartphone, text: 'App Mobile' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3">
                  <item.icon className="w-5 h-5 text-[#1e3a5f]" />
                  <span className="text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Planos para todos os tamanhos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para o seu negocio. Todos incluem 14 dias gratis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'ring-2 ring-[#1e3a5f] shadow-xl scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="bg-[#1e3a5f] text-white text-sm font-medium px-4 py-1 rounded-full inline-block mb-4">
                    Mais Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-1">{plan.description}</p>

                <div className="mt-6 mb-8">
                  <span className="text-4xl font-bold text-gray-900">R$ {plan.price}</span>
                  <span className="text-gray-600">/mes</span>
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
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-[#1e3a5f] hover:bg-[#2d5a87]'
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
            Todos os planos incluem suporte, atualizacoes e backup automatico.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Milhares de negocios confiam no Sellx
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-semibold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role} - {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas duvidas sobre o Sellx
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pronto para transformar seu negocio?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Comece agora mesmo com 14 dias gratis. Sem compromisso, sem cartao de credito.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/Register">
              <Button size="lg" className="bg-white text-[#1e3a5f] hover:bg-gray-100 text-lg px-8 py-6">
                Criar Minha Conta Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/Login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                Ja tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">Sellx</span>
              </div>
              <p className="text-sm">
                Sistema de gestao completo para comercios de todos os tamanhos.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Precos</button></li>
                <li><a href="#" className="hover:text-white transition-colors">Integracoes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentacao</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status do Sistema</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              2024 Sellx. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/></svg>
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <span className="sr-only">YouTube</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Banner de Instalação Flutuante - Desktop/Android */}
      {isInstallable && !isInstalled && (
        <div className="fixed bottom-6 right-6 z-50 hidden md:block">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm animate-in slide-in-from-bottom-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center flex-shrink-0">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Instalar Sellx</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Adicione o app na sua area de trabalho para acesso rapido!
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-[#1e3a5f] hover:bg-[#2d5a87]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Instalar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Instrucoes para iOS */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              Instalar no iPhone/iPad
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-gray-600">
              Para instalar o Sellx no seu dispositivo iOS, siga os passos abaixo no Safari:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Toque no botao de compartilhar</p>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <Share className="w-4 h-4" />
                    Icone de quadrado com seta para cima
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Role e toque em "Adicionar a Tela de Inicio"</p>
                  <p className="text-sm text-gray-600 mt-1">
                    O icone tem um simbolo de +
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0 font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Toque em "Adicionar"</p>
                  <p className="text-sm text-gray-600 mt-1">
                    O app sera adicionado a sua tela inicial
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowIOSDialog(false)} className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87]">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
