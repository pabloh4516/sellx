import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

const PRIORITY_OPTIONS = ['baixa', 'normal', 'alta', 'urgente'];
const STATUS_OPTIONS = ['aguardando', 'em_analise', 'aguardando_aprovacao', 'aprovado', 'em_execucao', 'concluido', 'entregue', 'cancelado'];

const DEFAULT_CHECKLIST = [
  { item: 'Equipamento ligando', checked: false },
  { item: 'Tela sem danos', checked: false },
  { item: 'Acessórios inclusos', checked: false },
  { item: 'Bateria presente', checked: false },
  { item: 'Carregador presente', checked: false }
];

export default function ServiceOrderForm({ serviceOrder, onSave, onCancel }) {
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    equipment_type: '',
    brand: '',
    model: '',
    serial_number: '',
    accessories: '',
    problem_description: '',
    checklist: DEFAULT_CHECKLIST,
    diagnosis: '',
    solution: '',
    services: [],
    parts: [],
    labor_cost: 0,
    parts_cost: 0,
    total: 0,
    status: 'aguardando',
    priority: 'normal',
    entry_date: new Date().toISOString(),
    estimated_date: '',
    internal_notes: '',
    payments: [],
    paid_amount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (serviceOrder) {
      setFormData({
        customer_id: serviceOrder.customer_id || '',
        technician_id: serviceOrder.technician_id || '',
        equipment_type: serviceOrder.equipment_type || '',
        brand: serviceOrder.brand || '',
        model: serviceOrder.model || '',
        serial_number: serviceOrder.serial_number || '',
        accessories: serviceOrder.accessories || '',
        problem_description: serviceOrder.problem_description || '',
        checklist: serviceOrder.checklist || DEFAULT_CHECKLIST,
        diagnosis: serviceOrder.diagnosis || '',
        solution: serviceOrder.solution || '',
        services: serviceOrder.services || [],
        parts: serviceOrder.parts || [],
        labor_cost: serviceOrder.labor_cost || 0,
        parts_cost: serviceOrder.parts_cost || 0,
        total: serviceOrder.total || 0,
        status: serviceOrder.status || 'aguardando',
        priority: serviceOrder.priority || 'normal',
        entry_date: serviceOrder.entry_date || new Date().toISOString(),
        estimated_date: serviceOrder.estimated_date || '',
        internal_notes: serviceOrder.internal_notes || '',
        payments: serviceOrder.payments || [],
        paid_amount: serviceOrder.paid_amount || 0
      });
    }
  }, [serviceOrder]);

  const loadData = async () => {
    try {
      const [customersData, sellersData, productsData] = await Promise.all([
        base44.entities.Customer.list(),
        base44.entities.Seller.list(),
        base44.entities.Product.list()
      ]);
      setCustomers(customersData);
      setSellers(sellersData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { description: '', price: 0 }]
    });
  };

  const updateService = (index, field, value) => {
    const newServices = [...formData.services];
    newServices[index][field] = value;
    setFormData({ ...formData, services: newServices });
    calculateTotal({ ...formData, services: newServices });
  };

  const removeService = (index) => {
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData({ ...formData, services: newServices });
    calculateTotal({ ...formData, services: newServices });
  };

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { product_id: '', name: '', quantity: 1, price: 0 }]
    });
  };

  const updatePart = (index, field, value) => {
    const newParts = [...formData.parts];
    newParts[index][field] = value;
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newParts[index].name = product.name;
        newParts[index].price = product.sale_price;
      }
    }
    
    setFormData({ ...formData, parts: newParts });
    calculateTotal({ ...formData, parts: newParts });
  };

  const removePart = (index) => {
    const newParts = formData.parts.filter((_, i) => i !== index);
    setFormData({ ...formData, parts: newParts });
    calculateTotal({ ...formData, parts: newParts });
  };

  const updateChecklistItem = (index, checked) => {
    const newChecklist = [...formData.checklist];
    newChecklist[index].checked = checked;
    setFormData({ ...formData, checklist: newChecklist });
  };

  const calculateTotal = (data = formData) => {
    const servicesTotal = data.services.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const partsTotal = data.parts.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);
    const total = servicesTotal + partsTotal + (parseFloat(data.labor_cost) || 0);
    
    setFormData(prev => ({
      ...prev,
      parts_cost: partsTotal,
      total: total
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.problem_description) {
      toast.error('Cliente e descrição do problema são obrigatórios');
      return;
    }

    try {
      let orderNumber = 1;
      if (!serviceOrder) {
        const allOrders = await base44.entities.ServiceOrder.list();
        orderNumber = allOrders.length > 0 ? Math.max(...allOrders.map(o => o.order_number || 0)) + 1 : 1;
      }

      const dataToSave = {
        ...formData,
        order_number: serviceOrder?.order_number || orderNumber,
        history: serviceOrder?.history || [{
          date: new Date().toISOString(),
          user: 'Sistema',
          action: 'OS Criada',
          notes: 'Ordem de serviço criada'
        }]
      };

      if (serviceOrder) {
        await base44.entities.ServiceOrder.update(serviceOrder.id, dataToSave);
        toast.success('OS atualizada');
      } else {
        await base44.entities.ServiceOrder.create(dataToSave);
        toast.success('OS criada');
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving service order:', error);
      toast.error('Erro ao salvar OS');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer & Equipment */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cliente *</Label>
          <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Técnico</Label>
          <Select value={formData.technician_id} onValueChange={(v) => setFormData({...formData, technician_id: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o técnico" />
            </SelectTrigger>
            <SelectContent>
              {sellers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Tipo de Equipamento *</Label>
          <Input
            value={formData.equipment_type}
            onChange={(e) => setFormData({...formData, equipment_type: e.target.value})}
            placeholder="Ex: Notebook, Celular"
            required
          />
        </div>
        <div>
          <Label>Marca</Label>
          <Input
            value={formData.brand}
            onChange={(e) => setFormData({...formData, brand: e.target.value})}
          />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Número de Série</Label>
          <Input
            value={formData.serial_number}
            onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
          />
        </div>
        <div>
          <Label>Acessórios</Label>
          <Input
            value={formData.accessories}
            onChange={(e) => setFormData({...formData, accessories: e.target.value})}
            placeholder="Ex: Carregador, bateria"
          />
        </div>
      </div>

      <div>
        <Label>Descrição do Problema *</Label>
        <Textarea
          value={formData.problem_description}
          onChange={(e) => setFormData({...formData, problem_description: e.target.value})}
          rows={3}
          required
        />
      </div>

      {/* Checklist */}
      <div>
        <Label className="mb-3 block">Check-list de Entrada</Label>
        <div className="grid grid-cols-2 gap-3">
          {formData.checklist.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Checkbox
                checked={item.checked}
                onCheckedChange={(checked) => updateChecklistItem(index, checked)}
              />
              <span className="text-sm">{item.item}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Diagnosis & Solution */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Diagnóstico</Label>
          <Textarea
            value={formData.diagnosis}
            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
            rows={3}
          />
        </div>
        <div>
          <Label>Solução Aplicada</Label>
          <Textarea
            value={formData.solution}
            onChange={(e) => setFormData({...formData, solution: e.target.value})}
            rows={3}
          />
        </div>
      </div>

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Serviços</Label>
          <Button type="button" size="sm" onClick={addService}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Serviço
          </Button>
        </div>
        <div className="space-y-2">
          {formData.services.map((service, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Descrição do serviço"
                value={service.description}
                onChange={(e) => updateService(index, 'description', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Preço"
                value={service.price || ''}
                onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                className="w-32"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeService(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Parts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Peças</Label>
          <Button type="button" size="sm" onClick={addPart}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Peça
          </Button>
        </div>
        <div className="space-y-2">
          {formData.parts.map((part, index) => (
            <div key={index} className="flex gap-2">
              <Select value={part.product_id} onValueChange={(v) => updatePart(index, 'product_id', v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Qtd"
                value={part.quantity || ''}
                onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 0)}
                className="w-20"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Preço"
                value={part.price || ''}
                onChange={(e) => updatePart(index, 'price', parseFloat(e.target.value) || 0)}
                className="w-32"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removePart(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Costs & Total */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
        <div>
          <Label>Mão de Obra</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.labor_cost || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setFormData({...formData, labor_cost: value});
              calculateTotal({...formData, labor_cost: value});
            }}
          />
        </div>
        <div>
          <Label>Total Peças</Label>
          <Input value={formData.parts_cost.toFixed(2)} disabled />
        </div>
        <div>
          <Label>TOTAL</Label>
          <Input 
            value={formData.total.toFixed(2)} 
            disabled 
            className="font-bold text-lg"
          />
        </div>
      </div>

      {/* Status & Dates */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Prioridade</Label>
          <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(priority => (
                <SelectItem key={priority} value={priority} className="capitalize">
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Previsão de Entrega</Label>
          <Input
            type="date"
            value={formData.estimated_date}
            onChange={(e) => setFormData({...formData, estimated_date: e.target.value})}
          />
        </div>
        <div>
          <Label>Garantia até</Label>
          <Input
            type="date"
            value={formData.warranty_until || ''}
            onChange={(e) => setFormData({...formData, warranty_until: e.target.value})}
          />
        </div>
      </div>

      <div>
        <Label>Observações Internas</Label>
        <Textarea
          value={formData.internal_notes}
          onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {serviceOrder ? 'Salvar OS' : 'Criar OS'}
        </Button>
      </div>
    </form>
  );
}