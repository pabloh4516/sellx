import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Loader2,
  Zap,
  Crown,
  Rocket,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { getSubscription, getSubscriptionPayments, cancelSubscription } from '@/services/asaasSubscription';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import {
  PageContainer,
  PageHeader,
} from '@/components/nexo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLAN_ICONS = {
  starter: Zap,
  professional: Crown,
  enterprise: Rocket,
};

const PLAN_COLORS = {
  starter: 'blue',
  professional: 'violet',
  enterprise: 'amber',
};

const STATUS_CONFIG = {
  trial: {
    label: 'Periodo de Teste',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
  },
  active: {
    label: 'Ativo',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
  overdue: {
    label: 'Pagamento Pendente',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
  },
  expired: {
    label: 'Expirado',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
  },
};

export default function Subscription() {
  const { operator } = useAuth();
  const { settings: paymentSettings } = useSiteSettings('payment');
  const { settings: planSettings } = useSiteSettings('plans');

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, [operator]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      if (!operator?.organization_id) {
        console.log('Sem organization_id');
        return;
      }

      // Buscar dados da organizacao
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', operator.organization_id)
        .single();

      if (orgError) {
        console.error('Erro ao buscar organizacao:', orgError);
        return;
      }

      setOrganization(orgData);

      // Buscar pagamentos do banco local
      const { data: paymentsData } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('organization_id', operator.organization_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentsData) {
        setPayments(paymentsData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFromAsaas = async () => {
    if (!organization?.asaas_subscription_id) {
      toast.error('Assinatura nao encontrada no Asaas');
      return;
    }

    setLoadingPayments(true);
    try {
      const apiKey = paymentSettings?.payment_asaas_api_key;

      if (!apiKey) {
        toast.error('API Key do Asaas nao configurada');
        return;
      }

      // Buscar status atualizado da assinatura
      const subResult = await getSubscription(organization.asaas_subscription_id, apiKey);

      if (subResult.success) {
        // Atualizar status no banco local
        const newStatus = subResult.status === 'ACTIVE' ? 'active' :
                         subResult.status === 'INACTIVE' ? 'cancelled' :
                         organization.subscription_status;

        await supabase
          .from('organizations')
          .update({ subscription_status: newStatus })
          .eq('id', organization.id);

        setOrganization(prev => ({ ...prev, subscription_status: newStatus }));
      }

      // Buscar pagamentos do Asaas
      const paymentsResult = await getSubscriptionPayments(organization.asaas_subscription_id, apiKey);

      if (paymentsResult.success && paymentsResult.payments.length > 0) {
        // Salvar pagamentos no banco local
        for (const payment of paymentsResult.payments) {
          await supabase
            .from('subscription_payments')
            .upsert({
              asaas_payment_id: payment.id,
              organization_id: organization.id,
              asaas_subscription_id: organization.asaas_subscription_id,
              amount: payment.value,
              status: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'paid' :
                     payment.status === 'OVERDUE' ? 'overdue' : 'pending',
              billing_type: payment.billingType,
              due_date: payment.dueDate,
              payment_date: payment.paymentDate,
              invoice_url: payment.invoiceUrl,
            }, {
              onConflict: 'asaas_payment_id'
            });
        }

        // Recarregar pagamentos
        await loadSubscriptionData();
      }

      toast.success('Dados atualizados!');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!organization?.asaas_subscription_id) {
      toast.error('Assinatura nao encontrada');
      return;
    }

    setCancelling(true);
    try {
      const apiKey = paymentSettings?.payment_asaas_api_key;

      if (apiKey) {
        const result = await cancelSubscription(organization.asaas_subscription_id, apiKey);

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Atualizar status local
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
          subscription_ends_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      setOrganization(prev => ({
        ...prev,
        subscription_status: 'cancelled',
        subscription_ends_at: new Date().toISOString(),
      }));

      toast.success('Assinatura cancelada. Voce ainda pode usar ate o fim do periodo pago.');
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar assinatura: ' + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!organization) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Organizacao nao encontrada</h2>
          <p className="text-muted-foreground">Nao foi possivel carregar os dados da assinatura.</p>
        </div>
      </PageContainer>
    );
  }

  const status = STATUS_CONFIG[organization.subscription_status] || STATUS_CONFIG.trial;
  const StatusIcon = status.icon;
  const PlanIcon = PLAN_ICONS[organization.plan] || Zap;
  const planColor = PLAN_COLORS[organization.plan] || 'blue';
  const planPrice = planSettings[`plans_${organization.plan}_price`] || 79;
  const trialDays = getDaysRemaining(organization.trial_ends_at);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Minha Assinatura"
        subtitle="Gerencie seu plano e pagamentos"
        icon={CreditCard}
      />

      {/* Status Banner */}
      {organization.subscription_status === 'trial' && trialDays !== null && (
        <div className={`mb-6 p-4 rounded-xl border ${trialDays <= 3 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${trialDays <= 3 ? 'text-yellow-600' : 'text-blue-600'}`} />
            <div>
              <p className={`font-medium ${trialDays <= 3 ? 'text-yellow-800' : 'text-blue-800'}`}>
                {trialDays > 0 ? (
                  <>Seu periodo de teste termina em <strong>{trialDays} dias</strong></>
                ) : trialDays === 0 ? (
                  <>Seu periodo de teste termina <strong>hoje</strong></>
                ) : (
                  <>Seu periodo de teste <strong>expirou</strong></>
                )}
              </p>
              <p className={`text-sm ${trialDays <= 3 ? 'text-yellow-600' : 'text-blue-600'}`}>
                Apos o trial, a cobranca sera gerada automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {organization.subscription_status === 'overdue' && (
        <div className="mb-6 p-4 rounded-xl border bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Pagamento pendente</p>
              <p className="text-sm text-red-600">
                Sua assinatura possui pagamento em atraso. Regularize para continuar usando.
              </p>
            </div>
            {payments[0]?.invoice_url && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => window.open(payments[0].invoice_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Pagar Agora
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plano Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlanIcon className={`w-5 h-5 text-${planColor}-600`} />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold capitalize">{organization.plan || 'Starter'}</h3>
                <p className="text-muted-foreground">
                  R$ {planPrice}/mes
                </p>
              </div>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite de usuarios</span>
                <span className="font-medium">
                  {organization.max_users === -1 ? 'Ilimitado' : organization.max_users}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limite de produtos</span>
                <span className="font-medium">
                  {organization.max_products === -1 ? 'Ilimitado' : organization.max_products}
                </span>
              </div>
              {organization.trial_ends_at && organization.subscription_status === 'trial' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial termina em</span>
                  <span className="font-medium">{formatDate(organization.trial_ends_at)}</span>
                </div>
              )}
              {organization.last_payment_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ultimo pagamento</span>
                  <span className="font-medium">{formatDate(organization.last_payment_at)}</span>
                </div>
              )}
            </div>

            {organization.subscription_status !== 'cancelled' && (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancelar Assinatura
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Historico de Pagamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Historico de Pagamentos
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshFromAsaas}
                disabled={loadingPayments}
              >
                <RefreshCw className={`w-4 h-4 ${loadingPayments ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>Ultimos pagamentos da assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum pagamento registrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        R$ {payment.amount?.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.due_date ? formatDate(payment.due_date) : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          payment.status === 'paid'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : payment.status === 'overdue'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }
                      >
                        {payment.status === 'paid' ? 'Pago' :
                         payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                      </Badge>
                      {payment.invoice_url && payment.status !== 'paid' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(payment.invoice_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info sobre cobranca */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Como funciona a cobranca?</h3>
              <p className="text-sm text-muted-foreground">
                Apos o periodo de teste, voce recebera um email com o PIX para pagamento.
                O pagamento e mensal e a cobranca e gerada automaticamente pelo Asaas.
                Voce pode pagar via PIX, boleto ou cartao de credito diretamente no link enviado por email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao cancelar sua assinatura:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Voce ainda pode usar ate o fim do periodo pago</li>
                <li>Nao sera possivel acessar apos o termino</li>
                <li>Seus dados serao mantidos por 30 dias</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
