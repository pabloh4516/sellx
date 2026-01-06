import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Ban, Search, Calendar, User, DollarSign, FileText, AlertTriangle,
  TrendingDown, Clock, Eye, Package, Filter
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';
import { USER_ROLES } from '@/config/permissions';

// Motivos de cancelamento (mesmo do PDV)
const CANCELLATION_REASONS = {
  cliente_desistiu: 'Cliente desistiu',
  produto_errado: 'Produto errado',
  sem_estoque: 'Sem estoque',
  problema_pagamento: 'Problema no pagamento',
  erro_operador: 'Erro de operador',
  cliente_sem_dinheiro: 'Cliente sem dinheiro',
  preco_incorreto: 'Preco incorreto',
  outro: 'Outro motivo',
};

export default function Cancellations() {
  const { operator } = useAuth();
  const [cancellations, setCancellations] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCancellation, setSelectedCancellation] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Verificar permissao - apenas admin, gerente e dono podem ver
  const canViewCancellations = operator?.role && [
    USER_ROLES.OWNER,
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER
  ].includes(operator.role);

  useEffect(() => {
    if (canViewCancellations) {
      loadData();
    }
  }, [canViewCancellations]);

  const loadData = async () => {
    try {
      const [cancellationsData, operatorsData] = await Promise.all([
        base44.entities.SaleCancellation.list('-cancelled_at').catch(() => []),
        base44.entities.Profile.list()
      ]);

      setCancellations(cancellationsData);
      setOperators(operatorsData);
    } catch (error) {
      console.error('Error loading cancellations:', error);
      toast.error('Erro ao carregar cancelamentos');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getOperatorName = (id) => {
    const op = operators.find(o => o.id === id);
    return op?.full_name || 'Operador';
  };

  // Filtrar cancelamentos
  const filteredCancellations = cancellations.filter(c => {
    // Filtro de busca
    const matchSearch = !searchTerm ||
      c.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de operador
    const matchOperator = operatorFilter === 'all' || c.operator_id === operatorFilter;

    // Filtro de motivo
    const matchReason = reasonFilter === 'all' || c.reason === reasonFilter;

    // Filtro de data
    let matchDate = true;
    if (c.cancelled_at) {
      const cancelDate = new Date(c.cancelled_at);
      if (dateFrom) {
        matchDate = matchDate && cancelDate >= startOfDay(parseISO(dateFrom));
      }
      if (dateTo) {
        matchDate = matchDate && cancelDate <= endOfDay(parseISO(dateTo));
      }
    }

    return matchSearch && matchOperator && matchReason && matchDate;
  });

  // Calcular metricas
  const totalCancellations = filteredCancellations.length;
  const totalValue = filteredCancellations.reduce((sum, c) => sum + (c.final_value || 0), 0);
  const avgValue = totalCancellations > 0 ? totalValue / totalCancellations : 0;

  // Agrupar por motivo para estatisticas
  const reasonStats = filteredCancellations.reduce((acc, c) => {
    const reason = c.reason || 'outro';
    if (!acc[reason]) {
      acc[reason] = { count: 0, value: 0 };
    }
    acc[reason].count++;
    acc[reason].value += c.final_value || 0;
    return acc;
  }, {});

  // Top motivo
  const topReason = Object.entries(reasonStats)
    .sort((a, b) => b[1].count - a[1].count)[0];

  const columns = [
    {
      key: 'cancelled_at',
      label: 'Data/Hora',
      width: '160px',
      render: (_, c) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{formatDate(c.cancelled_at)}</span>
        </div>
      )
    },
    {
      key: 'operator_name',
      label: 'Operador',
      render: (_, c) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{c.operator_name || getOperatorName(c.operator_id)}</span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (_, c) => (
        <StatusBadge
          status="warning"
          label={CANCELLATION_REASONS[c.reason] || c.reason_label || c.reason || 'Nao informado'}
        />
      )
    },
    {
      key: 'items',
      label: 'Itens',
      align: 'center',
      width: '80px',
      render: (_, c) => (
        <span className="font-medium">{c.items?.length || 0}</span>
      )
    },
    {
      key: 'final_value',
      label: 'Valor',
      align: 'right',
      width: '130px',
      render: (_, c) => (
        <span className="font-bold text-destructive">{formatCurrency(c.final_value)}</span>
      )
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      width: '60px',
      render: (_, c) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelectedCancellation(c);
            setShowDetails(true);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      )
    },
  ];

  if (!canViewCancellations) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas gerentes, administradores e proprietarios podem visualizar o relatorio de cancelamentos.
          </p>
        </div>
      </PageContainer>
    );
  }

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
        title="Cancelamentos"
        subtitle={`${totalCancellations} cancelamentos no periodo`}
        icon={Ban}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Cancelamentos"
          value={totalCancellations}
          icon={Ban}
          status="danger"
        />
        <MiniMetric
          label="Valor Total Cancelado"
          value={formatCurrency(totalValue)}
          icon={TrendingDown}
          status="danger"
        />
        <MiniMetric
          label="Ticket Medio"
          value={formatCurrency(avgValue)}
          icon={DollarSign}
        />
        <MiniMetric
          label="Principal Motivo"
          value={topReason ? CANCELLATION_REASONS[topReason[0]] || topReason[0] : '-'}
          icon={AlertTriangle}
          status="warning"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Operador, cliente ou observacao..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-[180px]">
            <Label className="text-xs text-muted-foreground">Operador</Label>
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os operadores</SelectItem>
                {operators.map(op => (
                  <SelectItem key={op.id} value={op.id}>{op.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px]">
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motivos</SelectItem>
                {Object.entries(CANCELLATION_REASONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="w-[150px]">
            <Label className="text-xs text-muted-foreground">Ate</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </CardSection>

      {/* Estatisticas por Motivo */}
      {Object.keys(reasonStats).length > 0 && (
        <CardSection title="Cancelamentos por Motivo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(reasonStats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([reason, stats]) => (
                <div
                  key={reason}
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{CANCELLATION_REASONS[reason] || reason}</span>
                    <StatusBadge status="warning" label={stats.count} />
                  </div>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(stats.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((stats.count / totalCancellations) * 100).toFixed(1)}% do total
                  </p>
                </div>
              ))}
          </div>
        </CardSection>
      )}

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredCancellations}
          columns={columns}
          emptyMessage="Nenhum cancelamento encontrado no periodo"
        />
      </CardSection>

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Detalhes do Cancelamento
            </DialogTitle>
          </DialogHeader>

          {selectedCancellation && (
            <div className="space-y-4">
              {/* Info Geral */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{formatDate(selectedCancellation.cancelled_at)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Operador</p>
                  <p className="font-medium">{selectedCancellation.operator_name}</p>
                </div>
              </div>

              {/* Motivo */}
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="font-semibold">Motivo do Cancelamento</span>
                </div>
                <p className="text-lg font-medium">
                  {CANCELLATION_REASONS[selectedCancellation.reason] || selectedCancellation.reason_label || selectedCancellation.reason}
                </p>
                {selectedCancellation.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong>Obs:</strong> {selectedCancellation.notes}
                  </p>
                )}
              </div>

              {/* Cliente */}
              {selectedCancellation.customer_name && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedCancellation.customer_name}</p>
                </div>
              )}

              {/* Itens */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens Cancelados ({selectedCancellation.items?.length || 0})
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedCancellation.items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="font-bold">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores */}
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedCancellation.total_value)}</span>
                  </div>
                  {selectedCancellation.discount_value > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Desconto</span>
                      <span>-{formatCurrency(selectedCancellation.discount_value)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-destructive/20">
                    <span>Total Cancelado</span>
                    <span className="text-destructive">{formatCurrency(selectedCancellation.final_value)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
