import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCcw,
  Download,
  BarChart3,
  Wallet,
  PiggyBank,
  Receipt,
  Building2,
  Zap,
  Crown,
  Package,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

export default function AdminFinancial() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    avgTicket: 0,
    payingOrgs: 0,
    freeOrgs: 0,
  });
  const [plans, setPlans] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [mrrHistory, setMrrHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orgsData } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      const { data: plansData } = await supabase.from('plans').select('*');

      setOrganizations(orgsData || []);
      setPlans(plansData || []);

      // Calcular MRR e estatisticas
      let mrr = 0;
      const planRevenue = {};
      let payingOrgs = 0;
      let freeOrgs = 0;

      (orgsData || []).forEach((org) => {
        const plan = (plansData || []).find((p) => p.slug === org.plan);
        const planSlug = org.plan || 'free';

        if (plan && plan.price_monthly > 0) {
          mrr += plan.price_monthly;
          payingOrgs++;
          planRevenue[planSlug] = (planRevenue[planSlug] || 0) + plan.price_monthly;
        } else {
          freeOrgs++;
        }
      });

      // Receita por plano
      const revenueData = Object.entries(planRevenue).map(([slug, revenue]) => {
        const plan = plansData?.find(p => p.slug === slug);
        const colors = {
          starter: '#3b82f6',
          professional: '#8b5cf6',
          enterprise: '#f59e0b',
        };
        return {
          name: plan?.name || slug,
          revenue,
          color: colors[slug] || '#6b7280',
          slug,
          count: orgsData?.filter(o => o.plan === slug)?.length || 0,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      setRevenueByPlan(revenueData);

      // Historico MRR (ultimos 6 meses - baseado em organizacoes criadas)
      const mrrHistoryData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });

        const endOfMonth = new Date(date);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);

        // Contar orgs ativas ate o final daquele mes
        const orgsAtMonth = orgsData?.filter(o => new Date(o.created_at) <= endOfMonth) || [];
        let monthMrr = 0;
        orgsAtMonth.forEach(org => {
          const plan = plansData?.find(p => p.slug === org.plan);
          if (plan && plan.price_monthly > 0) {
            monthMrr += plan.price_monthly;
          }
        });

        mrrHistoryData.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
          mrr: monthMrr,
          orgs: orgsAtMonth.filter(o => o.plan && o.plan !== 'free').length,
        });
      }
      setMrrHistory(mrrHistoryData);

      const avgTicket = payingOrgs > 0 ? mrr / payingOrgs : 0;

      setStats({
        mrr,
        arr: mrr * 12,
        totalRevenue: mrr * 6,
        avgTicket,
        payingOrgs,
        freeOrgs,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (slug) => {
    const icons = {
      starter: Zap,
      professional: Crown,
      enterprise: Building2,
    };
    return icons[slug] || Package;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary', loading: isLoading }) => {
    const colorClasses = {
      primary: 'bg-gradient-to-br from-blue-500 to-blue-600',
      success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
      purple: 'bg-gradient-to-br from-blue-500 to-blue-600',
    };

    if (isLoading) {
      return (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]} text-white shadow-lg`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border/50">
              {trend >= 0 ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-semibold">{Math.abs(trend)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="font-semibold">{Math.abs(trend)}%</span>
                </div>
              )}
              <span className="text-muted-foreground text-sm ml-1">vs mes anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const exportData = () => {
    const data = {
      mrr: stats.mrr,
      arr: stats.arr,
      payingOrgs: stats.payingOrgs,
      freeOrgs: stats.freeOrgs,
      avgTicket: stats.avgTicket,
      revenueByPlan,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-sellx-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Financeiro
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">Visao financeira da plataforma Sellx</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData} className="hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={loadData}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          subtitle="Receita Mensal"
          icon={DollarSign}
          color="success"
          loading={loading}
        />
        <StatCard
          title="ARR"
          value={formatCurrency(stats.arr)}
          subtitle="Receita Anual Projetada"
          icon={TrendingUp}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Ticket Medio"
          value={formatCurrency(stats.avgTicket)}
          subtitle="Por organizacao pagante"
          icon={Receipt}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Receita 6 meses"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="Estimativa semestral"
          icon={PiggyBank}
          color="warning"
          loading={loading}
        />
      </div>

      {/* Conversion Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <CreditCard className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Organizacoes Pagantes</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{stats.payingOrgs}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-emerald-600">
                  {stats.payingOrgs + stats.freeOrgs > 0
                    ? ((stats.payingOrgs / (stats.payingOrgs + stats.freeOrgs)) * 100).toFixed(0)
                    : 0}%
                </p>
                <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70">conversao</p>
              </div>
            </div>
            <Progress
              value={stats.payingOrgs + stats.freeOrgs > 0 ? (stats.payingOrgs / (stats.payingOrgs + stats.freeOrgs)) * 100 : 0}
              className="h-2 bg-emerald-200 dark:bg-emerald-900"
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Target className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Organizacoes Gratuitas</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats.freeOrgs}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-amber-600">Potencial</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {formatCurrency(stats.freeOrgs * (stats.avgTicket || 49.9))}
                </p>
              </div>
            </div>
            <p className="text-sm text-amber-700/70 dark:text-amber-400/70">
              Se todas convertessem para o ticket medio atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Evolution */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <CardTitle>Evolucao do MRR</CardTitle>
            </div>
            <CardDescription>Receita mensal recorrente dos ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : mrrHistory.length > 0 && mrrHistory.some(m => m.mrr > 0) ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrHistory}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis
                      tickFormatter={(value) => value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'mrr' ? formatCurrency(value) : value,
                        name === 'mrr' ? 'MRR' : 'Orgs Pagantes'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhum dado de receita ainda</p>
                <p className="text-sm">Cadastre organizacoes com planos pagos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Receita por Plano
            </CardTitle>
            <CardDescription>Distribuicao do MRR</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : revenueByPlan.length > 0 ? (
              <div className="space-y-4">
                {revenueByPlan.map((plan) => {
                  const PlanIcon = getPlanIcon(plan.slug);
                  const percent = stats.mrr > 0 ? (plan.revenue / stats.mrr) * 100 : 0;
                  return (
                    <div key={plan.slug} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded-lg"
                            style={{ backgroundColor: `${plan.color}20` }}
                          >
                            <PlanIcon className="w-4 h-4" style={{ color: plan.color }} />
                          </div>
                          <span className="text-sm font-medium">{plan.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {plan.count} orgs
                          </Badge>
                        </div>
                        <span className="font-bold" style={{ color: plan.color }}>
                          {formatCurrency(plan.revenue)}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: plan.color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {percent.toFixed(0)}% do MRR
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma receita registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Paying Organizations */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Maiores Receitas
              </CardTitle>
              <CardDescription>Organizacoes que mais contribuem para o MRR</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {organizations
                .filter(org => org.plan && org.plan !== 'free')
                .sort((a, b) => {
                  const planA = plans.find(p => p.slug === a.plan);
                  const planB = plans.find(p => p.slug === b.plan);
                  return (planB?.price_monthly || 0) - (planA?.price_monthly || 0);
                })
                .slice(0, 5)
                .map((org, index) => {
                  const plan = plans.find(p => p.slug === org.plan);
                  const PlanIcon = getPlanIcon(org.plan);
                  const planColors = {
                    starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                    professional: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
                    enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                  };
                  return (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Desde {new Date(org.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={planColors[org.plan] || 'bg-slate-100'}>
                          <PlanIcon className="w-3 h-3 mr-1" />
                          {plan?.name || org.plan}
                        </Badge>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(plan?.price_monthly || 0)}/mes
                        </span>
                      </div>
                    </div>
                  );
                })}
              {organizations.filter(org => org.plan && org.plan !== 'free').length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma organizacao pagante</p>
                  <p className="text-sm mt-1">As organizacoes com planos pagos aparecerao aqui</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
