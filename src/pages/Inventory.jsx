import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Save, ClipboardCheck, Package, AlertTriangle } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  MiniMetric,
} from '@/components/nexo';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await base44.entities.Product.list();
      setProducts(productsData);

      // Initialize inventory with current stock
      const inv = {};
      productsData.forEach(p => {
        inv[p.id] = p.stock_quantity || 0;
      });
      setInventory(inv);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryChange = (productId, value) => {
    setInventory({
      ...inventory,
      [productId]: parseFloat(value) || 0
    });
  };

  const handleSaveInventory = async () => {
    setSaving(true);
    try {
      const promises = [];

      for (const product of products) {
        const newStock = inventory[product.id];
        const oldStock = product.stock_quantity || 0;

        if (newStock !== oldStock) {
          // Update product stock
          promises.push(
            base44.entities.Product.update(product.id, { stock_quantity: newStock })
          );

          // Create stock movement
          promises.push(
            base44.entities.StockMovement.create({
              product_id: product.id,
              type: 'inventario',
              quantity: Math.abs(newStock - oldStock),
              previous_stock: oldStock,
              new_stock: newStock,
              reference_type: 'inventario',
              reason: 'Contagem de inventario',
              movement_date: new Date().toISOString()
            })
          );
        }
      }

      await Promise.all(promises);
      toast.success('Inventario salvo com sucesso!');
      loadProducts();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error('Erro ao salvar inventario');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasChanges = products.some(p =>
    inventory[p.id] !== (p.stock_quantity || 0)
  );

  const changedCount = products.filter(p =>
    inventory[p.id] !== (p.stock_quantity || 0)
  ).length;

  const columns = [
    {
      key: 'code',
      label: 'Codigo',
      render: (_, product) => (
        <span className="font-mono text-sm text-muted-foreground">{product.code || product.barcode || '-'}</span>
      )
    },
    {
      key: 'name',
      label: 'Produto',
      render: (_, product) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{product.name}</span>
        </div>
      )
    },
    {
      key: 'system_stock',
      label: 'Estoque Sistema',
      className: 'text-center',
      render: (_, product) => (
        <span className="text-muted-foreground">{product.stock_quantity || 0}</span>
      )
    },
    {
      key: 'physical_stock',
      label: 'Estoque Fisico',
      className: 'text-center',
      render: (_, product) => (
        <Input
          type="number"
          value={inventory[product.id] || 0}
          onChange={(e) => handleInventoryChange(product.id, e.target.value)}
          className="w-24 mx-auto text-center"
        />
      )
    },
    {
      key: 'difference',
      label: 'Diferenca',
      className: 'text-center',
      render: (_, product) => {
        const systemStock = product.stock_quantity || 0;
        const physicalStock = inventory[product.id] || 0;
        const difference = physicalStock - systemStock;

        if (difference === 0) return <span className="text-muted-foreground">-</span>;

        return (
          <span className={difference > 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
            {difference > 0 ? '+' : ''}{difference}
          </span>
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
        title="Inventario / Contagem"
        subtitle="Confira e atualize o estoque fisico"
        icon={ClipboardCheck}
        actions={
          hasChanges && (
            <Button
              onClick={handleSaveInventory}
              disabled={saving}
              className="bg-success hover:bg-success/90"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Inventario
            </Button>
          )
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Produtos"
          value={products.length}
          icon={Package}
        />
        <MiniMetric
          label="Produtos Alterados"
          value={changedCount}
          icon={AlertTriangle}
          status={changedCount > 0 ? 'warning' : 'default'}
        />
        <MiniMetric
          label="Produtos Listados"
          value={filteredProducts.length}
          icon={ClipboardCheck}
        />
      </Grid>

      {/* Filtro */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
