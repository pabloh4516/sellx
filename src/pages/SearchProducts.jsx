import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Package } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function SearchProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await base44.entities.Product.list();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
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

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  );

  const totalProducts = products.length;
  const inStock = products.filter(p => (p.stock_quantity || 0) > 0).length;
  const outOfStock = products.filter(p => (p.stock_quantity || 0) <= 0).length;

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
        title="Consulta de Produtos"
        subtitle="Busque informacoes sobre produtos"
        icon={Search}
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Produtos"
          value={totalProducts}
          icon={Package}
        />
        <MiniMetric
          label="Em Estoque"
          value={inStock}
          icon={Package}
          status="success"
        />
        <MiniMetric
          label="Sem Estoque"
          value={outOfStock}
          icon={Package}
          status={outOfStock > 0 ? 'danger' : 'default'}
        />
      </Grid>

      {/* Filtro */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por codigo, nome ou codigo de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
      </CardSection>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => (
          <CardSection key={product.id} className="hover:shadow-md transition-shadow">
            <div className="flex gap-4">
              {product.photo_url ? (
                <img src={product.photo_url} alt="" className="w-20 h-20 object-cover rounded" />
              ) : (
                <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{product.name}</h3>
                {product.code && <p className="text-xs text-muted-foreground">Cod: {product.code}</p>}
                {product.barcode && <p className="text-xs text-muted-foreground font-mono">EAN: {product.barcode}</p>}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Preco:</span>
                <span className="font-bold text-success">{formatCurrency(product.sale_price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estoque:</span>
                <StatusBadge
                  status={(product.stock_quantity || 0) > 0 ? 'success' : 'danger'}
                  label={`${product.stock_quantity || 0} ${product.unit || 'un'}`}
                />
              </div>
            </div>
          </CardSection>
        ))}
      </div>

      {searchTerm && filteredProducts.length === 0 && (
        <CardSection>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        </CardSection>
      )}
    </PageContainer>
  );
}
