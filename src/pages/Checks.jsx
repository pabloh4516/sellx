import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, CreditCard, Wallet, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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

export default function Checks() {
  const [checks, setChecks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'recebido',
    check_number: '',
    bank: '',
    agency: '',
    account: '',
    amount: 0,
    issue_date: '',
    due_date: '',
    issuer_name: '',
    issuer_cpf_cnpj: '',
    status: 'em_carteira',
    customer_id: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [checksData, customersData] = await Promise.all([
        base44.entities.Check.list('-due_date'),
        base44.entities.Customer.list()
      ]);
      setChecks(checksData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading checks:', error);
      toast.error('Erro ao carregar cheques');
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
      cleanData.amount = parseFloat(cleanData.amount) || 0;

      await base44.entities.Check.create(cleanData);
      toast.success('Cheque cadastrado');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving check:', error);
      toast.error('Erro ao salvar cheque');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'recebido',
      check_number: '',
      bank: '',
      agency: '',
      account: '',
      amount: 0,
      issue_date: '',
      due_date: '',
      issuer_name: '',
      issuer_cpf_cnpj: '',
      status: 'em_carteira',
      customer_id: '',
      notes: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';

  const filteredChecks = checks.filter(check => {
    const matchSearch =
      check.check_number?.includes(searchTerm) ||
      check.issuer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || check.type === typeFilter;
    const matchStatus = statusFilter === 'all' || check.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalInPortfolio = checks
    .filter(c => c.type === 'recebido' && c.status === 'em_carteira')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const totalCompensado = checks
    .filter(c => c.status === 'compensado')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const totalDevolvido = checks
    .filter(c => c.status === 'devolvido')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      em_carteira: { status: 'warning', label: 'Em Carteira' },
      depositado: { status: 'info', label: 'Depositado' },
      compensado: { status: 'success', label: 'Compensado' },
      devolvido: { status: 'danger', label: 'Devolvido' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const columns = [
    {
      key: 'check_number',
      label: 'N Cheque',
      render: (_, check) => (
        <span className="font-mono font-medium">{check.check_number}</span>
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (_, check) => (
        <StatusBadge
          status={check.type === 'recebido' ? 'success' : 'warning'}
          label={check.type === 'recebido' ? 'Recebido' : 'Emitido'}
        />
      )
    },
    {
      key: 'issuer',
      label: 'Emitente',
      render: (_, check) => (
        <span className="font-medium">{check.issuer_name || getCustomerName(check.customer_id)}</span>
      )
    },
    {
      key: 'bank',
      label: 'Banco/Ag/Conta',
      render: (_, check) => (
        <span className="font-mono text-sm text-muted-foreground">
          {check.bank}/{check.agency}/{check.account}
        </span>
      )
    },
    {
      key: 'due_date',
      label: 'Vencimento',
      render: (_, check) => (
        <span className="text-muted-foreground">{safeFormatDate(check.due_date)}</span>
      )
    },
    {
      key: 'amount',
      label: 'Valor',
      className: 'text-right',
      render: (_, check) => (
        <span className="font-bold">{formatCurrency(check.amount)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, check) => {
        const { status, label } = getStatusBadge(check.status);
        return <StatusBadge status={status} label={label} />;
      }
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
        title="Controle de Cheques"
        subtitle={`${filteredChecks.length} cheques`}
        icon={CreditCard}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cheque
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Cheques"
          value={checks.length}
          icon={CreditCard}
        />
        <MiniMetric
          label="Em Carteira"
          value={formatCurrency(totalInPortfolio)}
          icon={Wallet}
          status="warning"
        />
        <MiniMetric
          label="Compensados"
          value={formatCurrency(totalCompensado)}
          icon={CheckCircle}
          status="success"
        />
        <MiniMetric
          label="Devolvidos"
          value={formatCurrency(totalDevolvido)}
          icon={AlertTriangle}
          status={totalDevolvido > 0 ? 'danger' : 'default'}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cheques..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="emitido">Emitido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="em_carteira">Em Carteira</SelectItem>
              <SelectItem value="depositado">Depositado</SelectItem>
              <SelectItem value="compensado">Compensado</SelectItem>
              <SelectItem value="devolvido">Devolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredChecks}
          columns={columns}
          emptyMessage="Nenhum cheque encontrado"
        />
      </CardSection>

      {/* Dialog de Novo Cheque */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cheque</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recebido">Recebido</SelectItem>
                    <SelectItem value="emitido">Emitido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>N do Cheque *</Label>
                <Input
                  value={formData.check_number}
                  onChange={(e) => setFormData({...formData, check_number: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Banco</Label>
                <Input
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                />
              </div>
              <div>
                <Label>Agencia</Label>
                <Input
                  value={formData.agency}
                  onChange={(e) => setFormData({...formData, agency: e.target.value})}
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  value={formData.account}
                  onChange={(e) => setFormData({...formData, account: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Emitente</Label>
                <Input
                  value={formData.issuer_name}
                  onChange={(e) => setFormData({...formData, issuer_name: e.target.value})}
                />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input
                  value={formData.issuer_cpf_cnpj}
                  onChange={(e) => setFormData({...formData, issuer_cpf_cnpj: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <Label>Emissao</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
