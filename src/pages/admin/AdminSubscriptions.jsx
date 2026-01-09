import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Search,
  RefreshCcw,
  Download,
  Building2,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  MoreVertical,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [plans, setPlans] = useState([]);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [newPlan, setNewPlan] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [organizations, searchTerm, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      const { data: plansData } = await supabase.from('plans').select('*');

      setOrganizations(orgsData || []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...organizations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((org) =>
        org.name?.toLowerCase().includes(term) ||
        org.email?.toLowerCase().includes(term)
      );
    }
    if (statusFilter === 'paying') {
      filtered = filtered.filter((org) => org.plan && org.plan !== 'free');
    } else if (statusFilter === 'free') {
      filtered = filtered.filter((org) => !org.plan || org.plan === 'free');
    }
    setFilteredOrgs(filtered);
  };

  const handleChangePlan = (org) => {
    setSelectedOrg(org);
    setNewPlan(org.plan || 'free');
    setChangePlanOpen(true);
  };

  const handleSavePlan = async () => {
    if (!selectedOrg) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          plan: newPlan,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      // Also update/create subscription record if table exists
      try {
        const planInfo = plans.find(p => p.slug === newPlan);
        if (planInfo) {
          // Check if subscription exists
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('organization_id', selectedOrg.id)
            .single();

          if (existingSub) {
            await supabase
              .from('subscriptions')
              .update({
                plan_id: planInfo.id,
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSub.id);
          } else {
            await supabase
              .from('subscriptions')
              .insert({
                organization_id: selectedOrg.id,
                plan_id: planInfo.id,
                status: 'active',
              });
          }
        }
      } catch {
        // Subscriptions table might not exist or have different structure
      }

      toast.success('Plano alterado com sucesso');
      setChangePlanOpen(false);
      setSelectedOrg(null);
      loadData();
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Erro ao alterar plano');
    } finally {
      setSaving(false);
    }
  };

  const toggleOrgStatus = async (org) => {
    try {
      const newStatus = !org.is_active;
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: newStatus })
        .eq('id', org.id);

      if (error) throw error;

      toast.success(newStatus ? 'Organizacao ativada' : 'Organizacao desativada');
      loadData();
    } catch (error) {
      console.error('Error toggling org status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const getPlanInfo = (planSlug) => {
    return plans.find((p) => p.slug === planSlug) || { name: 'Gratuito', price_monthly: 0 };
  };

  const getMRR = () => {
    return organizations.reduce((sum, org) => {
      const plan = getPlanInfo(org.plan);
      return sum + (plan.price_monthly || 0);
    }, 0);
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-violet-100 text-violet-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    const labels = {
      free: 'Gratuito',
      starter: 'Starter',
      professional: 'Profissional',
      enterprise: 'Enterprise',
    };
    return <Badge className={colors[plan] || colors.free}>{labels[plan] || plan}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground">Gerencie assinaturas e planos</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(getMRR())}</p>
                <p className="text-sm text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.filter((o) => o.plan !== 'free').length}
                </p>
                <p className="text-sm text-muted-foreground">Pagantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.filter((o) => o.plan === 'free').length}
                </p>
                <p className="text-sm text-muted-foreground">Gratuitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(getMRR() * 12)}</p>
                <p className="text-sm text-muted-foreground">ARR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="paying">Pagantes</SelectItem>
                <SelectItem value="free">Gratuitos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizacao</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Carregando...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => {
                  const planInfo = getPlanInfo(org.plan);
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.email || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(planInfo.price_monthly)}
                      </TableCell>
                      <TableCell>
                        {org.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleChangePlan(org)}>
                              <Package className="w-4 h-4 mr-2" />
                              Alterar plano
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleOrgStatus(org)}>
                              {org.is_active !== false ? (
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>
              Selecione o novo plano para esta organizacao
            </DialogDescription>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedOrg.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Plano atual: {getPlanBadge(selectedOrg.plan)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Novo Plano</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.slug}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{plan.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(plan.price_monthly)}/mes
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newPlan && newPlan !== (selectedOrg.plan || 'free') && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    {(() => {
                      const currentPlan = getPlanInfo(selectedOrg.plan);
                      const nextPlan = getPlanInfo(newPlan);
                      const diff = nextPlan.price_monthly - currentPlan.price_monthly;
                      if (diff > 0) {
                        return (
                          <>
                            <ArrowUpCircle className="w-4 h-4 inline mr-1" />
                            Upgrade: +{formatCurrency(diff)}/mes
                          </>
                        );
                      } else if (diff < 0) {
                        return (
                          <>
                            <ArrowDownCircle className="w-4 h-4 inline mr-1" />
                            Downgrade: {formatCurrency(diff)}/mes
                          </>
                        );
                      }
                      return 'Mesmo valor';
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={saving || newPlan === (selectedOrg?.plan || 'free')}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Confirmar Alteracao'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
