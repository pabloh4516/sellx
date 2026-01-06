import React, { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';
import {
  Plus, Search, Edit, Trash2, User, Phone, Mail,
  History, MoreVertical, Users, Star, Crown, Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { ExportMenu } from '@/components/ui/export-menu';
import { useSafeLoading } from '@/components/ui/safe-loading';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
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
        base44.entities.Sale.list(),
        base44.entities.Installment.list()
      ]);
      setCustomers(customersData);
      setSales(salesData);
      setInstallments(installmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nome e obrigatorio');
      return;
    }

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
        toast.success('Cliente atualizado');
      } else {
        await base44.entities.Customer.create(cleanData);
        toast.success('Cliente cadastrado');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Erro ao salvar cliente');
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
      toast.success('Cliente excluido');
      loadData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Erro ao excluir cliente');
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
      toast.success('Foto enviada');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar foto');
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

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.cpf_cnpj?.includes(searchTerm) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <TableAvatar
            name={item.name}
            subtitle={item.city ? `${item.city}/${item.state}` : item.cpf_cnpj || 'Sem endereco'}
            image={item.photo_url}
          />
          {item.is_vip && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs font-medium">
              <Crown className="w-3 h-3" />
              VIP
              {item.vip_discount_percent > 0 && ` ${item.vip_discount_percent}%`}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'cpf_cnpj',
      header: 'CPF/CNPJ',
      render: (_, item) => (
        <span className="font-mono text-sm text-muted-foreground">{item.cpf_cnpj || '-'}</span>
      )
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
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3 h-3" />
              {item.email}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'credit_limit',
      header: 'Limite',
      align: 'right',
      render: (_, item) => <Currency value={item.credit_limit} />
    },
    {
      key: 'available',
      header: 'Disponivel',
      align: 'right',
      render: (_, item) => {
        const available = (item.credit_limit || 0) - (item.used_credit || 0);
        return <Currency value={available} showSign />
      }
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: '120px',
      render: (_, item) => {
        const pendingCount = getPendingInstallments(item.id).length;
        if (item.is_blocked) {
          return <StatusBadge status="danger" label="Bloqueado" />;
        }
        if (pendingCount > 0) {
          return <StatusBadge status="warning" label={`${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`} />;
        }
        return <StatusBadge status="success" label="Ativo" />;
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
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          </div>
        }
      />

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
          emptyMessage="Nenhum cliente encontrado"
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
                        <Input
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
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input
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
                  <Input
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
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCustomer ? 'Salvar' : 'Cadastrar'}
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
