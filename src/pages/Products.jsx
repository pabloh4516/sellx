import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import {
  Plus, Search, Edit, Trash2, Package, Image, MoreVertical, FileSpreadsheet,
  AlertTriangle, TrendingUp, DollarSign, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ExportMenu } from '@/components/ui/export-menu';
import { useSafeLoading } from '@/components/ui/safe-loading';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LimitAlert from '@/components/billing/LimitAlert';
import { useSubscriptionBlock, BLOCKABLE_FEATURES } from '@/hooks/useSubscriptionBlock';
import { SubscriptionBlockModal } from '@/components/SubscriptionBlockModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PageContainer,
  PageHeader,
  CardSection,
  DataTable,
  StatusBadge,
  Currency,
  TableAvatar,
  Grid,
  MiniMetric,
} from '@/components/nexo';

// Unidades de medida disponiveis
const UNITS = [
  { value: 'UN', label: 'Unidade', description: 'Venda por unidade' },
  { value: 'KG', label: 'Quilograma', description: 'Venda por peso (kg)' },
  { value: 'G', label: 'Grama', description: 'Venda por peso (g)' },
  { value: 'L', label: 'Litro', description: 'Venda por volume (L)' },
  { value: 'ML', label: 'Mililitro', description: 'Venda por volume (ml)' },
  { value: 'M', label: 'Metro', description: 'Venda por comprimento' },
  { value: 'M2', label: 'Metro Quadrado', description: 'Venda por area' },
  { value: 'CX', label: 'Caixa', description: 'Venda por caixa' },
  { value: 'PCT', label: 'Pacote', description: 'Venda por pacote' },
  { value: 'FD', label: 'Fardo', description: 'Venda por fardo' },
  { value: 'DZ', label: 'Duzia', description: 'Venda por duzia (12 un)' },
  { value: 'PC', label: 'Peca', description: 'Venda por peca' },
  { value: 'PAR', label: 'Par', description: 'Venda por par' },
  { value: 'BD', label: 'Bandeja', description: 'Venda por bandeja' },
  { value: 'SC', label: 'Saco', description: 'Venda por saco' },
  { value: 'RL', label: 'Rolo', description: 'Venda por rolo' },
  { value: 'PT', label: 'Pote', description: 'Venda por pote' },
  { value: 'GAL', label: 'Galao', description: 'Venda por galao' },
  { value: 'LT', label: 'Lata', description: 'Venda por lata' },
  { value: 'GF', label: 'Garrafa', description: 'Venda por garrafa' },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading, isTimeout] = useSafeLoading(true, 20000); // 20s timeout
  const [saving, setSaving] = useState(false);
  const { checkLimitAndNotify, getUsageSummary, refreshUsage } = usePlanLimits();

  // Sistema de bloqueio por inadimplencia
  const { isFeatureBlocked } = useSubscriptionBlock();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState('');

  // Funcao para verificar bloqueio
  const checkBlockedAction = (featureId) => {
    if (isFeatureBlocked(featureId)) {
      const feature = BLOCKABLE_FEATURES[featureId];
      setBlockedFeatureName(feature?.label || featureId);
      setShowBlockModal(true);
      return true;
    }
    return false;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStock, setFilterStock] = useState('all'); // all, zero, low, ok
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    description: '',
    photo_url: '',
    group_id: '',
    subgroup_id: '',
    supplier_id: '',
    unit: 'UN',
    cost_price: 0,
    sale_price: 0,
    wholesale_price: 0,
    stock_quantity: 0,
    min_stock: 0,
    max_stock: 0,
    expiry_date: '',
    commission_percent: 0,
    is_service: false,
    is_active: true,
    block_sale_no_stock: false,
    allow_open_price: false, // Permite definir preco na hora da venda
    ncm: '',
    location: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, groupsData, suppliersData] = await Promise.all([
        base44.entities.Product.list('-created_date'),
        base44.entities.ProductGroup.list(),
        base44.entities.Supplier.list()
      ]);
      setProducts(productsData);
      setGroups(groupsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      showErrorToast(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      showErrorToast({ code: 'REQUIRED_FIELD', message: 'Nome do produto e obrigatorio' });
      return;
    }

    // Se nao permite preco aberto, o preco de venda e obrigatorio
    if (!formData.allow_open_price && !formData.sale_price) {
      showErrorToast({ code: 'REQUIRED_FIELD', message: 'Preco de venda e obrigatorio (ou ative "Preco Livre")' });
      return;
    }

    setSaving(true);
    try {
      // Limpar dados antes de enviar - converter strings vazias em null
      const cleanData = { ...formData };

      // Campos que devem ser null se vazios (datas e IDs)
      const nullableFields = ['expiry_date', 'group_id', 'subgroup_id', 'supplier_id', 'code', 'barcode', 'photo_url', 'ncm', 'location', 'description'];
      nullableFields.forEach(field => {
        if (cleanData[field] === '' || cleanData[field] === undefined) {
          cleanData[field] = null;
        }
      });

      // Garantir que numeros sao numeros
      const numericFields = ['cost_price', 'sale_price', 'wholesale_price', 'stock_quantity', 'min_stock', 'max_stock', 'commission_percent'];
      numericFields.forEach(field => {
        cleanData[field] = parseFloat(cleanData[field]) || 0;
      });

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, cleanData);
        showSuccessToast('Produto atualizado', `"${formData.name}" foi atualizado com sucesso.`);
      } else {
        await base44.entities.Product.create(cleanData);
        showSuccessToast('Produto cadastrado', `"${formData.name}" foi adicionado ao catalogo.`);
        refreshUsage(); // Atualizar contagem de uso do plano
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      showErrorToast(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    if (checkBlockedAction('edit_product')) return;
    setEditingProduct(product);
    setFormData({
      code: product.code || '',
      barcode: product.barcode || '',
      name: product.name || '',
      description: product.description || '',
      photo_url: product.photo_url || '',
      group_id: product.group_id || '',
      subgroup_id: product.subgroup_id || '',
      supplier_id: product.supplier_id || '',
      unit: product.unit || 'UN',
      cost_price: product.cost_price || 0,
      sale_price: product.sale_price || 0,
      wholesale_price: product.wholesale_price || 0,
      stock_quantity: product.stock_quantity || 0,
      min_stock: product.min_stock || 0,
      max_stock: product.max_stock || 0,
      expiry_date: product.expiry_date || '',
      commission_percent: product.commission_percent || 0,
      is_service: product.is_service || false,
      is_active: product.is_active !== false,
      block_sale_no_stock: product.block_sale_no_stock || false,
      allow_open_price: product.allow_open_price || false,
      ncm: product.ncm || '',
      location: product.location || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (!confirm(`Excluir "${product.name}"?`)) return;

    try {
      await base44.entities.Product.delete(product.id);
      showSuccessToast('Produto excluido', `"${product.name}" foi removido do catalogo.`);
      loadData();
      refreshUsage(); // Atualizar contagem de uso do plano
    } catch (error) {
      console.error('Error deleting product:', error);
      showErrorToast(error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: result.file_url });
      showSuccessToast('Imagem enviada', 'A foto do produto foi carregada com sucesso.');
    } catch (error) {
      console.error('Error uploading image:', error);
      showErrorToast(error);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      barcode: '',
      name: '',
      description: '',
      photo_url: '',
      group_id: '',
      subgroup_id: '',
      supplier_id: '',
      unit: 'UN',
      cost_price: 0,
      sale_price: 0,
      wholesale_price: 0,
      stock_quantity: 0,
      min_stock: 0,
      max_stock: 0,
      expiry_date: '',
      commission_percent: 0,
      is_service: false,
      is_active: true,
      block_sale_no_stock: false,
      allow_open_price: false,
      ncm: '',
      location: ''
    });
  };

  const calculateMargin = () => {
    if (!formData.cost_price || !formData.sale_price) return 0;
    return (((formData.sale_price - formData.cost_price) / formData.cost_price) * 100).toFixed(1);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Calcular metricas
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.min_stock || 0)).length;
  const zeroStockCount = products.filter(p => p.stock_quantity === 0).length;
  const avgMargin = products.reduce((sum, p) => {
    if (p.cost_price && p.sale_price) {
      return sum + ((p.sale_price - p.cost_price) / p.cost_price) * 100;
    }
    return sum;
  }, 0) / (products.filter(p => p.cost_price && p.sale_price).length || 1);
  const totalStockValue = products.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0);

  const filteredProducts = products.filter(product => {
    const matchSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);
    const matchGroup = filterGroup === 'all' || product.group_id === filterGroup;
    // Filtro de estoque
    let matchStock = true;
    if (filterStock === 'zero') {
      matchStock = product.stock_quantity === 0;
    } else if (filterStock === 'low') {
      matchStock = product.stock_quantity > 0 && product.stock_quantity <= (product.min_stock || 0);
    } else if (filterStock === 'ok') {
      matchStock = product.stock_quantity > (product.min_stock || 0);
    }
    return matchSearch && matchGroup && matchStock;
  });

  const getGroupName = (id) => groups.find(g => g.id === id)?.name || '-';

  const columns = [
    {
      key: 'product',
      header: 'Produto',
      render: (_, item) => (
        <TableAvatar
          name={item.name}
          subtitle={item.code || item.barcode || 'Sem codigo'}
          image={item.photo_url}
        />
      )
    },
    {
      key: 'group',
      header: 'Grupo',
      render: (_, item) => (
        <span className="text-sm text-muted-foreground">{getGroupName(item.group_id)}</span>
      )
    },
    {
      key: 'cost_price',
      header: 'Custo',
      align: 'right',
      render: (_, item) => <Currency value={item.cost_price} />
    },
    {
      key: 'sale_price',
      header: 'Venda',
      align: 'right',
      render: (_, item) => (
        item.allow_open_price ? (
          <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded">
            Preco Livre
          </span>
        ) : (
          <Currency value={item.sale_price} className="font-semibold" />
        )
      )
    },
    {
      key: 'margin',
      header: 'Margem',
      align: 'center',
      render: (_, item) => {
        if (!item.cost_price || !item.sale_price) return <span className="text-muted-foreground">-</span>;
        const margin = ((item.sale_price - item.cost_price) / item.cost_price) * 100;
        const colorClass = margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-destructive';
        return (
          <div className="flex items-center gap-1">
            <div className={`w-16 h-2 bg-muted rounded-full overflow-hidden`}>
              <div
                className={`h-full ${margin >= 30 ? 'bg-success' : margin >= 15 ? 'bg-warning' : 'bg-destructive'}`}
                style={{ width: `${Math.min(margin, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${colorClass}`}>{margin.toFixed(0)}%</span>
          </div>
        );
      }
    },
    {
      key: 'stock',
      header: 'Estoque',
      align: 'center',
      render: (_, item) => {
        const status = item.stock_quantity === 0 ? 'danger' :
          item.stock_quantity <= (item.min_stock || 0) ? 'warning' : 'success';
        return (
          <StatusBadge
            status={status}
            label={`${item.stock_quantity || 0} ${item.unit}`}
          />
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: '100px',
      render: (_, item) => (
        <StatusBadge
          status={item.is_active !== false ? 'success' : 'default'}
          label={item.is_active !== false ? 'Ativo' : 'Inativo'}
        />
      )
    },
    {
      key: 'actions',
      header: 'Acoes',
      align: 'center',
      width: '60px',
      render: (_, item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} produtos cadastrados`}
        icon={Package}
        actions={
          <div className="flex gap-2">
            <ExportMenu
              data={filteredProducts.map(product => ({
                codigo: product.code || '',
                barcode: product.barcode || '',
                nome: product.name,
                grupo: groups.find(g => g.id === product.group_id)?.name || '',
                fornecedor: suppliers.find(s => s.id === product.supplier_id)?.name || '',
                unidade: product.unit || 'UN',
                preco_custo: product.cost_price || 0,
                preco_venda: product.sale_price || 0,
                preco_atacado: product.wholesale_price || 0,
                estoque: product.stock_quantity || 0,
                estoque_minimo: product.min_stock || 0,
                ativo: product.is_active ? 'Sim' : 'Nao',
              }))}
              filename={`produtos-${format(new Date(), 'yyyy-MM-dd')}`}
              columns={[
                { key: 'codigo', label: 'Codigo' },
                { key: 'barcode', label: 'Cod. Barras' },
                { key: 'nome', label: 'Nome' },
                { key: 'grupo', label: 'Grupo' },
                { key: 'fornecedor', label: 'Fornecedor' },
                { key: 'unidade', label: 'Unidade' },
                { key: 'preco_custo', label: 'Preco Custo' },
                { key: 'preco_venda', label: 'Preco Venda' },
                { key: 'preco_atacado', label: 'Preco Atacado' },
                { key: 'estoque', label: 'Estoque' },
                { key: 'estoque_minimo', label: 'Est. Minimo' },
                { key: 'ativo', label: 'Ativo' },
              ]}
            />
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Importar
            </Button>
            <Button onClick={() => {
              if (checkBlockedAction('create_product')) return;
              if (!checkLimitAndNotify('products')) return;
              resetForm();
              setShowForm(true);
            }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </div>
        }
      />

      {/* Alerta de limite */}
      {(() => {
        const summary = getUsageSummary('products');
        return (
          <LimitAlert
            limitKey="products"
            label={summary.label}
            current={products.length}
            limit={summary.limit}
          />
        );
      })()}

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Produtos"
          value={products.length}
          icon={Package}
        />
        <MiniMetric
          label="Estoque Zerado"
          value={zeroStockCount}
          icon={AlertTriangle}
          status={zeroStockCount > 0 ? 'danger' : 'default'}
        />
        <MiniMetric
          label="Estoque Baixo"
          value={lowStockCount}
          icon={AlertTriangle}
          status={lowStockCount > 0 ? 'warning' : 'default'}
        />
        <MiniMetric
          label="Margem Media"
          value={`${avgMargin.toFixed(1)}%`}
          icon={TrendingUp}
          status={avgMargin >= 30 ? 'success' : avgMargin >= 15 ? 'warning' : 'danger'}
        />
      </Grid>

      {/* Filters */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, codigo ou codigo de barras..."
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="zero">Zerado</SelectItem>
              <SelectItem value="low">Baixo</SelectItem>
              <SelectItem value="ok">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Products Table */}
      <CardSection noPadding>
        <DataTable
          data={filteredProducts}
          columns={columns}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyContext="products"
          onEmptyAction={() => { resetForm(); setShowForm(true); }}
        />
      </CardSection>

      {/* Product Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="basic">Dados Basicos</TabsTrigger>
                <TabsTrigger value="prices">Precos</TabsTrigger>
                <TabsTrigger value="stock">Estoque</TabsTrigger>
                <TabsTrigger value="other">Outros</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Photo */}
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center relative overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                        <span className="text-xs text-muted-foreground">Foto</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Codigo Interno</Label>
                        <Input
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value})}
                          placeholder="Ex: PROD001"
                        />
                      </div>
                      <div>
                        <Label>Codigo de Barras</Label>
                        <Input
                          value={formData.barcode}
                          onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          placeholder="EAN-13"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Nome do Produto *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Descricao</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Grupo</Label>
                    <Select value={formData.group_id} onValueChange={(v) => setFormData({...formData, group_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.filter(g => !g.parent_group_id).map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subgrupo</Label>
                    <Select value={formData.subgroup_id} onValueChange={(v) => setFormData({...formData, subgroup_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.filter(g => g.parent_group_id === formData.group_id).map(group => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Select value={formData.supplier_id} onValueChange={(v) => setFormData({...formData, supplier_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_service}
                      onCheckedChange={(v) => setFormData({...formData, is_service: v})}
                    />
                    <Label className="cursor-pointer">E um servico</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({...formData, is_active: v})}
                    />
                    <Label className="cursor-pointer">Ativo</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prices" className="space-y-4 mt-4">
                {/* Opcao de Preco Livre */}
                <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Preco Livre (Aberto)</p>
                      <p className="text-xs text-muted-foreground">
                        Permite definir o preco na hora da venda no PDV
                      </p>
                    </div>
                    <Switch
                      checked={formData.allow_open_price}
                      onCheckedChange={(v) => setFormData({...formData, allow_open_price: v, sale_price: v ? 0 : formData.sale_price})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preco de Custo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price || ''}
                      onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>
                      Preco de Venda {!formData.allow_open_price && '*'}
                      {formData.allow_open_price && <span className="text-warning text-xs ml-1">(Opcional)</span>}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sale_price || ''}
                      onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value) || 0})}
                      placeholder={formData.allow_open_price ? "Definir no PDV" : ""}
                      disabled={formData.allow_open_price}
                    />
                    {formData.allow_open_price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        O operador informara o preco no momento da venda
                      </p>
                    )}
                  </div>
                </div>

                {formData.cost_price > 0 && formData.sale_price > 0 && (
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <p className="text-sm text-primary font-medium">
                      Margem de lucro: <span className="font-bold">{calculateMargin()}%</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preco Atacado/Prazo</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.wholesale_price || ''}
                      onChange={(e) => setFormData({...formData, wholesale_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Comissao (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.commission_percent || ''}
                      onChange={(e) => setFormData({...formData, commission_percent: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unidade de Venda</Label>
                    <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            <span className="font-medium">{unit.value}</span>
                            <span className="text-muted-foreground ml-2">- {unit.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantidade em Estoque</Label>
                    <Input
                      type="number"
                      value={formData.stock_quantity || ''}
                      onChange={(e) => setFormData({...formData, stock_quantity: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estoque Minimo</Label>
                    <Input
                      type="number"
                      value={formData.min_stock || ''}
                      onChange={(e) => setFormData({...formData, min_stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label>Estoque Maximo</Label>
                    <Input
                      type="number"
                      value={formData.max_stock || ''}
                      onChange={(e) => setFormData({...formData, max_stock: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Data de Validade</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Localizacao no Estoque</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Ex: Prateleira A3"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.block_sale_no_stock}
                    onCheckedChange={(v) => setFormData({...formData, block_sale_no_stock: v})}
                  />
                  <Label className="cursor-pointer">Bloquear venda sem estoque</Label>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <div>
                  <Label>NCM</Label>
                  <Input
                    value={formData.ncm}
                    onChange={(e) => setFormData({...formData, ncm: e.target.value})}
                    placeholder="Codigo NCM"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving} loadingText="Salvando...">
                {editingProduct ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Bloqueio por Inadimplencia */}
      <SubscriptionBlockModal
        open={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        featureName={blockedFeatureName}
      />
    </PageContainer>
  );
}
