import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, RotateCcw, DollarSign, Users, Calendar } from 'lucide-react';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  MiniMetric,
  StatusBadge,
} from '@/components/nexo';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, customersData] = await Promise.all([
        base44.entities.Sale.filter({ status: 'devolvida' }),
        base44.entities.Customer.list()
      ]);
      setReturns(salesData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Erro ao carregar devolucoes');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredReturns = returns.filter(ret =>
    ret.sale_number?.toString().includes(searchTerm) ||
    getCustomerName(ret.customer_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = returns.reduce((sum, r) => sum + (r.total || 0), 0);
  const uniqueCustomers = new Set(returns.map(r => r.customer_id)).size;

  // Get current month returns
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthReturns = returns.filter(r => {
    const date = new Date(r.sale_date || r.created_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthValue = monthReturns.reduce((sum, r) => sum + (r.total || 0), 0);

  const columns = [
    {
      key: 'sale_number',
      label: 'N Venda',
      render: (_, ret) => (
        <span className="font-mono text-sm">#{ret.sale_number}</span>
      )
    },
    {
      key: 'date',
      label: 'Data Original',
      render: (_, ret) => (
        <span className="text-muted-foreground">
          {safeFormatDate(ret.sale_date || ret.created_date)}
        </span>
      )
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, ret) => (
        <span className="font-medium">{getCustomerName(ret.customer_id)}</span>
      )
    },
    {
      key: 'items',
      label: 'Itens',
      className: 'text-center',
      render: (_, ret) => (
        <span className="text-muted-foreground">{ret.items?.length || 0}</span>
      )
    },
    {
      key: 'total',
      label: 'Valor',
      className: 'text-right',
      render: (_, ret) => (
        <span className="font-bold text-destructive">{formatCurrency(ret.total)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <StatusBadge status="danger" label="Devolvida" />
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
        title="Devolucoes"
        subtitle={`${filteredReturns.length} devolucoes`}
        icon={RotateCcw}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Devolucoes"
          value={returns.length}
          icon={RotateCcw}
          status="danger"
        />
        <MiniMetric
          label="Valor Total"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          status="danger"
        />
        <MiniMetric
          label="Este Mes"
          value={formatCurrency(monthValue)}
          icon={Calendar}
        />
        <MiniMetric
          label="Clientes"
          value={uniqueCustomers}
          icon={Users}
        />
      </Grid>

      {/* Busca */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredReturns}
          columns={columns}
          emptyMessage="Nenhuma devolucao encontrada"
        />
      </CardSection>
    </PageContainer>
  );
}
