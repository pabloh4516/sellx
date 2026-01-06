import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Search, Edit, Trash2, UserCircle, Phone, Mail, MoreVertical, Users, Percent, Shield,
  Target, DollarSign, Clock, History, TrendingUp, Ban, Check, X, Calendar, Award, Lock
} from 'lucide-react';
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
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';
import { USER_ROLES, ROLE_LABELS } from '@/config/permissions';

const ACCESS_LEVELS = [
  { value: USER_ROLES.SELLER, label: 'Vendedor' },
  { value: USER_ROLES.CASHIER, label: 'Operador de Caixa' },
  { value: USER_ROLES.STOCKIST, label: 'Estoquista' },
  { value: USER_ROLES.MANAGER, label: 'Gerente' },
  { value: USER_ROLES.ADMIN, label: 'Administrador' },
  { value: USER_ROLES.OWNER, label: 'Proprietario' }
];

// Permissoes padrao por cargo
const DEFAULT_PERMISSIONS = {
  [USER_ROLES.OWNER]: {
    max_discount: 100,
    can_cancel_own_sale: true,
    can_cancel_any_sale: true,
    can_withdraw: true,
    can_supply: true,
    can_view_others_reports: true,
    can_change_price: true,
    can_give_discount: true,
  },
  [USER_ROLES.ADMIN]: {
    max_discount: 100,
    can_cancel_own_sale: true,
    can_cancel_any_sale: true,
    can_withdraw: true,
    can_supply: true,
    can_view_others_reports: true,
    can_change_price: true,
    can_give_discount: true,
  },
  [USER_ROLES.MANAGER]: {
    max_discount: 50,
    can_cancel_own_sale: true,
    can_cancel_any_sale: true,
    can_withdraw: true,
    can_supply: true,
    can_view_others_reports: true,
    can_change_price: true,
    can_give_discount: true,
  },
  [USER_ROLES.SELLER]: {
    max_discount: 10,
    can_cancel_own_sale: true,
    can_cancel_any_sale: false,
    can_withdraw: false,
    can_supply: false,
    can_view_others_reports: false,
    can_change_price: false,
    can_give_discount: true,
  },
  [USER_ROLES.CASHIER]: {
    max_discount: 5,
    can_cancel_own_sale: true,
    can_cancel_any_sale: false,
    can_withdraw: true,
    can_supply: true,
    can_view_others_reports: false,
    can_change_price: false,
    can_give_discount: false,
  },
  [USER_ROLES.STOCKIST]: {
    max_discount: 0,
    can_cancel_own_sale: false,
    can_cancel_any_sale: false,
    can_withdraw: false,
    can_supply: false,
    can_view_others_reports: false,
    can_change_price: false,
    can_give_discount: false,
  },
};

