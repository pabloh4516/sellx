import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Eye, Wrench, Clock, CheckCircle, Printer, Edit, ClipboardList, AlertCircle, Package } from 'lucide-react';
import { safeFormatDate } from '@/lib/utils';
import ServiceOrderForm from '../components/serviceorder/ServiceOrderForm';
import ServiceOrderPrint from '../components/serviceorder/ServiceOrderPrint';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

const STATUS_CONFIG = {
  aguardando: { label: 'Aguardando', status: 'default' },
  em_analise: { label: 'Em Analise', status: 'info' },
  aguardando_aprovacao: { label: 'Aguard. Aprovacao', status: 'warning' },
  aprovado: { label: 'Aprovado', status: 'success' },
  em_execucao: { label: 'Em Execucao', status: 'info' },
  concluido: { label: 'Concluido', status: 'success' },
  entregue: { label: 'Entregue', status: 'success' },
  cancelado: { label: 'Cancelado', status: 'danger' }
};

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, customersData, companyData] = await Promise.all([
        base44.entities.ServiceOrder.list('-entry_date'),
        base44.entities.Customer.list(),
        base44.entities.Company.list()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
      if (companyData.length > 0) {
        setCompany(companyData[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar ordens de serviço');
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

  const filteredOrders = orders.filter(order => {
    const matchSearch =
      order.order_number?.toString().includes(searchTerm) ||
      getCustomerName(order.customer_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.equipment_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingOrders = orders.filter(o => ['aguardando', 'em_analise', 'aguardando_aprovacao'].includes(o.status)).length;
  const inProgressOrders = orders.filter(o => ['aprovado', 'em_execucao'].includes(o.status)).length;
  const completedOrders = orders.filter(o => ['concluido', 'entregue'].includes(o.status)).length;

  const columns = [
    {
      key: 'order_number',
      label: 'OS',
      render: (_, order) => (
        <span className="font-mono font-bold text-primary">#{order.order_number}</span>
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
      key: 'equipment',
      label: 'Equipamento',
      render: (_, order) => (
        <div>
          <p className="font-medium">{order.equipment_type}</p>
          <p className="text-xs text-muted-foreground">{order.brand} {order.model}</p>
        </div>
      )
    },
    {
      key: 'entry_date',
      label: 'Entrada',
      render: (_, order) => (
        <span className="text-muted-foreground">{safeFormatDate(order.entry_date)}</span>
      )
    },
    {
      key: 'estimated_date',
      label: 'Previsao',
      render: (_, order) => (
        <span className="text-muted-foreground">{safeFormatDate(order.estimated_date)}</span>
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
        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.aguardando;
        return <StatusBadge status={statusConfig.status} label={statusConfig.label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'w-28',
      render: (_, order) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedOrder(order);
              setShowDetails(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingOrder(order);
              setShowForm(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedOrder(order);
              setShowPrint(true);
            }}
          >
            <Printer className="w-4 h-4" />
          </Button>
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
        title="Ordens de Servico"
        subtitle={`${filteredOrders.length} ordens`}
        icon={ClipboardList}
        actions={
          <Button onClick={() => { setEditingOrder(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova OS
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de OS"
          value={orders.length}
          icon={ClipboardList}
        />
        <MiniMetric
          label="Pendentes"
          value={pendingOrders}
          icon={Clock}
          status="warning"
        />
        <MiniMetric
          label="Em Andamento"
          value={inProgressOrders}
          icon={Wrench}
          status="info"
        />
        <MiniMetric
          label="Concluidas"
          value={completedOrders}
          icon={CheckCircle}
          status="success"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, cliente ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredOrders}
          columns={columns}
          emptyMessage="Nenhuma ordem de servico encontrada"
        />
      </CardSection>

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar OS' : 'Nova Ordem de Serviço'}</DialogTitle>
          </DialogHeader>
          <ServiceOrderForm
            serviceOrder={editingOrder}
            onSave={() => {
              setShowForm(false);
              setEditingOrder(null);
              loadData();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingOrder(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OS #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Equipamento</p>
                  <p className="font-medium">{selectedOrder.equipment_type} {selectedOrder.brand} {selectedOrder.model}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge>{selectedOrder.status}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Problema</p>
                <p className="p-3 bg-slate-50 rounded">{selectedOrder.problem_description}</p>
              </div>
              {selectedOrder.diagnosis && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Diagnóstico</p>
                  <p className="p-3 bg-slate-50 rounded">{selectedOrder.diagnosis}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => {
                  setEditingOrder(selectedOrder);
                  setShowDetails(false);
                  setShowForm(true);
                }}>
                  Editar OS
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false);
                    setShowPrint(true);
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Modal */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <ServiceOrderPrint
              serviceOrder={selectedOrder}
              company={company}
              customer={customers.find(c => c.id === selectedOrder.customer_id)}
              onClose={() => {
                setShowPrint(false);
                setSelectedOrder(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}