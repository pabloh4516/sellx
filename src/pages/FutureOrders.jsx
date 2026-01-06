import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Clock, CheckCircle, Package, CalendarClock, DollarSign, Users } from 'lucide-react';
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

export default function FutureOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, customersData] = await Promise.all([
        base44.entities.FutureOrder.list('-created_date'),
        base44.entities.Customer.list()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await base44.entities.FutureOrder.update(orderId, { status: newStatus });
      toast.success('Status atualizado!');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.name || 'Cliente';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pendente: { status: 'warning', label: 'Pendente' },
      parcial: { status: 'info', label: 'Parcial' },
      pronto: { status: 'success', label: 'Pronto' },
      entregue: { status: 'default', label: 'Entregue' },
      cancelado: { status: 'danger', label: 'Cancelado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const pendingOrders = orders.filter(o => ['pendente', 'parcial'].includes(o.status));
  const totalPending = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const readyOrders = orders.filter(o => o.status === 'pronto').length;

  const columns = [
    {
      key: 'order_number',
      label: 'Pedido',
      render: (_, order) => (
        <div>
          <p className="font-medium">#{order.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {safeFormatDate(order.order_date || order.created_date, 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      )
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, order) => (
        <span className="font-medium">{getCustomerName(order.customer_id)}</span>
      )
    },
    {
      key: 'expected_date',
      label: 'Data Prevista',
      render: (_, order) => (
        <span className="text-muted-foreground">
          {safeFormatDate(order.expected_date)}
        </span>
      )
    },
    {
      key: 'total',
      label: 'Valor',
      className: 'text-right',
      render: (_, order) => (
        <span className="font-bold">{formatCurrency(order.total)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, order) => {
        const { status, label } = getStatusBadge(order.status);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      render: (_, order) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedOrder(order)}
          >
            Detalhes
          </Button>
          {order.status === 'pendente' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(order.id, 'pronto')}
            >
              Marcar Pronto
            </Button>
          )}
          {order.status === 'pronto' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus(order.id, 'entregue')}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              Entregar
            </Button>
          )}
        </div>
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
        title="Pedidos Futuros"
        subtitle="Gerencie vendas de produtos ainda nao disponiveis"
        icon={CalendarClock}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Pedidos"
          value={orders.length}
          icon={Package}
        />
        <MiniMetric
          label="Pedidos Pendentes"
          value={pendingOrders.length}
          icon={Clock}
          status="warning"
        />
        <MiniMetric
          label="Valor Pendente"
          value={formatCurrency(totalPending)}
          icon={DollarSign}
        />
        <MiniMetric
          label="Prontos p/ Entrega"
          value={readyOrders}
          icon={CheckCircle}
          status="success"
        />
      </Grid>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={orders}
          columns={columns}
          emptyMessage="Nenhum pedido futuro encontrado"
        />
      </CardSection>

      {/* Dialog de Detalhes */}
      {selectedOrder && (
        <Dialog open={true} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido #{selectedOrder.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{getCustomerName(selectedOrder.customer_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Prevista</p>
                  <p className="font-medium">
                    {safeFormatDate(selectedOrder.expected_date)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Itens do Pedido</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <CardSection className="bg-muted/50">
                <div className="flex justify-between mb-2">
                  <span>Total do Pedido:</span>
                  <span className="font-bold">{formatCurrency(selectedOrder.total)}</span>
                </div>
                {selectedOrder.advance_payment > 0 && (
                  <>
                    <div className="flex justify-between mb-2 text-success">
                      <span>Sinal Pago:</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.advance_payment)}</span>
                    </div>
                    <div className="flex justify-between text-warning">
                      <span>Restante:</span>
                      <span className="font-bold">{formatCurrency(selectedOrder.remaining_payment)}</span>
                    </div>
                  </>
                )}
              </CardSection>

              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observacoes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
