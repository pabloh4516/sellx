import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Building2, Wallet, DollarSign, Landmark } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MiniMetric,
  StatusBadge,
} from '@/components/nexo';

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    agency: '',
    account_number: '',
    account_type: 'corrente',
    balance: 0,
    is_active: true
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await base44.entities.BankAccount.list();
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.BankAccount.create(formData);
      toast.success('Conta cadastrada');
      setShowForm(false);
      resetForm();
      loadAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Erro ao salvar conta');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      bank: '',
      agency: '',
      account_number: '',
      account_type: 'corrente',
      balance: 0,
      is_active: true
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const activeAccounts = accounts.filter(a => a.is_active !== false).length;

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
        title="Contas Bancarias"
        subtitle={`${accounts.length} contas cadastradas`}
        icon={Landmark}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Contas"
          value={accounts.length}
          icon={Building2}
        />
        <MiniMetric
          label="Contas Ativas"
          value={activeAccounts}
          icon={Wallet}
          status="success"
        />
        <MiniMetric
          label="Saldo Total"
          value={formatCurrency(totalBalance)}
          icon={DollarSign}
        />
      </Grid>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(account => (
          <CardSection key={account.id}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  account.account_type === 'corrente' ? 'bg-primary/10' :
                  account.account_type === 'poupanca' ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  {account.account_type === 'caixa' ? (
                    <Wallet className="w-5 h-5 text-warning" />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{account.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{account.account_type}</p>
                </div>
              </div>
              <StatusBadge
                status={account.is_active ? 'success' : 'default'}
                label={account.is_active ? 'Ativa' : 'Inativa'}
              />
            </div>

            <div className="space-y-2">
              {account.bank && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Banco:</span>
                  <span className="font-medium">{account.bank}</span>
                </div>
              )}
              {account.agency && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Agencia:</span>
                  <span className="font-mono">{account.agency}</span>
                </div>
              )}
              {account.account_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conta:</span>
                  <span className="font-mono">{account.account_number}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Saldo</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(account.balance)}</p>
            </div>
          </CardSection>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full">
            <CardSection>
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
              </div>
            </CardSection>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta Bancaria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Conta *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Ex: Conta Corrente Empresa"
              />
            </div>

            <div>
              <Label>Tipo de Conta</Label>
              <Select value={formData.account_type} onValueChange={(v) => setFormData({...formData, account_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupanca</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Banco</Label>
                <Input
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
              <div>
                <Label>Agencia</Label>
                <Input
                  value={formData.agency}
                  onChange={(e) => setFormData({...formData, agency: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Numero da Conta</Label>
              <Input
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
              />
            </div>

            <div>
              <Label>Saldo Inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.balance || ''}
                onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({...formData, is_active: v})}
              />
              <Label>Conta ativa</Label>
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
