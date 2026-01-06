import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/config/permissions';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, Target, Award, User, ShoppingBag, Hash, Calendar, Trophy, Flame } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, isAfter, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  DataTable,
  StatusBadge,
} from '@/components/nexo';

export default function DashboardSeller() {
  const { operator } = useAuth();

  // Verificar se usuario pode ver valores monetarios (admin, owner, gerente)
  const canViewValues = operator?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(operator.role);

  const [stats, setStats] = useState({
    mySales: [],
    myCommission: 0,
    salesTrend: [],
    topCustomers: [],
    topProducts: [],
    // Metas
    goals: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      bonus_percent: 0
    },
    progress: {
      daily: 0,
      weekly: 0,
      monthly: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (operator?.id) {
      loadData();
    }
  }, [operator?.id]);

  const loadData = async () => {
    try {
      if (!operator?.id) {
        console.log('[DashboardSeller] Operador nao definido');
        setLoading(false);
        return;
      }

      console.log('[DashboardSeller] Carregando dados para operador:', operator.id, operator.full_name);

      const [sales, sellers, customers, profile] = await Promise.all([
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Seller.list(),
        base44.entities.Customer.list(),
        base44.entities.Profile.get(operator.id).catch(() => null)
      ]);

      // Encontrar o vendedor associado ao operador (se existir)
      const mySeller = sellers.find(s => s.email === operator.email || s.user_id === operator.id);

      // Obter metas do profile ou do seller
      const goals = {
        daily: profile?.daily_goal || mySeller?.daily_goal || 0,
        weekly: profile?.weekly_goal || mySeller?.weekly_goal || 0,
        monthly: profile?.monthly_goal || mySeller?.monthly_goal || 0,
        bonus_percent: profile?.goal_bonus_percent || mySeller?.goal_bonus_percent || 0
      };

      // Filtrar vendas por operator_id OU seller_id (para retrocompatibilidade)
      const mySales = sales.filter(s =>
        s.operator_id === operator.id ||
        (mySeller && s.seller_id === mySeller.id)
      );

      console.log('[DashboardSeller] Vendas encontradas:', mySales.length);

      // Calcular progresso das metas
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira
      const monthStart = startOfMonth(today);

      const todaySales = mySales.filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return isSameDay(saleDate, today);
      });

      const weekSales = mySales.filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return isAfter(saleDate, weekStart) || isSameDay(saleDate, weekStart);
      });

      const monthSales = mySales.filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return isAfter(saleDate, monthStart) || isSameDay(saleDate, monthStart);
      });

      const progress = {
        daily: todaySales.reduce((sum, s) => sum + (s.total || 0), 0),
        weekly: weekSales.reduce((sum, s) => sum + (s.total || 0), 0),
        monthly: monthSales.reduce((sum, s) => sum + (s.total || 0), 0)
      };

      // Calculate commission
      let totalCommission = 0;
      mySales.forEach(sale => {
        sale.items?.forEach(item => {
          const itemCommission = (item.total * (item.commission_percent || mySeller?.commission_percent || profile?.commission_percent || 0)) / 100;
          totalCommission += itemCommission;
        });
      });

      // Sales trend (last 7 days)
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const daySales = mySales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        });
        salesTrend.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          vendas: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
          quantidade: daySales.length
        });
      }

      // Top customers
      const customerSales = {};
      mySales.forEach(sale => {
        if (sale.customer_id) {
          if (!customerSales[sale.customer_id]) {
            customerSales[sale.customer_id] = {
              customer_id: sale.customer_id,
              total: 0,
              count: 0
            };
          }
          customerSales[sale.customer_id].total += sale.total || 0;
          customerSales[sale.customer_id].count += 1;
        }
      });

      const topCustomers = Object.values(customerSales)
        .map(cs => ({
          ...cs,
          name: customers.find(c => c.id === cs.customer_id)?.name || 'Cliente'
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Top products
      const productSales = {};
      mySales.forEach(sale => {
        sale.items?.forEach(item => {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              name: item.product_name,
              revenue: 0,
              quantity: 0
            };
          }
          productSales[item.product_id].revenue += item.total;
          productSales[item.product_id].quantity += item.quantity;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        mySales,
        myCommission: totalCommission,
        salesTrend,
        topCustomers,
        topProducts,
        goals,
        progress
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getProgressPercent = (current, goal) => {
    if (!goal || goal <= 0) return 0;
    return Math.min(Math.round((current / goal) * 100), 100);
  };

  const getProgressStatus = (percent) => {
    if (percent >= 100) return { color: 'bg-success', text: 'text-success', label: 'Meta atingida!' };
    if (percent >= 75) return { color: 'bg-primary', text: 'text-primary', label: 'Quase la!' };
    if (percent >= 50) return { color: 'bg-warning', text: 'text-warning', label: 'Na metade' };
    return { color: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'Continue vendendo!' };
  };

  const totalSales = stats.mySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const avgTicket = stats.mySales.length > 0 ? totalSales / stats.mySales.length : 0;
  const daysWithSales = stats.salesTrend.filter(d => d.vendas > 0).length;

  // Verificar se tem metas configuradas
  const hasGoals = stats.goals.daily > 0 || stats.goals.weekly > 0 || stats.goals.monthly > 0;

  const customerColumns = [
    {
      key: 'name',
      label: 'Cliente',
      render: (_, customer) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{customer.name}</span>
        </div>
      )
    },
    {
      key: 'count',
      label: 'Vendas',
      align: 'center',
      width: '100px',
      render: (_, customer) => (
        <StatusBadge status="info" label={customer.count} />
      )
    },
    // Mostrar colunas de valores apenas para admin/gerente
    ...(canViewValues ? [
      {
        key: 'total',
        label: 'Total',
        align: 'right',
        width: '130px',
        render: (_, customer) => (
          <span className="font-bold text-success">{formatCurrency(customer.total)}</span>
        )
      },
      {
        key: 'ticket',
        label: 'Ticket Medio',
        align: 'right',
        width: '130px',
        render: (_, customer) => (
          <span className="text-muted-foreground">{formatCurrency(customer.total / customer.count)}</span>
        )
      }
    ] : [])
  ];

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
        title="Meu Desempenho"
        subtitle={`Ola, ${operator?.full_name || 'Vendedor'}! Acompanhe suas vendas e metas.`}
        icon={TrendingUp}
      />

      {/* Metas - Se configuradas */}
      {hasGoals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Meta Diaria */}
          {stats.goals.daily > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meta Diaria</p>
                    <p className="font-semibold">{formatCurrency(stats.goals.daily)}</p>
                  </div>
                </div>
                {getProgressPercent(stats.progress.daily, stats.goals.daily) >= 100 && (
                  <Trophy className="w-6 h-6 text-warning" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={getProgressStatus(getProgressPercent(stats.progress.daily, stats.goals.daily)).text}>
                    {formatCurrency(stats.progress.daily)}
                  </span>
                  <span className="font-medium">{getProgressPercent(stats.progress.daily, stats.goals.daily)}%</span>
                </div>
                <Progress
                  value={getProgressPercent(stats.progress.daily, stats.goals.daily)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {getProgressStatus(getProgressPercent(stats.progress.daily, stats.goals.daily)).label}
                </p>
              </div>
            </div>
          )}

          {/* Meta Semanal */}
          {stats.goals.weekly > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meta Semanal</p>
                    <p className="font-semibold">{formatCurrency(stats.goals.weekly)}</p>
                  </div>
                </div>
                {getProgressPercent(stats.progress.weekly, stats.goals.weekly) >= 100 && (
                  <Trophy className="w-6 h-6 text-warning" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={getProgressStatus(getProgressPercent(stats.progress.weekly, stats.goals.weekly)).text}>
                    {formatCurrency(stats.progress.weekly)}
                  </span>
                  <span className="font-medium">{getProgressPercent(stats.progress.weekly, stats.goals.weekly)}%</span>
                </div>
                <Progress
                  value={getProgressPercent(stats.progress.weekly, stats.goals.weekly)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {getProgressStatus(getProgressPercent(stats.progress.weekly, stats.goals.weekly)).label}
                </p>
              </div>
            </div>
          )}

          {/* Meta Mensal */}
          {stats.goals.monthly > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meta Mensal</p>
                    <p className="font-semibold">{formatCurrency(stats.goals.monthly)}</p>
                  </div>
                </div>
                {getProgressPercent(stats.progress.monthly, stats.goals.monthly) >= 100 && (
                  <Trophy className="w-6 h-6 text-warning" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={getProgressStatus(getProgressPercent(stats.progress.monthly, stats.goals.monthly)).text}>
                    {formatCurrency(stats.progress.monthly)}
                  </span>
                  <span className="font-medium">{getProgressPercent(stats.progress.monthly, stats.goals.monthly)}%</span>
                </div>
                <Progress
                  value={getProgressPercent(stats.progress.monthly, stats.goals.monthly)}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {getProgressStatus(getProgressPercent(stats.progress.monthly, stats.goals.monthly)).label}
                  {stats.goals.bonus_percent > 0 && getProgressPercent(stats.progress.monthly, stats.goals.monthly) >= 100 && (
                    <span className="text-success ml-1">+{stats.goals.bonus_percent}% bonus!</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <Grid cols={canViewValues ? 4 : 3}>
        <MetricCard
          label="Minhas Vendas"
          value={canViewValues ? formatCurrency(totalSales) : stats.mySales.length}
          icon={canViewValues ? DollarSign : ShoppingBag}
          variant="primary"
          subtitle={canViewValues ? `${stats.mySales.length} vendas` : 'vendas realizadas'}
        />
        {canViewValues && (
          <MetricCard
            label="Minhas Comissoes"
            value={formatCurrency(stats.myCommission)}
            icon={Award}
            variant="success"
          />
        )}
        <MetricCard
          label={canViewValues ? "Ticket Medio" : "Media de Itens"}
          value={canViewValues ? formatCurrency(avgTicket) : (stats.mySales.length > 0 ? Math.round(stats.mySales.reduce((sum, s) => sum + (s.items?.length || 0), 0) / stats.mySales.length) : 0)}
          icon={canViewValues ? Target : Hash}
          variant="info"
          subtitle={canViewValues ? undefined : 'por venda'}
        />
        <MetricCard
          label="Performance"
          value={`${daysWithSales}/7`}
          icon={TrendingUp}
          variant="warning"
          subtitle="dias com vendas"
        />
      </Grid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title={canViewValues ? "Vendas dos Ultimos 7 Dias" : "Quantidade de Vendas - 7 Dias"} icon={TrendingUp}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={canViewValues ? (v) => `R$${v/1000}k` : undefined} />
                <Tooltip
                  formatter={(value, name) => canViewValues ? [formatCurrency(value), 'Vendas'] : [value, 'Quantidade']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={canViewValues ? "vendas" : "quantidade"}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name={canViewValues ? "Vendas" : "Quantidade"}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        <CardSection title="Meus Produtos Mais Vendidos" icon={Target}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-muted-foreground" fontSize={12} />
                <YAxis dataKey="name" type="category" className="text-muted-foreground" fontSize={12} width={120} />
                <Tooltip
                  formatter={(value, name) => [value, 'Quantidade']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSection>
      </div>

      {/* Top Customers Table */}
      <CardSection title="Meus Melhores Clientes" icon={User} noPadding>
        <DataTable
          data={stats.topCustomers}
          columns={customerColumns}
          emptyMessage="Nenhum cliente encontrado"
        />
      </CardSection>
    </PageContainer>
  );
}
