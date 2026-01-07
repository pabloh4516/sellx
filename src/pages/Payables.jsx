import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, CheckCircle, Clock, AlertTriangle, CreditCard, TrendingDown, Calendar, Receipt, Plus, Trash2, Edit } from 'lucide-react';
import { isPast } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

const EXPENSE_CATEGORIES = [
  { value: 'fornecedores', label: 'Fornecedores' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'agua', label: 'Agua' },
  { value: 'luz', label: 'Luz/Energia' },
  { value: 'telefone', label: 'Telefone/Internet' },
  { value: 'salarios', label: 'Salarios' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'manutencao', label: 'Manutencao' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transporte', label: 'Transporte/Frete' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'servicos', label: 'Servicos' },
  { value: 'outros', label: 'Outros' },
];

export default function Payables() {
  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentData, setPaymentData] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    payment_method_id: ''
  });
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    category: 'outros',
    supplier_id: '',
    notes: '',
    recurrence: 'none', // none, monthly, weekly
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[Payables] Carregando dados...');
      const [expensesData, methodsData, suppliersData] = await Promise.all([
        base44.entities.Expense.list('-due_date'),
        base44.entities.PaymentMethod.list(),
        base44.entities.Supplier.list()
      ]);

      console.log('[Payables] Despesas carregadas:', expensesData?.length || 0, expensesData);

      const updatedExpenses = expensesData.map(exp => {
        if (exp.status === 'pendente' && exp.due_date && isPast(new Date(exp.due_date))) {
          return { ...exp, status: 'atrasado' };
        }
        return exp;
      });

      setExpenses(updatedExpenses);
      setPaymentMethods(methodsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      category: 'outros',
      supplier_id: '',
      notes: '',
      recurrence: 'none',
    });
    setSelectedExpense(null);
  };

  const handleCreate = async () => {
    if (!formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha os campos obrigatorios');
      return;
    }

    try {
      const data = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category: formData.category || 'outros',
        supplier_id: formData.supplier_id || null,
        notes: formData.notes || '',
        status: 'pendente',
      };

      console.log('[Payables] Salvando conta:', data);

      if (selectedExpense) {
        const result = await base44.entities.Expense.update(selectedExpense.id, data);
        console.log('[Payables] Conta atualizada:', result);
        toast.success('Conta atualizada com sucesso!');
      } else {
        const result = await base44.entities.Expense.create(data);
        console.log('[Payables] Conta criada:', result);
        toast.success('Conta cadastrada com sucesso!');
      }

      setShowCreateDialog(false);
      resetForm();
      await loadData();
      console.log('[Payables] Dados recarregados');
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(`Erro ao salvar conta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      due_date: expense.due_date?.split('T')[0] || '',
      category: expense.category || '',
      supplier_id: expense.supplier_id || '',
      notes: expense.notes || '',
      recurrence: 'none',
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (expense) => {
    if (!confirm('Deseja realmente excluir esta conta?')) return;

    try {
      await base44.entities.Expense.delete(expense.id);
      toast.success('Conta excluida com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const handlePay = async () => {
    if (!paymentData.payment_method_id) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    try {
      // Dados base para atualização
      const updateData = {
        status: 'pago',
        paid_date: paymentData.paid_date,
      };

      // Tentar com payment_method_id (coluna opcional)
      try {
        await base44.entities.Expense.update(selectedExpense.id, {
          ...updateData,
          payment_method_id: paymentData.payment_method_id
        });
      } catch (e) {
        // Se falhar, tenta sem payment_method_id
        console.warn('Tentando sem payment_method_id:', e.message);
        await base44.entities.Expense.update(selectedExpense.id, updateData);
      }

      toast.success('Pagamento registrado');
      setShowPayDialog(false);
      setSelectedExpense(null);
      loadData();
    } catch (error) {
      console.error('Error paying expense:', error);
      toast.error(`Erro ao registrar pagamento: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '';

  const filteredExpenses = expenses.filter(expense => {
    const description = (expense.description || '').toLowerCase();
    const category = (expense.category || '').toLowerCase();
    const supplierName = getSupplierName(expense.supplier_id).toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchSearch = description.includes(search) || category.includes(search) || supplierName.includes(search);
    const matchStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPending = expenses
    .filter(e => e.status === 'pendente' || e.status === 'atrasado')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalOverdue = expenses
    .filter(e => e.status === 'atrasado')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalPaid = expenses
    .filter(e => e.status === 'pago')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      pago: { status: 'success', label: 'Pago' },
      pendente: { status: 'warning', label: 'Pendente' },
      atrasado: { status: 'danger', label: 'Atrasado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const getCategoryLabel = (value) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === value);
    return cat?.label || value || '-';
  };

  const columns = [
    {
      key: 'description',
      label: 'Descrição',
      render: (_, expense) => (
        <div>
          <p className="font-medium">{expense.description}</p>
          {expense.supplier_id && (
            <p className="text-xs text-muted-foreground">Fornecedor: {getSupplierName(expense.supplier_id)}</p>
          )}
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
        <span className="capitalize text-sm">{getCategoryLabel(expense.category)}</span>
      )
    },
    {
      key: 'due_date',
      label: 'Vencimento',
      render: (_, expense) => {
        const isOverdue = expense.status === 'atrasado';
        return (
          <div className="flex items-center gap-2">
            {isOverdue && <AlertTriangle className="w-4 h-4 text-destructive" />}
            <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {safeFormatDate(expense.due_date)}
            </span>
          </div>
        );
      }
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
      className: 'w-36',
      render: (_, expense) => (
        <div className="flex items-center gap-1">
          {expense.status !== 'pago' && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedExpense(expense);
                setPaymentData({
                  paid_date: new Date().toISOString().split('T')[0],
                  payment_method_id: ''
                });
                setShowPayDialog(true);
              }}
              className="bg-success hover:bg-success/90"
            >
              Pagar
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEdit(expense)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive"
            onClick={() => handleDelete(expense)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
        title="Contas a Pagar"
        subtitle={`${filteredExpenses.length} contas`}
        icon={CreditCard}
        actions={
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total a Pagar"
          value={formatCurrency(totalPending)}
          icon={TrendingDown}
          status="warning"
        />
        <MiniMetric
          label="Em Atraso"
          value={formatCurrency(totalOverdue)}
          icon={AlertTriangle}
          status="danger"
        />
        <MiniMetric
          label="Pago"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          status="success"
        />
        <MiniMetric
          label="Contas Pendentes"
          value={expenses.filter(e => e.status !== 'pago').length}
          icon={Receipt}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição, categoria ou fornecedor..."
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
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredExpenses}
          columns={columns}
          emptyMessage="Nenhuma conta encontrada"
        />
      </CardSection>

      {/* Dialog de Pagamento */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="font-medium">{selectedExpense.description}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(selectedExpense.amount)}
                </p>
              </div>

              <div>
                <Label>Data do Pagamento</Label>
                <Input
                  type="date"
                  value={paymentData.paid_date}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={paymentData.payment_method_id} onValueChange={(v) => setPaymentData({ ...paymentData, payment_method_id: v })}>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePay} className="bg-success hover:bg-success/90">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar/Editar Conta */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedExpense ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Descricao *</Label>
              <Input
                placeholder="Ex: Conta de luz, Fornecedor XYZ..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Select value={formData.supplier_id || '_none'} onValueChange={(v) => setFormData({ ...formData, supplier_id: v === '_none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {suppliers.map(sup => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observacoes</Label>
              <Textarea
                placeholder="Informacoes adicionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              {selectedExpense ? 'Salvar Alteracoes' : 'Cadastrar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
