import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  Monitor,
  Check,
  X,
  Wifi,
  WifiOff,
  ShoppingCart,
  ArrowRight,
  Smartphone,
  HardDrive,
  RefreshCw,
  Shield,
  Users,
  Download,
  CreditCard,
  Zap,
  Star,
  ChevronRight,
  Menu,
  Package,
  BarChart3,
  Receipt,
  Warehouse,
} from 'lucide-react';

const COMPARISON_FEATURES = [
  { feature: 'PDV Completo', online: true, offline: true },
  { feature: 'Gestao de Estoque', online: true, offline: true },
  { feature: 'Cadastro de Clientes', online: true, offline: true },
  { feature: 'Contas a Pagar/Receber', online: true, offline: true },
  { feature: 'Controle de Caixa', online: true, offline: true },
  { feature: 'Relatorios e Graficos', online: true, offline: true },
  { feature: 'Sistema de Permissoes', online: true, offline: true },
  { feature: 'Funciona sem Internet', online: false, offline: true },
  { feature: 'Acesso de Qualquer Lugar', online: true, offline: false },
  { feature: 'Backup Automatico na Nuvem', online: true, offline: false },
  { feature: 'Acesso pelo Celular', online: true, offline: false },
  { feature: 'Multi-usuarios Simultaneos', online: true, offline: false },
  { feature: 'Atualizacoes Automaticas', online: true, offline: false },
  { feature: 'Pagamento Unico', online: false, offline: true },
];

