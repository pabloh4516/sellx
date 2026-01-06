import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Tag, Plus, Edit, Trash2, Percent, Gift, Calendar, MoreVertical,
  Copy, Zap, Clock, TrendingUp, AlertTriangle, Search, Filter,
  Package, Users, CheckCircle, XCircle, Eye, BarChart3
} from 'lucide-react';
import { safeFormatDate, formatCurrency, cn } from '@/lib/utils';
import { format, isAfter, isBefore, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
  MetricCard,
} from '@/components/nexo';

const PROMOTION_TYPES = [
  { value: 'discount_percent', label: 'Desconto Percentual', icon: Percent },
  { value: 'discount_value', label: 'Desconto em Reais', icon: Tag },
  { value: 'buy_x_get_y', label: 'Compre X Leve Y', icon: Gift },
  { value: 'combo', label: 'Combo de Produtos', icon: Package },
  { value: 'quantity_discount', label: 'Desconto por Quantidade', icon: TrendingUp },
  { value: 'progressive', label: 'Desconto Progressivo', icon: BarChart3 },
  { value: 'first_purchase', label: 'Primeira Compra', icon: Zap },
  { value: 'loyalty', label: 'Cliente Fidelidade', icon: Users },
];

const TARGET_OPTIONS = [
  { value: 'all', label: 'Todos os Produtos' },
  { value: 'products', label: 'Produtos Especificos' },
  { value: 'categories', label: 'Categorias' },
];

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPromotion, setPreviewPromotion] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'discount_percent',
    description: '',
    start_date: '',
    end_date: '',
    discount_percent: 0,
    discount_value: 0,
    buy_quantity: 2,
    get_quantity: 1,
    min_quantity: 3,
    min_purchase_value: 0,
    max_discount_value: 0,
    usage_limit: 0,
    usage_count: 0,
    target_type: 'all',
    products: [],
    categories: [],
    combo_items: [],
    combo_price: 0,
    progressive_tiers: [
      { min_quantity: 2, discount_percent: 5 },
      { min_quantity: 5, discount_percent: 10 },
      { min_quantity: 10, discount_percent: 15 },
    ],
    loyalty_min_points: 0,
    is_active: true,
    priority: 1,
    stackable: false,
    coupon_code: '',
    conditions: {
      days_of_week: [],
      time_start: '',
      time_end: '',
      customer_segments: [],
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promotionsData, productsData, categoriesData, salesData] = await Promise.all([
        base44.entities.Promotion.list(),
        base44.entities.Product.list(),
        base44.entities.ProductGroup.list(),
        base44.entities.Sale.list(),
      ]);
      setPromotions(promotionsData);
      setProducts(productsData);
      setCategories(categoriesData);
      setSales(salesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatisticas das promocoes
  const stats = useMemo(() => {
    const now = new Date();
    const active = promotions.filter(p => p.is_active);
    const scheduled = promotions.filter(p => {
      if (!p.start_date) return false;
      return isAfter(parseISO(p.start_date), now);
    });
    const expiringSoon = promotions.filter(p => {
      if (!p.end_date || !p.is_active) return false;
      const endDate = parseISO(p.end_date);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return isAfter(endDate, now) && isBefore(endDate, threeDaysFromNow);
    });

    // Calcular vendas com promocao
    const salesWithPromo = sales.filter(s => s.discount > 0 || s.promotion_id);
    const totalDiscountGiven = salesWithPromo.reduce((sum, s) => sum + (s.discount || 0), 0);

    return {
      total: promotions.length,
      active: active.length,
      scheduled: scheduled.length,
      expiringSoon: expiringSoon.length,
      inactive: promotions.length - active.length,
      salesWithPromo: salesWithPromo.length,
      totalDiscountGiven,
    };
  }, [promotions, sales]);

  // Filtrar promocoes
  const filteredPromotions = useMemo(() => {
    let filtered = promotions;

    // Filtro por tab
    const now = new Date();
    if (activeTab === 'active') {
      filtered = filtered.filter(p => p.is_active);
    } else if (activeTab === 'scheduled') {
      filtered = filtered.filter(p => p.start_date && isAfter(parseISO(p.start_date), now));
    } else if (activeTab === 'expired') {
      filtered = filtered.filter(p => p.end_date && isBefore(parseISO(p.end_date), now));
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(p => !p.is_active);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.coupon_code?.toLowerCase().includes(term)
      );
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }

    return filtered;
  }, [promotions, activeTab, searchTerm, filterType]);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Informe o nome da promocao');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        progressive_tiers: formData.type === 'progressive' ? formData.progressive_tiers : undefined,
      };

      if (editingPromotion) {
        await base44.entities.Promotion.update(editingPromotion.id, dataToSave);
        toast.success('Promocao atualizada!');
      } else {
        await base44.entities.Promotion.create(dataToSave);
        toast.success('Promocao criada!');
      }
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast.error('Erro ao salvar promocao');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      ...promotion,
      progressive_tiers: promotion.progressive_tiers || [
        { min_quantity: 2, discount_percent: 5 },
        { min_quantity: 5, discount_percent: 10 },
        { min_quantity: 10, discount_percent: 15 },
      ],
      conditions: promotion.conditions || {
        days_of_week: [],
        time_start: '',
        time_end: '',
        customer_segments: [],
      }
    });
    setShowDialog(true);
  };

  const handleDuplicate = (promotion) => {
    setEditingPromotion(null);
    setFormData({
      ...promotion,
      name: `${promotion.name} (Copia)`,
      is_active: false,
      usage_count: 0,
    });
    setShowDialog(true);
    toast.info('Promocao duplicada - edite e salve');
  };

  const handleToggleActive = async (promotion) => {
    try {
      await base44.entities.Promotion.update(promotion.id, {
        is_active: !promotion.is_active
      });
      toast.success(promotion.is_active ? 'Promocao desativada' : 'Promocao ativada');
      loadData();
    } catch (error) {
      console.error('Error toggling promotion:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta promocao?')) return;

    try {
      await base44.entities.Promotion.delete(id);
      toast.success('Promocao excluida!');
      loadData();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Erro ao excluir promocao');
    }
  };

  const handlePreview = (promotion) => {
    setPreviewPromotion(promotion);
    setShowPreview(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'discount_percent',
      description: '',
      start_date: '',
      end_date: '',
      discount_percent: 0,
      discount_value: 0,
      buy_quantity: 2,
      get_quantity: 1,
      min_quantity: 3,
      min_purchase_value: 0,
      max_discount_value: 0,
      usage_limit: 0,
      usage_count: 0,
      target_type: 'all',
      products: [],
      categories: [],
      combo_items: [],
      combo_price: 0,
      progressive_tiers: [
        { min_quantity: 2, discount_percent: 5 },
        { min_quantity: 5, discount_percent: 10 },
        { min_quantity: 10, discount_percent: 15 },
      ],
      loyalty_min_points: 0,
      is_active: true,
      priority: 1,
      stackable: false,
      coupon_code: '',
      conditions: {
        days_of_week: [],
        time_start: '',
        time_end: '',
        customer_segments: [],
      }
    });
    setEditingPromotion(null);
  };

  const getPromotionTypeLabel = (type) => {
    const found = PROMOTION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getPromotionTypeIcon = (type) => {
    const found = PROMOTION_TYPES.find(t => t.value === type);
    return found?.icon || Tag;
  };

  const getPromotionStatus = (promotion) => {
    const now = new Date();
    if (!promotion.is_active) return { status: 'default', label: 'Inativa' };

    if (promotion.start_date && isAfter(parseISO(promotion.start_date), now)) {
      return { status: 'info', label: 'Agendada' };
    }

    if (promotion.end_date && isBefore(parseISO(promotion.end_date), now)) {
      return { status: 'warning', label: 'Expirada' };
    }

    if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
      return { status: 'warning', label: 'Limite Atingido' };
    }

    return { status: 'success', label: 'Ativa' };
  };

  const addComboItem = () => {
    setFormData({
      ...formData,
      combo_items: [...formData.combo_items, { product_id: '', quantity: 1 }]
    });
  };

  const updateComboItem = (index, field, value) => {
    const items = [...formData.combo_items];
    items[index][field] = value;
    setFormData({ ...formData, combo_items: items });
  };

  const removeComboItem = (index) => {
    setFormData({
      ...formData,
      combo_items: formData.combo_items.filter((_, i) => i !== index)
    });
  };

  const addProgressiveTier = () => {
    setFormData({
      ...formData,
      progressive_tiers: [...formData.progressive_tiers, { min_quantity: 1, discount_percent: 0 }]
    });
  };

  const updateProgressiveTier = (index, field, value) => {
    const tiers = [...formData.progressive_tiers];
    tiers[index][field] = parseFloat(value) || 0;
    setFormData({ ...formData, progressive_tiers: tiers });
  };

  const removeProgressiveTier = (index) => {
    setFormData({
      ...formData,
      progressive_tiers: formData.progressive_tiers.filter((_, i) => i !== index)
    });
  };

  const toggleProduct = (productId) => {
    const current = formData.products || [];
    if (current.includes(productId)) {
      setFormData({ ...formData, products: current.filter(id => id !== productId) });
    } else {
      setFormData({ ...formData, products: [...current, productId] });
    }
  };

  const toggleCategory = (categoryId) => {
    const current = formData.categories || [];
    if (current.includes(categoryId)) {
      setFormData({ ...formData, categories: current.filter(id => id !== categoryId) });
    } else {
      setFormData({ ...formData, categories: [...current, categoryId] });
    }
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, coupon_code: code });
  };

  const columns = [
    {
      key: 'name',
      label: 'Promocao',
      render: (_, promotion) => {
        const TypeIcon = getPromotionTypeIcon(promotion.type);
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              promotion.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium">{promotion.name}</p>
              {promotion.coupon_code && (
                <Badge variant="outline" className="text-xs mt-0.5">
                  {promotion.coupon_code}
                </Badge>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (_, promotion) => (
        <StatusBadge status="info" label={getPromotionTypeLabel(promotion.type)} />
      )
    },
    {
      key: 'discount',
      label: 'Desconto',
      render: (_, promotion) => {
        if (promotion.type === 'discount_percent' || promotion.type === 'quantity_discount') {
          return <span className="font-medium text-green-600">{promotion.discount_percent}%</span>;
        }
        if (promotion.type === 'discount_value') {
          return <span className="font-medium text-green-600">{formatCurrency(promotion.discount_value)}</span>;
        }
        if (promotion.type === 'buy_x_get_y') {
          return <span className="text-sm">Compre {promotion.buy_quantity} Leve {promotion.get_quantity}</span>;
        }
        if (promotion.type === 'combo') {
          return <span className="font-medium text-green-600">{formatCurrency(promotion.combo_price)}</span>;
        }
        return '-';
      }
    },
    {
      key: 'period',
      label: 'Periodo',
      render: (_, promotion) => (
        <div className="text-sm">
          {promotion.start_date && <p>{safeFormatDate(promotion.start_date)}</p>}
          {promotion.end_date && <p className="text-muted-foreground">ate {safeFormatDate(promotion.end_date)}</p>}
          {!promotion.start_date && !promotion.end_date && <span className="text-muted-foreground">Sem prazo</span>}
        </div>
      )
    },
    {
      key: 'usage',
      label: 'Uso',
      render: (_, promotion) => (
        <div className="text-sm">
          <span className="font-medium">{promotion.usage_count || 0}</span>
          {promotion.usage_limit > 0 && (
            <span className="text-muted-foreground"> / {promotion.usage_limit}</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, promotion) => {
        const { status, label } = getPromotionStatus(promotion);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, promotion) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlePreview(promotion)}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(promotion)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(promotion)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleToggleActive(promotion)}>
              {promotion.is_active ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(promotion.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        title="Gestao de Promocoes"
        subtitle="Crie e gerencie promocoes, cupons e ofertas especiais"
        icon={Tag}
        actions={
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Promocao
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MetricCard
          title="Promocoes Ativas"
          value={stats.active}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Agendadas"
          value={stats.scheduled}
          icon={Clock}
          variant="info"
        />
        <MetricCard
          title="Expirando em Breve"
          value={stats.expiringSoon}
          icon={AlertTriangle}
          variant={stats.expiringSoon > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Descontos Concedidos"
          value={formatCurrency(stats.totalDiscountGiven)}
          icon={TrendingUp}
          description={`Em ${stats.salesWithPromo} vendas`}
        />
      </Grid>

      {/* Filtros e Tabs */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar promocao ou cupom..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {PROMOTION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              Todas ({promotions.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Ativas ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Agendadas ({stats.scheduled})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expiradas
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inativas ({stats.inactive})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredPromotions}
          columns={columns}
          emptyMessage="Nenhuma promocao encontrada"
        />
      </CardSection>

      {/* Form Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromotion ? 'Editar' : 'Nova'} Promocao</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basico</TabsTrigger>
              <TabsTrigger value="discount">Desconto</TabsTrigger>
              <TabsTrigger value="target">Aplicacao</TabsTrigger>
              <TabsTrigger value="rules">Regras</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome da Promocao</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Promocao de Verao"
                  />
                </div>
                <div>
                  <Label>Tipo de Promocao</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descricao</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  placeholder="Descricao detalhada da promocao"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data Inicio</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Codigo do Cupom (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.coupon_code}
                      onChange={(e) => setFormData({...formData, coupon_code: e.target.value.toUpperCase()})}
                      placeholder="VERAO2024"
                    />
                    <Button type="button" variant="outline" onClick={generateCouponCode}>
                      Gerar
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                    min={1}
                    max={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maior = mais prioritario</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Promocao Ativa</Label>
                  <p className="text-sm text-muted-foreground">Ativar promocao imediatamente</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({...formData, is_active: v})}
                />
              </div>
            </TabsContent>

            <TabsContent value="discount" className="space-y-4 mt-4">
              {formData.type === 'discount_percent' && (
                <div>
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
                    min={0}
                    max={100}
                  />
                </div>
              )}

              {formData.type === 'discount_value' && (
                <div>
                  <Label>Valor do Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  />
                </div>
              )}

              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Compre (quantidade)</Label>
                    <Input
                      type="number"
                      value={formData.buy_quantity}
                      onChange={(e) => setFormData({...formData, buy_quantity: parseInt(e.target.value) || 2})}
                    />
                  </div>
                  <div>
                    <Label>Leve (quantidade)</Label>
                    <Input
                      type="number"
                      value={formData.get_quantity}
                      onChange={(e) => setFormData({...formData, get_quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'quantity_discount' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade Minima</Label>
                    <Input
                      type="number"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({...formData, min_quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              )}

              {formData.type === 'progressive' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Faixas de Desconto Progressivo</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addProgressiveTier}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Faixa
                    </Button>
                  </div>
                  {formData.progressive_tiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="text-sm text-muted-foreground w-32">A partir de</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={tier.min_quantity}
                        onChange={(e) => updateProgressiveTier(index, 'min_quantity', e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">unidades =</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={tier.discount_percent}
                        onChange={(e) => updateProgressiveTier(index, 'discount_percent', e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">% desconto</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProgressiveTier(index)}
                        disabled={formData.progressive_tiers.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {formData.type === 'combo' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Itens do Combo</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addComboItem}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Item
                    </Button>
                  </div>
                  {formData.combo_items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={item.product_id}
                        onValueChange={(v) => updateComboItem(index, 'product_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-24"
                        placeholder="Qtd"
                        value={item.quantity}
                        onChange={(e) => updateComboItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeComboItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Label>Preco do Combo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.combo_price}
                      onChange={(e) => setFormData({...formData, combo_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              )}

              {(formData.type === 'first_purchase' || formData.type === 'loyalty') && (
                <div className="space-y-4">
                  <div>
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  {formData.type === 'loyalty' && (
                    <div>
                      <Label>Pontos Minimos para Aplicar</Label>
                      <Input
                        type="number"
                        value={formData.loyalty_min_points}
                        onChange={(e) => setFormData({...formData, loyalty_min_points: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="target" className="space-y-4 mt-4">
              <div>
                <Label>Aplicar Promocao em</Label>
                <Select value={formData.target_type} onValueChange={(v) => setFormData({...formData, target_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.target_type === 'products' && (
                <div>
                  <Label>Selecione os Produtos</Label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto mt-2">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleProduct(product.id)}
                      >
                        <Checkbox checked={(formData.products || []).includes(product.id)} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <span className="text-sm">{formatCurrency(product.sale_price)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.products || []).length} produto(s) selecionado(s)
                  </p>
                </div>
              )}

              {formData.target_type === 'categories' && (
                <div>
                  <Label>Selecione as Categorias</Label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto mt-2">
                    {categories.map(category => (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <Checkbox checked={(formData.categories || []).includes(category.id)} />
                        <span className="text-sm">{category.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.categories || []).length} categoria(s) selecionada(s)
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rules" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Minimo da Compra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_purchase_value}
                    onChange={(e) => setFormData({...formData, min_purchase_value: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = sem minimo</p>
                </div>
                <div>
                  <Label>Desconto Maximo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.max_discount_value}
                    onChange={(e) => setFormData({...formData, max_discount_value: parseFloat(e.target.value) || 0})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = sem limite</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Limite de Usos</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({...formData, usage_limit: parseInt(e.target.value) || 0})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = ilimitado</p>
                </div>
                <div>
                  <Label>Usos Atuais</Label>
                  <Input
                    type="number"
                    value={formData.usage_count}
                    disabled
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label>Acumulavel</Label>
                  <p className="text-sm text-muted-foreground">Permite combinar com outras promocoes</p>
                </div>
                <Switch
                  checked={formData.stackable}
                  onCheckedChange={(v) => setFormData({...formData, stackable: v})}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingPromotion ? 'Atualizar' : 'Criar'} Promocao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Promocao</DialogTitle>
          </DialogHeader>
          {previewPromotion && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const TypeIcon = getPromotionTypeIcon(previewPromotion.type);
                  return (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="w-6 h-6 text-primary" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-lg">{previewPromotion.name}</h3>
                  <Badge variant="outline">{getPromotionTypeLabel(previewPromotion.type)}</Badge>
                </div>
              </div>

              {previewPromotion.description && (
                <p className="text-muted-foreground">{previewPromotion.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{getPromotionStatus(previewPromotion).label}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Usos</p>
                  <p className="font-medium">
                    {previewPromotion.usage_count || 0}
                    {previewPromotion.usage_limit > 0 && ` / ${previewPromotion.usage_limit}`}
                  </p>
                </div>
                {previewPromotion.start_date && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Inicio</p>
                    <p className="font-medium">{safeFormatDate(previewPromotion.start_date)}</p>
                  </div>
                )}
                {previewPromotion.end_date && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Fim</p>
                    <p className="font-medium">{safeFormatDate(previewPromotion.end_date)}</p>
                  </div>
                )}
              </div>

              {previewPromotion.coupon_code && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Codigo do Cupom</p>
                  <p className="text-2xl font-mono font-bold text-primary">{previewPromotion.coupon_code}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
