import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Package,
  Plus,
  Edit,
  Check,
  Users,
  ShoppingBag,
  RefreshCcw,
  Star,
  Trash2,
  X,
  Building,
  Receipt,
  UserPlus,
  Monitor,
  Wrench,
  FileText,
  Truck,
  HardDrive,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const INITIAL_PLAN = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  max_users: 1,
  max_products: 100,
  max_customers: 100,
  max_sales_per_month: 500,
  max_pdv_terminals: 1,
  max_service_orders: 50,
  max_quotes: 50,
  max_suppliers: 20,
  max_storage_mb: 100,
  max_stores: 1,
  features: [],
  is_active: true,
};

export default function AdminPlans() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [planStats, setPlanStats] = useState({});
  const [editingPlan, setEditingPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [newPlan, setNewPlan] = useState(INITIAL_PLAN);
  const [newFeature, setNewFeature] = useState('');
  const [editFeature, setEditFeature] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);

      // Load stats for each plan (subscribers count)
      const stats = {};
      for (const plan of data || []) {
        const { count } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);
        stats[plan.id] = { subscribers: count || 0 };
      }
      setPlanStats(stats);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    setSaving(true);
    try {
      // Parse features if string
      let features = editingPlan.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch {
          features = [];
        }
      }

      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          description: editingPlan.description,
          price_monthly: editingPlan.price_monthly,
          price_yearly: editingPlan.price_yearly,
          max_users: editingPlan.max_users,
          max_products: editingPlan.max_products,
          max_customers: editingPlan.max_customers,
          max_sales_per_month: editingPlan.max_sales_per_month,
          max_pdv_terminals: editingPlan.max_pdv_terminals,
          max_service_orders: editingPlan.max_service_orders,
          max_quotes: editingPlan.max_quotes,
          max_suppliers: editingPlan.max_suppliers,
          max_storage_mb: editingPlan.max_storage_mb,
          max_stores: editingPlan.max_stores,
          features: features,
          is_active: editingPlan.is_active,
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      toast.success('Plano atualizado com sucesso');
      setDialogOpen(false);
      setEditingPlan(null);
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name) {
      toast.error('Nome do plano e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      const slug = newPlan.slug || generateSlug(newPlan.name);

      // Check if slug already exists
      const { data: existing } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        toast.error('Ja existe um plano com esse identificador');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('plans')
        .insert({
          name: newPlan.name,
          slug: slug,
          description: newPlan.description,
          price_monthly: newPlan.price_monthly || 0,
          price_yearly: newPlan.price_yearly || 0,
          max_users: newPlan.max_users || 1,
          max_products: newPlan.max_products || 100,
          max_customers: newPlan.max_customers || 100,
          max_sales_per_month: newPlan.max_sales_per_month || 500,
          max_pdv_terminals: newPlan.max_pdv_terminals || 1,
          max_service_orders: newPlan.max_service_orders || 50,
          max_quotes: newPlan.max_quotes || 50,
          max_suppliers: newPlan.max_suppliers || 20,
          max_storage_mb: newPlan.max_storage_mb || 100,
          max_stores: newPlan.max_stores || 1,
          features: newPlan.features || [],
          is_active: newPlan.is_active,
        });

      if (error) throw error;

      toast.success('Plano criado com sucesso');
      setCreateOpen(false);
      setNewPlan(INITIAL_PLAN);
      setNewFeature('');
      loadPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Erro ao criar plano');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;

    // Check if plan has subscribers
    const stats = planStats[planToDelete.id];
    if (stats?.subscribers > 0) {
      toast.error(`Nao e possivel excluir. ${stats.subscribers} empresas usam este plano.`);
      setDeleteOpen(false);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;

      toast.success('Plano excluido com sucesso');
      setDeleteOpen(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    } finally {
      setSaving(false);
    }
  };

  const addFeature = (type) => {
    const feature = type === 'new' ? newFeature : editFeature;
    if (!feature.trim()) return;

    if (type === 'new') {
      setNewPlan({ ...newPlan, features: [...(newPlan.features || []), feature.trim()] });
      setNewFeature('');
    } else {
      const features = typeof editingPlan.features === 'string'
        ? JSON.parse(editingPlan.features)
        : (editingPlan.features || []);
      setEditingPlan({ ...editingPlan, features: [...features, feature.trim()] });
      setEditFeature('');
    }
  };

  const removeFeature = (type, index) => {
    if (type === 'new') {
      const features = [...(newPlan.features || [])];
      features.splice(index, 1);
      setNewPlan({ ...newPlan, features });
    } else {
      const features = typeof editingPlan.features === 'string'
        ? JSON.parse(editingPlan.features)
        : [...(editingPlan.features || [])];
      features.splice(index, 1);
      setEditingPlan({ ...editingPlan, features });
    }
  };

  const getFeatures = (plan) => {
    if (!plan?.features) return [];
    return typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
  };

  const getPlanColor = (slug) => {
    const colors = {
      free: 'border-gray-200 bg-gray-50',
      starter: 'border-blue-200 bg-blue-50',
      professional: 'border-violet-200 bg-violet-50',
      enterprise: 'border-amber-200 bg-amber-50',
    };
    return colors[slug] || colors.free;
  };

  const getPlanIcon = (slug) => {
    const icons = {
      free: 'text-gray-500',
      starter: 'text-blue-500',
      professional: 'text-violet-500',
      enterprise: 'text-amber-500',
    };
    return icons[slug] || icons.free;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPlans} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-4 text-center py-12">
            <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Carregando planos...</p>
          </div>
        ) : (
          plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative overflow-hidden ${getPlanColor(plan.slug)}`}
            >
              {plan.slug === 'professional' && (
                <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm ${getPlanIcon(plan.slug)}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {formatCurrency(plan.price_monthly)}
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  {plan.price_yearly > 0 && (
                    <p className="text-sm text-muted-foreground">
                      ou {formatCurrency(plan.price_yearly)}/ano
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Usuarios
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_users === -1 ? '∞' : plan.max_users}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Produtos
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_products === -1 ? '∞' : plan.max_products}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Clientes
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_customers === -1 ? '∞' : plan.max_customers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5" />
                      Vendas/mes
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_sales_per_month === -1 ? '∞' : plan.max_sales_per_month}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5" />
                      PDVs
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_pdv_terminals === -1 ? '∞' : plan.max_pdv_terminals}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Store className="w-3.5 h-3.5" />
                      Lojas
                    </span>
                    <span className="font-medium text-xs">
                      {plan.max_stores === -1 ? '∞' : plan.max_stores}
                    </span>
                  </div>
                </div>

                {/* Subscribers */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Assinantes
                  </span>
                  <Badge variant={planStats[plan.id]?.subscribers > 0 ? 'default' : 'secondary'}>
                    {planStats[plan.id]?.subscribers || 0}
                  </Badge>
                </div>

                {/* Features */}
                {plan.features && getFeatures(plan).length > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recursos inclusos:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getFeatures(plan).slice(0, 3).map((feature, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {feature}
                        </Badge>
                      ))}
                      {getFeatures(plan).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{getFeatures(plan).length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingPlan({ ...plan, features: getFeatures(plan) });
                      setEditFeature('');
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setPlanToDelete(plan);
                      setDeleteOpen(true);
                    }}
                    disabled={planStats[plan.id]?.subscribers > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Altere as configuracoes do plano
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (identificador)</Label>
                  <Input
                    value={editingPlan.slug}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  value={editingPlan.description || ''}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preco Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPlan.price_monthly}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price_monthly: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preco Anual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPlan.price_yearly || ''}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price_yearly: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground">Limites do Plano (-1 = ilimitado)</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Usuarios</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_users}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_users: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Produtos</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_products}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_products: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Clientes</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_customers || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_customers: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vendas/Mes</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_sales_per_month || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_sales_per_month: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">PDVs Simultaneos</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_pdv_terminals || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_pdv_terminals: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ordens de Servico/Mes</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_service_orders || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_service_orders: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Orcamentos/Mes</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_quotes || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_quotes: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedores</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_suppliers || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_suppliers: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Armazenamento (MB)</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_storage_mb || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_storage_mb: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Lojas/Filiais</Label>
                    <Input
                      type="number"
                      value={editingPlan.max_stores || 0}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          max_stores: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <Label>Recursos do Plano</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Suporte prioritario"
                    value={editFeature}
                    onChange={(e) => setEditFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature('edit'))}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => addFeature('edit')}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {editingPlan.features?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingPlan.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {feature}
                        <button
                          type="button"
                          onClick={() => removeFeature('edit', i)}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label>Plano Ativo</Label>
                <Switch
                  checked={editingPlan.is_active}
                  onCheckedChange={(checked) =>
                    setEditingPlan({ ...editingPlan, is_active: checked })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Plano</DialogTitle>
            <DialogDescription>
              Configure um novo plano de assinatura
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Premium"
                  value={newPlan.name}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (identificador)</Label>
                <Input
                  placeholder="premium"
                  value={newPlan.slug}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para gerar automaticamente
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Descreva os beneficios do plano"
                value={newPlan.description}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preco Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="99.90"
                  value={newPlan.price_monthly || ''}
                  onChange={(e) =>
                    setNewPlan({
                      ...newPlan,
                      price_monthly: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preco Anual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="999.90"
                  value={newPlan.price_yearly || ''}
                  onChange={(e) =>
                    setNewPlan({
                      ...newPlan,
                      price_yearly: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">Limites do Plano (-1 = ilimitado)</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Usuarios</Label>
                  <Input
                    type="number"
                    value={newPlan.max_users}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_users: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Produtos</Label>
                  <Input
                    type="number"
                    value={newPlan.max_products}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_products: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Clientes</Label>
                  <Input
                    type="number"
                    value={newPlan.max_customers}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_customers: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vendas/Mes</Label>
                  <Input
                    type="number"
                    value={newPlan.max_sales_per_month}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_sales_per_month: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PDVs Simultaneos</Label>
                  <Input
                    type="number"
                    value={newPlan.max_pdv_terminals}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_pdv_terminals: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ordens de Servico/Mes</Label>
                  <Input
                    type="number"
                    value={newPlan.max_service_orders}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_service_orders: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Orcamentos/Mes</Label>
                  <Input
                    type="number"
                    value={newPlan.max_quotes}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_quotes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fornecedores</Label>
                  <Input
                    type="number"
                    value={newPlan.max_suppliers}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_suppliers: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Armazenamento (MB)</Label>
                  <Input
                    type="number"
                    value={newPlan.max_storage_mb}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_storage_mb: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lojas/Filiais</Label>
                  <Input
                    type="number"
                    value={newPlan.max_stores}
                    onChange={(e) =>
                      setNewPlan({
                        ...newPlan,
                        max_stores: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label>Recursos do Plano</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Suporte 24h"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature('new'))}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => addFeature('new')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newPlan.features?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPlan.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature('new', i)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Plano Ativo</Label>
              <Switch
                checked={newPlan.is_active}
                onCheckedChange={(checked) =>
                  setNewPlan({ ...newPlan, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewPlan(INITIAL_PLAN);
                setNewFeature('');
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreatePlan} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano "{planToDelete?.name}"?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
