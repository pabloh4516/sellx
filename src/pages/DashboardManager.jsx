import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, Users, ShoppingCart, BarChart3, PieChart as PieChartIcon,
  AlertTriangle, Award, User, Package, Wallet, ArrowUp, ArrowDown, Trophy, Medal,
  Clock, CheckCircle, XCircle, Target, Bell
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

      {/* Operators Ranking & Cash Registers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Ranking de Operadores/Vendedores" icon={Trophy}>
          {/* Top 3 Podium */}
          {stats.salesByOperator.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* 2o lugar */}
              <div className="flex flex-col items-center p-3 bg-[#C0C0C0]/10 rounded-xl border border-[#C0C0C0]/20">
                <Medal className="w-6 h-6 text-[#C0C0C0] mb-1" />
                <span className="text-lg font-bold text-[#C0C0C0]">2o</span>
                <p className="text-xs font-medium truncate w-full text-center mt-1">{stats.salesByOperator[1]?.name}</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(stats.salesByOperator[1]?.vendas)}</p>
              </div>
              {/* 1o lugar */}
              <div className="flex flex-col items-center p-3 bg-warning/10 rounded-xl border-2 border-warning -mt-2">
                <Trophy className="w-7 h-7 text-warning mb-1" />
                <span className="text-xl font-bold text-warning">1o</span>
                <p className="text-xs font-medium truncate w-full text-center mt-1">{stats.salesByOperator[0]?.name}</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(stats.salesByOperator[0]?.vendas)}</p>
              </div>
              {/* 3o lugar */}
              <div className="flex flex-col items-center p-3 bg-[#CD7F32]/10 rounded-xl border border-[#CD7F32]/20">
                <Medal className="w-6 h-6 text-[#CD7F32] mb-1" />
                <span className="text-lg font-bold text-[#CD7F32]">3o</span>
                <p className="text-xs font-medium truncate w-full text-center mt-1">{stats.salesByOperator[2]?.name}</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(stats.salesByOperator[2]?.vendas)}</p>
              </div>
            </div>
          )}

          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {stats.salesByOperator.map((operator, index) => {
                const avgTicket = operator.quantidade > 0 ? operator.vendas / operator.quantidade : 0;
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-warning/20 text-warning' :
                        index === 1 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                        index === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{operator.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {operator.quantidade} vendas | Ticket: {formatCurrency(avgTicket)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(operator.vendas)}</p>
                      <p className="text-xs text-success">{formatCurrency(operator.lucro)} lucro</p>
                    </div>
                  </div>
                );
              })}
              {stats.salesByOperator.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma venda registrada</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardSection>

        {/* Caixas Ativos */}
        <CardSection title="Caixas Ativos" icon={Wallet}>
          {stats.cashRegisters.length > 0 ? (
            <div className="space-y-3">
              {stats.cashRegisters.map((register, index) => {
                // Calcular vendas do caixa
                const registerSales = stats.sales.filter(s => s.cash_register_id === register.id);
                const registerTotal = registerSales.reduce((sum, s) => sum + (s.total || 0), 0);
                const openingDate = register.opening_date ? new Date(register.opening_date) : new Date();
                const hoursOpen = Math.floor((new Date() - openingDate) / (1000 * 60 * 60));
                const minutesOpen = Math.floor(((new Date() - openingDate) / (1000 * 60)) % 60);

                return (
                  <div key={register.id} className="p-4 bg-success/5 border border-success/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{register.opened_by || 'Operador'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {hoursOpen}h {minutesOpen}m aberto
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-medium">Ativo</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Inicial</p>
                        <p className="font-medium text-sm">{formatCurrency(register.opening_balance)}</p>
                      </div>
                      <div className="text-center p-2 bg-primary/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Vendas</p>
                        <p className="font-bold text-primary">{formatCurrency(registerTotal)}</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Qtd</p>
                        <p className="font-medium text-sm">{registerSales.length}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Resumo Total */}
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total em Caixas</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(stats.cashRegisters.reduce((sum, r) => {
                      const rSales = stats.sales.filter(s => s.cash_register_id === r.id);
                      return sum + rSales.reduce((s, sale) => s + (sale.total || 0), 0);
                    }, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto mb-2 text-destructive opacity-50" />
              <p className="text-muted-foreground">Nenhum caixa aberto</p>
              <p className="text-xs text-muted-foreground mt-1">Os operadores precisam abrir seus caixas</p>
            </div>
          )}
        </CardSection>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Alertas Operacionais */}
        <CardSection title="Alertas Operacionais" icon={Bell}>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {/* Alerta de caixas fechados */}
              {stats.cashRegisters.length === 0 && (
                <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Nenhum caixa aberto</p>
                    <p className="text-xs text-muted-foreground">Os operadores precisam abrir seus caixas para iniciar vendas</p>
                  </div>
                </div>
              )}

              {/* Alerta de operadores sem vendas */}
              {stats.cashRegisters.filter(r => {
                const rSales = stats.sales.filter(s => s.cash_register_id === r.id);
                return rSales.length === 0;
              }).map(reg => (
                <div key={reg.id} className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{reg.opened_by || 'Operador'} sem vendas</p>
                    <p className="text-xs text-muted-foreground">Caixa aberto mas nenhuma venda registrada ainda</p>
                  </div>
                </div>
              ))}

              {/* Alerta de produtos sem estoque */}
              {stats.products.filter(p => p.stock_quantity === 0 && p.is_active !== false).length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {stats.products.filter(p => p.stock_quantity === 0 && p.is_active !== false).length} produtos sem estoque
                    </p>
                    <p className="text-xs text-muted-foreground">Produtos esgotados que precisam de reposicao urgente</p>
                  </div>
                </div>
              )}

              {/* Alerta de ticket medio baixo */}
              {avgTicket > 0 && avgTicket < 50 && (
                <div className="flex items-center gap-3 p-3 bg-info/10 rounded-lg border border-info/20">
                  <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center">
                    <Target className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Ticket medio abaixo de R$ 50</p>
                    <p className="text-xs text-muted-foreground">Considere estrategias de upselling para aumentar o valor medio</p>
                  </div>
                </div>
              )}

              {/* Alerta de margem baixa */}
              {totalSales > 0 && (totalProfit / totalSales * 100) < 15 && (
                <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Margem de lucro abaixo de 15%</p>
                    <p className="text-xs text-muted-foreground">Revise precos e custos para melhorar a rentabilidade</p>
                  </div>
                </div>
              )}

              {/* Sem alertas */}
              {stats.cashRegisters.length > 0 &&
               stats.cashRegisters.filter(r => stats.sales.filter(s => s.cash_register_id === r.id).length === 0).length === 0 &&
               stats.products.filter(p => p.stock_quantity === 0 && p.is_active !== false).length === 0 &&
               (avgTicket === 0 || avgTicket >= 50) &&
               (totalSales === 0 || (totalProfit / totalSales * 100) >= 15) && (
                <div className="text-center py-8 text-success">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Tudo funcionando bem!</p>
                  <p className="text-sm text-muted-foreground">Nenhum alerta operacional no momento</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardSection>
      </div>
    </PageContainer>
  );
}
