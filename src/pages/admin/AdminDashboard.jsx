import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

// Dados mock para demonstracao (serao substituidos por dados reais)
const mockMRRData = [
  { month: 'Jul', mrr: 4500 },
  { month: 'Ago', mrr: 5200 },
  { month: 'Set', mrr: 6100 },
  { month: 'Out', mrr: 7400 },
  { month: 'Nov', mrr: 8200 },
  { month: 'Dez', mrr: 9800 },
];

const mockPlanDistribution = [
  { name: 'Gratuito', value: 45, color: '#94a3b8' },
  { name: 'Starter', value: 30, color: '#3b82f6' },
  { name: 'Professional', value: 20, color: '#8b5cf6' },
  { name: 'Enterprise', value: 5, color: '#f59e0b' },
];

const mockRecentOrgs = [
  { id: 1, name: 'Loja do Joao', plan: 'starter', status: 'active', created: '2024-01-05' },
  { id: 2, name: 'Mercado Central', plan: 'professional', status: 'active', created: '2024-01-04' },
  { id: 3, name: 'Emporio Silva', plan: 'free', status: 'trial', created: '2024-01-03' },
  { id: 4, name: 'Conveniencia 24h', plan: 'starter', status: 'active', created: '2024-01-02' },
  { id: 5, name: 'Padaria Doce Mel', plan: 'free', status: 'active', created: '2024-01-01' },
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    mrr: 0,
    arr: 0,
    churnRate: 0,
    newOrgsThisMonth: 0,
    trialOrgs: 0,
  });
  const [recentOrgs, setRecentOrgs] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Carregar organizacoes
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

      if (orgsError) throw orgsError;

      // Carregar usuarios
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) throw usersError;

      // Carregar planos
      const { data: plans } = await supabase
        .from('plans')
        .select('*');

      // Calcular estatisticas
      const totalOrgs = orgs?.length || 0;
      const activeOrgs = orgs?.filter(o => o.is_active)?.length || 0;
      const totalUsers = users?.length || 0;

      // Calcular MRR baseado nos planos (simplificado)
      let mrr = 0;
      orgs?.forEach(org => {
        const plan = plans?.find(p => p.slug === org.plan);
        if (plan && plan.price_monthly > 0) {
          mrr += plan.price_monthly;
        }
      });

      // Organizacoes novas este mes
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newOrgsThisMonth = orgs?.filter(o =>
        new Date(o.created_at) >= thisMonth
      )?.length || 0;

      setStats({
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalUsers: totalUsers,
        mrr: mrr,
        arr: mrr * 12,
        churnRate: 2.5, // Mock - calcular real baseado em cancelamentos
        newOrgsThisMonth,
        trialOrgs: orgs?.filter(o => o.plan === 'free')?.length || 0,
      });

      // Ordenar por data e pegar as 5 mais recentes
      const sortedOrgs = orgs?.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 5) || [];

      setRecentOrgs(sortedOrgs);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Usar dados mock se falhar
      setStats({
        totalOrganizations: 156,
        activeOrganizations: 142,
        totalUsers: 423,
        mrr: 9800,
        arr: 117600,
        churnRate: 2.5,
        newOrgsThisMonth: 12,
        trialOrgs: 45,
      });
      setRecentOrgs(mockRecentOrgs);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) => {
    const colorClasses = {
      primary: 'bg-blue-500/10 text-blue-600',
      success: 'bg-green-500/10 text-green-600',
      warning: 'bg-amber-500/10 text-amber-600',
      purple: 'bg-violet-500/10 text-violet-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-4">
              {trend >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(trend)}%
              </span>
              <span className="text-muted-foreground text-sm">{trendValue}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const getPlanBadgeColor = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-violet-100 text-violet-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    return colors[plan] || colors.free;
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
    }
    if (status === 'trial') {
      return <Badge className="bg-amber-100 text-amber-700">Trial</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard SaaS</h1>
          <p className="text-muted-foreground">Visao geral da plataforma Sellx</p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          subtitle="Receita Mensal Recorrente"
          icon={DollarSign}
          trend={12.5}
          trendValue="vs mes anterior"
          color="success"
        />
        <StatCard
          title="Organizacoes"
          value={stats.totalOrganizations}
          subtitle={`${stats.activeOrganizations} ativas`}
          icon={Building2}
          trend={8.3}
          trendValue="vs mes anterior"
          color="primary"
        />
        <StatCard
          title="Usuarios"
          value={stats.totalUsers}
          subtitle="Total de usuarios"
          icon={Users}
          trend={15.2}
          trendValue="vs mes anterior"
          color="purple"
        />
        <StatCard
          title="Churn Rate"
          value={`${stats.churnRate}%`}
          subtitle="Taxa de cancelamento"
          icon={Activity}
          trend={-0.5}
          trendValue="vs mes anterior"
          color="warning"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100 text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ARR</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.arr)}</p>
                <p className="text-xs text-muted-foreground">Receita Anual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novos este mes</p>
                <p className="text-2xl font-bold">{stats.newOrgsThisMonth}</p>
                <p className="text-xs text-muted-foreground">organizacoes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Trial</p>
                <p className="text-2xl font-bold">{stats.trialOrgs}</p>
                <p className="text-xs text-muted-foreground">organizacoes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Evolucao do MRR
            </CardTitle>
            <CardDescription>Ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockMRRData}>
                  <defs>
                    <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis
                    tickFormatter={(value) => `R$${value / 1000}k`}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'MRR']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorMRR)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por Plano</CardTitle>
            <CardDescription>Organizacoes por plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockPlanDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockPlanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Porcentagem']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {mockPlanDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: plan.color }}
                    />
                    <span className="text-sm">{plan.name}</span>
                  </div>
                  <span className="text-sm font-medium">{plan.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Organizations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizacoes Recentes</CardTitle>
              <CardDescription>Ultimas organizacoes cadastradas</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/organizations'}>
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrgs.length > 0 ? (
              recentOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(org.created_at || org.created).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getPlanBadgeColor(org.plan)}>
                      {org.plan?.charAt(0).toUpperCase() + org.plan?.slice(1) || 'Free'}
                    </Badge>
                    {getStatusBadge(org.is_active ? 'active' : 'inactive')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma organizacao cadastrada ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
