import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Truck, Phone, Mail, MoreVertical, Building2, Users } from 'lucide-react';
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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    cnpj: '',
    ie: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    is_active: true
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await base44.entities.Supplier.list('-created_date');
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Razao social e obrigatoria');
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

      if (editingSupplier) {
        await base44.entities.Supplier.update(editingSupplier.id, cleanData);
        toast.success('Fornecedor atualizado');
      } else {
        await base44.entities.Supplier.create(cleanData);
        toast.success('Fornecedor cadastrado');
      }
      setShowForm(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Erro ao salvar fornecedor');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      trade_name: supplier.trade_name || '',
      cnpj: supplier.cnpj || '',
      ie: supplier.ie || '',
      contact_name: supplier.contact_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: supplier.zip_code || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`Excluir "${supplier.name}"?`)) return;

    try {
      await base44.entities.Supplier.delete(supplier.id);
      toast.success('Fornecedor excluido');
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Erro ao excluir fornecedor');
    }
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      trade_name: '',
      cnpj: '',
      ie: '',
      contact_name: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
      is_active: true
    });
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cnpj?.includes(searchTerm)
  );

  const activeSuppliers = suppliers.filter(s => s.is_active !== false).length;

  const columns = [
    {
      key: 'name',
      label: 'Razao Social',
      render: (_, supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{supplier.name}</p>
            {supplier.trade_name && (
              <p className="text-xs text-muted-foreground">{supplier.trade_name}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'cnpj',
      label: 'CNPJ',
      render: (_, supplier) => (
        <span className="font-mono text-sm text-muted-foreground">{supplier.cnpj || '-'}</span>
      )
    },
    {
      key: 'contact',
      label: 'Contato',
      render: (_, supplier) => (
        <div className="text-sm space-y-0.5">
          {supplier.phone && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="w-3 h-3" />{supplier.phone}
            </p>
          )}
          {supplier.email && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="w-3 h-3" />{supplier.email}
            </p>
          )}
          {!supplier.phone && !supplier.email && <span className="text-muted-foreground">-</span>}
        </div>
      )
    },
    {
      key: 'location',
      label: 'Cidade/UF',
      render: (_, supplier) => (
        <span className="text-muted-foreground">
          {supplier.city ? `${supplier.city}/${supplier.state}` : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, supplier) => (
        <StatusBadge
          status={supplier.is_active !== false ? 'success' : 'default'}
          label={supplier.is_active !== false ? 'Ativo' : 'Inativo'}
        />
      )
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, supplier) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(supplier)} className="text-destructive">
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
        title="Fornecedores"
        subtitle={`${suppliers.length} fornecedores cadastrados`}
        icon={Truck}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Fornecedores"
          value={suppliers.length}
          icon={Building2}
        />
        <MiniMetric
          label="Ativos"
          value={activeSuppliers}
          icon={Truck}
          status="success"
        />
        <MiniMetric
          label="Inativos"
          value={suppliers.length - activeSuppliers}
          icon={Users}
          status={suppliers.length - activeSuppliers > 0 ? 'warning' : 'default'}
        />
      </Grid>

      {/* Busca */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razao social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredSuppliers}
          columns={columns}
          emptyMessage="Nenhum fornecedor encontrado"
        />
      </CardSection>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Razao Social *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div>
                <Label>Inscricao Estadual</Label>
                <Input
                  value={formData.ie}
                  onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Nome do Contato</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Endereco</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>UF</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <Label>CEP</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              />
            </div>

            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingSupplier ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
