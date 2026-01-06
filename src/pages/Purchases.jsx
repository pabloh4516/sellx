import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Eye, Truck, DollarSign, Package, ShoppingCart } from 'lucide-react';
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

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesData, suppliersData] = await Promise.all([
        base44.entities.Purchase.list('-purchase_date'),
        base44.entities.Supplier.list()
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error('Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '-';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredPurchases = purchases.filter(purchase => {
    const matchSearch =
      purchase.invoice_number?.includes(searchTerm) ||
      getSupplierName(purchase.supplier_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const receivedPurchases = purchases.filter(p => p.status === 'recebido');
  const pendingPurchases = purchases.filter(p => p.status === 'pendente');

  const getStatusBadge = (status) => {
    const statusMap = {
      recebido: { status: 'success', label: 'Recebido' },
      pendente: { status: 'warning', label: 'Pendente' },
      cancelado: { status: 'danger', label: 'Cancelado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const columns = [
    {
      key: 'invoice_number',
      label: 'Nota Fiscal',
      render: (_, purchase) => (
        <span className="font-mono text-sm">{purchase.invoice_number || '-'}</span>
      )
    },
    {
      key: 'date',
      label: 'Data',
      render: (_, purchase) => (
        <span className="text-muted-foreground">
          {safeFormatDate(purchase.purchase_date)}
        </span>
      )
    },
    {
      key: 'supplier',
      label: 'Fornecedor',
      render: (_, purchase) => (
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{getSupplierName(purchase.supplier_id)}</span>
        </div>
      )
    },
    {
      key: 'items',
      label: 'Itens',
      className: 'text-center',
      render: (_, purchase) => (
        <span className="text-muted-foreground">{purchase.items?.length || 0}</span>
      )
    },
    {
      key: 'total',
      label: 'Total',
      className: 'text-right',
      render: (_, purchase) => (
        <span className="font-bold">{formatCurrency(purchase.total)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, purchase) => {
        const { status, label } = getStatusBadge(purchase.status);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: () => (
        <Button variant="ghost" size="icon">
          <Eye className="w-4 h-4" />
        </Button>
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
        title="Registro de Compras"
        subtitle={`${filteredPurchases.length} compras`}
        icon={ShoppingCart}
        actions={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Compras"
          value={purchases.length}
          icon={ShoppingCart}
        />
        <MiniMetric
          label="Valor Total"
          value={formatCurrency(totalPurchases)}
          icon={DollarSign}
        />
        <MiniMetric
          label="Recebidas"
          value={receivedPurchases.length}
          icon={Package}
          status="success"
        />
        <MiniMetric
          label="Pendentes"
          value={pendingPurchases.length}
          icon={Truck}
          status="warning"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nota ou fornecedor..."
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredPurchases}
          columns={columns}
          emptyMessage="Nenhuma compra encontrada"
        />
      </CardSection>
    </PageContainer>
  );
}
