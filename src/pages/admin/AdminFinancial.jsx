import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PieChart as PieChartIcon,
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
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

// Dados mock para demonstracao
const mockRevenueData = [
  { month: 'Jul', receita: 4500, despesas: 1200 },
  { month: 'Ago', receita: 5200, despesas: 1400 },
  { month: 'Set', receita: 6100, despesas: 1300 },
  { month: 'Out', receita: 7400, despesas: 1600 },
  { month: 'Nov', receita: 8200, despesas: 1500 },
  { month: 'Dez', receita: 9800, despesas: 1800 },
];

const mockTransactions = [
  { id: 1, org: 'Loja do Joao', type: 'receita', amount: 99.90, date: '2024-01-05', plan: 'starter' },
  { id: 2, org: 'Mercado Central', type: 'receita', amount: 199.90, date: '2024-01-05', plan: 'professional' },
  { id: 3, org: 'Taxa Gateway', type: 'despesa', amount: -15.50, date: '2024-01-04', plan: null },
  { id: 4, org: 'Emporio Silva', type: 'receita', amount: 99.90, date: '2024-01-03', plan: 'starter' },
  { id: 5, org: 'Servidor AWS', type: 'despesa', amount: -250.00, date: '2024-01-02', plan: null },
];

export default function AdminFinancial() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    growth: 0,
  });
  const [plans, setPlans] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orgsData } = await supabase.from('organizations').select('*');
      const { data: plansData } = await supabase.from('plans').select('*');

      setOrganizations(orgsData || []);
      setPlans(plansData || []);

      // Calcular MRR
      let mrr = 0;
      (orgsData || []).forEach((org) => {
        const plan = (plansData || []).find((p) => p.slug === org.plan);
        if (plan && plan.price_monthly > 0) {
          mrr += plan.price_monthly;
        }
      });

      setStats({
        mrr,
        arr: mrr * 12,
        totalRevenue: mrr * 6, // Simulando 6 meses
        totalExpenses: mrr * 0.3 * 6, // 30% em despesas
        profit: mrr * 0.7 * 6,
        growth: 12.5,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
    const colorClasses = {
      primary: 'bg-blue-500/10 text-blue-600',
      success: 'bg-green-500/10 text-green-600',
      warning: 'bg-amber-500/10 text-amber-600',
      danger: 'bg-red-500/10 text-red-600',
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
              <span className="text-muted-foreground text-sm">vs mes anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Visao financeira da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={loadData} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          subtitle="Receita Mensal"
          icon={DollarSign}
          trend={stats.growth}
          color="success"
        />
        <StatCard
          title="ARR"
          value={formatCurrency(stats.arr)}
          subtitle="Receita Anual"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Receita Total"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="Ultimos 6 meses"
          icon={CreditCard}
          color="primary"
        />
        <StatCard
          title="Lucro Liquido"
          value={formatCurrency(stats.profit)}
          subtitle="Ultimos 6 meses"
          icon={BarChart3}
          trend={8.3}
          color="success"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Receita vs Despesas
          </CardTitle>
          <CardDescription>Comparativo dos ultimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis
                  tickFormatter={(value) => `R$${value / 1000}k`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Ultimas Transacoes</CardTitle>
          <CardDescription>Movimentacoes recentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'receita'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {tx.type === 'receita' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{tx.org}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatCurrency(Math.abs(tx.amount))}
                  </p>
                  {tx.plan && (
                    <Badge variant="secondary" className="mt-1">
                      {tx.plan}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
