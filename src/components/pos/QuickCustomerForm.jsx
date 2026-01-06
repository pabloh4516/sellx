import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';

export default function QuickCustomerForm({ open, onOpenChange, onCustomerCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cpf_cnpj: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const customer = await base44.entities.Customer.create(formData);
      toast.success('Cliente cadastrado com sucesso!');
      onCustomerCreated(customer);
      onOpenChange(false);
      setFormData({ name: '', phone: '', cpf_cnpj: '', email: '' });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Cadastro Rápido de Cliente
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome Completo *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nome do cliente"
              required
              autoFocus
            />
          </div>

          <div>
            <Label>Telefone / WhatsApp *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div>
            <Label>CPF / CNPJ</Label>
            <Input
              value={formData.cpf_cnpj}
              onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="email@exemplo.com"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar Cliente
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}