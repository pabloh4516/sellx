import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, TrendingDown, DollarSign, Clock, CheckCircle, MoreVertical } from 'lucide-react';
import { safeFormatDate } from '@/lib/utils';
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

const CATEGORIES = [
  'aluguel', 'agua', 'luz', 'telefone', 'internet', 'salarios',
  'impostos', 'fornecedores', 'manutencao', 'marketing', 'outros'
];

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: 0,
    due_date: '',
    paid_date: '',
    status: 'pendente',
    payment_method_id: '',
    supplier_id: '',
    notes: '',
    recurrent: false,
    recurrence_type: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expensesData, suppliersData, methodsData] = await Promise.all([
        base44.entities.Expense.list('-due_date'),
        base44.entities.Supplier.list(),
        base44.entities.PaymentMethod.list()
      ]);
      setExpenses(expensesData);
      setSuppliers(suppliersData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Limpar dados - converter strings vazias em null
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === '' || cleanData[key] === undefined) {
          cleanData[key] = null;
        }
      });
      // Garantir numeros
      cleanData.amount = parseFloat(cleanData.amount) || 0;

      if (editingExpense) {
        await base44.entities.Expense.update(editingExpense.id, cleanData);
        toast.success('Despesa atualizada');
      } else {
        await base44.entities.Expense.create(cleanData);
        toast.success('Despesa cadastrada');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description || '',
      category: expense.category || '',
      amount: expense.amount || 0,
      due_date: expense.due_date || '',
      paid_date: expense.paid_date || '',
      status: expense.status || 'pendente',
      payment_method_id: expense.payment_method_id || '',
      supplier_id: expense.supplier_id || '',
      notes: expense.notes || '',
      recurrent: expense.recurrent || false,
      recurrence_type: expense.recurrence_type || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (expense) => {
    if (!confirm(`Excluir "${expense.description}"?`)) return;

    try {
      await base44.entities.Expense.delete(expense.id);
      toast.success('Despesa excluida');
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Erro ao excluir despesa');
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      category: '',
      amount: 0,
      due_date: '',
      paid_date: '',
      status: 'pendente',
      payment_method_id: '',
      supplier_id: '',
      notes: '',
      recurrent: false,
      recurrence_type: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPending = expenses
    .filter(e => e.status === 'pendente')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalPaid = expenses
    .filter(e => e.status === 'pago')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalOverdue = expenses
    .filter(e => e.status === 'atrasado')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      pago: { status: 'success', label: 'Pago' },
      pendente: { status: 'warning', label: 'Pendente' },
      atrasado: { status: 'danger', label: 'Atrasado' },
      cancelado: { status: 'default', label: 'Cancelado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const columns = [
    {
      key: 'description',
      label: 'Descricao',
      render: (_, expense) => (
        <div>
          <p className="font-medium">{expense.description}</p>
          {expense.notes && (
            <p className="text-xs text-muted-foreground truncate max-w-xs">{expense.notes}</p>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (_, expense) => (
        <span className="capitalize">{expense.category?.replace(/_/g, ' ') || '-'}</span>
      )
    },
    {
      key: 'due_date',
      label: 'Vencimento',
      render: (_, expense) => (
        <span className="text-muted-foreground">
          {safeFormatDate(expense.due_date)}
        </span>
      )
    },
    {
      key: 'paid_date',
      label: 'Pagamento',
      render: (_, expense) => (
        <span className="text-muted-foreground">
          {safeFormatDate(expense.paid_date)}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Valor',
      className: 'text-right',
      render: (_, expense) => (
        <span className="font-bold">{formatCurrency(expense.amount)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, expense) => {
        const { status, label } = getStatusBadge(expense.status);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, expense) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(expense)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(expense)} className="text-destructive">
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
        title="Despesas"
        subtitle={`${filteredExpenses.length} despesas`}
        icon={TrendingDown}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Despesas"
          value={expenses.length}
          icon={TrendingDown}
        />
        <MiniMetric
          label="Pendente"
          value={formatCurrency(totalPending)}
          icon={Clock}
          status="warning"
        />
        <MiniMetric
          label="Em Atraso"
          value={formatCurrency(totalOverdue)}
          icon={TrendingDown}
          status="danger"
        />
        <MiniMetric
          label="Pago"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          status="success"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredExpenses}
          columns={columns}
          emptyMessage="Nenhuma despesa encontrada"
        />
      </CardSection>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descricao *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.status === 'pago' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={formData.paid_date}
                    onChange={(e) => setFormData({...formData, paid_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={formData.payment_method_id} onValueChange={(v) => setFormData({...formData, payment_method_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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

            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingExpense ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