export default function SystemsPage() {
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
              <Link to="/sistemas" className="text-[#1e3a5f] font-medium">
                Sistemas
              </Link>
              <Link to="/Login" className="text-gray-600 hover:text-[#1e3a5f] transition-colors">
                Entrar
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/Register">
                <Button className="bg-[#1e3a5f] hover:bg-[#2d5a87]">
                  Criar Conta Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Zap className="w-3 h-3 mr-1" />
            Escolha o ideal para voce
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Nossos <span className="text-[#1e3a5f]">Sistemas</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Oferecemos duas opcoes para atender diferentes necessidades.
            Escolha entre nossa versao na nuvem ou o sistema instalado no seu computador.
          </p>
        </div>
      </section>

      {/* Systems Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Online System Card */}
            <div className="relative bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-[#1e3a5f] hover:shadow-2xl transition-all group">
              <div className="absolute top-4 right-4">
                <Badge className="bg-green-100 text-green-700">
                  <Star className="w-3 h-3 mr-1 fill-green-700" />
                  Mais Popular
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Cloud className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Sellx Online</h2>
                  <p className="text-gray-600">Sistema na Nuvem</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Acesse seu sistema de qualquer lugar, a qualquer hora. Seus dados ficam
                seguros na nuvem com backup automatico. Ideal para quem precisa de mobilidade
                e acesso em multiplos dispositivos.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Acesse de qualquer dispositivo</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Backup automatico na nuvem</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Atualizacoes automaticas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Multi-usuarios simultaneos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Suporte incluso</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-sm text-gray-500">A partir de</span>
                <span className="text-4xl font-bold text-[#1e3a5f]">R$ 79</span>
                <span className="text-gray-600">/mes</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Wifi className="w-4 h-4" />
                <span>Requer conexao com internet</span>
              </div>

              <Link to="/sistema-online">
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#2d5a87] py-6 text-lg group-hover:shadow-lg transition-shadow">
                  Conhecer Sistema Online
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Offline System Card */}
            <div className="relative bg-white rounded-3xl border-2 border-gray-200 p-8 hover:border-amber-500 hover:shadow-2xl transition-all group">
              <div className="absolute top-4 right-4">
                <Badge className="bg-amber-100 text-amber-700">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Pagamento Unico
                </Badge>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Sellx Offline</h2>
                  <p className="text-gray-600">Sistema Desktop</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                Instale no seu computador e use sem precisar de internet. Seus dados
                ficam armazenados localmente com total privacidade. Ideal para quem
                tem conexao instavel ou prefere controle total.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-gray-700">Funciona 100% sem internet</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-gray-700">Dados armazenados no seu PC</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-gray-700">Pagamento unico (sem mensalidade)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-gray-700">Mais velocidade (dados locais)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-gray-700">Licenca vitalicia</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-bold text-amber-600">R$ 69,90</span>
                <span className="text-gray-600">unico</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <WifiOff className="w-4 h-4" />
                <span>Nao precisa de internet</span>
              </div>

              <Link to="/sistema-offline">
                <Button className="w-full bg-amber-500 hover:bg-amber-600 py-6 text-lg group-hover:shadow-lg transition-shadow">
                  Conhecer Sistema Offline
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comparativo Completo
            </h2>
            <p className="text-gray-600">
              Veja as diferencas entre as duas versoes
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-gray-100 p-4 font-semibold">
              <div className="text-gray-700">Funcionalidade</div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Cloud className="w-5 h-5" />
                  Online
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <Monitor className="w-5 h-5" />
                  Offline
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {COMPARISON_FEATURES.map((item, index) => (
                <div key={index} className="grid grid-cols-3 p-4 hover:bg-gray-50">
                  <div className="text-gray-700">{item.feature}</div>
                  <div className="flex justify-center">
                    {item.online ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {item.offline ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer - Pricing */}
            <div className="grid grid-cols-3 bg-gray-50 p-6 border-t-2 border-gray-200">
              <div className="font-semibold text-gray-900">Investimento</div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">R$ 79/mes</p>
                <p className="text-sm text-gray-500">Plano Starter</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">R$ 69,90</p>
                <p className="text-sm text-gray-500">Pagamento unico</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Which One to Choose Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Qual escolher?
            </h2>
            <p className="text-gray-600">
              Ajudamos voce a decidir qual sistema e melhor para seu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Choose Online */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Cloud className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Escolha o Online se:</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">Precisa acessar de varios dispositivos (celular, tablet, outro PC)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">Tem mais de uma pessoa usando o sistema ao mesmo tempo</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">Quer backup automatico sem se preocupar</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">Prefere pagar mensalmente conforme usa</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 mt-0.5" />
                  <span className="text-gray-700">Tem boa conexao de internet no estabelecimento</span>
                </li>
              </ul>
              <Link to="/sistema-online" className="block mt-6">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Ver Planos Online
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Choose Offline */}
            <div className="bg-amber-50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Monitor className="w-8 h-8 text-amber-600" />
                <h3 className="text-xl font-bold text-gray-900">Escolha o Offline se:</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">Sua internet e instavel ou inexistente</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">Prefere pagar uma vez so e usar para sempre</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">Usa apenas em um computador</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">Quer total controle sobre seus dados</span>
                </li>
                <li className="flex items-start gap-3">
                  <ChevronRight className="w-5 h-5 text-amber-600 mt-0.5" />
                  <span className="text-gray-700">Precisa de maxima velocidade no PDV</span>
                </li>
              </ul>
              <Link to="/sistema-offline" className="block mt-6">
                <Button className="w-full bg-amber-500 hover:bg-amber-600">
                  Comprar Offline
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Both Have */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades em Ambas as Versoes
            </h2>
            <p className="text-gray-600">
              Independente da sua escolha, voce tera acesso a todas essas funcionalidades
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShoppingCart, title: 'PDV Completo', desc: 'Vendas rapidas e eficientes' },
              { icon: Package, title: 'Controle de Estoque', desc: 'Entradas, saidas e alertas' },
              { icon: Users, title: 'Clientes', desc: 'Cadastro e historico' },
              { icon: CreditCard, title: 'Financeiro', desc: 'Contas a pagar e receber' },
              { icon: BarChart3, title: 'Relatorios', desc: 'Graficos e analises' },
              { icon: Receipt, title: 'Caixa', desc: 'Abertura, fechamento e sangria' },
              { icon: Shield, title: 'Permissoes', desc: 'Controle de acesso por usuario' },
              { icon: Warehouse, title: 'Multi-lojas', desc: 'Gerencie varias unidades' },
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ainda tem duvidas?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Entre em contato conosco! Teremos prazer em ajudar voce a escolher a melhor opcao.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-green-500 hover:bg-green-600 text-lg px-8 py-6">
                Falar no WhatsApp
              </Button>
            </a>
            <Link to="/Register">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                Testar Sistema Online Gratis
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
