import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CreditCard, Wallet, DollarSign, Banknote } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MiniMetric,
  StatusBadge,
} from '@/components/nexo';

const PAYMENT_TYPES = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Wallet },
  { value: 'pix', label: 'PIX', icon: DollarSign },
  { value: 'debito', label: 'Cartao de Debito', icon: CreditCard },
  { value: 'credito', label: 'Cartao de Credito', icon: CreditCard },
  { value: 'credito_parcelado', label: 'Credito Parcelado', icon: CreditCard },
  { value: 'boleto', label: 'Boleto', icon: DollarSign },
  { value: 'prazo', label: 'A Prazo (Crediario)', icon: DollarSign },
  { value: 'cheque', label: 'Cheque', icon: DollarSign },
  { value: 'vale', label: 'Vale-compras', icon: Wallet }
];

export default function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    fee_percent: 0,
    fee_fixed: 0,
    max_installments: 1,
    days_to_receive: 0,
    is_active: true
  });

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    try {
      const data = await base44.entities.PaymentMethod.list();
      setMethods(data);
    } catch (error) {
      console.error('Error loading methods:', error);
      toast.error('Erro ao carregar formas de pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      toast.error('Nome e tipo sao obrigatorios');
      return;
    }

    try {
      if (editingMethod) {
        await base44.entities.PaymentMethod.update(editingMethod.id, formData);
        toast.success('Forma de pagamento atualizada');
      } else {
        await base44.entities.PaymentMethod.create(formData);
        toast.success('Forma de pagamento cadastrada');
      }
      setShowForm(false);
      resetForm();
      loadMethods();
    } catch (error) {
      console.error('Error saving method:', error);
      toast.error('Erro ao salvar forma de pagamento');
    }
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      name: method.name || '',
      type: method.type || '',
      fee_percent: method.fee_percent || 0,
      fee_fixed: method.fee_fixed || 0,
      max_installments: method.max_installments || 1,
      days_to_receive: method.days_to_receive || 0,
      is_active: method.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (method) => {
    if (!confirm(`Excluir "${method.name}"?`)) return;

    try {
      await base44.entities.PaymentMethod.delete(method.id);
      toast.success('Forma de pagamento excluida');
      loadMethods();
    } catch (error) {
      console.error('Error deleting method:', error);
      toast.error('Erro ao excluir forma de pagamento');
    }
  };

  const resetForm = () => {
    setEditingMethod(null);
    setFormData({
      name: '',
      type: '',
      fee_percent: 0,
      fee_fixed: 0,
      max_installments: 1,
      days_to_receive: 0,
      is_active: true
    });
  };

  const getTypeLabel = (type) => {
    return PAYMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type) => {
    const TypeIcon = PAYMENT_TYPES.find(t => t.value === type)?.icon || Wallet;
    return <TypeIcon className="w-5 h-5 text-primary" />;
  };

  const activeMethods = methods.filter(m => m.is_active !== false).length;
  const cardMethods = methods.filter(m => ['credito', 'credito_parcelado', 'debito'].includes(m.type)).length;

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
        title="Formas de Pagamento"
        subtitle={`${methods.length} formas cadastradas`}
        icon={CreditCard}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Forma de Pagamento
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Formas"
          value={methods.length}
          icon={CreditCard}
        />
        <MiniMetric
          label="Ativas"
          value={activeMethods}
          icon={Wallet}
          status="success"
        />
        <MiniMetric
          label="Cartoes"
          value={cardMethods}
          icon={Banknote}
        />
      </Grid>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map(method => (
          <CardSection key={method.id}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getTypeIcon(method.type)}
                </div>
                <div>
                  <h3 className="font-semibold">{method.name}</h3>
                  <p className="text-sm text-muted-foreground">{getTypeLabel(method.type)}</p>
                </div>
              </div>
              <StatusBadge
                status={method.is_active !== false ? 'success' : 'default'}
                label={method.is_active !== false ? 'Ativo' : 'Inativo'}
              />
            </div>

            <div className="space-y-2 mb-4">
              {method.fee_percent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa:</span>
                  <span className="font-medium">{method.fee_percent}%</span>
                </div>
              )}
              {method.fee_fixed > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa fixa:</span>
                  <span className="font-medium">R$ {method.fee_fixed.toFixed(2)}</span>
                </div>
              )}
              {method.max_installments > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span className="font-medium">ate {method.max_installments}x</span>
                </div>
              )}
              {method.days_to_receive > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recebimento:</span>
                  <span className="font-medium">{method.days_to_receive} dias</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(method)}>
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(method)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardSection>
        ))}

        {methods.length === 0 && (
          <div className="col-span-full">
            <CardSection>
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma forma de pagamento cadastrada</p>
              </div>
            </CardSection>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Ex: Dinheiro, Cartao Visa, etc."
              />
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taxa (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fee_percent || ''}
                  onChange={(e) => setFormData({...formData, fee_percent: parseFloat(e.target.value) || 0})}
                  placeholder="Ex: 2.5"
                />
              </div>
              <div>
                <Label>Taxa Fixa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fee_fixed || ''}
                  onChange={(e) => setFormData({...formData, fee_fixed: parseFloat(e.target.value) || 0})}
                  placeholder="Ex: 1.50"
                />
              </div>
            </div>

            {(formData.type === 'credito_parcelado' || formData.type === 'prazo') && (
              <div>
                <Label>Maximo de Parcelas</Label>
                <Input
                  type="number"
                  value={formData.max_installments || ''}
                  onChange={(e) => setFormData({...formData, max_installments: parseInt(e.target.value) || 1})}
                />
              </div>
            )}

            <div>
              <Label>Dias para Receber</Label>
              <Input
                type="number"
                value={formData.days_to_receive || ''}
                onChange={(e) => setFormData({...formData, days_to_receive: parseInt(e.target.value) || 0})}
                placeholder="Ex: 30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prazo medio para recebimento (para controle financeiro)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({...formData, is_active: v})}
              />
              <Label>Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMethod ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
