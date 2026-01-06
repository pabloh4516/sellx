import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, Users, ShoppingCart, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, Award, User, Package, Wallet, ArrowUp, ArrowDown
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8B5CF6', '#EC4899'];

export default function DashboardManager() {
  const [stats, setStats] = useState({
    sales: [],
    products: [],
    customers: [],
    expenses: [],
    operators: [],
    cashFlowData: [],
    topProducts: [],
    salesByCategory: [],
    performanceTrend: [],
    salesByOperator: [],
    lowStockProducts: [],
    lastMonthSales: 0,
    lastMonthProfit: 0,
    newCustomers: 0,
    cashRegisters: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date();
      const startMonth = startOfMonth(today).toISOString();
      const endMonth = endOfMonth(today).toISOString();
      const lastMonth = subMonths(today, 1);
      const startLastMonth = startOfMonth(lastMonth).toISOString();
      const endLastMonth = endOfMonth(lastMonth).toISOString();

      const [sales, products, customers, expenses, groups, operators, sellers, cashRegisters] = await Promise.all([
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Product.list(),
        base44.entities.Customer.list(),
        base44.entities.Expense.list(),
        base44.entities.ProductGroup.list(),
        base44.entities.Profile.list(),
        base44.entities.Seller.list(),
        base44.entities.CashRegister.filter({ status: 'aberto' })
      ]);

      // Sales trend (last 7 days)
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const daySales = sales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        });
        salesTrend.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          vendas: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
          lucro: daySales.reduce((sum, s) => sum + (s.profit || 0), 0)
        });
      }

      // Top products
      const productSales = {};
      sales.forEach(sale => {
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

      // Sales by category
      const categoryGroups = {};
      sales.forEach(sale => {
        sale.items?.forEach(item => {
          const product = products.find(p => p.id === item.product_id);
          const groupId = product?.group_id || 'sem_grupo';
          const groupName = groups.find(g => g.id === groupId)?.name || 'Sem Grupo';

          if (!categoryGroups[groupName]) {
            categoryGroups[groupName] = 0;
          }
          categoryGroups[groupName] += item.total;
        });
      });

      const salesByCategory = Object.entries(categoryGroups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Cash flow
      const monthSales = sales.filter(s => {
        const date = new Date(s.sale_date || s.created_date);
        return date >= new Date(startMonth) && date <= new Date(endMonth);
      });

      const monthExpenses = expenses.filter(e => {
        const date = new Date(e.paid_date || e.due_date || e.created_date);
        return date >= new Date(startMonth) && date <= new Date(endMonth);
      });

      const cashFlowData = [];
      for (let i = 0; i < 30; i += 5) {
        const date = new Date(startMonth);
        date.setDate(date.getDate() + i);
        const dayStr = format(date, 'dd/MM');

        const dayRevenue = monthSales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return saleDate <= date;
        }).reduce((sum, s) => sum + (s.total || 0), 0);

        const dayExpenses = monthExpenses.filter(e => {
          const expDate = new Date(e.paid_date || e.due_date || e.created_date);
          return expDate <= date;
        }).reduce((sum, e) => sum + (e.amount || 0), 0);

        cashFlowData.push({
          date: dayStr,
          receitas: dayRevenue,
          despesas: dayExpenses,
          saldo: dayRevenue - dayExpenses
        });
      }

      // Last month comparison
      const lastMonthSalesData = sales.filter(s => {
        const date = new Date(s.sale_date || s.created_date);
        return date >= new Date(startLastMonth) && date <= new Date(endLastMonth);
      });
      const lastMonthTotal = lastMonthSalesData.reduce((sum, s) => sum + (s.total || 0), 0);
      const lastMonthProfit = lastMonthSalesData.reduce((sum, s) => sum + (s.profit || 0), 0);

      // Sales by operator
      const salesByOperatorMap = {};
      monthSales.forEach(sale => {
        let responsibleName = 'Sem operador';
        let responsibleId = null;
        if (sale.seller_id) {
          const seller = sellers.find(s => s.id === sale.seller_id);
          if (seller) {
            responsibleName = seller.name;
            responsibleId = seller.id;
          }
        } else if (sale.operator_id) {
          const op = operators.find(o => o.id === sale.operator_id);
          if (op) {
            responsibleName = op.full_name;
            responsibleId = op.id;
          }
        }
        if (!salesByOperatorMap[responsibleName]) {
          salesByOperatorMap[responsibleName] = { name: responsibleName, vendas: 0, quantidade: 0, lucro: 0 };
        }
        salesByOperatorMap[responsibleName].vendas += sale.total || 0;
        salesByOperatorMap[responsibleName].lucro += sale.profit || 0;
        salesByOperatorMap[responsibleName].quantidade += 1;
      });
      const salesByOperator = Object.values(salesByOperatorMap).sort((a, b) => b.vendas - a.vendas);

      // Low stock products
      const lowStockProducts = products.filter(p =>
        p.min_stock && p.stock_quantity <= p.min_stock && p.is_active !== false
      ).slice(0, 5);

      // New customers this month
      const newCustomers = customers.filter(c => {
        const createdDate = new Date(c.created_date || c.created_at);
        return createdDate >= new Date(startMonth);
      }).length;

      setStats({
        sales: monthSales,
        products,
        customers,
        operators,
        expenses: monthExpenses,
        performanceTrend: salesTrend,
        topProducts,
        salesByCategory,
        cashFlowData,
        salesByOperator,
        lowStockProducts,
        lastMonthSales: lastMonthTotal,
        lastMonthProfit,
        newCustomers,
        cashRegisters
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

  const totalSales = stats.sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = stats.sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const avgTicket = stats.sales.length > 0 ? totalSales / stats.sales.length : 0;
  const salesGrowth = stats.lastMonthSales > 0
    ? ((totalSales - stats.lastMonthSales) / stats.lastMonthSales * 100).toFixed(1)
    : 0;
  const profitGrowth = stats.lastMonthProfit > 0
    ? ((totalProfit - stats.lastMonthProfit) / stats.lastMonthProfit * 100).toFixed(1)
    : 0;

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
        title="Dashboard Gerencial"
        subtitle="Visao estrategica do negocio"
        icon={BarChart3}
      />

      {/* KPIs */}
      <Grid cols={4}>
        <MetricCard
          label="Vendas no Mes"
          value={formatCurrency(totalSales)}
          icon={ShoppingCart}
          variant="primary"
          trend={salesGrowth != 0 ? {
            value: Math.abs(salesGrowth),
            label: 'vs mes anterior',
            positive: salesGrowth >= 0
          } : undefined}
          subtitle={`${stats.sales.length} vendas`}
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(totalProfit)}
          icon={TrendingUp}
          variant="success"
          trend={profitGrowth != 0 ? {
            value: Math.abs(profitGrowth),
            label: 'vs mes anterior',
            positive: profitGrowth >= 0
          } : undefined}
          subtitle={totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% margem` : '0%'}
        />
        <MetricCard
          label="Ticket Medio"
          value={formatCurrency(avgTicket)}
          icon={DollarSign}
          variant="info"
        />
        <MetricCard
          label="Clientes"
          value={stats.customers.length}
          icon={Users}
          variant="warning"
          subtitle={`+${stats.newCustomers} novos este mes`}
        />
      </Grid>

      {/* Quick Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniMetric
          label="Caixas Abertos"
          value={stats.cashRegisters?.length || 0}
          icon={Wallet}
          status={stats.cashRegisters?.length > 0 ? 'success' : 'danger'}
        />
        <MiniMetric
          label="Operadores Ativos"
          value={stats.salesByOperator?.length || 0}
          icon={User}
        />
        <MiniMetric
          label="Produtos Vendidos"
          value={stats.sales.reduce((sum, s) => sum + (s.items?.length || 0), 0)}
          icon={Package}
        />
        <MiniMetric
          label="Estoque Baixo"
          value={stats.lowStockProducts?.length || 0}
          icon={AlertTriangle}
          status={stats.lowStockProducts?.length > 0 ? 'danger' : 'success'}
        />
        <MiniMetric
          label="Despesas no Mes"
          value={formatCurrency(stats.expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)}
          icon={ArrowDown}
          status="danger"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Performance de Vendas (Ultimos 7 Dias)" icon={TrendingUp}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" strokeWidth={2} name="Vendas" />
                <Line type="monotone" dataKey="lucro" stroke="hsl(var(--success))" strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        <CardSection title="Vendas por Categoria" icon={PieChartIcon}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.salesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardSection>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Top 5 Produtos" icon={BarChart3}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <YAxis dataKey="name" type="category" className="text-muted-foreground" fontSize={12} width={150} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        <CardSection title="Fluxo de Caixa Acumulado" icon={DollarSign}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(var(--success))" name="Receitas" />
                <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSection>
      </div>

      {/* Operators Ranking & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Ranking de Operadores/Vendedores" icon={Award}>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {stats.salesByOperator.map((operator, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-600' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{operator.name}</p>
                      <p className="text-xs text-muted-foreground">{operator.quantidade} vendas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(operator.vendas)}</p>
                    <p className="text-xs text-success">{formatCurrency(operator.lucro)} lucro</p>
                  </div>
                </div>
              ))}
              {stats.salesByOperator.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma venda registrada</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardSection>

        <CardSection title="Alertas de Estoque" icon={AlertTriangle}>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {stats.lowStockProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Min: {product.min_stock} unidades</p>
                    </div>
                  </div>
                  <StatusBadge
                    status="danger"
                    label={`${product.stock_quantity || 0} un`}
                  />
                </div>
              ))}
              {stats.lowStockProducts.length === 0 && (
                <div className="text-center py-8 text-success">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Estoque em dia!</p>
                  <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardSection>
      </div>
    </PageContainer>
  );
}
