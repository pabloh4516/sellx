import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, Package } from 'lucide-react';
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

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [movementsData, productsData] = await Promise.all([
        base44.entities.StockMovement.list('-movement_date'),
        base44.entities.Product.list()
      ]);
      setMovements(movementsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Erro ao carregar movimentacoes');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';

  const filteredMovements = movements.filter(movement => {
    const matchSearch = getProductName(movement.product_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || movement.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalEntradas = movements.filter(m => m.type === 'entrada').length;
  const totalSaidas = movements.filter(m => m.type === 'saida').length;
  const totalAjustes = movements.filter(m => m.type === 'ajuste').length;

  const getTypeStatus = (type) => {
    const typeMap = {
      entrada: { status: 'success', label: 'Entrada' },
      saida: { status: 'danger', label: 'Saida' },
      ajuste: { status: 'info', label: 'Ajuste' },
      inventario: { status: 'warning', label: 'Inventario' },
      devolucao: { status: 'default', label: 'Devolucao' },
    };
    return typeMap[type] || { status: 'default', label: type };
  };

  const columns = [
    {
      key: 'date',
      label: 'Data/Hora',
      render: (_, movement) => (
        <span className="text-muted-foreground">
          {safeFormatDate(movement.movement_date || movement.created_date, 'dd/MM/yyyy HH:mm')}
        </span>
      )
    },
    {
      key: 'product',
      label: 'Produto',
      render: (_, movement) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{getProductName(movement.product_id)}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (_, movement) => {
        const { status, label } = getTypeStatus(movement.type);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'quantity',
      label: 'Quantidade',
      className: 'text-center',
      render: (_, movement) => (
        <span className={`font-bold ${movement.type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
          {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
        </span>
      )
    },
    {
      key: 'stock',
      label: 'Estoque',
      className: 'text-center',
      render: (_, movement) => (
        <span className="text-muted-foreground">
          {movement.previous_stock} → <span className="font-medium text-foreground">{movement.new_stock}</span>
        </span>
      )
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (_, movement) => (
        <span className="text-sm text-muted-foreground">
          {movement.reason || movement.reference_type || '-'}
        </span>
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
        title="Movimentacoes de Estoque"
        subtitle={`${filteredMovements.length} movimentacoes`}
        icon={ArrowLeftRight}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Movimentacoes"
          value={movements.length}
          icon={ArrowLeftRight}
        />
        <MiniMetric
          label="Entradas"
          value={totalEntradas}
          icon={TrendingUp}
          status="success"
        />
        <MiniMetric
          label="Saidas"
          value={totalSaidas}
          icon={TrendingDown}
          status="danger"
        />
        <MiniMetric
          label="Ajustes"
          value={totalAjustes}
          icon={Package}
          status="warning"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saida</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
              <SelectItem value="inventario">Inventario</SelectItem>
              <SelectItem value="devolucao">Devolucao</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredMovements}
          columns={columns}
          emptyMessage="Nenhuma movimentacao encontrada"
        />
      </CardSection>
    </PageContainer>
  );
}
