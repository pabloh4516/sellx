import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Users,
  Package,
  Calendar,
  Mail,
  Phone,
  MapPin,
  RefreshCcw,
  Download,
  Plus,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  cnpj: '',
  city: '',
  state: '',
  plan: 'free',
  custom_limits: false, // Se true, usa limites customizados ao inves do plano
  max_users: 1,
  max_products: 100,
  max_customers: 100,
  max_sales_per_month: 100,
  max_pdv_terminals: 1,
  max_service_orders: 50,
  max_quotes: 50,
  max_suppliers: 20,
  max_storage_mb: 100,
  max_stores: 1,
  is_active: true,
};

export default function AdminOrganizations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [organizations, searchTerm, planFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar organizacoes
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Carregar planos
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      // Carregar estatisticas de cada organizacao
      const orgsWithStats = await Promise.all(
        (orgsData || []).map(async (org) => {
          // Contagem de usuarios
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Contagem de produtos
          const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Contagem de vendas do mes
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .gte('created_at', startOfMonth.toISOString());

          return {
            ...org,
            users_count: usersCount || 0,
            products_count: productsCount || 0,
            sales_month: salesCount || 0,
          };
        })
      );

      setOrganizations(orgsWithStats);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erro ao carregar organizacoes');
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = [...organizations];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (org) =>
          org.name?.toLowerCase().includes(term) ||
          org.email?.toLowerCase().includes(term) ||
          org.cnpj?.includes(term)
      );
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter((org) => org.plan === planFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((org) =>
        statusFilter === 'active' ? org.is_active : !org.is_active
      );
    }

    setFilteredOrgs(filtered);
  };

  const handleCreateOrg = async () => {
    if (!formData.name) {
      toast.error('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      const plan = plans.find((p) => p.slug === formData.plan);

      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          cnpj: formData.cnpj || null,
          city: formData.city || null,
          state: formData.state || null,
          plan: formData.plan,
          custom_limits: formData.custom_limits || false,
          max_users: formData.custom_limits ? formData.max_users : (plan?.max_users || formData.max_users),
          max_products: formData.custom_limits ? formData.max_products : (plan?.max_products || formData.max_products),
          max_customers: formData.custom_limits ? formData.max_customers : (plan?.max_customers || 100),
          max_sales_per_month: formData.custom_limits ? formData.max_sales_per_month : (plan?.max_sales_per_month || 100),
          max_pdv_terminals: formData.custom_limits ? formData.max_pdv_terminals : (plan?.max_pdv_terminals || 1),
          max_service_orders: formData.custom_limits ? formData.max_service_orders : (plan?.max_service_orders || 50),
          max_quotes: formData.custom_limits ? formData.max_quotes : (plan?.max_quotes || 50),
          max_suppliers: formData.custom_limits ? formData.max_suppliers : (plan?.max_suppliers || 20),
          max_storage_mb: formData.custom_limits ? formData.max_storage_mb : (plan?.max_storage_mb || 100),
          max_stores: formData.custom_limits ? formData.max_stores : (plan?.max_stores || 1),
          is_active: formData.is_active,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Organizacao criada com sucesso!');
      setCreateOpen(false);
      setFormData(initialFormData);
      loadData();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Erro ao criar organizacao');
    } finally {
      setSaving(false);
    }
  };

  const handleEditOrg = async () => {
    if (!formData.name) {
      toast.error('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      const plan = plans.find((p) => p.slug === formData.plan);

      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          cnpj: formData.cnpj || null,
          city: formData.city || null,
          state: formData.state || null,
          plan: formData.plan,
          custom_limits: formData.custom_limits || false,
          max_users: formData.max_users,
          max_products: formData.max_products,
          max_customers: formData.max_customers,
          max_sales_per_month: formData.max_sales_per_month,
          max_pdv_terminals: formData.max_pdv_terminals,
          max_service_orders: formData.max_service_orders,
          max_quotes: formData.max_quotes,
          max_suppliers: formData.max_suppliers,
          max_storage_mb: formData.max_storage_mb,
          max_stores: formData.max_stores,
          is_active: formData.is_active,
        })
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success('Organizacao atualizada!');
      setEditOpen(false);
      setSelectedOrg(null);
      setFormData(initialFormData);
      loadData();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Erro ao atualizar organizacao');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', selectedOrg.id);

      if (error) throw error;

      toast.success('Organizacao excluida!');
      setDeleteOpen(false);
      setSelectedOrg(null);
      loadData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      if (error.message?.includes('foreign key')) {
        toast.error('Nao e possivel excluir: organizacao possui dados vinculados');
      } else {
        toast.error('Erro ao excluir organizacao');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleOrgStatus = async (org) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active })
        .eq('id', org.id);

      if (error) throw error;

      toast.success(
        org.is_active ? 'Organizacao desativada' : 'Organizacao ativada'
      );
      loadData();
    } catch (error) {
      console.error('Error toggling org status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const updateOrgPlan = async (orgId, newPlan) => {
    try {
      const plan = plans.find((p) => p.slug === newPlan);
      const { error } = await supabase
        .from('organizations')
        .update({
          plan: newPlan,
          max_users: plan?.max_users || 1,
          max_products: plan?.max_products || 100,
        })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Plano atualizado com sucesso');
      loadData();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Erro ao atualizar plano');
    }
  };

  const openEditDialog = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      cnpj: org.cnpj || '',
      city: org.city || '',
      state: org.state || '',
      plan: org.plan || 'free',
      custom_limits: org.custom_limits || false,
      max_users: org.max_users ?? 1,
      max_products: org.max_products ?? 100,
      max_customers: org.max_customers ?? 100,
      max_sales_per_month: org.max_sales_per_month ?? 100,
      max_pdv_terminals: org.max_pdv_terminals ?? 1,
      max_service_orders: org.max_service_orders ?? 50,
      max_quotes: org.max_quotes ?? 50,
      max_suppliers: org.max_suppliers ?? 20,
      max_storage_mb: org.max_storage_mb ?? 100,
      max_stores: org.max_stores ?? 1,
      is_active: org.is_active !== false,
    });
    setEditOpen(true);
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      professional: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
      enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    };
    const labels = {
      free: 'Gratuito',
      starter: 'Starter',
      professional: 'Profissional',
      enterprise: 'Enterprise',
    };
    return (
      <Badge className={colors[plan] || colors.free}>
        {labels[plan] || plan}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'CNPJ', 'Plano', 'Usuarios', 'Produtos', 'Status', 'Criado em'];
    const rows = filteredOrgs.map((org) => [
      org.name,
      org.email || '',
      org.cnpj || '',
      org.plan,
      org.users_count,
      org.products_count,
      org.is_active ? 'Ativo' : 'Inativo',
      new Date(org.created_at).toLocaleDateString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizacoes.csv';
    a.click();
  };

  const OrgForm = ({ isEdit = false }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Nome da Empresa *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da empresa"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@empresa.com"
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <Label>CNPJ</Label>
          <Input
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Cidade"
          />
        </div>
        <div>
          <Label>Estado</Label>
          <Input
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="UF"
            maxLength={2}
          />
        </div>
        <div>
          <Label>Plano</Label>
          <Select
            value={formData.plan}
            onValueChange={(value) => {
              const plan = plans.find((p) => p.slug === value);
              setFormData({
                ...formData,
                plan: value,
                max_users: plan?.max_users || 1,
                max_products: plan?.max_products || 100,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.slug} value={plan.slug}>
                  {plan.name} - {formatCurrency(plan.price_monthly)}/mes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isEdit && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Limites Customizados</Label>
              <p className="text-xs text-muted-foreground">Ative para definir limites especificos para esta empresa</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{formData.custom_limits ? 'Ativo' : 'Usar do Plano'}</span>
              <Button
                type="button"
                variant={formData.custom_limits ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormData({ ...formData, custom_limits: !formData.custom_limits })}
              >
                {formData.custom_limits ? 'Customizado' : 'Plano'}
              </Button>
            </div>
          </div>

          {formData.custom_limits && (
            <>
              <div className="flex items-center justify-end gap-2 pb-2 border-b">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData,
                    max_users: -1,
                    max_products: -1,
                    max_customers: -1,
                    max_sales_per_month: -1,
                    max_pdv_terminals: -1,
                    max_service_orders: -1,
                    max_quotes: -1,
                    max_suppliers: -1,
                    max_storage_mb: -1,
                    max_stores: -1,
                  })}
                >
                  Definir Tudo Ilimitado
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Usuarios</Label>
                  <Input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Produtos</Label>
                  <Input
                    type="number"
                    value={formData.max_products}
                    onChange={(e) => setFormData({ ...formData, max_products: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Clientes</Label>
                  <Input
                    type="number"
                    value={formData.max_customers}
                    onChange={(e) => setFormData({ ...formData, max_customers: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Vendas/Mes</Label>
                  <Input
                    type="number"
                    value={formData.max_sales_per_month}
                    onChange={(e) => setFormData({ ...formData, max_sales_per_month: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">PDVs Simultaneos</Label>
                  <Input
                    type="number"
                    value={formData.max_pdv_terminals}
                    onChange={(e) => setFormData({ ...formData, max_pdv_terminals: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ordens Servico/Mes</Label>
                  <Input
                    type="number"
                    value={formData.max_service_orders}
                    onChange={(e) => setFormData({ ...formData, max_service_orders: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Orcamentos/Mes</Label>
                  <Input
                    type="number"
                    value={formData.max_quotes}
                    onChange={(e) => setFormData({ ...formData, max_quotes: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fornecedores</Label>
                  <Input
                    type="number"
                    value={formData.max_suppliers}
                    onChange={(e) => setFormData({ ...formData, max_suppliers: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Storage (MB)</Label>
                  <Input
                    type="number"
                    value={formData.max_storage_mb}
                    onChange={(e) => setFormData({ ...formData, max_storage_mb: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
                <div>
                  <Label className="text-xs">Lojas/Filiais</Label>
                  <Input
                    type="number"
                    value={formData.max_stores}
                    onChange={(e) => setFormData({ ...formData, max_stores: parseInt(e.target.value) || 0 })}
                    min={-1}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Use -1 para ilimitado</p>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizacoes</h1>
          <p className="text-muted-foreground">
            Gerencie todas as organizacoes da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => { setFormData(initialFormData); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Organizacao
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.filter((o) => o.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Package className="w-5 h-5" />
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.reduce((sum, o) => sum + (o.users_count || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizacao</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Carregando...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Building2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      Nenhuma organizacao encontrada
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {org.email || 'Sem email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(org.plan)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {org.users_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        {org.products_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.is_active ? (
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
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrg(org);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(org)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleOrgStatus(org)}>
                            {org.is_active ? (
                              <>
                                <Ban className="w-4 h-4 mr-2" />
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
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedOrg(org);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Organizacao</DialogTitle>
            <DialogDescription>
              Cadastre uma nova empresa na plataforma
            </DialogDescription>
          </DialogHeader>
          <OrgForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrg} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Organizacao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Organizacao</DialogTitle>
            <DialogDescription>
              Altere os dados da organizacao
            </DialogDescription>
          </DialogHeader>
          <OrgForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditOrg} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Organizacao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{selectedOrg?.name}"? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrg} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Organizacao</DialogTitle>
            <DialogDescription>
              Informacoes completas e gerenciamento
            </DialogDescription>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedOrg.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">CNPJ</Label>
                  <p className="font-medium">{selectedOrg.cnpj || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedOrg.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{selectedOrg.phone || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Cidade/UF</Label>
                  <p className="font-medium">
                    {selectedOrg.city
                      ? `${selectedOrg.city}/${selectedOrg.state}`
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Criado em</Label>
                  <p className="font-medium">
                    {new Date(selectedOrg.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Plan Management */}
              <div className="p-4 rounded-lg border border-border space-y-4">
                <h4 className="font-semibold">Gerenciar Plano</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Plano Atual</Label>
                    <Select
                      value={selectedOrg.plan}
                      onValueChange={(value) =>
                        updateOrgPlan(selectedOrg.id, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.slug} value={plan.slug}>
                            {plan.name} - {formatCurrency(plan.price_monthly)}/mes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Usuarios</Label>
                    <p className="text-2xl font-bold">
                      {selectedOrg.max_users === -1
                        ? 'Ilimitado'
                        : selectedOrg.max_users}
                    </p>
                  </div>
                  <div>
                    <Label>Max Produtos</Label>
                    <p className="text-2xl font-bold">
                      {selectedOrg.max_products === -1
                        ? 'Ilimitado'
                        : selectedOrg.max_products}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{selectedOrg.users_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{selectedOrg.products_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Produtos</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{selectedOrg.sales_month || 0}</p>
                  <p className="text-sm text-muted-foreground">Vendas/mes</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => openEditDialog(selectedOrg)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
