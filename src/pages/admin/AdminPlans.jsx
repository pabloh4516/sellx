import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Package,
  Plus,
  Edit,
  Check,
  Users,
  ShoppingBag,
  RefreshCcw,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function AdminPlans() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    try {
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
          max_sales_month: editingPlan.max_sales_month,
          is_active: editingPlan.is_active,
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      toast.success('Plano atualizado com sucesso');
      setDialogOpen(false);
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
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
        <Button onClick={loadPlans} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
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
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Usuarios
                    </span>
                    <span className="font-medium">
                      {plan.max_users === -1 ? 'Ilimitado' : plan.max_users}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Produtos
                    </span>
                    <span className="font-medium">
                      {plan.max_products === -1 ? 'Ilimitado' : plan.max_products}
                    </span>
                  </div>
                </div>

                {/* Features */}
                {plan.features && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recursos inclusos:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(typeof plan.features === 'string'
                        ? JSON.parse(plan.features)
                        : plan.features
                      ).slice(0, 3).map((feature, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    setEditingPlan(plan);
                    setDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Plano
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Altere as configuracoes do plano
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
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
                <Label>Descricao</Label>
                <Input
                  value={editingPlan.description || ''}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preco Mensal (R$)</Label>
                  <Input
                    type="number"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Usuarios (-1 = ilimitado)</Label>
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
                <div className="space-y-2">
                  <Label>Max Produtos (-1 = ilimitado)</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
