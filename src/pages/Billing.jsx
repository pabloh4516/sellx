import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth, OwnerOnly } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  CreditCard, Check, Crown, Zap, Building2, Users, Package,
  ShoppingCart, Calendar, AlertTriangle, ArrowRight, Star, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
} from '@/components/nexo';

const PLAN_FEATURES = {
  free: {
    name: 'Gratuito',
    price: 0,
    priceYearly: 0,
    icon: Package,
    color: 'bg-gray-500',
    features: [
      '1 usuario',
      'Ate 50 produtos',
      'Ate 50 clientes',
      'PDV basico',
      'Relatorios simples',
    ],
    limits: {
      users: 1,
      products: 50,
      customers: 50,
      sales: 50,
    },
  },
  starter: {
    name: 'Starter',
    price: 49.90,
    priceYearly: 479.00,
    icon: Zap,
    color: 'bg-blue-500',
    popular: false,
    features: [
      'Ate 3 usuarios',
      'Ate 500 produtos',
      'Ate 500 clientes',
      'PDV completo',
      'Relatorios',
      'Integracao WhatsApp',
      'Backup automatico',
    ],
    limits: {
      users: 3,
      products: 500,
      customers: 500,
      sales: 500,
    },
  },
  professional: {
    name: 'Profissional',
    price: 99.90,
    priceYearly: 959.00,
    icon: Crown,
    color: 'bg-purple-500',
    popular: true,
    features: [
      'Ate 10 usuarios',
      'Ate 5.000 produtos',
      'Ate 5.000 clientes',
      'Tudo do Starter',
      'Relatorios avancados',
      'API de integracao',
      'Multi-lojas',
      'Suporte prioritario',
    ],
    limits: {
      users: 10,
      products: 5000,
      customers: 5000,
      sales: 5000,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: 299.90,
    priceYearly: 2879.00,
    icon: Building2,
    color: 'bg-amber-500',
    features: [
      'Usuarios ilimitados',
      'Produtos ilimitados',
      'Clientes ilimitados',
      'Tudo do Profissional',
      'Suporte dedicado 24/7',
      'Personalizacao',
      'Treinamento incluso',
      'SLA garantido',
    ],
    limits: {
      users: -1,
      products: -1,
      customers: -1,
      sales: -1,
    },
  },
};

export default function Billing() {
  const { user, company, subscription, isOwner, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [usage, setUsage] = useState({ users: 0, products: 0, customers: 0 });
  const [loading, setLoading] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const currentPlan = company?.plan || 'free';
  const planInfo = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.free;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar contagens de uso
      const [usersCount, productsCount, customersCount] = await Promise.all([
        base44.entities.User.count?.() || 0,
        base44.entities.Product.count?.() || 0,
        base44.entities.Customer.count?.() || 0,
      ]);

      setUsage({
        users: usersCount,
        products: productsCount,
        customers: customersCount,
      });

      // Carregar historico de cobranca (se disponivel)
      try {
        const history = await base44.entities.BillingHistory?.list?.() || [];
        setBillingHistory(history);
      } catch (e) {
        console.log('No billing history');
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercent = (current, max) => {
    if (max === -1) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    toast.info('Redirecionando para pagamento...');
    // Aqui integraria com Stripe/PagSeguro/etc
    setShowUpgradeDialog(false);
  };

  // Verificar se e owner
  if (!isOwner()) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas o proprietario da conta pode acessar as configuracoes de faturamento.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Faturamento e Assinatura"
        subtitle="Gerencie seu plano e pagamentos"
        icon={CreditCard}
      />

      {/* Plano Atual */}
      <div className="mb-8">
        <CardSection title="Seu Plano Atual" icon={planInfo.icon}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-3 rounded-xl ${planInfo.color} text-white`}>
                  <planInfo.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{planInfo.name}</h3>
                  <p className="text-muted-foreground">
                    {planInfo.price === 0 ? 'Gratis' : `${formatCurrency(planInfo.price)}/mes`}
                  </p>
                </div>
              </div>
              {subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground mt-2">
                  Proximo faturamento: {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
            {currentPlan !== 'enterprise' && (
              <Button onClick={() => setShowUpgradeDialog(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            )}
          </div>
        </CardSection>
      </div>

      {/* Uso do Plano */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Uso do Plano</h3>
        <Grid cols={3}>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Usuarios</span>
              </div>
              <span className="text-sm">
                {usage.users} / {planInfo.limits.users === -1 ? '∞' : planInfo.limits.users}
              </span>
            </div>
            <Progress value={getUsagePercent(usage.users, planInfo.limits.users)} className="h-2" />
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Produtos</span>
              </div>
              <span className="text-sm">
                {usage.products} / {planInfo.limits.products === -1 ? '∞' : planInfo.limits.products}
              </span>
            </div>
            <Progress value={getUsagePercent(usage.products, planInfo.limits.products)} className="h-2" />
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Clientes</span>
              </div>
              <span className="text-sm">
                {usage.customers} / {planInfo.limits.customers === -1 ? '∞' : planInfo.limits.customers}
              </span>
            </div>
            <Progress value={getUsagePercent(usage.customers, planInfo.limits.customers)} className="h-2" />
          </div>
        </Grid>
      </div>

      {/* Planos Disponiveis */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Planos Disponiveis</h3>
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly' ? 'bg-background shadow' : ''
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly' ? 'bg-background shadow' : ''
              }`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>

        <Grid cols={4}>
          {Object.entries(PLAN_FEATURES).map(([key, plan]) => (
            <div
              key={key}
              className={`relative p-6 border rounded-xl ${
                key === currentPlan ? 'border-primary bg-primary/5' : 'border-border'
              } ${plan.popular ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Mais Popular</Badge>
                </div>
              )}

              <div className={`p-3 rounded-xl ${plan.color} text-white w-fit mb-4`}>
                <plan.icon className="w-6 h-6" />
              </div>

              <h4 className="text-xl font-bold mb-1">{plan.name}</h4>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {formatCurrency(billingCycle === 'yearly' ? plan.priceYearly / 12 : plan.price)}
                </span>
                <span className="text-muted-foreground">/mes</span>
                {billingCycle === 'yearly' && plan.price > 0 && (
                  <p className="text-sm text-green-600">
                    {formatCurrency(plan.priceYearly)}/ano
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {key === currentPlan ? (
                <Button variant="outline" className="w-full" disabled>
                  Plano Atual
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={key > currentPlan ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedPlan(key);
                    setShowUpgradeDialog(true);
                  }}
                >
                  {Object.keys(PLAN_FEATURES).indexOf(key) > Object.keys(PLAN_FEATURES).indexOf(currentPlan)
                    ? 'Fazer Upgrade'
                    : 'Mudar Plano'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          ))}
        </Grid>
      </div>

      {/* Historico de Cobranca */}
      {billingHistory.length > 0 && (
        <CardSection title="Historico de Cobranca" icon={Calendar}>
          <div className="divide-y">
            {billingHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Plano {PLAN_FEATURES[item.plan]?.name || item.plan}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.amount)}</p>
                  <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>
                    {item.status === 'paid' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {/* Dialog de Upgrade */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Mudanca de Plano</DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="py-4">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${PLAN_FEATURES[selectedPlan].color} text-white`}>
                  {React.createElement(PLAN_FEATURES[selectedPlan].icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <h4 className="font-bold">{PLAN_FEATURES[selectedPlan].name}</h4>
                  <p className="text-muted-foreground">
                    {formatCurrency(
                      billingCycle === 'yearly'
                        ? PLAN_FEATURES[selectedPlan].priceYearly
                        : PLAN_FEATURES[selectedPlan].price
                    )}
                    /{billingCycle === 'yearly' ? 'ano' : 'mes'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-sm">
                  Ao confirmar, voce sera redirecionado para a pagina de pagamento seguro.
                  A cobranca sera proporcional ao periodo restante do seu plano atual.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpgrade}>
              Confirmar Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
