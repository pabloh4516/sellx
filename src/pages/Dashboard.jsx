import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { useSafeLoading } from '@/components/ui/safe-loading';
import { safeGetItem, safeSetItem } from '@/lib/storageUtils';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/config/permissions';
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown,
  AlertTriangle, Clock, BarChart3, Wallet, LayoutDashboard, Receipt,
  ArrowUpRight, ArrowDownRight, User, Unlock, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  Section,
  CardSection,
  Grid,
  MetricCard,
  HighlightMetric,
  MiniMetric,
  ProgressMetric,
  DataTable,
  StatusBadge,
} from '@/components/nexo';

export default function Dashboard() {
  const { can, operator } = useAuth();
  const canViewAllCash = can('cash.view_all');

  // Verificar se pode ver todas as vendas (admin, owner, gerente)
  const canViewAllSales = operator?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(operator.role);

  const [stats, setStats] = useState({
    todaySales: 0,
    todayCount: 0,
    monthSales: 0,
    monthCount: 0,
    // Comparativos - ontem
    yesterdaySales: 0,
    yesterdayCount: 0,
    lastMonthSales: 0,
    lastMonthCount: 0,
    // Variações percentuais
    salesVariation: 0,
    countVariation: 0,
    monthVariation: 0,
    ticketVariation: 0,
    // Métricas de operadores (para gerentes)
    operatorStats: [],
    totalCancellations: 0,
    totalReturns: 0,
    avgSaleTime: 0,
    // Originais
    pendingReceivables: 0,
    pendingPayables: 0,
    lowStockProducts: [],
    expiringProducts: [],
    zeroStockProducts: [],
    overdueCustomers: [],
    recentSales: [],
    salesByCategory: [],
    dailySales: [],
    totalProducts: 0,
    totalCustomers: 0,
    productsSold: 0,
    salesByPaymentMethod: [],
    topProducts: [],
    hourlyDistribution: [],
    profit: 0,
    todayProfit: 0,
    yesterdayProfit: 0,
    profitVariation: 0
  });
  const [loading, setLoading, isTimeout] = useSafeLoading(true, 25000); // 25s timeout (mais dados)
  const [refreshing, setRefreshing] = useState(false);
  const [cashRegister, setCashRegister] = useState(null);

  // Funcao para forcar atualizacao (limpa cache e recarrega)
  const handleRefresh = async () => {
    setRefreshing(true);
    // Limpar cache do dashboard
    localStorage.removeItem('dashboard_cache');
    await loadFreshData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [operator?.id, canViewAllSales]);

  // Cache local do dashboard (5 minutos)
  const DASHBOARD_CACHE_KEY = 'dashboard_cache';
  const DASHBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  const getCachedDashboard = () => {
    const cached = safeGetItem(DASHBOARD_CACHE_KEY, null);
    if (cached && cached.data && cached.timestamp) {
      if (Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
        return cached.data;
      }
    }
    return null;
  };

  const setCachedDashboard = (data) => {
    // Usar safeSetItem com limite de tamanho
    safeSetItem(DASHBOARD_CACHE_KEY, {
      data,
      timestamp: Date.now()
    }, { maxSize: 100000 }); // Max 100KB para cache do dashboard
  };

  const loadDashboardData = async () => {
    try {
      // Verificar cache primeiro
      const cachedData = getCachedDashboard();
      if (cachedData) {
        console.log('[Dashboard] Usando dados do cache');
        setStats(cachedData.stats);
        setCashRegister(cachedData.cashRegister);
        setLoading(false);

        // Atualizar em background se online
        if (navigator.onLine) {
          loadFreshData();
        }
        return;
      }

      await loadFreshData();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const loadFreshData = async (retryCount = 0) => {
    try {
      console.log('[Dashboard] Carregando dados frescos... (tentativa', retryCount + 1, ')');

      const today = new Date();
      const yesterday = subDays(today, 1);
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();
      const startYesterday = startOfDay(yesterday).toISOString();
      const endYesterday = endOfDay(yesterday).toISOString();
      const startMonth = startOfMonth(today).toISOString();
      const endMonth = endOfMonth(today).toISOString();
      const lastMonth = subDays(startOfMonth(today), 1);
      const startLastMonth = startOfMonth(lastMonth).toISOString();
      const endLastMonth = endOfMonth(lastMonth).toISOString();
      const sevenDaysAgo = subDays(today, 7).toISOString();

      // Queries otimizadas - buscar apenas dados necessarios
      // Dividido em dois grupos para nao sobrecarregar
      const [
        salesData,
        cashRegisters,
        customersCount
      ] = await Promise.all([
        // Vendas concluidas ordenadas por data (mais recentes primeiro)
        base44.entities.Sale.list('-sale_date', { limit: 200 }),
        // Caixa aberto
        base44.entities.CashRegister.filter({ status: 'aberto' }, { limit: 1 }),
        // Contagem de clientes
        base44.entities.Customer.count()
      ]);

      console.log('[Dashboard] Vendas brutas recebidas:', salesData?.length || 0);

      // Filtrar apenas vendas concluidas
      let completedSalesData = (salesData || []).filter(s => s.status === 'concluida');

      // Se nao pode ver todas as vendas, filtrar apenas as do operador atual
      if (!canViewAllSales && operator?.id) {
        completedSalesData = completedSalesData.filter(sale =>
          sale.operator_id === operator.id || sale.seller_id === operator.id
        );
      }

      // Se nao encontrou vendas e e a primeira tentativa, pode ser problema de organization_id
      // Tentar novamente apos pequeno delay
      if (completedSalesData.length === 0 && retryCount < 2 && salesData?.length === 0) {
        console.log('[Dashboard] Nenhuma venda encontrada, tentando novamente em 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadFreshData(retryCount + 1);
      }

      // Segunda rodada de queries (menos criticas)
      const [
        lowStockProducts,
        receivablesData,
        payablesData,
        operatorsData,
        sellersData
      ] = await Promise.all([
        // Produtos com estoque baixo - limite menor
        base44.entities.Product.list('-stock_quantity', { limit: 100 }),
        // Parcelas pendentes (limite menor)
        base44.entities.Installment.filter({ status: 'pendente' }, { limit: 100 }),
        // Despesas pendentes (limite menor)
        base44.entities.Expense.filter({ status: 'pendente' }, { limit: 50 }),
        // Operadores para mostrar nome nas vendas (apenas se admin)
        canViewAllSales ? base44.entities.Profile.list() : Promise.resolve([]),
        // Vendedores para mostrar nome nas vendas (apenas se admin)
        canViewAllSales ? base44.entities.Seller.list().catch(() => []) : Promise.resolve([])
      ]);

      // Usar os dados carregados
      const sales = completedSalesData;
      const products = lowStockProducts || [];
      const receivables = receivablesData || [];
      const payables = payablesData || [];
      const productsData = products; // Remover query duplicada

      console.log('[Dashboard] Vendas concluidas:', sales.length);
      if (sales.length > 0) {
        console.log('[Dashboard] Ultima venda:', {
          id: sales[0]?.id?.slice(0, 8),
          status: sales[0]?.status,
          total: sales[0]?.total,
          date: sales[0]?.sale_date
        });
      }

      // Today's sales
      const todaySales = sales.filter(s =>
        new Date(s.sale_date || s.created_at) >= new Date(startToday) &&
        new Date(s.sale_date || s.created_at) <= new Date(endToday)
      );

      // Yesterday's sales (para comparativo)
      const yesterdaySalesData = sales.filter(s =>
        new Date(s.sale_date || s.created_at) >= new Date(startYesterday) &&
        new Date(s.sale_date || s.created_at) <= new Date(endYesterday)
      );

      // Month sales
      const monthSales = sales.filter(s =>
        new Date(s.sale_date || s.created_at) >= new Date(startMonth) &&
        new Date(s.sale_date || s.created_at) <= new Date(endMonth)
      );

      // Last month sales (para comparativo)
      const lastMonthSalesData = sales.filter(s =>
        new Date(s.sale_date || s.created_at) >= new Date(startLastMonth) &&
        new Date(s.sale_date || s.created_at) <= new Date(endLastMonth)
      );

      // Calcular totais de ontem
      const yesterdaySalesTotal = yesterdaySalesData.reduce((sum, s) => sum + (s.total || 0), 0);
      const yesterdayCountTotal = yesterdaySalesData.length;
      const yesterdayProfitTotal = yesterdaySalesData.reduce((sum, s) => sum + (s.profit || 0), 0);

      // Calcular totais do mês passado
      const lastMonthSalesTotal = lastMonthSalesData.reduce((sum, s) => sum + (s.total || 0), 0);

      // Calcular variações percentuais
      const calcVariation = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Métricas de operadores (para gerentes/admins)
      const operatorStatsMap = {};
      if (canViewAllSales) {
        // Criar mapa de operadores para lookup rápido
        const operatorsMap = {};
        (operatorsData || []).forEach(op => {
          operatorsMap[op.id] = op.full_name || op.name || 'Operador';
        });
        // Adicionar vendedores ao mapa
        (sellersData || []).forEach(seller => {
          operatorsMap[seller.id] = seller.name || seller.full_name || 'Vendedor';
          if (seller.seller_id) {
            operatorsMap[seller.seller_id] = seller.name || seller.full_name || 'Vendedor';
          }
        });

        todaySales.forEach(sale => {
          const opId = sale.operator_id || sale.seller_id || 'unknown';
          if (!operatorStatsMap[opId]) {
            // Buscar nome do operador: primeiro na venda, depois no mapa de perfis
            const operatorName = sale.operator_name ||
                                 sale.seller_name ||
                                 operatorsMap[opId] ||
                                 operatorsMap[sale.operator_id] ||
                                 operatorsMap[sale.seller_id] ||
                                 'Operador';
            operatorStatsMap[opId] = {
              id: opId,
              name: operatorName,
              sales: 0,
              total: 0,
              items: 0,
              cancellations: 0,
              avgTicket: 0
            };
          }
          operatorStatsMap[opId].sales++;
          operatorStatsMap[opId].total += sale.total || 0;
          operatorStatsMap[opId].items += sale.items?.length || 0;
        });

        // Calcular ticket médio por operador
        Object.values(operatorStatsMap).forEach(op => {
          op.avgTicket = op.sales > 0 ? op.total / op.sales : 0;
        });
      }
      const operatorStats = Object.values(operatorStatsMap).sort((a, b) => b.total - a.total);

      // Products sold today
      const productsSold = todaySales.reduce((sum, s) => {
        return sum + (s.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0);
      }, 0);

      // Low stock products
      const lowStock = products.filter(p =>
        p.min_stock && p.stock_quantity <= p.min_stock && p.stock_quantity > 0 && p.is_active !== false
      ).slice(0, 5);

      // Zero stock products (crítico)
      const zeroStock = products.filter(p =>
        p.stock_quantity === 0 && p.is_active !== false
      ).slice(0, 5);

      // Expiring products (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiring = products.filter(p =>
        p.expiry_date && new Date(p.expiry_date) <= thirtyDaysFromNow
      ).slice(0, 5);

      // Overdue installments (clientes em atraso)
      const overdueInstallments = receivables.filter(r =>
        new Date(r.due_date) < today && r.status === 'pendente'
      );
      // Apenas contar clientes unicos em atraso (nao precisamos dos dados completos)
      const overdueCustomerIds = [...new Set(overdueInstallments.map(i => i.customer_id))];
      // Criar lista simplificada para exibicao
      const overdueCustomersList = overdueCustomerIds.slice(0, 5).map(id => ({
        id,
        name: overdueInstallments.find(i => i.customer_id === id)?.customer_name || 'Cliente'
      }));

      // Daily sales for chart
      const dailyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const daySales = sales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_at);
          return saleDate >= startOfDay(date) && saleDate <= endOfDay(date);
        });
        dailyData.push({
          date: format(date, 'EEE', { locale: ptBR }),
          vendas: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
          lucro: daySales.reduce((sum, s) => sum + (s.profit || 0), 0),
          quantidade: daySales.length
        });
      }

      // Sales by payment method (for pie chart)
      const paymentBreakdown = {};
      monthSales.forEach(sale => {
        (sale.payments || []).forEach(payment => {
          const methodName = payment.method_name || 'Outros';
          if (!paymentBreakdown[methodName]) {
            paymentBreakdown[methodName] = 0;
          }
          paymentBreakdown[methodName] += payment.amount || 0;
        });
      });
      const salesByPaymentMethod = Object.entries(paymentBreakdown).map(([name, value]) => ({
        name,
        value,
        percentage: ((value / stats.monthSales) * 100).toFixed(1)
      })).sort((a, b) => b.value - a.value);

      // Top selling products (for bar chart)
      const productSalesCount = {};
      monthSales.forEach(sale => {
        (sale.items || []).forEach(item => {
          const productName = item.product_name || 'Produto';
          if (!productSalesCount[productName]) {
            productSalesCount[productName] = { name: productName, quantidade: 0, valor: 0 };
          }
          productSalesCount[productName].quantidade += item.quantity || 0;
          productSalesCount[productName].valor += item.total || 0;
        });
      });
      const topProducts = Object.values(productSalesCount)
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Hourly distribution (for today's sales)
      const hourlyData = [];
      for (let hour = 8; hour <= 22; hour++) {
        const hourSales = todaySales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_at);
          return saleDate.getHours() === hour;
        });
        hourlyData.push({
          hora: `${hour}h`,
          vendas: hourSales.reduce((sum, s) => sum + (s.total || 0), 0),
          quantidade: hourSales.length
        });
      }

      // Calculate profit
      const todayProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
      const monthProfit = monthSales.reduce((sum, s) => sum + (s.profit || 0), 0);

      // Open cash register
      if (cashRegisters.length > 0) {
        setCashRegister(cashRegisters[0]);
      }

      // Recent sales with customer and operator names
      const operators = operatorsData || [];
      const recentSalesWithCustomer = sales.slice(0, 5).map(sale => {
        // Buscar nome do operador
        let operatorName = '-';
        if (sale.operator_id) {
          const op = operators.find(o => o.id === sale.operator_id);
          if (op) operatorName = op.full_name;
        }
        return {
          ...sale,
          customerName: sale.customer_name || 'Cliente avulso',
          operatorName
        };
      });

      // Calcular valores de hoje e variações
      const todaySalesTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
      const monthSalesTotal = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const todayTicket = todaySales.length > 0 ? todaySalesTotal / todaySales.length : 0;
      const yesterdayTicket = yesterdayCountTotal > 0 ? yesterdaySalesTotal / yesterdayCountTotal : 0;

      const newStats = {
        todaySales: todaySalesTotal,
        todayCount: todaySales.length,
        monthSales: monthSalesTotal,
        monthCount: monthSales.length,
        // Comparativos
        yesterdaySales: yesterdaySalesTotal,
        yesterdayCount: yesterdayCountTotal,
        lastMonthSales: lastMonthSalesTotal,
        lastMonthCount: lastMonthSalesData.length,
        // Variações percentuais
        salesVariation: calcVariation(todaySalesTotal, yesterdaySalesTotal),
        countVariation: calcVariation(todaySales.length, yesterdayCountTotal),
        monthVariation: calcVariation(monthSalesTotal, lastMonthSalesTotal),
        ticketVariation: calcVariation(todayTicket, yesterdayTicket),
        // Métricas de operadores
        operatorStats,
        // Financeiro
        pendingReceivables: receivables.reduce((sum, r) => sum + (r.amount || 0), 0),
        pendingReceivablesCount: receivables.length,
        pendingPayables: payables.reduce((sum, p) => sum + (p.amount || 0), 0),
        pendingPayablesCount: payables.length,
        // Alertas
        lowStockProducts: lowStock,
        zeroStockProducts: zeroStock,
        expiringProducts: expiring,
        overdueCustomers: overdueCustomersList,
        // Vendas
        recentSales: recentSalesWithCustomer,
        dailySales: dailyData,
        totalProducts: products.length,
        totalCustomers: customersCount || 0,
        productsSold,
        salesByPaymentMethod,
        topProducts,
        hourlyDistribution: hourlyData,
        // Lucro
        todayProfit,
        yesterdayProfit: yesterdayProfitTotal,
        profitVariation: calcVariation(todayProfit, yesterdayProfitTotal),
        profit: monthProfit
      };

      setStats(newStats);

      // Salvar no cache
      const currentCashRegister = cashRegisters.length > 0 ? cashRegisters[0] : null;
      setCachedDashboard({
        stats: newStats,
        cashRegister: currentCashRegister
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  // Goals calculation - memoizado para evitar recalculos
  const dailyGoal = 5000;
  const monthlyGoal = 100000;
  const ticketMedio = useMemo(() =>
    stats.todayCount > 0 ? stats.todaySales / stats.todayCount : 0,
    [stats.todayCount, stats.todaySales]
  );

  // Componente para mostrar variação com cor e seta
  const TrendIndicator = ({ value, suffix = '%', invertColors = false }) => {
    if (value === 0 || isNaN(value)) return null;
    const isPositive = value > 0;
    const color = invertColors
      ? (isPositive ? 'text-destructive' : 'text-success')
      : (isPositive ? 'text-success' : 'text-destructive');
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
      </span>
    );
  };

  // Colors for pie chart
  const CHART_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  // Sales table columns
  const salesColumns = [
    {
      key: 'number',
      label: 'Venda',
      render: (_, sale) => (
        <span className="font-medium">#{sale.sale_number || sale.id?.slice(0, 8)}</span>
      ),
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, sale) => (
        <span className="text-muted-foreground">{sale.customerName}</span>
      ),
    },
    // Mostrar operador apenas para admin/gerente/owner
    ...(canViewAllSales ? [{
      key: 'operator',
      label: 'Operador',
      render: (_, sale) => (
        <span className="text-muted-foreground text-sm">{sale.operatorName || '-'}</span>
      ),
    }] : []),
    {
      key: 'total',
      label: 'Total',
      className: 'text-right',
      render: (_, sale) => (
        <span className="font-bold">{formatCurrency(sale.total)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, sale) => {
        const statusMap = {
          concluida: { status: 'success', label: 'Concluída' },
          cancelada: { status: 'danger', label: 'Cancelada' },
          pendente: { status: 'warning', label: 'Pendente' },
        };
        const { status, label } = statusMap[sale.status] || statusMap.pendente;
        return <StatusBadge status={status} label={label} />;
      },
    },
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
      {/* Header */}
      <PageHeader
        title={canViewAllSales ? "Dashboard" : "Meu Dashboard"}
        subtitle={canViewAllSales ? "Visao geral do seu negocio" : `Vendas de ${operator?.full_name || 'Operador'}`}
        icon={LayoutDashboard}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Link to={createPageUrl('PDV')}>
              <Button className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Abrir PDV
              </Button>
            </Link>
          </div>
        }
      />

      {/* Cash Register Status */}
      {!cashRegister ? (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-medium text-foreground">Caixa nao aberto</p>
              <p className="text-sm text-muted-foreground">Abra o caixa para comecar a vender</p>
            </div>
          </div>
          <Link to={createPageUrl('CashRegister')}>
            <Button>Abrir Caixa</Button>
          </Link>
        </div>
      ) : canViewAllCash && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Unlock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  Caixa Aberto
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {cashRegister.opened_by || 'Operador'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Aberto {safeFormatDate(cashRegister.opening_date, "dd/MM 'às' HH:mm")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                <p className="font-bold text-success">{formatCurrency(cashRegister.opening_balance || 0)}</p>
              </div>
              <Link to={createPageUrl('CashRegister')}>
                <Button variant="outline">Ver Detalhes</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Metrics - Sellx Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Highlight Principal - Faturamento com comparativo */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <TrendIndicator value={stats.salesVariation} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Faturamento Hoje</p>
            <p className="text-3xl font-bold text-foreground mb-2">{formatCurrency(stats.todaySales)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats.todayCount} vendas realizadas</span>
              <span>Ontem: {formatCurrency(stats.yesterdaySales)}</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
              <TrendIndicator value={stats.monthVariation} />
            </div>
            <p className="text-xs text-muted-foreground mb-1">Vendas no Mes</p>
            <p className="text-xl font-bold">{formatCurrency(stats.monthSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mes anterior: {formatCurrency(stats.lastMonthSales)}
            </p>
          </div>
          {canViewAllSales ? (
            <>
              <MetricCard
                label="Contas a Receber"
                value={formatCurrency(stats.pendingReceivables)}
                icon={ArrowUpRight}
                variant="warning"
                footer={
                  <span className="text-xs text-muted-foreground">
                    {stats.pendingReceivablesCount || 0} titulos em aberto
                  </span>
                }
              />
              <MetricCard
                label="Contas a Pagar"
                value={formatCurrency(stats.pendingPayables)}
                icon={ArrowDownRight}
                variant="danger"
                footer={
                  <span className="text-xs text-muted-foreground">
                    {stats.pendingPayablesCount || 0} titulos pendentes
                  </span>
                }
              />
            </>
          ) : (
            <>
              <MetricCard
                label="Qtd Vendas Mes"
                value={stats.monthCount}
                icon={ShoppingCart}
                variant="info"
                footer={
                  <span className="text-xs text-muted-foreground">
                    vendas realizadas
                  </span>
                }
              />
              <MetricCard
                label="Ticket Medio"
                value={formatCurrency(stats.monthCount > 0 ? stats.monthSales / stats.monthCount : 0)}
                icon={Receipt}
                variant="primary"
              />
            </>
          )}
        </div>
      </div>

      {/* Quick Metrics + Goals */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MiniMetric
          label="Ticket Medio"
          value={formatCurrency(ticketMedio)}
          icon={Receipt}
        />
        <MiniMetric
          label="Produtos Vendidos"
          value={stats.productsSold}
          icon={Package}
        />
        <MiniMetric
          label="Clientes Hoje"
          value={stats.todayCount}
          icon={Users}
        />
        <MiniMetric
          label="Status do Caixa"
          value={cashRegister ? 'Aberto' : 'Fechado'}
          icon={Wallet}
          status={cashRegister ? 'success' : 'danger'}
        />
        <ProgressMetric
          label="Meta Diaria"
          value={stats.todaySales}
          max={dailyGoal}
          variant={stats.todaySales >= dailyGoal * 0.8 ? 'success' : 'warning'}
          format={(v, m) => `${formatCurrency(v)} / ${formatCurrency(m)}`}
        />
        <ProgressMetric
          label="Meta Mensal"
          value={stats.monthSales}
          max={monthlyGoal}
          variant={stats.monthSales >= monthlyGoal * 0.7 ? 'success' : 'default'}
          format={(v, m) => `${((v / m) * 100).toFixed(0)}% atingido`}
        />
      </div>

      {/* Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <CardSection
          title="Vendas - Ultimos 7 Dias"
          icon={BarChart3}
          className="lg:col-span-2"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailySales}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-muted-foreground"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-muted-foreground"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Vendas']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVendas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        {/* Alerts */}
        <CardSection
          title="Alertas"
          icon={AlertTriangle}
        >
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Estoque Zerado - Crítico */}
            {stats.zeroStockProducts?.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Estoque Zerado ({stats.zeroStockProducts.length})
                </p>
                <div className="space-y-1">
                  {stats.zeroStockProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-foreground truncate">{product.name}</span>
                      <StatusBadge status="danger" label="0 un" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estoque Baixo */}
            {stats.lowStockProducts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">
                  Estoque Baixo ({stats.lowStockProducts.length})
                </p>
                <div className="space-y-2">
                  {stats.lowStockProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-foreground truncate">{product.name}</span>
                      <StatusBadge status="warning" label={`${product.stock_quantity} un`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.expiringProducts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Proximo da Validade
                </p>
                <div className="space-y-2">
                  {stats.expiringProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-foreground truncate">{product.name}</span>
                      <StatusBadge status="warning" label={safeFormatDate(product.expiry_date, 'dd/MM')} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.overdueCustomers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Clientes em Atraso
                </p>
                <div className="space-y-2">
                  {stats.overdueCustomers.map(customer => (
                    <div key={customer.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-foreground truncate">{customer.name}</span>
                      <Clock className="w-4 h-4 text-destructive" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.lowStockProducts.length === 0 && stats.expiringProducts.length === 0 && stats.overdueCustomers.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
              </div>
            )}
          </div>
        </CardSection>
      </div>

      {/* New Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Pie Chart */}
        <CardSection
          title="Vendas por Forma de Pagamento"
          icon={Receipt}
        >
          {stats.salesByPaymentMethod.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.salesByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
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
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value, entry, index) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados de pagamento
            </div>
          )}
        </CardSection>

        {/* Top Products Bar Chart */}
        <CardSection
          title="Produtos Mais Vendidos"
          icon={Package}
        >
          {stats.topProducts.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                    fontSize={10}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    className="text-muted-foreground"
                    fontSize={10}
                    width={100}
                    tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'valor' ? formatCurrency(value) : value,
                      name === 'valor' ? 'Valor' : 'Quantidade'
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
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem dados de produtos
            </div>
          )}
        </CardSection>

        {/* Hourly Distribution */}
        <CardSection
          title="Distribuicao por Hora (Hoje)"
          icon={Clock}
        >
          {stats.hourlyDistribution.some(h => h.vendas > 0) ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="hora"
                    className="text-muted-foreground"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    className="text-muted-foreground"
                    fontSize={10}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'vendas' ? formatCurrency(value) : value,
                      name === 'vendas' ? 'Vendas' : 'Qtd'
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                    }}
                  />
                  <Bar dataKey="vendas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Sem vendas hoje
            </div>
          )}
        </CardSection>
      </div>

      {/* Performance de Operadores - Apenas para gerentes/admins */}
      {canViewAllSales && stats.operatorStats.length > 0 && (
        <CardSection
          title="Performance dos Operadores (Hoje)"
          icon={Users}
        >
          <div className="space-y-3">
            {stats.operatorStats.slice(0, 5).map((op, index) => (
              <div key={op.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-warning text-warning-foreground' :
                  index === 1 ? 'bg-muted text-muted-foreground' :
                  index === 2 ? 'bg-orange-200 text-orange-800' :
                  'bg-muted/50 text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{op.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {op.sales} vendas • Ticket medio: {formatCurrency(op.avgTicket)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(op.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {/* Recent Sales Table */}
      <Section
        title="Ultimas Vendas"
        subtitle="Transacoes recentes"
        icon={ShoppingCart}
        action={{
          label: 'Ver todas',
          onClick: () => window.location.href = createPageUrl('Sales'),
        }}
      >
        <DataTable
          data={stats.recentSales}
          columns={salesColumns}
          keyExtractor={(sale) => sale.id}
          emptyContext="sales"
        />
      </Section>

      {/* Quick Stats */}
      <Section title="Resumo Geral" subtitle="Estatisticas do sistema">
        <Grid cols={4}>
          <MiniMetric
            label="Produtos Cadastrados"
            value={stats.totalProducts}
            icon={Package}
          />
          <MiniMetric
            label="Clientes Cadastrados"
            value={stats.totalCustomers}
            icon={Users}
          />
          <MiniMetric
            label="Estoque Baixo"
            value={stats.lowStockProducts.length}
            icon={AlertTriangle}
            status={stats.lowStockProducts.length > 0 ? 'danger' : 'default'}
          />
          <MiniMetric
            label="Em Atraso"
            value={stats.overdueCustomers.length}
            icon={Clock}
            status={stats.overdueCustomers.length > 0 ? 'warning' : 'default'}
          />
        </Grid>
      </Section>
    </PageContainer>
  );
}
