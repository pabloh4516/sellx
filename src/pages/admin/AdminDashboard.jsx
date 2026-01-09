import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Zap,
  Crown,
  Package,
  Eye,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { isAdminSubdomain } from '@/utils/subdomain';

const getPrefix = () => isAdminSubdomain() ? '' : '/admin';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const prefix = getPrefix();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    inactiveOrganizations: 0,
    totalUsers: 0,
    mrr: 0,
    arr: 0,
    newOrgsThisMonth: 0,
    newOrgsLastMonth: 0,
    trialOrgs: 0,
    payingOrgs: 0,
  });
  const [recentOrgs, setRecentOrgs] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [mrrHistory, setMrrHistory] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Carregar organizacoes
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Carregar usuarios (excluindo super_admins)
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'super_admin');

      if (usersError) throw usersError;

      // Carregar planos
      const { data: plansData } = await supabase
        .from('plans')
        .select('*');

      setPlans(plansData || []);

      // Calcular estatisticas
      const totalOrgs = orgs?.length || 0;
      const activeOrgs = orgs?.filter(o => o.is_active !== false)?.length || 0;
      const inactiveOrgs = totalOrgs - activeOrgs;
      const totalUsers = users?.filter(u => u.role !== 'super_admin')?.length || 0;

      // Calcular MRR baseado nos planos
      let mrr = 0;
      const planCounts = {};

      orgs?.forEach(org => {
        const planSlug = org.plan || 'free';
        planCounts[planSlug] = (planCounts[planSlug] || 0) + 1;

        const plan = plansData?.find(p => p.slug === planSlug);
        if (plan && plan.price_monthly > 0) {
          mrr += plan.price_monthly;
        }
      });

      // Distribuicao por plano (dados reais)
      const distribution = Object.entries(planCounts).map(([slug, count]) => {
        const plan = plansData?.find(p => p.slug === slug);
        const colors = {
          free: '#94a3b8',
          starter: '#3b82f6',
          professional: '#8b5cf6',
          enterprise: '#f59e0b',
        };
        return {
          name: plan?.name || (slug === 'free' ? 'Gratuito' : slug),
          value: count,
          color: colors[slug] || '#6b7280',
          slug,
        };
      }).sort((a, b) => b.value - a.value);

      setPlanDistribution(distribution);

      // Organizacoes novas este mes
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const newOrgsThisMonth = orgs?.filter(o =>
        new Date(o.created_at) >= thisMonth
      )?.length || 0;

      const newOrgsLastMonth = orgs?.filter(o => {
        const created = new Date(o.created_at);
        return created >= lastMonth && created < thisMonth;
      })?.length || 0;

      // Calcular historico de MRR (ultimos 6 meses)
      const mrrHistoryData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });

        // Contar orgs criadas ate aquele mes
        const orgsAtMonth = orgs?.filter(o => new Date(o.created_at) <= date) || [];
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
        });
      }
      setMrrHistory(mrrHistoryData);

      // Orgs pagantes vs gratuitas
      const payingOrgs = orgs?.filter(o => o.plan && o.plan !== 'free')?.length || 0;
      const trialOrgs = orgs?.filter(o => !o.plan || o.plan === 'free')?.length || 0;

      setStats({
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        inactiveOrganizations: inactiveOrgs,
        totalUsers: totalUsers,
        mrr: mrr,
        arr: mrr * 12,
        newOrgsThisMonth,
        newOrgsLastMonth,
        trialOrgs,
        payingOrgs,
      });

      // Pegar as 5 mais recentes
      setRecentOrgs(orgs?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthPercent = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getPlanIcon = (plan) => {
    const icons = {
      free: Package,
      starter: Zap,
      professional: Crown,
      enterprise: Building2,
    };
    return icons[plan] || Package;
  };

  const getPlanBadgeColor = (plan) => {
    const colors = {
      free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      professional: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
      enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    };
    return colors[plan] || colors.free;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendLabel, color = 'primary', loading: isLoading }) => {
    const colorClasses = {
      primary: 'bg-gradient-to-br from-blue-500 to-blue-600',
      success: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      warning: 'bg-gradient-to-br from-amber-500 to-amber-600',
      purple: 'bg-gradient-to-br from-blue-500 to-blue-600',
      rose: 'bg-gradient-to-br from-rose-500 to-rose-600',
    };

    if (isLoading) {
      return (
        <Card className="overflow-hidden">
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
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {value}
              </p>
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
              {parseFloat(trend) >= 0 ? (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="font-semibold">{Math.abs(trend)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="font-semibold">{Math.abs(trend)}%</span>
                </div>
              )}
              <span className="text-muted-foreground text-sm ml-1">{trendLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Visao geral da plataforma Sellx
          </p>
        </div>
        <Button
          onClick={loadDashboardData}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards - Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          subtitle="Receita Mensal Recorrente"
          icon={DollarSign}
          trend={getGrowthPercent(stats.mrr, stats.mrr * 0.9)}
          trendLabel="vs mes anterior"
          color="success"
          loading={loading}
        />
        <StatCard
          title="Organizacoes"
          value={stats.totalOrganizations}
          subtitle={`${stats.activeOrganizations} ativas`}
          icon={Building2}
          trend={getGrowthPercent(stats.newOrgsThisMonth, stats.newOrgsLastMonth)}
          trendLabel="novos este mes"
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Usuarios"
          value={stats.totalUsers}
          subtitle="Total de usuarios"
          icon={Users}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="ARR"
          value={formatCurrency(stats.arr)}
          subtitle="Receita Anual Projetada"
          icon={TrendingUp}
          color="warning"
          loading={loading}
        />
      </div>

      {/* Cards Secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Pagantes</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.payingOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Gratuitos</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.trialOrgs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Novos (mes)</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.newOrgsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200/50 dark:border-rose-800/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10">
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">Inativos</p>
                <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{stats.inactiveOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Chart */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
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
                      <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis
                      tickFormatter={(value) => value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`}
                      className="text-xs"
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'MRR']}
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
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorMRR)"
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

        {/* Plan Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle>Distribuicao por Plano</CardTitle>
            <CardDescription>Organizacoes por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center">
                <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : planDistribution.length > 0 ? (
              <>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 mt-4">
                  {planDistribution.map((plan) => {
                    const PlanIcon = getPlanIcon(plan.slug);
                    const percent = stats.totalOrganizations > 0
                      ? ((plan.value / stats.totalOrganizations) * 100).toFixed(0)
                      : 0;
                    return (
                      <div key={plan.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: plan.color }}
                          />
                          <PlanIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{plan.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{plan.value}</span>
                          <span className="text-xs text-muted-foreground">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                <Package className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhuma organizacao cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Conversao */}
      {stats.totalOrganizations > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Taxa de Conversao
            </CardTitle>
            <CardDescription>Porcentagem de organizacoes pagantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Conversao para plano pago</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {((stats.payingOrgs / stats.totalOrganizations) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={(stats.payingOrgs / stats.totalOrganizations) * 100}
                  className="h-3 bg-muted"
                />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>{stats.payingOrgs} pagantes</span>
                  <span>{stats.trialOrgs} gratuitos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Organizations */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Organizacoes Recentes
              </CardTitle>
              <CardDescription>Ultimas organizacoes cadastradas na plataforma</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`${prefix}/organizations`)}
              className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : recentOrgs.length > 0 ? (
            <div className="space-y-3">
              {recentOrgs.map((org) => {
                const PlanIcon = getPlanIcon(org.plan || 'free');
                return (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-blue-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
                    onClick={() => navigate(`${prefix}/organizations`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          {org.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(org.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPlanBadgeColor(org.plan || 'free')}>
                        <PlanIcon className="w-3 h-3 mr-1" />
                        {plans.find(p => p.slug === org.plan)?.name || 'Gratuito'}
                      </Badge>
                      {org.is_active !== false ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-rose-500" title="Inativo" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma organizacao cadastrada</p>
              <p className="text-sm mt-1">As organizacoes aparecerao aqui quando forem criadas</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate(`${prefix}/organizations`)}
              >
                Gerenciar Organizacoes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
