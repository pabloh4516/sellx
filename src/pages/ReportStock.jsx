import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Package, AlertTriangle, TrendingUp, DollarSign, Boxes } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  DataTable,
  StatusBadge,
} from '@/components/nexo';

export default function ReportStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData);
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

  const lowStockProducts = products.filter(p =>
    (p.stock_quantity || 0) <= (p.min_stock || 0) && p.is_active !== false
  );

  const zeroStockProducts = products.filter(p =>
    (p.stock_quantity || 0) === 0 && p.is_active !== false
  );

  const totalValue = products.reduce((sum, p) =>
    sum + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0
  );

  const totalItems = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

  const lowStockColumns = [
    {
      key: 'name',
      label: 'Produto',
      render: (_, product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-warning" />
          </div>
          <span className="font-medium">{product.name}</span>
        </div>
      )
    },
    {
      key: 'stock',
      label: 'Estoque',
      className: 'text-center',
      render: (_, product) => (
        <StatusBadge
          status="error"
          label={product.stock_quantity || 0}
        />
      )
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
      key: 'value',
      label: 'Valor',
      className: 'text-right',
      render: (_, product) => (
        <span className="font-medium">
          {formatCurrency((product.stock_quantity || 0) * (product.cost_price || 0))}
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
        title="Relatorio de Estoque"
        subtitle="Analise do inventario"
        icon={Boxes}
      />

      {/* KPIs */}
      <Grid cols={4}>
        <MetricCard
          label="Total de Produtos"
          value={products.length}
          icon={Package}
          variant="primary"
        />
        <MetricCard
          label="Total de Itens"
          value={totalItems}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          label="Valor do Estoque"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          variant="info"
        />
        <MetricCard
          label="Estoque Baixo"
          value={lowStockProducts.length}
          icon={AlertTriangle}
          variant="warning"
        />
      </Grid>

      {/* Low Stock Products */}
      {lowStockProducts.length > 0 && (
        <CardSection title="Produtos com Estoque Baixo" icon={AlertTriangle} noPadding>
          <DataTable
            data={lowStockProducts}
            columns={lowStockColumns}
            emptyMessage="Nenhum produto com estoque baixo"
          />
        </CardSection>
      )}

      {/* Zero Stock Products */}
      {zeroStockProducts.length > 0 && (
        <CardSection title="Produtos Sem Estoque" icon={Package}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {zeroStockProducts.map(product => (
              <div
                key={product.id}
                className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
              >
                <p className="font-medium text-sm text-destructive">{product.name}</p>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {/* All Products Empty State */}
      {lowStockProducts.length === 0 && zeroStockProducts.length === 0 && (
        <CardSection>
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-success font-medium">Todos os produtos estao com estoque adequado!</p>
          </div>
        </CardSection>
      )}
    </PageContainer>
  );
}
