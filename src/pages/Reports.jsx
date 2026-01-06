import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  BarChart3, TrendingUp, Users, Package, DollarSign, Calendar,
  Filter, Download, RefreshCw, ShoppingBag, CreditCard, Percent,
  ArrowUpRight, ArrowDownRight, Target, Award, Lock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  DataTable,
} from '@/components/nexo';
import { ExportMenu } from '@/components/ui/export-menu';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7days', label: 'Ultimos 7 dias' },
  { value: 'last30days', label: 'Ultimos 30 dias' },
  { value: 'thisMonth', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes passado' },
  { value: 'custom', label: 'Personalizado' },
];

export default function Reports() {
  const { can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('vendas');

  // Verificar permissao de acesso
  const hasAccess = can('reports.sales');

  // Filters
  const [period, setPeriod] = useState('last30days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellerId, setSellerId] = useState('all');
  const [customerId, setCustomerId] = useState('all');

  // Se nao tem permissao, mostra mensagem de acesso negado
  if (!hasAccess) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Voce nao tem permissao para acessar os relatorios.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Apenas administradores e gerentes podem ver esta pagina.
          </p>
        </div>
      </PageContainer>
    );
  }
  const [groupId, setGroupId] = useState('all');

  // Data
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [groups, setGroups] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Calculated Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgTicket: 0,
    totalItems: 0,
    salesByDay: [],
    salesBySeller: [],
    salesByPaymentMethod: [],
    salesByGroup: [],
    topProducts: [],
    topCustomers: [],
    comparison: { revenue: 0, count: 0 }
  });

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!loading) {
      calculateStats();
    }
  }, [period, startDate, endDate, sellerId, customerId, groupId, sales]);

  const loadBaseData = async () => {
    try {
      const [salesData, productsData, customersData, sellersData, operatorsData, groupsData, methodsData] = await Promise.all([
        base44.entities.Sale.list(),
        base44.entities.Product.list(),
        base44.entities.Customer.list(),
        base44.entities.Seller.list(),
        base44.entities.Profile.list(),
        base44.entities.ProductGroup.list(),
        base44.entities.PaymentMethod.list(),
      ]);

      setSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      setSellers(sellersData);
      setOperators(operatorsData);
      setGroups(groupsData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadBaseData();
    setRefreshing(false);
    toast.success('Dados atualizados');
  };

  const getDateRange = () => {
    const today = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'yesterday':
        start = startOfDay(subDays(today, 1));
        end = endOfDay(subDays(today, 1));
        break;
      case 'last7days':
        start = startOfDay(subDays(today, 6));
        end = endOfDay(today);
        break;
      case 'last30days':
        start = startOfDay(subDays(today, 29));
        end = endOfDay(today);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case 'custom':
        start = startDate ? startOfDay(parseISO(startDate)) : startOfDay(subDays(today, 29));
        end = endDate ? endOfDay(parseISO(endDate)) : endOfDay(today);
        break;
      default:
        start = startOfDay(subDays(today, 29));
        end = endOfDay(today);
    }

    return { start, end };
  };

  const calculateStats = () => {
    const { start, end } = getDateRange();

    // Filter sales by date range
    let filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_date);
      return saleDate >= start && saleDate <= end && sale.status === 'concluida';
    });

    // Filter by seller
    if (sellerId !== 'all') {
      filteredSales = filteredSales.filter(s => s.seller_id === sellerId);
    }

    // Filter by customer
    if (customerId !== 'all') {
      filteredSales = filteredSales.filter(s => s.customer_id === customerId);
    }

    // Basic stats
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

    // Sales by day
    const salesByDayMap = {};
    filteredSales.forEach(sale => {
      const date = format(new Date(sale.sale_date || sale.created_date), 'dd/MM');
      if (!salesByDayMap[date]) {
        salesByDayMap[date] = { date, vendas: 0, lucro: 0, quantidade: 0 };
      }
      salesByDayMap[date].vendas += sale.total || 0;
      salesByDayMap[date].lucro += sale.profit || 0;
      salesByDayMap[date].quantidade += 1;
    });
    const salesByDay = Object.values(salesByDayMap).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/');
      const [dayB, monthB] = b.date.split('/');
      return (parseInt(monthA) * 100 + parseInt(dayA)) - (parseInt(monthB) * 100 + parseInt(dayB));
    });

    // Sales by seller/operator
    const salesBySellerMap = {};
    filteredSales.forEach(sale => {
      // Tentar pegar o vendedor, se nao houver, usar o operador
      let responsibleName = 'Sem vendedor';
      if (sale.seller_id) {
        const seller = sellers.find(s => s.id === sale.seller_id);
        if (seller) responsibleName = seller.name;
      } else if (sale.operator_id) {
        const op = operators.find(o => o.id === sale.operator_id);
        if (op) responsibleName = op.full_name;
      }

      if (!salesBySellerMap[responsibleName]) {
        salesBySellerMap[responsibleName] = { name: responsibleName, vendas: 0, quantidade: 0 };
      }
      salesBySellerMap[responsibleName].vendas += sale.total || 0;
      salesBySellerMap[responsibleName].quantidade += 1;
    });
    const salesBySeller = Object.values(salesBySellerMap).sort((a, b) => b.vendas - a.vendas);

    // Sales by payment method
    const salesByPaymentMap = {};
    filteredSales.forEach(sale => {
      (sale.payments || []).forEach(payment => {
        const methodName = payment.method_name || 'Outros';
        if (!salesByPaymentMap[methodName]) {
          salesByPaymentMap[methodName] = { name: methodName, value: 0, count: 0 };
        }
        salesByPaymentMap[methodName].value += payment.amount || 0;
        salesByPaymentMap[methodName].count += 1;
      });
    });
    const salesByPaymentMethod = Object.values(salesByPaymentMap).sort((a, b) => b.value - a.value);

    // Top products
    const productSalesMap = {};
    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const productName = item.product_name || 'Produto';
        if (!productSalesMap[productName]) {
          productSalesMap[productName] = { name: productName, quantidade: 0, valor: 0, lucro: 0 };
        }
        productSalesMap[productName].quantidade += item.quantity || 0;
        productSalesMap[productName].valor += item.total || 0;
        productSalesMap[productName].lucro += (item.total || 0) - ((item.cost_price || 0) * (item.quantity || 0));
      });
    });
    const topProducts = Object.values(productSalesMap).sort((a, b) => b.valor - a.valor).slice(0, 10);

    // Top customers
    const customerSalesMap = {};
    filteredSales.forEach(sale => {
      const customer = customers.find(c => c.id === sale.customer_id);
      const customerName = customer?.name || 'Cliente avulso';
      if (!customerSalesMap[customerName]) {
        customerSalesMap[customerName] = { name: customerName, vendas: 0, quantidade: 0 };
      }
      customerSalesMap[customerName].vendas += sale.total || 0;
      customerSalesMap[customerName].quantidade += 1;
    });
    const topCustomers = Object.values(customerSalesMap).sort((a, b) => b.vendas - a.vendas).slice(0, 10);

    // Period comparison
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const prevStart = subDays(start, daysDiff);
    const prevEnd = subDays(end, daysDiff);
    const prevSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_date);
      return saleDate >= prevStart && saleDate <= prevEnd && sale.status === 'concluida';
    });
    const prevRevenue = prevSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const countChange = prevSales.length > 0 ? ((filteredSales.length - prevSales.length) / prevSales.length) * 100 : 0;

    setStats({
      totalSales: filteredSales.length,
      totalRevenue,
      totalProfit,
      avgTicket,
      totalItems,
      salesByDay,
      salesBySeller,
      salesByPaymentMethod,
      topProducts,
      topCustomers,
      comparison: { revenue: revenueChange, count: countChange }
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Export data preparation
  const getExportData = () => {
    const { start, end } = getDateRange();
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_date);
      return saleDate >= start && saleDate <= end && sale.status === 'concluida';
    }).map(sale => ({
      numero: sale.sale_number,
      data: format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy HH:mm'),
      cliente: customers.find(c => c.id === sale.customer_id)?.name || 'Cliente avulso',
      vendedor: sellers.find(s => s.id === sale.seller_id)?.name || '-',
      itens: sale.items?.length || 0,
      total: sale.total || 0,
      lucro: sale.profit || 0,
    }));
  };

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
        title="Relatorios"
        subtitle="Analise detalhada do seu negocio"
        icon={BarChart3}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <ExportMenu
              data={getExportData()}
              filename={`relatorio-${format(new Date(), 'yyyy-MM-dd')}`}
              columns={[
                { key: 'numero', label: 'N Venda' },
                { key: 'data', label: 'Data' },
                { key: 'cliente', label: 'Cliente' },
                { key: 'vendedor', label: 'Vendedor' },
                { key: 'itens', label: 'Itens' },
                { key: 'total', label: 'Total' },
                { key: 'lucro', label: 'Lucro' },
              ]}
            />
          </div>
        }
      />

      {/* Filters */}
      <CardSection>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-40">
            <Label className="text-xs">Periodo</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div className="w-40">
                <Label className="text-xs">Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label className="text-xs">Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="w-48">
            <Label className="text-xs">Vendedor</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sellers.map(seller => (
                  <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-xs">Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {customers.slice(0, 50).map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardSection>

      {/* Main Metrics */}
      <Grid cols={5}>
        <MetricCard
          label="Total de Vendas"
          value={stats.totalSales}
          icon={ShoppingBag}
          trend={stats.comparison.count !== 0 ? {
            value: Math.abs(stats.comparison.count).toFixed(1),
            label: stats.comparison.count >= 0 ? 'aumento' : 'reducao',
            positive: stats.comparison.count >= 0
          } : undefined}
        />
        <MetricCard
          label="Faturamento"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          variant="success"
          trend={stats.comparison.revenue !== 0 ? {
            value: Math.abs(stats.comparison.revenue).toFixed(1),
            label: stats.comparison.revenue >= 0 ? 'aumento' : 'reducao',
            positive: stats.comparison.revenue >= 0
          } : undefined}
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(stats.totalProfit)}
          icon={TrendingUp}
          variant="default"
          footer={
            <span className="text-xs text-muted-foreground">
              Margem: {stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          }
        />
        <MetricCard
          label="Ticket Medio"
          value={formatCurrency(stats.avgTicket)}
          icon={Target}
        />
        <MetricCard
          label="Itens Vendidos"
          value={stats.totalItems}
          icon={Package}
        />
      </Grid>

      {/* Tabs for different reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="vendas" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="gap-2">
            <Users className="w-4 h-4" />
            Vendedores
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="vendas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Over Time */}
            <CardSection title="Evolucao de Vendas" icon={TrendingUp}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.salesByDay}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" fontSize={11} />
                    <YAxis className="text-muted-foreground" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'vendas' ? formatCurrency(value) : value,
                        name === 'vendas' ? 'Faturamento' : 'Quantidade'
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                    <Area type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorVendas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardSection>

            {/* Revenue vs Profit */}
            <CardSection title="Faturamento vs Lucro" icon={BarChart3}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" fontSize={11} />
                    <YAxis className="text-muted-foreground" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="vendas" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardSection>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="produtos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSection title="Top 10 Produtos por Faturamento" icon={Award}>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={10} />
                    <YAxis type="category" dataKey="name" width={120} fontSize={10} tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '...' : v} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'valor' ? formatCurrency(value) : value,
                        name === 'valor' ? 'Faturamento' : 'Quantidade'
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardSection>

            <CardSection title="Detalhes dos Produtos">
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {stats.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantidade} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(product.valor)}</p>
                        <p className="text-xs text-success">{formatCurrency(product.lucro)} lucro</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardSection>
          </div>
        </TabsContent>

        {/* Sellers Tab */}
        <TabsContent value="vendedores" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSection title="Vendas por Vendedor" icon={Users}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesBySeller}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" fontSize={11} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '...' : v} />
                    <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} fontSize={11} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                    <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardSection>

            <CardSection title="Ranking de Vendedores">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {stats.salesBySeller.map((seller, index) => (
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
                          <p className="font-medium text-sm">{seller.name}</p>
                          <p className="text-xs text-muted-foreground">{seller.quantidade} vendas</p>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(seller.vendas)}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardSection>
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="clientes" className="space-y-6">
          <CardSection title="Top 10 Clientes" icon={Users}>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {stats.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                        index === 1 ? 'bg-gray-400/20 text-gray-600' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.quantidade} compras</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(customer.vendas)}</p>
                      <p className="text-xs text-muted-foreground">
                        Ticket medio: {formatCurrency(customer.vendas / customer.quantidade)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardSection>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="pagamentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSection title="Formas de Pagamento" icon={CreditCard}>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.salesByPaymentMethod}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {stats.salesByPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardSection>

            <CardSection title="Detalhes por Forma de Pagamento">
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {stats.salesByPaymentMethod.map((method, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.count} transacoes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(method.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.totalRevenue > 0 ? ((method.value / stats.totalRevenue) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardSection>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
