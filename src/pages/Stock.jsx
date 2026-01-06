import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Package, AlertTriangle, TrendingUp, DollarSign, Archive, BarChart3 } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
  TableAvatar,
} from '@/components/nexo';

export default function Stock() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStock, setFilterStock] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, groupsData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.ProductGroup.list()
      ]);
      setProducts(productsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const getGroupName = (id) => groups.find(g => g.id === id)?.name || '-';

  const filteredProducts = products.filter(product => {
    const matchSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = filterGroup === 'all' || product.group_id === filterGroup;

    let matchStock = true;
    if (filterStock === 'low') {
      matchStock = (product.stock_quantity || 0) <= (product.min_stock || 0);
    } else if (filterStock === 'zero') {
      matchStock = (product.stock_quantity || 0) === 0;
    } else if (filterStock === 'ok') {
      matchStock = (product.stock_quantity || 0) > (product.min_stock || 0);
    }

    return matchSearch && matchGroup && matchStock;
  });

  const totalValue = filteredProducts.reduce((sum, p) =>
    sum + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0
  );

  const totalItems = filteredProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

  const lowStock = products.filter(p =>
    (p.stock_quantity || 0) <= (p.min_stock || 0) && p.is_active !== false
  ).length;

  const zeroStock = products.filter(p =>
    (p.stock_quantity || 0) === 0 && p.is_active !== false
  ).length;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStockStatus = (product) => {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock || 0;

    if (stock === 0) {
      return { status: 'danger', label: 'Sem estoque' };
    } else if (stock <= minStock) {
      return { status: 'warning', label: 'Baixo' };
    }
    return { status: 'success', label: 'OK' };
  };

  const columns = [
    {
      key: 'code',
      label: 'Codigo',
      render: (_, product) => (
        <span className="font-mono text-sm text-muted-foreground">{product.code || product.barcode}</span>
      )
    },
    {
      key: 'name',
      label: 'Produto',
      render: (_, product) => (
        <TableAvatar
          src={product.photo_url}
          name={product.name}
          subtitle={getGroupName(product.group_id)}
          fallbackIcon={Package}
        />
      )
    },
    {
      key: 'stock_quantity',
      label: 'Estoque',
      className: 'text-center',
      render: (_, product) => {
        const stock = product.stock_quantity || 0;
        const minStock = product.min_stock || 0;
        const isLow = stock <= minStock;
        return (
          <div className={`font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
            {stock} <span className="text-muted-foreground font-normal text-sm">{product.unit}</span>
          </div>
        );
      }
    },
    {
      key: 'min_stock',
      label: 'Minimo',
      className: 'text-center',
      render: (_, product) => (
        <span className="text-muted-foreground">{product.min_stock || 0}</span>
      )
    },
    {
      key: 'cost_price',
      label: 'Custo Un.',
      className: 'text-right',
      render: (_, product) => (
        <span className="text-muted-foreground">{formatCurrency(product.cost_price)}</span>
      )
    },
    {
      key: 'total_value',
      label: 'Total',
      className: 'text-right',
      render: (_, product) => {
        const totalValue = (product.stock_quantity || 0) * (product.cost_price || 0);
        return <span className="font-bold">{formatCurrency(totalValue)}</span>;
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, product) => {
        const { status, label } = getStockStatus(product);
        return <StatusBadge status={status} label={label} />;
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
        title="Controle de Estoque"
        subtitle={`${filteredProducts.length} produtos`}
        icon={Archive}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Valor em Estoque"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
        />
        <MiniMetric
          label="Total de Itens"
          value={totalItems.toLocaleString('pt-BR')}
          icon={BarChart3}
        />
        <MiniMetric
          label="Estoque Baixo"
          value={lowStock}
          icon={AlertTriangle}
          status={lowStock > 0 ? 'warning' : 'default'}
        />
        <MiniMetric
          label="Sem Estoque"
          value={zeroStock}
          icon={Package}
          status={zeroStock > 0 ? 'danger' : 'default'}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStock} onValueChange={setFilterStock}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ok">Estoque OK</SelectItem>
              <SelectItem value="low">Estoque Baixo</SelectItem>
              <SelectItem value="zero">Sem Estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredProducts}
          columns={columns}
          emptyMessage="Nenhum produto encontrado"
        />
      </CardSection>
    </PageContainer>
  );
}
