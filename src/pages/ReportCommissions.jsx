import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  UserCircle, Award, DollarSign, Users, ShoppingCart, Target, TrendingUp,
  Calendar, CheckCircle, Clock, MoreVertical, Eye, Download, Printer,
  Banknote, Star, Trophy, Percent, ArrowUp, ArrowDown, Filter, Lock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  DataTable,
  StatusBadge,
} from '@/components/nexo';
import { ExportMenu } from '@/components/ui/export-menu';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportCommissions() {
  const { can } = useAuth();
  const [sales, setSales] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [commissionPayments, setCommissionPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSellers, setSelectedSellers] = useState([]);

  // Verificar permissao de acesso
  if (!can('reports.commissions')) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Voce nao tem permissao para acessar o relatorio de comissoes.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Dialogs
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [selectedSellerDetail, setSelectedSellerDetail] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    seller_id: '',
    amount: 0,
    period_start: '',
    period_end: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });
  const [goalForm, setGoalForm] = useState({
    seller_id: '',
    monthly_goal: 0,
    bonus_percent: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, sellersData, paymentsData] = await Promise.all([
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Seller.list(),
        base44.entities.CommissionPayment?.list() || Promise.resolve([])
      ]);
      setSales(salesData);
      setSellers(sellersData);
      setCommissionPayments(paymentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
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

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date || sale.created_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, startDate, endDate]);

  const commissionsBySeller = useMemo(() => {
    return sellers.map(seller => {
      const sellerSales = filteredSales.filter(s => s.seller_id === seller.id);
      const totalSales = sellerSales.reduce((sum, s) => sum + (s.total || 0), 0);

      let totalCommission = 0;
      sellerSales.forEach(sale => {
        if (sale.items?.length > 0) {
          sale.items.forEach(item => {
            const commissionPercent = item.commission_percent || seller.commission_percent || 0;
            totalCommission += (item.total * commissionPercent) / 100;
          });
        } else {
          const commissionPercent = seller.commission_percent || 0;
          totalCommission += (sale.total * commissionPercent) / 100;
        }
      });

      // Verificar meta
      const monthlyGoal = seller.monthly_goal || 0;
      const goalProgress = monthlyGoal > 0 ? (totalSales / monthlyGoal) * 100 : 0;
      const goalMet = goalProgress >= 100;

      // Bonus por meta
      let bonus = 0;
      if (goalMet && seller.bonus_percent) {
        bonus = (totalSales * seller.bonus_percent) / 100;
      }

      // Pagamentos feitos no periodo
      const periodPayments = commissionPayments.filter(p =>
        p.seller_id === seller.id &&
        isWithinInterval(parseISO(p.payment_date), {
          start: parseISO(startDate),
          end: parseISO(endDate)
        })
      );
      const paidAmount = periodPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        seller,
        salesCount: sellerSales.length,
        totalSales,
        totalCommission,
        bonus,
        totalEarnings: totalCommission + bonus,
        paidAmount,
        pendingAmount: totalCommission + bonus - paidAmount,
        avgTicket: sellerSales.length > 0 ? totalSales / sellerSales.length : 0,
        goalProgress: Math.min(goalProgress, 100),
        goalMet,
        monthlyGoal,
        sales: sellerSales
      };
    }).filter(data => data.salesCount > 0 || data.seller.is_active);
  }, [sellers, filteredSales, commissionPayments, startDate, endDate]);

  // Calcular totais
  const totals = useMemo(() => {
    const totalCommissions = commissionsBySeller.reduce((sum, d) => sum + d.totalCommission, 0);
    const totalBonus = commissionsBySeller.reduce((sum, d) => sum + d.bonus, 0);
    const totalEarnings = commissionsBySeller.reduce((sum, d) => sum + d.totalEarnings, 0);
    const totalPaid = commissionsBySeller.reduce((sum, d) => sum + d.paidAmount, 0);
    const totalPending = commissionsBySeller.reduce((sum, d) => sum + d.pendingAmount, 0);
    const totalSales = commissionsBySeller.reduce((sum, d) => sum + d.totalSales, 0);
    const totalSalesCount = commissionsBySeller.reduce((sum, d) => sum + d.salesCount, 0);
    const sellersWithGoalMet = commissionsBySeller.filter(d => d.goalMet).length;

    return {
      totalCommissions,
      totalBonus,
      totalEarnings,
      totalPaid,
      totalPending,
      totalSales,
      totalSalesCount,
      sellersWithGoalMet,
      activeSellers: commissionsBySeller.filter(d => d.salesCount > 0).length
    };
  }, [commissionsBySeller]);

  // Dados para graficos
  const chartData = useMemo(() => {
    // Vendas por vendedor (bar chart)
    const salesBySellerData = commissionsBySeller
      .filter(d => d.salesCount > 0)
      .map(d => ({
        name: d.seller.name?.split(' ')[0] || 'N/A',
        vendas: d.totalSales,
        comissao: d.totalCommission,
        bonus: d.bonus
      }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);

    // Distribuicao de comissoes (pie chart)
    const commissionDistribution = commissionsBySeller
      .filter(d => d.totalCommission > 0)
      .map(d => ({
        name: d.seller.name?.split(' ')[0] || 'N/A',
        value: d.totalCommission
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Evolucao mensal (ultimos 6 meses)
    const monthlyEvolution = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.sale_date || sale.created_date);
        return saleDate >= monthStart && saleDate <= monthEnd;
      });

      let monthCommissions = 0;
      monthSales.forEach(sale => {
        const seller = sellers.find(s => s.id === sale.seller_id);
        if (sale.items?.length > 0) {
          sale.items.forEach(item => {
            const percent = item.commission_percent || seller?.commission_percent || 0;
            monthCommissions += (item.total * percent) / 100;
          });
        } else if (seller) {
          monthCommissions += (sale.total * seller.commission_percent) / 100;
        }
      });

      monthlyEvolution.push({
        name: format(monthDate, 'MMM', { locale: ptBR }),
        comissoes: monthCommissions,
        vendas: monthSales.reduce((sum, s) => sum + (s.total || 0), 0) / 1000
      });
    }

    return { salesBySellerData, commissionDistribution, monthlyEvolution };
  }, [commissionsBySeller, sales, sellers]);

  const handlePayCommission = async () => {
    if (!paymentForm.seller_id || paymentForm.amount <= 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await base44.entities.CommissionPayment?.create({
        ...paymentForm,
        period_start: startDate,
        period_end: endDate,
        status: 'paid'
      });
      toast.success('Pagamento registrado!');
      setShowPaymentDialog(false);
      setPaymentForm({
        seller_id: '',
        amount: 0,
        period_start: '',
        period_end: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleSaveGoal = async () => {
    if (!goalForm.seller_id) {
      toast.error('Selecione um vendedor');
      return;
    }

    try {
      await base44.entities.Seller.update(goalForm.seller_id, {
        monthly_goal: goalForm.monthly_goal,
        bonus_percent: goalForm.bonus_percent
      });
      toast.success('Meta atualizada!');
      setShowGoalDialog(false);
      setGoalForm({ seller_id: '', monthly_goal: 0, bonus_percent: 0 });
      loadData();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
    }
  };

  const handleViewDetail = (data) => {
    setSelectedSellerDetail(data);
    setShowDetailDialog(true);
  };

  const handlePaySeller = (data) => {
    setPaymentForm({
      seller_id: data.seller.id,
      amount: data.pendingAmount > 0 ? data.pendingAmount : data.totalEarnings,
      period_start: startDate,
      period_end: endDate,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    });
    setShowPaymentDialog(true);
  };

  const handleSetGoal = (seller) => {
    setGoalForm({
      seller_id: seller.id,
      monthly_goal: seller.monthly_goal || 0,
      bonus_percent: seller.bonus_percent || 0
    });
    setShowGoalDialog(true);
  };

  const toggleSelectSeller = (sellerId) => {
    setSelectedSellers(prev =>
      prev.includes(sellerId)
        ? prev.filter(id => id !== sellerId)
        : [...prev, sellerId]
    );
  };

  const handlePaySelected = () => {
    const selectedData = commissionsBySeller.filter(d =>
      selectedSellers.includes(d.seller.id) && d.pendingAmount > 0
    );
    const totalToPay = selectedData.reduce((sum, d) => sum + d.pendingAmount, 0);

    if (totalToPay <= 0) {
      toast.error('Nenhum valor pendente para os vendedores selecionados');
      return;
    }

    // Abrir dialog de pagamento em lote
    toast.info(`Total a pagar: ${formatCurrency(totalToPay)} para ${selectedData.length} vendedor(es)`);
  };

  // Export data
  const exportData = commissionsBySeller.map(d => ({
    'Vendedor': d.seller.name,
    'Vendas': d.salesCount,
    'Total Vendido': d.totalSales,
    'Comissao': d.totalCommission,
    'Bonus': d.bonus,
    'Total Ganhos': d.totalEarnings,
    'Pago': d.paidAmount,
    'Pendente': d.pendingAmount,
    'Ticket Medio': d.avgTicket,
    'Meta (%)': d.goalProgress.toFixed(1)
  }));

  const columns = [
    {
      key: 'select',
      label: '',
      className: 'w-10',
      render: (_, data) => (
        <Checkbox
          checked={selectedSellers.includes(data.seller.id)}
          onCheckedChange={() => toggleSelectSeller(data.seller.id)}
        />
      )
    },
    {
      key: 'seller',
      label: 'Vendedor',
      render: (_, data) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            {data.goalMet && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                <Trophy className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{data.seller?.name || '-'}</p>
            <p className="text-xs text-muted-foreground">{data.seller?.commission_percent || 0}% comissao</p>
          </div>
        </div>
      )
    },
    {
      key: 'salesCount',
      label: 'Vendas',
      className: 'text-center',
      render: (_, data) => (
        <StatusBadge status="info" label={data.salesCount} />
      )
    },
    {
      key: 'totalSales',
      label: 'Total Vendido',
      className: 'text-right',
      render: (_, data) => (
        <div>
          <span className="font-medium">{formatCurrency(data.totalSales)}</span>
          {data.monthlyGoal > 0 && (
            <div className="mt-1">
              <Progress value={data.goalProgress} className="h-1.5" />
              <span className="text-xs text-muted-foreground">
                {data.goalProgress.toFixed(0)}% da meta
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'commission',
      label: 'Comissao',
      className: 'text-right',
      render: (_, data) => (
        <div>
          <span className="font-medium">{formatCurrency(data.totalCommission)}</span>
          {data.bonus > 0 && (
            <div className="flex items-center justify-end gap-1 text-amber-600">
              <Star className="w-3 h-3" />
              <span className="text-xs">+{formatCurrency(data.bonus)}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      className: 'text-center',
      render: (_, data) => {
        if (data.paidAmount >= data.totalEarnings && data.totalEarnings > 0) {
          return <StatusBadge status="success" label="Pago" />;
        }
        if (data.paidAmount > 0) {
          return <StatusBadge status="warning" label="Parcial" />;
        }
        if (data.pendingAmount > 0) {
          return <StatusBadge status="info" label="Pendente" />;
        }
        return <StatusBadge status="default" label="-" />;
      }
    },
    {
      key: 'pending',
      label: 'A Pagar',
      className: 'text-right',
      render: (_, data) => (
        <span className={data.pendingAmount > 0 ? 'font-bold text-primary' : 'text-muted-foreground'}>
          {formatCurrency(Math.max(0, data.pendingAmount))}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, data) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetail(data)}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetGoal(data.seller)}>
              <Target className="w-4 h-4 mr-2" />
              Definir Meta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handlePaySeller(data)}
              disabled={data.pendingAmount <= 0}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Pagar Comissao
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
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
      <PageHeader
        title="Comissoes de Vendedores"
        subtitle="Gerencie comissoes, metas e pagamentos"
        icon={Award}
        actions={
          <div className="flex gap-2">
            <ExportMenu data={exportData} filename="comissoes" />
            <Button variant="outline" onClick={() => setShowGoalDialog(true)}>
              <Target className="w-4 h-4 mr-2" />
              Definir Metas
            </Button>
            <Button onClick={() => setShowPaymentDialog(true)}>
              <Banknote className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label>Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
            >
              Este Mes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastMonth = subMonths(new Date(), 1);
                setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
              }}
            >
              Mes Passado
            </Button>
          </div>
        </div>
      </CardSection>

      {/* KPIs */}
      <Grid cols={5}>
        <MetricCard
          title="Total Comissoes"
          value={formatCurrency(totals.totalCommissions)}
          icon={Award}
          variant="success"
        />
        <MetricCard
          title="Bonus por Metas"
          value={formatCurrency(totals.totalBonus)}
          icon={Trophy}
          variant="warning"
        />
        <MetricCard
          title="Pago"
          value={formatCurrency(totals.totalPaid)}
          icon={CheckCircle}
          variant="default"
        />
        <MetricCard
          title="Pendente"
          value={formatCurrency(totals.totalPending)}
          icon={Clock}
          variant={totals.totalPending > 0 ? "info" : "default"}
        />
        <MetricCard
          title="Metas Batidas"
          value={`${totals.sellersWithGoalMet}/${totals.activeSellers}`}
          icon={Target}
          variant={totals.sellersWithGoalMet > 0 ? "success" : "default"}
        />
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="evolution">Evolucao</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Actions for selected */}
          {selectedSellers.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg">
              <span className="text-sm">
                {selectedSellers.length} vendedor(es) selecionado(s)
              </span>
              <Button size="sm" onClick={handlePaySelected}>
                <Banknote className="w-4 h-4 mr-2" />
                Pagar Selecionados
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedSellers([])}>
                Limpar
              </Button>
            </div>
          )}

          {/* Commissions Table */}
          <CardSection noPadding>
            <DataTable
              data={commissionsBySeller}
              columns={columns}
              keyExtractor={(data) => data.seller?.id || Math.random()}
              emptyMessage="Nenhum vendedor encontrado"
            />
          </CardSection>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Grid cols={2}>
            {/* Ranking de Vendas */}
            <CardSection title="Top Vendedores por Volume" icon={TrendingUp}>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.salesBySellerData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={80} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" />
                    <Bar dataKey="comissao" name="Comissao" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardSection>

            {/* Distribuicao de Comissoes */}
            <CardSection title="Distribuicao de Comissoes" icon={Percent}>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.commissionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {chartData.commissionDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardSection>
          </Grid>

          {/* Top 3 Destaque */}
          <CardSection title="Destaques do Periodo" icon={Trophy}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {commissionsBySeller
                .sort((a, b) => b.totalSales - a.totalSales)
                .slice(0, 3)
                .map((data, index) => (
                  <div
                    key={data.seller.id}
                    className={`p-4 rounded-lg border-2 ${
                      index === 0 ? 'bg-amber-500/10 border-amber-500' :
                      index === 1 ? 'bg-gray-200/50 border-gray-400' :
                      'bg-orange-200/50 border-orange-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        'bg-orange-400 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold">{data.seller.name}</p>
                        <p className="text-xs text-muted-foreground">{data.salesCount} vendas</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vendido:</span>
                        <span className="font-medium">{formatCurrency(data.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Comissao:</span>
                        <span className="font-medium text-green-600">{formatCurrency(data.totalCommission)}</span>
                      </div>
                      {data.bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bonus:</span>
                          <span className="font-medium text-amber-600">{formatCurrency(data.bonus)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardSection>
        </TabsContent>

        <TabsContent value="evolution" className="mt-4">
          <CardSection title="Evolucao de Comissoes (6 meses)" icon={TrendingUp}>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}k`} />
                  <Tooltip formatter={(v, name) => [
                    name === 'comissoes' ? formatCurrency(v) : `R$ ${v}k`,
                    name === 'comissoes' ? 'Comissoes' : 'Vendas'
                  ]} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="comissoes"
                    name="Comissoes"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="vendas"
                    name="Vendas (mil)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardSection>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Comissao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendedor</Label>
              <Select
                value={paymentForm.seller_id}
                onValueChange={(v) => {
                  const data = commissionsBySeller.find(d => d.seller.id === v);
                  setPaymentForm({
                    ...paymentForm,
                    seller_id: v,
                    amount: data?.pendingAmount > 0 ? data.pendingAmount : data?.totalEarnings || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentForm.seller_id && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                {(() => {
                  const data = commissionsBySeller.find(d => d.seller.id === paymentForm.seller_id);
                  return data ? (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Total de Comissoes:</span>
                        <span className="font-medium">{formatCurrency(data.totalCommission)}</span>
                      </div>
                      {data.bonus > 0 && (
                        <div className="flex justify-between">
                          <span>Bonus:</span>
                          <span className="font-medium text-amber-600">{formatCurrency(data.bonus)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Ja Pago:</span>
                        <span>{formatCurrency(data.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Pendente:</span>
                        <span className="text-primary">{formatCurrency(data.pendingAmount)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div>
              <Label>Valor do Pagamento</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                placeholder="Ex: Referente ao mes de Janeiro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button onClick={handlePayCommission}>Registrar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Meta de Vendas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendedor</Label>
              <Select
                value={goalForm.seller_id}
                onValueChange={(v) => {
                  const seller = sellers.find(s => s.id === v);
                  setGoalForm({
                    ...goalForm,
                    seller_id: v,
                    monthly_goal: seller?.monthly_goal || 0,
                    bonus_percent: seller?.bonus_percent || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meta Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={goalForm.monthly_goal}
                onChange={(e) => setGoalForm({...goalForm, monthly_goal: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground mt-1">Valor de vendas que o vendedor deve atingir</p>
            </div>
            <div>
              <Label>Bonus por Meta Atingida (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={goalForm.bonus_percent}
                onChange={(e) => setGoalForm({...goalForm, bonus_percent: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground mt-1">Percentual adicional sobre as vendas quando a meta for batida</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal}>Salvar Meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes - {selectedSellerDetail?.seller?.name}</DialogTitle>
          </DialogHeader>
          {selectedSellerDetail && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedSellerDetail.salesCount}</p>
                  <p className="text-sm text-muted-foreground">Vendas</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(selectedSellerDetail.totalSales)}</p>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success">{formatCurrency(selectedSellerDetail.totalEarnings)}</p>
                  <p className="text-sm text-muted-foreground">Total Ganhos</p>
                </div>
              </div>

              {/* Meta */}
              {selectedSellerDetail.monthlyGoal > 0 && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Progresso da Meta</span>
                    <Badge variant={selectedSellerDetail.goalMet ? "default" : "secondary"}>
                      {selectedSellerDetail.goalMet ? 'Meta Atingida!' : `${selectedSellerDetail.goalProgress.toFixed(1)}%`}
                    </Badge>
                  </div>
                  <Progress value={selectedSellerDetail.goalProgress} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {formatCurrency(selectedSellerDetail.totalSales)} de {formatCurrency(selectedSellerDetail.monthlyGoal)}
                  </p>
                </div>
              )}

              {/* Ultimas vendas */}
              <div>
                <h4 className="font-medium mb-2">Ultimas Vendas do Periodo</h4>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {selectedSellerDetail.sales.slice(0, 10).map((sale, idx) => (
                    <div key={sale.id || idx} className="flex items-center justify-between p-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">Venda #{sale.id?.slice(-6) || idx + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.sale_date || sale.created_date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(sale.total)}</p>
                        <p className="text-xs text-green-600">
                          {formatCurrency((sale.total * (selectedSellerDetail.seller.commission_percent || 0)) / 100)} comissao
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