const initialFormData = {
  // Dados basicos
  name: '',
  email: '',
  phone: '',
  cpf: '',
  access_level: USER_ROLES.SELLER,
  is_active: true,
  // Metas e comissao
  commission_percent: 0,
  daily_goal: 0,
  weekly_goal: 0,
  monthly_goal: 0,
  goal_bonus_percent: 0,
  // Permissoes
  max_discount: 10,
  can_cancel_own_sale: true,
  can_cancel_any_sale: false,
  can_withdraw: false,
  can_supply: false,
  can_view_others_reports: false,
  can_change_price: false,
  can_give_discount: true,
  // Horario
  work_start: '',
  work_end: '',
  restrict_by_schedule: false,
};

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState('dados');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const [profilesData, sellersData] = await Promise.all([
        base44.entities.Profile.list('-created_at'),
        base44.entities.Seller.list('-created_date').catch(() => [])
      ]);

      const mergedData = profilesData.map(profile => {
        const linkedSeller = sellersData.find(s =>
          s.email === profile.email || s.user_id === profile.id
        );
        return {
          id: profile.id,
          name: profile.full_name || profile.email,
          email: profile.email,
          phone: profile.phone || linkedSeller?.phone || '',
          cpf: linkedSeller?.cpf || '',
          access_level: profile.role || USER_ROLES.SELLER,
          is_active: profile.is_active !== false,
          seller_id: linkedSeller?.id,
          // Metas e comissao
          commission_percent: linkedSeller?.commission_percent || profile.commission_percent || 0,
          daily_goal: linkedSeller?.daily_goal || profile.daily_goal || 0,
          weekly_goal: linkedSeller?.weekly_goal || profile.weekly_goal || 0,
          monthly_goal: linkedSeller?.monthly_goal || profile.monthly_goal || 0,
          goal_bonus_percent: linkedSeller?.goal_bonus_percent || profile.goal_bonus_percent || 0,
          // Permissoes
          max_discount: profile.max_discount ?? DEFAULT_PERMISSIONS[profile.role]?.max_discount ?? 10,
          can_cancel_own_sale: profile.can_cancel_own_sale ?? DEFAULT_PERMISSIONS[profile.role]?.can_cancel_own_sale ?? true,
          can_cancel_any_sale: profile.can_cancel_any_sale ?? DEFAULT_PERMISSIONS[profile.role]?.can_cancel_any_sale ?? false,
          can_withdraw: profile.can_withdraw ?? DEFAULT_PERMISSIONS[profile.role]?.can_withdraw ?? false,
          can_supply: profile.can_supply ?? DEFAULT_PERMISSIONS[profile.role]?.can_supply ?? false,
          can_view_others_reports: profile.can_view_others_reports ?? DEFAULT_PERMISSIONS[profile.role]?.can_view_others_reports ?? false,
          can_change_price: profile.can_change_price ?? DEFAULT_PERMISSIONS[profile.role]?.can_change_price ?? false,
          can_give_discount: profile.can_give_discount ?? DEFAULT_PERMISSIONS[profile.role]?.can_give_discount ?? true,
          // Horario
          work_start: profile.work_start || '',
          work_end: profile.work_end || '',
          restrict_by_schedule: profile.restrict_by_schedule || false,
          // Historico
          last_login: profile.last_login || profile.updated_at,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
      });

      setSellers(mergedData);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Erro ao carregar funcionarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!formData.name) {
      toast.error('Nome e obrigatorio');
      setActiveTab('dados');
      return;
    }

    setSaving(true);
    try {
      if (editingSeller) {
        // Atualizar profile com todos os dados
        await base44.entities.Profile.update(editingSeller.id, {
          full_name: formData.name,
          phone: formData.phone,
          role: formData.access_level,
          is_active: formData.is_active,
          // Metas
          daily_goal: formData.daily_goal,
          weekly_goal: formData.weekly_goal,
          monthly_goal: formData.monthly_goal,
          goal_bonus_percent: formData.goal_bonus_percent,
          commission_percent: formData.commission_percent,
          // Permissoes
          max_discount: formData.max_discount,
          can_cancel_own_sale: formData.can_cancel_own_sale,
          can_cancel_any_sale: formData.can_cancel_any_sale,
          can_withdraw: formData.can_withdraw,
          can_supply: formData.can_supply,
          can_view_others_reports: formData.can_view_others_reports,
          can_change_price: formData.can_change_price,
          can_give_discount: formData.can_give_discount,
          // Horario
          work_start: formData.work_start || null,
          work_end: formData.work_end || null,
          restrict_by_schedule: formData.restrict_by_schedule,
        });

        // Atualizar ou criar seller para comissao
        if (editingSeller.seller_id) {
          await base44.entities.Seller.update(editingSeller.seller_id, {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            cpf: formData.cpf,
            commission_percent: formData.commission_percent,
            daily_goal: formData.daily_goal,
            weekly_goal: formData.weekly_goal,
            monthly_goal: formData.monthly_goal,
            goal_bonus_percent: formData.goal_bonus_percent,
          });
        } else if (formData.commission_percent > 0 || formData.daily_goal > 0) {
          await base44.entities.Seller.create({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            cpf: formData.cpf,
            commission_percent: formData.commission_percent,
            user_id: editingSeller.id,
            is_active: formData.is_active,
            daily_goal: formData.daily_goal,
            weekly_goal: formData.weekly_goal,
            monthly_goal: formData.monthly_goal,
            goal_bonus_percent: formData.goal_bonus_percent,
          });
        }

        toast.success('Funcionario atualizado com sucesso!');
      } else {
        toast.error('Use Configuracoes > Usuarios para convidar novos funcionarios');
        return;
      }
      setShowForm(false);
      resetForm();
      loadSellers();
    } catch (error) {
      console.error('Error saving seller:', error);
      toast.error('Erro ao salvar funcionario');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (seller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name || '',
      email: seller.email || '',
      phone: seller.phone || '',
      cpf: seller.cpf || '',
      access_level: seller.access_level || USER_ROLES.SELLER,
      is_active: seller.is_active !== false,
      // Metas
      commission_percent: seller.commission_percent || 0,
      daily_goal: seller.daily_goal || 0,
      weekly_goal: seller.weekly_goal || 0,
      monthly_goal: seller.monthly_goal || 0,
      goal_bonus_percent: seller.goal_bonus_percent || 0,
      // Permissoes
      max_discount: seller.max_discount ?? 10,
      can_cancel_own_sale: seller.can_cancel_own_sale ?? true,
      can_cancel_any_sale: seller.can_cancel_any_sale ?? false,
      can_withdraw: seller.can_withdraw ?? false,
      can_supply: seller.can_supply ?? false,
      can_view_others_reports: seller.can_view_others_reports ?? false,
      can_change_price: seller.can_change_price ?? false,
      can_give_discount: seller.can_give_discount ?? true,
      // Horario
      work_start: seller.work_start || '',
      work_end: seller.work_end || '',
      restrict_by_schedule: seller.restrict_by_schedule || false,
    });
    setActiveTab('dados');
    setShowForm(true);
  };

  const handleDelete = async (seller) => {
    if (!confirm(`Desativar "${seller.name}"? O usuario nao podera mais acessar o sistema.`)) return;

    try {
      await base44.entities.Profile.update(seller.id, { is_active: false });
      toast.success('Funcionario desativado');
      loadSellers();
    } catch (error) {
      console.error('Error deactivating seller:', error);
      toast.error('Erro ao desativar funcionario');
    }
  };

  const handleActivate = async (seller) => {
    try {
      await base44.entities.Profile.update(seller.id, { is_active: true });
      toast.success('Funcionario reativado');
      loadSellers();
    } catch (error) {
      console.error('Error activating seller:', error);
      toast.error('Erro ao reativar funcionario');
    }
  };

  const resetForm = () => {
    setEditingSeller(null);
    setFormData(initialFormData);
    setActiveTab('dados');
  };

  const applyDefaultPermissions = (role) => {
    const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS[USER_ROLES.SELLER];
    setFormData(prev => ({
      ...prev,
      access_level: role,
      ...defaults
    }));
  };

  const filteredSellers = sellers.filter(seller =>
    seller.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.cpf?.includes(searchTerm)
  );

  const getAccessLevelLabel = (level) => {
    return ROLE_LABELS[level] || ACCESS_LEVELS.find(l => l.value === level)?.label || level || 'Usuario';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const activeSellers = sellers.filter(s => s.is_active !== false).length;
  const avgCommission = sellers.length > 0
    ? (sellers.reduce((sum, s) => sum + (s.commission_percent || 0), 0) / sellers.length).toFixed(1)
    : 0;
  const totalDailyGoal = sellers.filter(s => s.is_active).reduce((sum, s) => sum + (s.daily_goal || 0), 0);

  const columns = [
    {
      key: 'name',
      label: 'Funcionario',
      render: (_, seller) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${seller.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
            <UserCircle className={`w-5 h-5 ${seller.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <span className={`font-medium ${!seller.is_active && 'text-muted-foreground'}`}>{seller.name}</span>
            {seller.daily_goal > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Meta: {formatCurrency(seller.daily_goal)}/dia
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contato',
      render: (_, seller) => (
        <div className="text-sm space-y-0.5">
          {seller.email && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3 h-3" />{seller.email}
            </p>
          )}
          {seller.phone && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3 h-3" />{seller.phone}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'commission',
      label: 'Comissao',
      align: 'center',
      width: '100px',
      render: (_, seller) => (
        <div className="text-center">
          <span className="font-medium">{seller.commission_percent || 0}%</span>
          {seller.max_discount > 0 && (
            <p className="text-xs text-muted-foreground">Desc. max: {seller.max_discount}%</p>
          )}
        </div>
      )
    },
    {
      key: 'access_level',
      label: 'Cargo',
      align: 'center',
      width: '130px',
      render: (_, seller) => (
        <StatusBadge
          status={[USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(seller.access_level) ? 'info' : 'default'}
          label={getAccessLevelLabel(seller.access_level)}
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '100px',
      render: (_, seller) => (
        <StatusBadge
          status={seller.is_active !== false ? 'success' : 'danger'}
          label={seller.is_active !== false ? 'Ativo' : 'Inativo'}
        />
      )
    },
    {
      key: 'actions',
      label: 'Acoes',
      align: 'center',
      width: '60px',
      render: (_, seller) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(seller)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {seller.is_active !== false ? (
              <DropdownMenuItem onClick={() => handleDelete(seller)} className="text-destructive">
                <Ban className="w-4 h-4 mr-2" />
                Desativar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleActivate(seller)} className="text-success">
                <Check className="w-4 h-4 mr-2" />
                Reativar
              </DropdownMenuItem>
            )}
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
        title="Funcionarios"
        subtitle={`${sellers.length} funcionarios cadastrados`}
        icon={Users}
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Funcionarios"
          value={sellers.length}
          icon={Users}
        />
        <MiniMetric
          label="Ativos"
          value={activeSellers}
          icon={UserCircle}
          status="success"
        />
        <MiniMetric
          label="Comissao Media"
          value={`${avgCommission}%`}
          icon={Percent}
        />
        <MiniMetric
          label="Meta Diaria Total"
          value={formatCurrency(totalDailyGoal)}
          icon={Target}
          status="info"
        />
      </Grid>

      {/* Busca */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredSellers}
          columns={columns}
          emptyMessage="Nenhum funcionario encontrado"
        />
      </CardSection>

      {/* Form Dialog com Abas */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              {editingSeller ? `Editar: ${editingSeller.name}` : 'Novo Funcionario'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="dados" className="flex items-center gap-1">
                <UserCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Dados</span>
              </TabsTrigger>
              <TabsTrigger value="metas" className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Metas</span>
              </TabsTrigger>
              <TabsTrigger value="permissoes" className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Permissoes</span>
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-1">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Historico</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2">
              {/* Aba Dados */}
              <TabsContent value="dados" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do funcionario"
                    />
                  </div>

                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
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

                  <div className="col-span-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email nao pode ser alterado</p>
                  </div>

                  <div>
                    <Label>Cargo / Nivel de Acesso</Label>
                    <Select
                      value={formData.access_level}
                      onValueChange={(v) => applyDefaultPermissions(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESS_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Ao mudar, permissoes serao redefinidas</p>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <Label className="text-base">Status</Label>
                      <p className="text-sm text-muted-foreground">Usuario pode acessar o sistema</p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Metas */}
              <TabsContent value="metas" className="mt-0 space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Comissao e Bonificacao</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Comissao Base (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.commission_percent || ''}
                        onChange={(e) => setFormData({ ...formData, commission_percent: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Percentual sobre cada venda</p>
                    </div>
                    <div>
                      <Label>Bonus por Meta (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.goal_bonus_percent || ''}
                        onChange={(e) => setFormData({ ...formData, goal_bonus_percent: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Adicional ao atingir meta</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Metas de Vendas</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Meta Diaria (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.daily_goal || ''}
                        onChange={(e) => setFormData({ ...formData, daily_goal: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Meta Semanal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weekly_goal || ''}
                        onChange={(e) => setFormData({ ...formData, weekly_goal: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Meta Mensal (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.monthly_goal || ''}
                        onChange={(e) => setFormData({ ...formData, monthly_goal: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Metas aparecerao no dashboard do funcionario para acompanhamento
                  </p>
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Horario de Trabalho</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <Label>Entrada</Label>
                      <Input
                        type="time"
                        value={formData.work_start || ''}
                        onChange={(e) => setFormData({ ...formData, work_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Saida</Label>
                      <Input
                        type="time"
                        value={formData.work_end || ''}
                        onChange={(e) => setFormData({ ...formData, work_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div>
                      <Label className="text-sm">Bloquear fora do horario</Label>
                      <p className="text-xs text-muted-foreground">Impede acesso ao sistema fora do expediente</p>
                    </div>
                    <Switch
                      checked={formData.restrict_by_schedule}
                      onCheckedChange={(v) => setFormData({ ...formData, restrict_by_schedule: v })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Permissoes */}
              <TabsContent value="permissoes" className="mt-0 space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Percent className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">Desconto Maximo Permitido</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-lg font-medium">%</span>
                    <p className="text-sm text-muted-foreground flex-1">
                      Limite de desconto que este funcionario pode aplicar em vendas
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Permissoes do PDV
                  </h4>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode dar desconto</Label>
                        <p className="text-xs text-muted-foreground">Aplicar descontos em vendas (ate o limite)</p>
                      </div>
                      <Switch
                        checked={formData.can_give_discount}
                        onCheckedChange={(v) => setFormData({ ...formData, can_give_discount: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode alterar preco na venda</Label>
                        <p className="text-xs text-muted-foreground">Modificar preco de produtos durante a venda</p>
                      </div>
                      <Switch
                        checked={formData.can_change_price}
                        onCheckedChange={(v) => setFormData({ ...formData, can_change_price: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode cancelar venda propria</Label>
                        <p className="text-xs text-muted-foreground">Cancelar vendas realizadas por ele mesmo</p>
                      </div>
                      <Switch
                        checked={formData.can_cancel_own_sale}
                        onCheckedChange={(v) => setFormData({ ...formData, can_cancel_own_sale: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode cancelar qualquer venda</Label>
                        <p className="text-xs text-muted-foreground">Cancelar vendas de outros funcionarios</p>
                      </div>
                      <Switch
                        checked={formData.can_cancel_any_sale}
                        onCheckedChange={(v) => setFormData({ ...formData, can_cancel_any_sale: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Permissoes do Caixa
                  </h4>

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode fazer sangria</Label>
                        <p className="text-xs text-muted-foreground">Retirar dinheiro do caixa</p>
                      </div>
                      <Switch
                        checked={formData.can_withdraw}
                        onCheckedChange={(v) => setFormData({ ...formData, can_withdraw: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <Label>Pode fazer suprimento</Label>
                        <p className="text-xs text-muted-foreground">Adicionar dinheiro ao caixa</p>
                      </div>
                      <Switch
                        checked={formData.can_supply}
                        onCheckedChange={(v) => setFormData({ ...formData, can_supply: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Permissoes de Relatorios
                  </h4>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <Label>Ver relatorios de outros</Label>
                      <p className="text-xs text-muted-foreground">Visualizar vendas e desempenho de outros funcionarios</p>
                    </div>
                    <Switch
                      checked={formData.can_view_others_reports}
                      onCheckedChange={(v) => setFormData({ ...formData, can_view_others_reports: v })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Historico */}
              <TabsContent value="historico" className="mt-0 space-y-4">
                {editingSeller ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 border border-border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-muted-foreground">Cadastrado em</Label>
                        </div>
                        <p className="font-medium">{formatDate(editingSeller.created_at)}</p>
                      </div>

                      <div className="p-4 bg-muted/50 border border-border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <Label className="text-muted-foreground">Ultimo acesso</Label>
                        </div>
                        <p className="font-medium">{formatDate(editingSeller.last_login)}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-muted-foreground">Ultima atualizacao</Label>
                      </div>
                      <p className="font-medium">{formatDate(editingSeller.updated_at)}</p>
                    </div>

                    <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Informacoes do Sistema
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID do Usuario:</span>
                          <span className="font-mono">{editingSeller.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID do Vendedor:</span>
                          <span className="font-mono">{editingSeller.seller_id || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <StatusBadge
                            status={editingSeller.is_active ? 'success' : 'danger'}
                            label={editingSeller.is_active ? 'Ativo' : 'Inativo'}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Historico disponivel apenas ao editar um funcionario</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
