import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, CheckCircle, Clock, AlertTriangle, User, DollarSign, TrendingUp, Calendar, Plus, Trash2, Edit } from 'lucide-react';
import { isPast } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';

// Categorias de recebíveis
const RECEIVABLE_CATEGORIES = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'emprestimo', label: 'Empréstimo' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'juros', label: 'Juros/Rendimentos' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'outros', label: 'Outros' },
];
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function Receivables() {
  const [installments, setInstallments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pendente');
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentData, setPaymentData] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    paid_amount: 0,
    payment_method_id: ''
  });

  // Estados para cadastro manual
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    category: 'vendas',
    installment_number: 1,
    total_installments: 1,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [installmentsData, customersData, methodsData] = await Promise.all([
        base44.entities.Installment.list('-due_date'),
        base44.entities.Customer.list(),
        base44.entities.PaymentMethod.list()
      ]);

      const updatedInstallments = installmentsData.map(inst => {
        if (inst.status === 'pendente' && inst.due_date && isPast(new Date(inst.due_date))) {
          return { ...inst, status: 'atrasado' };
        }
        return inst;
      });

      setInstallments(updatedInstallments);
      setCustomers(customersData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!paymentData.payment_method_id) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    try {
      await base44.entities.Installment.update(selectedInstallment.id, {
        status: 'pago',
        paid_date: paymentData.paid_date,
        paid_amount: paymentData.paid_amount,
        payment_method_id: paymentData.payment_method_id
      });

      const customer = customers.find(c => c.id === selectedInstallment.customer_id);
      if (customer) {
        await base44.entities.Customer.update(customer.id, {
          used_credit: (customer.used_credit || 0) - selectedInstallment.amount
        });
      }

      toast.success('Recebimento registrado');
      setShowReceiveDialog(false);
      setSelectedInstallment(null);
      loadData();
    } catch (error) {
      console.error('Error receiving installment:', error);
      toast.error('Erro ao registrar recebimento');
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      customer_id: '',
      category: 'vendas',
      installment_number: 1,
      total_installments: 1,
      notes: '',
    });
    setEditingReceivable(null);
  };

  const handleCreate = async () => {
    if (!formData.description || !formData.amount || !formData.due_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const data = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        customer_id: formData.customer_id || null,
        category: formData.category || 'outros',
        installment_number: parseInt(formData.installment_number) || 1,
        total_installments: parseInt(formData.total_installments) || 1,
        notes: formData.notes || '',
        status: 'pendente',
        is_manual: true,
      };

      if (editingReceivable) {
        await base44.entities.Installment.update(editingReceivable.id, data);
        toast.success('Conta a receber atualizada');
      } else {
        await base44.entities.Installment.create(data);
        toast.success('Conta a receber cadastrada');
      }

      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving receivable:', error);
      toast.error('Erro ao salvar conta a receber');
    }
  };

  const handleEdit = (receivable) => {
    setEditingReceivable(receivable);
    setFormData({
      description: receivable.description || '',
      amount: receivable.amount?.toString() || '',
      due_date: receivable.due_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      customer_id: receivable.customer_id || '',
      category: receivable.category || 'vendas',
      installment_number: receivable.installment_number || 1,
      total_installments: receivable.total_installments || 1,
      notes: receivable.notes || '',
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (receivable) => {
    if (!confirm('Deseja realmente excluir esta conta a receber?')) return;

    try {
      await base44.entities.Installment.delete(receivable.id);
      toast.success('Conta a receber excluída');
      loadData();
    } catch (error) {
      console.error('Error deleting receivable:', error);
      toast.error('Erro ao excluir conta a receber');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const filteredInstallments = installments.filter(inst => {
    const matchSearch = getCustomerName(inst.customer_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inst.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPending = installments
    .filter(i => i.status === 'pendente' || i.status === 'atrasado')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalOverdue = installments
    .filter(i => i.status === 'atrasado')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalPaid = installments
    .filter(i => i.status === 'pago')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      pago: { status: 'success', label: 'Pago' },
      pendente: { status: 'warning', label: 'Pendente' },
      atrasado: { status: 'danger', label: 'Atrasado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const columns = [
    {
      key: 'customer_id',
      label: 'Cliente',
      render: (_, inst) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{getCustomerName(inst.customer_id)}</span>
        </div>
      )
    },
    {
      key: 'installment',
      label: 'Parcela',
      render: (_, inst) => (
        <span className="font-mono">{inst.installment_number}/{inst.total_installments}</span>
      )
    },
    {
      key: 'due_date',
      label: 'Vencimento',
      render: (_, inst) => {
        const isOverdue = inst.status === 'atrasado';
        return (
          <div className="flex items-center gap-2">
            {isOverdue && <AlertTriangle className="w-4 h-4 text-destructive" />}
            <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {safeFormatDate(inst.due_date)}
            </span>
          </div>
        );
      }
    },
    {
      key: 'amount',
      label: 'Valor',
      className: 'text-right',
      render: (_, inst) => (
        <span className="font-bold">{formatCurrency(inst.amount)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, inst) => {
        const { status, label } = getStatusBadge(inst.status);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: '',
      className: 'w-40',
      render: (_, inst) => (
        <div className="flex items-center gap-1">
          {inst.status !== 'pago' && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedInstallment(inst);
                setPaymentData({
                  paid_date: new Date().toISOString().split('T')[0],
                  paid_amount: inst.amount,
                  payment_method_id: ''
                });
                setShowReceiveDialog(true);
              }}
              className="bg-success hover:bg-success/90"
            >
              Receber
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(inst)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(inst)}
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
        title="Contas a Receber"
        subtitle={`${filteredInstallments.length} parcelas`}
        icon={DollarSign}
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
          label="Total a Receber"
          value={formatCurrency(totalPending)}
          icon={TrendingUp}
          status="warning"
        />
        <MiniMetric
          label="Em Atraso"
          value={formatCurrency(totalOverdue)}
          icon={AlertTriangle}
          status="danger"
        />
        <MiniMetric
          label="Recebido"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          status="success"
        />
        <MiniMetric
          label="Parcelas Pendentes"
          value={installments.filter(i => i.status !== 'pago').length}
          icon={Calendar}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
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
          data={filteredInstallments}
          columns={columns}
          emptyMessage="Nenhuma parcela encontrada"
        />
      </CardSection>

      {/* Dialog de Recebimento */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          {selectedInstallment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{getCustomerName(selectedInstallment.customer_id)}</p>
                <p className="text-sm text-muted-foreground mt-2">Parcela</p>
                <p className="font-medium">
                  {selectedInstallment.installment_number}/{selectedInstallment.total_installments}
                </p>
                <p className="text-2xl font-bold text-success mt-2">
                  {formatCurrency(selectedInstallment.amount)}
                </p>
              </div>

              <div>
                <Label>Data do Recebimento</Label>
                <Input
                  type="date"
                  value={paymentData.paid_date}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Valor Recebido</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: parseFloat(e.target.value) || 0 })}
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
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive} className="bg-success hover:bg-success/90">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReceivable ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Venda de produtos, Serviço prestado..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIVABLE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Parcela</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.installment_number}
                  onChange={(e) => setFormData({ ...formData, installment_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Total de Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.total_installments}
                  onChange={(e) => setFormData({ ...formData, total_installments: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              {editingReceivable ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
