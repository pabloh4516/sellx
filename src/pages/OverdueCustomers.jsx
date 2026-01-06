import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, User, Phone, Mail, DollarSign, Calendar } from 'lucide-react';
import { isPast } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function OverdueCustomers() {
  const [installments, setInstallments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [installmentsData, customersData] = await Promise.all([
        base44.entities.Installment.filter({ status: 'pendente' }),
        base44.entities.Customer.list()
      ]);
      
      const overdueInstallments = installmentsData.filter(inst => 
        isPast(new Date(inst.due_date))
      );
      
      setInstallments(overdueInstallments);
      setCustomers(customersData);
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

  const getCustomer = (id) => customers.find(c => c.id === id);

  const customerDebts = customers.map(customer => {
    const customerInstallments = installments.filter(i => i.customer_id === customer.id);
    const totalDebt = customerInstallments.reduce((sum, i) => sum + (i.amount || 0), 0);
    const overdueCount = customerInstallments.length;
    
    return {
      customer,
      totalDebt,
      overdueCount,
      installments: customerInstallments
    };
  }).filter(data => data.overdueCount > 0)
    .sort((a, b) => b.totalDebt - a.totalDebt);

  const totalOverdue = customerDebts.reduce((sum, data) => sum + data.totalDebt, 0);

  const columns = [
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, data) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <User className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium">{data.customer?.name}</p>
            {data.customer?.cpf_cnpj && (
              <p className="text-xs text-muted-foreground">{data.customer.cpf_cnpj}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contato',
      render: (_, data) => (
        <div className="text-sm space-y-0.5">
          {data.customer?.phone && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3 h-3" />{data.customer.phone}
            </p>
          )}
          {data.customer?.email && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3 h-3" />{data.customer.email}
            </p>
          )}
          {!data.customer?.phone && !data.customer?.email && <span className="text-muted-foreground">-</span>}
        </div>
      )
    },
    {
      key: 'overdueCount',
      label: 'Parcelas',
      className: 'text-center',
      render: (_, data) => (
        <StatusBadge status="danger" label={data.overdueCount} />
      )
    },
    {
      key: 'totalDebt',
      label: 'Total Devido',
      className: 'text-right',
      render: (_, data) => (
        <span className="font-bold text-destructive">{formatCurrency(data.totalDebt)}</span>
      )
    },
    {
      key: 'oldest',
      label: 'Venc. Mais Antigo',
      render: (_, data) => {
        const oldestInstallment = data.installments?.sort((a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        )[0];
        return (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-destructive font-medium">
              {oldestInstallment ? safeFormatDate(oldestInstallment.due_date) : '-'}
            </span>
          </div>
        );
      }
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
        title="Clientes em Atraso"
        subtitle={`${customerDebts.length} clientes com pendencias`}
        icon={AlertTriangle}
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Clientes em Atraso"
          value={customerDebts.length}
          icon={User}
          status="danger"
        />
        <MiniMetric
          label="Total em Atraso"
          value={formatCurrency(totalOverdue)}
          icon={DollarSign}
          status="danger"
        />
        <MiniMetric
          label="Parcelas Atrasadas"
          value={installments.length}
          icon={Calendar}
          status="warning"
        />
      </Grid>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={customerDebts}
          columns={columns}
          keyExtractor={(data) => data.customer?.id || Math.random()}
          emptyMessage="Nenhum cliente em atraso"
        />
      </CardSection>
    </PageContainer>
  );
}