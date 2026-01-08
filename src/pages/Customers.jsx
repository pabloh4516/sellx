import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CPFCNPJInput, PhoneInput, CEPInput } from '@/components/ui/masked-input';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import {
  Plus, Search, Edit, Trash2, User, Phone, Mail,
  History, MoreVertical, Users, Star, Crown, Percent,
  AlertTriangle, Clock, TrendingUp, ShoppingBag, Ban
} from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { ExportMenu } from '@/components/ui/export-menu';
import { useSafeLoading } from '@/components/ui/safe-loading';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LimitAlert from '@/components/billing/LimitAlert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  DataTable,
  StatusBadge,
  Currency,
  TableAvatar,
  CardSection,
} from '@/components/nexo';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading, isTimeout] = useSafeLoading(true, 20000); // 20s timeout
  const { checkLimitAndNotify, getUsageSummary, refreshUsage } = usePlanLimits();
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cpf_cnpj: '',
    rg: '',
    photo_url: '',
    birth_date: '',
    gender: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    credit_limit: 0,
    is_blocked: false,
    is_vip: false,
    vip_discount_percent: 0,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersData, salesData, installmentsData] = await Promise.all([
        base44.entities.Customer.list('-created_at'),
        base44.entities.Sale.list('-sale_date', { limit: 500 }),
        base44.entities.Installment.filter({ status: 'pendente' }, { limit: 200 })
      ]);
      setCustomers(customersData);
      setSales(salesData);
      setInstallments(installmentsData);
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
      showErrorToast({ code: 'REQUIRED_FIELD' });
      return;
    }

    setSaving(true);
    try {
      // Limpar dados - converter strings vazias em null
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === '' || cleanData[key] === undefined) {
          cleanData[key] = null;
        }
      });
      // Garantir numeros
      ['credit_limit', 'used_credit', 'vip_discount'].forEach(field => {
        cleanData[field] = parseFloat(cleanData[field]) || 0;
      });

      if (editingCustomer) {
        await base44.entities.Customer.update(editingCustomer.id, cleanData);
        showSuccessToast(
          'Cliente atualizado!',
          `Os dados de "${formData.name}" foram salvos com sucesso.`
        );
      } else {
        await base44.entities.Customer.create(cleanData);
        showSuccessToast(
          'Cliente cadastrado!',
          `"${formData.name}" foi adicionado a sua base de clientes.`
        );
        refreshUsage(); // Atualizar contagem de uso do plano
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving customer:', error);
      showErrorToast(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      cpf_cnpj: customer.cpf_cnpj || '',
      rg: customer.rg || '',
      photo_url: customer.photo_url || '',
      birth_date: customer.birth_date || '',
      gender: customer.gender || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      credit_limit: customer.credit_limit || 0,
      is_blocked: customer.is_blocked || false,
      is_vip: customer.is_vip || false,
      vip_discount_percent: customer.vip_discount_percent || 0,
      notes: customer.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (customer) => {
    if (!confirm(`Excluir "${customer.name}"?`)) return;

    try {
      await base44.entities.Customer.delete(customer.id);
      showSuccessToast(
        'Cliente excluido!',
        `"${customer.name}" foi removido da sua base de clientes.`
      );
      loadData();
      refreshUsage(); // Atualizar contagem de uso do plano
    } catch (error) {
      console.error('Error deleting customer:', error);
      showErrorToast(error);
    }
  };

  const handleViewHistory = (customer) => {
    setSelectedCustomer(customer);
    setShowHistory(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, photo_url: result.file_url });
      showSuccessToast('Foto enviada!', 'A imagem foi carregada com sucesso.');
    } catch (error) {
      console.error('Error uploading image:', error);
      showErrorToast(error);
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      cpf_cnpj: '',
      rg: '',
      photo_url: '',
      birth_date: '',
      gender: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      credit_limit: 0,
      is_blocked: false,
      notes: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getCustomerSales = (customerId) => {
    return sales.filter(s => s.customer_id === customerId);
  };

  const getCustomerInstallments = (customerId) => {
    return installments.filter(i => i.customer_id === customerId);
  };

  const getPendingInstallments = (customerId) => {
    return getCustomerInstallments(customerId).filter(i => i.status === 'pendente' || i.status === 'atrasado');
  };

  const getOverdueInstallments = (customerId) => {
    return getCustomerInstallments(customerId).filter(i => i.status === 'atrasado');
  };

  // Calcula metricas de cada cliente
  const customerMetrics = useMemo(() => {
    const metrics = {};
    const today = new Date();
    const inactiveDays = 90; // Cliente inativo apos 90 dias sem compra

    customers.forEach(customer => {
      const customerSales = getCustomerSales(customer.id);
      const pendingInst = getPendingInstallments(customer.id);
      const overdueInst = getOverdueInstallments(customer.id);

      // Ultima compra
      const lastSale = customerSales.length > 0
        ? customerSales.sort((a, b) => new Date(b.sale_date || b.created_date) - new Date(a.sale_date || a.created_date))[0]
        : null;

      const lastPurchaseDate = lastSale ? new Date(lastSale.sale_date || lastSale.created_date) : null;
      const daysSinceLastPurchase = lastPurchaseDate ? differenceInDays(today, lastPurchaseDate) : null;

      // Total gasto
      const totalSpent = customerSales.reduce((sum, s) => sum + (s.total || 0), 0);

      // Total em atraso
      const totalOverdue = overdueInst.reduce((sum, i) => sum + (i.amount || 0), 0);

      metrics[customer.id] = {
        totalPurchases: customerSales.length,
        totalSpent,
        lastPurchaseDate,
        daysSinceLastPurchase,
        pendingCount: pendingInst.length,
        overdueCount: overdueInst.length,
        totalOverdue,
        isInactive: daysSinceLastPurchase === null || daysSinceLastPurchase > inactiveDays,
        isOverdue: overdueInst.length > 0
      };
    });

    return metrics;
  }, [customers, sales, installments]);

  // Contagem por segmento
  const segmentCounts = useMemo(() => {
    let vip = 0, overdue = 0, inactive = 0, blocked = 0, active = 0;

    customers.forEach(c => {
      const m = customerMetrics[c.id] || {};
      if (c.is_blocked) blocked++;
      else if (c.is_vip) vip++;
      else if (m.isOverdue) overdue++;
      else if (m.isInactive) inactive++;
      else active++;
    });

    return { all: customers.length, vip, overdue, inactive, blocked, active };
  }, [customers, customerMetrics]);

  // Filtro por segmento
  const getSegmentedCustomers = useCallback((customerList) => {
    if (segmentFilter === 'all') return customerList;

    return customerList.filter(customer => {
      const m = customerMetrics[customer.id] || {};

      switch (segmentFilter) {
        case 'vip':
          return customer.is_vip && !customer.is_blocked;
        case 'overdue':
          return m.isOverdue && !customer.is_blocked;
        case 'inactive':
          return m.isInactive && !customer.is_vip && !m.isOverdue && !customer.is_blocked;
        case 'blocked':
          return customer.is_blocked;
        case 'active':
          return !customer.is_blocked && !customer.is_vip && !m.isOverdue && !m.isInactive;
        default:
          return true;
      }
    });
  }, [segmentFilter, customerMetrics]);

  const filteredCustomers = getSegmentedCustomers(customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.cpf_cnpj?.includes(searchTerm) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const columns = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (_, item) => {
        const m = customerMetrics[item.id] || {};
        return (
          <div className="flex items-center gap-2">
            <TableAvatar
              name={item.name}
              subtitle={item.city ? `${item.city}/${item.state}` : item.cpf_cnpj || 'Sem endereco'}
              image={item.photo_url}
            />
            <div className="flex flex-wrap gap-1">
              {item.is_vip && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  VIP
                  {item.vip_discount_percent > 0 && ` ${item.vip_discount_percent}%`}
                </div>
              )}
              {item.is_blocked && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                  <Ban className="w-3 h-3" />
                  Bloqueado
                </div>
              )}
              {m.isOverdue && !item.is_blocked && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Inadimplente
                </div>
              )}
              {m.isInactive && !item.is_vip && !m.isOverdue && !item.is_blocked && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  Inativo
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (_, item) => (
        <div className="text-sm space-y-0.5">
          {item.phone && (
            <p className="flex items-center gap-1.5 text-foreground">
              <Phone className="w-3 h-3 text-muted-foreground" />
              {item.phone}
            </p>
          )}
          {item.email && (
            <p className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[180px]">
              <Mail className="w-3 h-3" />
              {item.email}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'purchases',
      header: 'Compras',
      align: 'right',
      render: (_, item) => {
        const m = customerMetrics[item.id] || {};
        return (
          <div className="text-right">
            <div className="font-medium">
              <Currency value={m.totalSpent || 0} />
            </div>
            <div className="text-xs text-muted-foreground">
              {m.totalPurchases || 0} {m.totalPurchases === 1 ? 'compra' : 'compras'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'last_purchase',
      header: 'Ultima Compra',
      render: (_, item) => {
        const m = customerMetrics[item.id] || {};
        if (!m.lastPurchaseDate) {
          return <span className="text-muted-foreground text-sm">Nunca comprou</span>;
        }
        return (
          <div className="text-sm">
            <div>{safeFormatDate(m.lastPurchaseDate, 'dd/MM/yyyy')}</div>
            <div className={`text-xs ${m.daysSinceLastPurchase > 90 ? 'text-destructive' : m.daysSinceLastPurchase > 30 ? 'text-warning' : 'text-muted-foreground'}`}>
              {m.daysSinceLastPurchase === 0 ? 'Hoje' : m.daysSinceLastPurchase === 1 ? 'Ontem' : `${m.daysSinceLastPurchase} dias atras`}
            </div>
          </div>
        );
      }
    },
    {
      key: 'credit',
      header: 'Credito',
      align: 'right',
      render: (_, item) => {
        const m = customerMetrics[item.id] || {};
        const available = (item.credit_limit || 0) - (item.used_credit || 0);
        return (
          <div className="text-right">
            <div className="font-medium">
              <Currency value={available} />
            </div>
            {m.totalOverdue > 0 && (
              <div className="text-xs text-destructive font-medium">
                {formatCurrency(m.totalOverdue)} em atraso
              </div>
            )}
            {m.totalOverdue === 0 && item.credit_limit > 0 && (
              <div className="text-xs text-muted-foreground">
                de {formatCurrency(item.credit_limit)}
              </div>
            )}
          </div>
        );
      }
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
            <DropdownMenuItem onClick={() => handleViewHistory(item)}>
              <History className="w-4 h-4 mr-2" />
              Historico
            </DropdownMenuItem>
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
        title="Clientes"
        subtitle={`${customers.length} clientes cadastrados`}
        icon={Users}
        actions={
          <div className="flex gap-2">
            <ExportMenu
              data={filteredCustomers.map(customer => ({
                nome: customer.name,
                cpf_cnpj: customer.cpf_cnpj || '',
                email: customer.email || '',
                telefone: customer.phone || '',
                endereco: customer.address || '',
                cidade: customer.city || '',
                estado: customer.state || '',
                cep: customer.zip_code || '',
                limite_credito: customer.credit_limit || 0,
                vip: customer.is_vip ? 'Sim' : 'Nao',
                desconto_vip: customer.vip_discount_percent || 0,
                aniversario: customer.birth_date || '',
              }))}
              filename={`clientes-${format(new Date(), 'yyyy-MM-dd')}`}
              columns={[
                { key: 'nome', label: 'Nome' },
                { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
                { key: 'email', label: 'Email' },
                { key: 'telefone', label: 'Telefone' },
                { key: 'endereco', label: 'Endereco' },
                { key: 'cidade', label: 'Cidade' },
                { key: 'estado', label: 'Estado' },
                { key: 'cep', label: 'CEP' },
                { key: 'limite_credito', label: 'Limite Credito' },
                { key: 'vip', label: 'VIP' },
                { key: 'desconto_vip', label: 'Desconto VIP %' },
                { key: 'aniversario', label: 'Aniversario' },
              ]}
            />
            <Button onClick={() => {
              if (!checkLimitAndNotify('customers')) return;
              resetForm();
              setShowForm(true);
            }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        }
      />

      {/* Alerta de limite */}
      {(() => {
        const summary = getUsageSummary('customers');
        return (
          <LimitAlert
            limitKey="customers"
            label={summary.label}
            current={customers.length}
            limit={summary.limit}
          />
        );
      })()}

      {/* Segment Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSegmentFilter('all')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'all' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-2xl font-bold">{segmentCounts.all}</span>
          </div>
          <p className="text-xs text-muted-foreground">Todos</p>
        </button>

        <button
          onClick={() => setSegmentFilter('vip')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'vip' ? 'border-warning bg-warning/5 ring-1 ring-warning' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-warning" />
            <span className="text-2xl font-bold text-warning">{segmentCounts.vip}</span>
          </div>
          <p className="text-xs text-muted-foreground">VIP</p>
        </button>

        <button
          onClick={() => setSegmentFilter('active')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'active' ? 'border-success bg-success/5 ring-1 ring-success' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-2xl font-bold text-success">{segmentCounts.active}</span>
          </div>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </button>

        <button
          onClick={() => setSegmentFilter('overdue')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'overdue' ? 'border-destructive bg-destructive/5 ring-1 ring-destructive' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-2xl font-bold text-destructive">{segmentCounts.overdue}</span>
          </div>
          <p className="text-xs text-muted-foreground">Inadimplentes</p>
        </button>

        <button
          onClick={() => setSegmentFilter('inactive')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'inactive' ? 'border-muted-foreground bg-muted/50 ring-1 ring-muted-foreground' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold">{segmentCounts.inactive}</span>
          </div>
          <p className="text-xs text-muted-foreground">Inativos (+90d)</p>
        </button>

        <button
          onClick={() => setSegmentFilter('blocked')}
          className={`p-3 rounded-xl border transition-all text-left ${
            segmentFilter === 'blocked' ? 'border-destructive bg-destructive/5 ring-1 ring-destructive' : 'border-border bg-card hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Ban className="w-4 h-4 text-destructive" />
            <span className="text-2xl font-bold">{segmentCounts.blocked}</span>
          </div>
          <p className="text-xs text-muted-foreground">Bloqueados</p>
        </button>
      </div>

      {/* Search */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Customers Table */}
      <CardSection noPadding>
        <DataTable
          data={filteredCustomers}
          columns={columns}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyContext={searchTerm ? 'search' : 'customers'}
          emptyMessage={searchTerm ? 'Nenhum cliente encontrado' : undefined}
          emptyDescription={searchTerm ? `Nenhum resultado para "${searchTerm}"` : undefined}
          emptyActionLabel={searchTerm ? 'Limpar busca' : 'Cadastrar Cliente'}
          onEmptyAction={() => {
            if (searchTerm) {
              setSearchTerm('');
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
        />
      </CardSection>

      {/* Customer Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="address">Endereco</TabsTrigger>
                <TabsTrigger value="credit">Credito</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-full flex items-center justify-center relative overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
                    {formData.photo_url ? (
                      <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CPF/CNPJ</Label>
                        <CPFCNPJInput
                          value={formData.cpf_cnpj}
                          onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>RG</Label>
                        <Input
                          value={formData.rg}
                          onChange={(e) => setFormData({...formData, rg: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <PhoneInput
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <div>
                  <Label>Endereco</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua, numero, complemento"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label>CEP</Label>
                  <CEPInput
                    value={formData.zip_code}
                    onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                  />
                </div>
              </TabsContent>

              <TabsContent value="credit" className="space-y-4 mt-4">
                <div>
                  <Label>Limite de Credito</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.credit_limit || ''}
                    onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  />
                </div>

                {/* VIP Section */}
                <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-warning" />
                    <div className="flex-1">
                      <p className="font-medium">Cliente VIP</p>
                      <p className="text-xs text-muted-foreground">
                        Clientes VIP recebem desconto automatico nas compras
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_vip}
                      onCheckedChange={(v) => setFormData({...formData, is_vip: v})}
                    />
                  </div>

                  {formData.is_vip && (
                    <div>
                      <Label className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        Desconto VIP (%)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.vip_discount_percent || ''}
                        onChange={(e) => setFormData({...formData, vip_discount_percent: parseFloat(e.target.value) || 0})}
                        placeholder="Ex: 5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Este desconto sera aplicado automaticamente no PDV
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_blocked}
                    onCheckedChange={(v) => setFormData({...formData, is_blocked: v})}
                  />
                  <Label className="cursor-pointer">Bloquear cliente</Label>
                </div>

                <div>
                  <Label>Observacoes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving} loadingText="Salvando...">
                {editingCustomer ? 'Salvar Alteracoes' : 'Cadastrar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historico - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="sales">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="sales">Compras</TabsTrigger>
                <TabsTrigger value="installments">Parcelas</TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="mt-4">
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Data</TableHead>
                        <TableHead>N Venda</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerSales(selectedCustomer.id).map(sale => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-sm">
                            {safeFormatDate(sale.sale_date || sale.created_date, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">#{sale.sale_number}</TableCell>
                          <TableCell className="text-right">
                            <Currency value={sale.total} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={sale.status === 'concluida' ? 'success' : 'default'}
                              label={sale.status}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {getCustomerSales(selectedCustomer.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhuma compra encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="installments" className="mt-4">
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCustomerInstallments(selectedCustomer.id).map(installment => (
                        <TableRow key={installment.id}>
                          <TableCell className="text-sm">
                            {safeFormatDate(installment.due_date)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {installment.installment_number}/{installment.total_installments}
                          </TableCell>
                          <TableCell className="text-right">
                            <Currency value={installment.amount} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={
                                installment.status === 'pago' ? 'success' :
                                installment.status === 'atrasado' ? 'danger' : 'warning'
                              }
                              label={installment.status}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {getCustomerInstallments(selectedCustomer.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Nenhuma parcela encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
