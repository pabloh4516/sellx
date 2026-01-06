import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Building2, MapPin, Plus, Pencil, Star, Search, Warehouse } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function StockLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'loja',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    manager_name: '',
    phone: '',
    email: '',
    is_main: false,
    is_active: true
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const data = await base44.entities.StockLocation.list();
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Erro ao carregar locais');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingLocation) {
        await base44.entities.StockLocation.update(editingLocation.id, formData);
        toast.success('Local atualizado');
      } else {
        await base44.entities.StockLocation.create(formData);
        toast.success('Local cadastrado');
      }
      setShowDialog(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Erro ao salvar local');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'loja',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      manager_name: '',
      phone: '',
      email: '',
      is_main: false,
      is_active: true
    });
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData(location);
    setShowDialog(true);
  };

  const typeLabels = {
    loja: 'Loja',
    deposito: 'Depósito',
    centro_distribuicao: 'Centro de Distribuição'
  };

  const filteredLocations = locations.filter(loc =>
    loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mainLocations = locations.filter(l => l.is_main).length;
  const activeLocations = locations.filter(l => l.is_active).length;

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
        title="Locais de Estoque"
        subtitle="Gerencie filiais e depositos"
        icon={Warehouse}
        actions={
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Local
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Locais"
          value={locations.length}
          icon={Warehouse}
        />
        <MiniMetric
          label="Locais Ativos"
          value={activeLocations}
          icon={Building2}
          status="success"
        />
        <MiniMetric
          label="Locais Principais"
          value={mainLocations}
          icon={Star}
          status="warning"
        />
      </Grid>

      {/* Filtro */}
      <CardSection>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map(location => (
          <CardSection key={location.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                {location.is_main && (
                  <Star className="w-4 h-4 text-warning fill-warning" />
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(location)} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>

            <h3 className="font-semibold mb-1">{location.name}</h3>
            {location.code && (
              <p className="text-xs text-muted-foreground mb-2">Codigo: {location.code}</p>
            )}

            <StatusBadge status="default" label={typeLabels[location.type]} className="mb-3" />

            {location.city && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                {location.city}/{location.state}
              </div>
            )}

            {location.manager_name && (
              <p className="text-sm text-muted-foreground">Resp.: {location.manager_name}</p>
            )}

            <div className="mt-3 pt-3 border-t border-border">
              <StatusBadge
                status={location.is_active ? 'success' : 'default'}
                label={location.is_active ? 'Ativo' : 'Inativo'}
              />
            </div>
          </CardSection>
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <CardSection>
          <div className="text-center py-8">
            <Warehouse className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum local encontrado</p>
          </div>
        </CardSection>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Editar Local' : 'Novo Local'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Local *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger className="border-[#E2E8F0] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="centro_distribuicao">Centro de Distribuição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Estado</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                maxLength={2}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>CEP</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Responsável</Label>
              <Input
                value={formData.manager_name}
                onChange={(e) => setFormData({...formData, manager_name: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_main}
                  onChange={(e) => setFormData({...formData, is_main: e.target.checked})}
                  className="rounded border-[#E2E8F0]"
                />
                <span className="text-sm text-[#64748B]">Local Principal</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded border-[#E2E8F0]"
                />
                <span className="text-sm text-[#64748B]">Ativo</span>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}