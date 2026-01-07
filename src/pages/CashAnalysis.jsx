import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/contexts/OperatorContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  CheckCircle, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, QrCode, Receipt, Eye, Printer,
  BarChart3, Calendar, Clock, Package, X
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateInRange } from '@/utils/dateHelper';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { ExportMenu } from '@/components/ui/export-menu';

const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

export default function CashAnalysis() {
  const { user, can } = useAuth();
  const { operator } = useOperator();

  const [loading, setLoading] = useState(true);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [operators, setOperators] = useState([]);

  // Filtros
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedOperator, setSelectedOperator] = useState('all');

  // Dialog de detalhes
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState(null);

  // Verificar se e admin/gerente (pode ver todos os caixas)
  const isAdmin = useMemo(() => {
    const role = operator?.role || user?.role;
    return ['owner', 'admin', 'gerente', 'super_admin'].includes(role);
  }, [user, operator]);

  // ID do operador atual para filtrar
  const currentOperatorId = operator?.id || user?.id;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const today = new Date();
    switch (period) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setStartDate(format(yesterday, 'yyyy-MM-dd'));
        setEndDate(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(today, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
    }
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [registersData, movementsData, salesData, profilesData, sellersData] = await Promise.all([
        base44.entities.CashRegister.list(),
        base44.entities.CashMovement?.list() || Promise.resolve([]),
        base44.entities.Sale.list(),
        base44.entities.Profile.list().catch(() => []),
        base44.entities.Seller.list().catch(() => [])
      ]);

      setCashRegisters(registersData || []);
      setCashMovements(movementsData || []);
      setSales(salesData || []);

      // Combinar operadores
      const allOperators = [...sellersData];
      profilesData.forEach(profile => {
        const exists = allOperators.some(s => s.email === profile.email || s.user_id === profile.id);
        if (!exists && profile.full_name) {
          allOperators.push({ id: profile.id, name: profile.full_name, email: profile.email });
        }
      });
      setOperators(allOperators);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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

  // Filtrar registros por periodo E por permissao
  const filteredRegisters = useMemo(() => {
    return cashRegisters.filter(register => {
      // Usar helper para comparar datas corretamente (considera fuso horario)
      const dateMatch = isDateInRange(register.opening_date || register.created_date, startDate, endDate);

      // Filtro por operador selecionado
      let operatorMatch = true;
      if (selectedOperator !== 'all') {
        operatorMatch = register.opened_by_id === selectedOperator ||
          register.opened_by === selectedOperator ||
          register.user_id === selectedOperator;
      }

      // Se NAO e admin, filtra apenas os caixas do operador atual
      if (!isAdmin) {
        const isOwnRegister = register.opened_by_id === currentOperatorId ||
          register.opened_by === currentOperatorId ||
          register.user_id === currentOperatorId;
        return dateMatch && isOwnRegister;
      }

      return dateMatch && operatorMatch;
    });
  }, [cashRegisters, startDate, endDate, selectedOperator, isAdmin, currentOperatorId]);

  // Filtrar vendas por periodo
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      // Usar helper para comparar datas corretamente (considera fuso horario)
      return isDateInRange(sale.sale_date || sale.created_date, startDate, endDate);
    });
  }, [sales, startDate, endDate]);

  // Calcular metricas
  const metrics = useMemo(() => {
    const closedRegisters = filteredRegisters.filter(r => r.status === 'fechado');
    const openRegisters = filteredRegisters.filter(r => r.status === 'aberto');

    // Vendas dos caixas filtrados
    const registerIds = filteredRegisters.map(r => r.id);
    const registerSales = filteredSales.filter(s => registerIds.includes(s.cash_register_id));

    const totalSales = registerSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const salesCount = registerSales.length;
    const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;

    // Diferencas
    const totalDifference = closedRegisters.reduce((sum, r) => sum + (r.difference || 0), 0);
    const positiveDiff = closedRegisters.filter(r => r.difference > 0).reduce((sum, r) => sum + r.difference, 0);
    const negativeDiff = closedRegisters.filter(r => r.difference < 0).reduce((sum, r) => sum + Math.abs(r.difference), 0);

    // Formas de pagamento
    let cashAmount = 0, cardAmount = 0, pixAmount = 0, otherAmount = 0;
    registerSales.forEach(sale => {
      if (sale.payments && Array.isArray(sale.payments)) {
        sale.payments.forEach(payment => {
          const method = (payment.method_name || payment.method || '').toLowerCase();
          if (method.includes('dinheiro') || method.includes('cash')) {
            cashAmount += payment.amount || 0;
          } else if (method.includes('credito') || method.includes('debito') || method.includes('card')) {
            cardAmount += payment.amount || 0;
          } else if (method.includes('pix')) {
            pixAmount += payment.amount || 0;
          } else {
            otherAmount += payment.amount || 0;
          }
        });
      } else if (sale.payment_method) {
        const method = (sale.payment_method || '').toLowerCase();
        const amount = sale.total || 0;
        if (method.includes('dinheiro')) cashAmount += amount;
        else if (method.includes('credito') || method.includes('debito')) cardAmount += amount;
        else if (method.includes('pix')) pixAmount += amount;
        else otherAmount += amount;
      }
    });

    return {
      totalSales, salesCount, avgTicket,
      totalDifference, positiveDiff, negativeDiff,
      closedCount: closedRegisters.length,
      openCount: openRegisters.length,
      cashAmount, cardAmount, pixAmount, otherAmount
    };
  }, [filteredRegisters, filteredSales]);

  // Dados para graficos
  const chartData = useMemo(() => {
    // Distribuicao por forma de pagamento
    const paymentData = [
      { name: 'Dinheiro', value: metrics.cashAmount, color: '#10b981' },
      { name: 'Cartao', value: metrics.cardAmount, color: '#3b82f6' },
      { name: 'PIX', value: metrics.pixAmount, color: '#8b5cf6' },
      { name: 'Outros', value: metrics.otherAmount, color: '#f59e0b' }
    ].filter(item => item.value > 0);

    // Evolucao dos ultimos 7 dias
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.sale_date || sale.created_date);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      dailyData.push({
        name: format(day, 'EEE', { locale: ptBR }),
        vendas: daySales.reduce((sum, s) => sum + (s.total || 0), 0)
      });
    }

    return { paymentData, dailyData };
  }, [metrics, sales]);

  // Obter nome do operador
  const getOperatorName = (register) => {
    const op = operators.find(o =>
      o.id === register.opened_by_id || o.id === register.opened_by || o.id === register.user_id
    );
    return op?.name || register.opened_by_name || 'N/A';
  };

  // Obter vendas de um caixa
  const getRegisterSales = (registerId) => {
    return sales.filter(s => s.cash_register_id === registerId);
  };

  // Obter movimentos de um caixa
  const getRegisterMovements = (registerId) => {
    return cashMovements.filter(m => m.cash_register_id === registerId);
  };

  // Export data
  const exportData = filteredRegisters.map(register => {
    const regSales = getRegisterSales(register.id);
    return {
      'Data': format(new Date(register.opening_date || register.created_date), 'dd/MM/yyyy'),
      'Operador': getOperatorName(register),
      'Status': register.status === 'aberto' ? 'Aberto' : 'Fechado',
      'Saldo Inicial': register.opening_balance || 0,
      'Vendas': regSales.reduce((sum, s) => sum + (s.total || 0), 0),
      'Qtd Vendas': regSales.length,
      'Diferenca': register.difference || 0
    };
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analise de Caixa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Visualizando todos os caixas' : 'Visualizando seus caixas'}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu data={exportData} filename="analise-caixa" />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Periodo</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ate</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </>
          )}

          {isAdmin && (
            <div>
              <Label className="text-xs text-muted-foreground">Operador</Label>
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {operators.filter(op => op.id).map(op => (
                    <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={loadData}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total em Vendas
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalSales)}</p>
          <p className="text-xs text-muted-foreground">{metrics.salesCount} vendas</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Receipt className="w-4 h-4" />
            Ticket Medio
          </div>
          <p className="text-2xl font-bold">{formatCurrency(metrics.avgTicket)}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Package className="w-4 h-4" />
            Caixas
          </div>
          <p className="text-2xl font-bold">{metrics.closedCount + metrics.openCount}</p>
          <p className="text-xs text-muted-foreground">
            {metrics.closedCount} fechados
            {metrics.openCount > 0 && <span className="text-amber-600"> | {metrics.openCount} abertos</span>}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            {metrics.totalDifference >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            Diferenca
          </div>
          <p className={`text-2xl font-bold ${metrics.totalDifference === 0 ? 'text-green-600' : metrics.totalDifference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {metrics.totalDifference === 0 ? 'OK' : formatCurrency(metrics.totalDifference)}
          </p>
          {metrics.totalDifference !== 0 && (
            <p className="text-xs text-muted-foreground">
              {metrics.totalDifference > 0 ? 'Sobra' : 'Falta'}
            </p>
          )}
        </div>
      </div>

      {/* Conteudo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Graficos */}
        <div className="lg:col-span-1 space-y-6">
          {/* Grafico de Formas de Pagamento */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Formas de Pagamento
            </h3>
            {chartData.paymentData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
            {/* Legenda */}
            <div className="mt-4 space-y-2">
              {[
                { label: 'Dinheiro', value: metrics.cashAmount, color: '#10b981', icon: Banknote },
                { label: 'Cartao', value: metrics.cardAmount, color: '#3b82f6', icon: CreditCard },
                { label: 'PIX', value: metrics.pixAmount, color: '#8b5cf6', icon: QrCode }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <item.icon className="w-3 h-3 text-muted-foreground" />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Evolucao Semanal */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Ultimos 7 Dias
            </h3>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Coluna Direita - Lista de Caixas */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Historico de Caixas
              </h3>
            </div>

            {filteredRegisters.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum caixa encontrado no periodo selecionado
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredRegisters
                  .sort((a, b) => new Date(b.opening_date || b.created_date) - new Date(a.opening_date || a.created_date))
                  .map(register => {
                    const regSales = getRegisterSales(register.id);
                    const totalVendas = regSales.reduce((sum, s) => sum + (s.total || 0), 0);
                    const diff = register.difference || 0;

                    return (
                      <div
                        key={register.id}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedRegister(register);
                          setShowDetailDialog(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              register.status === 'aberto' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {register.status === 'aberto' ? <Clock className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium">
                                {format(new Date(register.opening_date || register.created_date), 'dd/MM/yyyy')}
                                <span className="text-muted-foreground font-normal ml-2">
                                  {format(new Date(register.opening_date || register.created_date), 'HH:mm')}
                                  {register.closing_date && ` - ${format(new Date(register.closing_date), 'HH:mm')}`}
                                </span>
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {getOperatorName(register)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{formatCurrency(totalVendas)}</p>
                              <p className="text-xs text-muted-foreground">{regSales.length} vendas</p>
                            </div>

                            {register.status === 'fechado' && (
                              <div className={`px-2 py-1 rounded text-xs font-medium ${
                                diff === 0
                                  ? 'bg-green-100 text-green-700'
                                  : diff > 0
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                {diff === 0 ? 'OK' : (
                                  <span className="flex items-center gap-1">
                                    {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {formatCurrency(Math.abs(diff))}
                                  </span>
                                )}
                              </div>
                            )}

                            {register.status === 'aberto' && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Aberto
                              </Badge>
                            )}

                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Detalhes do Caixa */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Detalhes do Caixa
            </DialogTitle>
          </DialogHeader>

          {selectedRegister && (
            <div className="space-y-6">
              {/* Info do Operador e Horarios */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{getOperatorName(selectedRegister)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedRegister.opening_date || selectedRegister.created_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant={selectedRegister.status === 'aberto' ? 'outline' : 'default'} className={selectedRegister.status === 'aberto' ? 'text-amber-600 border-amber-300' : 'bg-green-600'}>
                    {selectedRegister.status === 'aberto' ? 'Em Aberto' : 'Fechado'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Abertura:</span>
                    <span className="font-medium">
                      {format(new Date(selectedRegister.opening_date || selectedRegister.created_date), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fechamento:</span>
                    <span className="font-medium">
                      {selectedRegister.closing_date
                        ? format(new Date(selectedRegister.closing_date), 'HH:mm')
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Resumo Financeiro
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Saldo Inicial</span>
                    <span className="font-medium">{formatCurrency(selectedRegister.opening_balance)}</span>
                  </div>

                  {(() => {
                    const regSales = getRegisterSales(selectedRegister.id);
                    const total = regSales.reduce((sum, s) => sum + (s.total || 0), 0);
                    return (
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Vendas ({regSales.length})</span>
                        <span className="font-medium text-green-600">+ {formatCurrency(total)}</span>
                      </div>
                    );
                  })()}

                  {(() => {
                    const movements = getRegisterMovements(selectedRegister.id);
                    const withdrawals = movements.filter(m => m.type === 'withdrawal' || m.type === 'sangria');
                    const deposits = movements.filter(m => m.type === 'deposit' || m.type === 'suprimento');
                    const totalW = withdrawals.reduce((sum, m) => sum + (m.amount || 0), 0);
                    const totalD = deposits.reduce((sum, m) => sum + (m.amount || 0), 0);

                    return (
                      <>
                        {totalD > 0 && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Suprimentos ({deposits.length})</span>
                            <span className="font-medium text-blue-600">+ {formatCurrency(totalD)}</span>
                          </div>
                        )}
                        {totalW > 0 && (
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Sangrias ({withdrawals.length})</span>
                            <span className="font-medium text-red-600">- {formatCurrency(totalW)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 rounded">
                    <span className="font-medium">Saldo Esperado</span>
                    <span className="font-bold">{formatCurrency(selectedRegister.expected_balance)}</span>
                  </div>

                  {selectedRegister.status === 'fechado' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Saldo Contado</span>
                        <span className="font-medium">{formatCurrency(selectedRegister.closing_balance)}</span>
                      </div>

                      <div className={`flex justify-between items-center py-3 px-3 rounded-lg ${
                        selectedRegister.difference === 0
                          ? 'bg-green-100'
                          : selectedRegister.difference > 0
                            ? 'bg-blue-100'
                            : 'bg-red-100'
                      }`}>
                        <span className="font-semibold">Diferenca</span>
                        <span className={`font-bold text-lg ${
                          selectedRegister.difference === 0
                            ? 'text-green-700'
                            : selectedRegister.difference > 0
                              ? 'text-blue-700'
                              : 'text-red-700'
                        }`}>
                          {selectedRegister.difference === 0 ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-5 h-5" />
                              Caixa OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              {selectedRegister.difference > 0
                                ? <ArrowUpRight className="w-5 h-5" />
                                : <ArrowDownRight className="w-5 h-5" />}
                              {formatCurrency(Math.abs(selectedRegister.difference))}
                              <span className="text-sm font-normal">
                                ({selectedRegister.difference > 0 ? 'sobra' : 'falta'})
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Vendas do Caixa */}
              {(() => {
                const regSales = getRegisterSales(selectedRegister.id);
                if (regSales.length === 0) return null;

                return (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      Vendas Realizadas ({regSales.length})
                    </h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {regSales.slice(0, 10).map((sale, idx) => (
                        <div key={sale.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">Venda #{sale.id?.slice(-6) || idx + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.sale_date || sale.created_date), 'HH:mm')}
                              {sale.customer_name && ` - ${sale.customer_name}`}
                            </p>
                          </div>
                          <span className="font-medium">{formatCurrency(sale.total)}</span>
                        </div>
                      ))}
                      {regSales.length > 10 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          ... e mais {regSales.length - 10} vendas
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Movimentacoes */}
              {(() => {
                const movements = getRegisterMovements(selectedRegister.id);
                if (movements.length === 0) return null;

                return (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Movimentacoes ({movements.length})
                    </h4>
                    <div className="space-y-2">
                      {movements.map((mov, idx) => {
                        const isWithdrawal = mov.type === 'withdrawal' || mov.type === 'sangria';
                        return (
                          <div key={mov.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isWithdrawal ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                {isWithdrawal
                                  ? <ArrowDownRight className="w-4 h-4 text-red-600" />
                                  : <ArrowUpRight className="w-4 h-4 text-blue-600" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {isWithdrawal ? 'Sangria' : 'Suprimento'}
                                </p>
                                {mov.description && (
                                  <p className="text-xs text-muted-foreground">{mov.description}</p>
                                )}
                              </div>
                            </div>
                            <span className={`font-medium ${isWithdrawal ? 'text-red-600' : 'text-blue-600'}`}>
                              {isWithdrawal ? '-' : '+'} {formatCurrency(mov.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Observacoes */}
              {selectedRegister.notes && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Observacoes</h4>
                  <p className="text-sm text-muted-foreground">{selectedRegister.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
