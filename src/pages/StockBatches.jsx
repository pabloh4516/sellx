import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, Plus, Search, Calendar, AlertTriangle, Layers } from 'lucide-react';
import { differenceInDays } from 'date-fns';
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

export default function StockBatches() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    product_id: '',
    batch_number: '',
    location_id: '',
    quantity: 0,
    manufacturing_date: '',
    expiry_date: '',
    cost_price: 0,
    status: 'ativo',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchesData, productsData, locationsData] = await Promise.all([
        base44.entities.StockBatch.list('-created_date'),
        base44.entities.Product.list(),
        base44.entities.StockLocation.list()
      ]);
      setBatches(batchesData);
      setProducts(productsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.product_id || !formData.batch_number || !formData.quantity) {
        toast.error('Preencha os campos obrigatórios');
        return;
      }

      // Limpar dados - converter strings vazias em null
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === '' || cleanData[key] === undefined) {
          cleanData[key] = null;
        }
      });
      cleanData.quantity = parseFloat(cleanData.quantity) || 0;
      cleanData.cost_price = parseFloat(cleanData.cost_price) || 0;

      await base44.entities.StockBatch.create(cleanData);
      toast.success('Lote cadastrado');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving batch:', error);
      toast.error('Erro ao salvar lote');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      batch_number: '',
      location_id: '',
      quantity: 0,
      manufacturing_date: '',
      expiry_date: '',
      cost_price: 0,
      status: 'ativo',
      notes: ''
    });
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { status: 'danger', label: 'Vencido' };
    if (days <= 30) return { status: 'warning', label: `${days}d restantes` };
    return { status: 'success', label: 'No prazo' };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ativo: { status: 'success', label: 'Ativo' },
      vencido: { status: 'danger', label: 'Vencido' },
      bloqueado: { status: 'warning', label: 'Bloqueado' },
      descartado: { status: 'default', label: 'Descartado' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const filteredBatches = batches.filter(batch => {
    const product = products.find(p => p.id === batch.product_id);
    const matchSearch = product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeBatches = batches.filter(b => b.status === 'ativo').length;
  const expiringBatches = batches.filter(b => {
    if (!b.expiry_date) return false;
    const days = differenceInDays(new Date(b.expiry_date), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const expiredBatches = batches.filter(b => b.status === 'vencido').length;

  const columns = [
    {
      key: 'product',
      label: 'Produto',
      render: (_, batch) => {
        const product = products.find(p => p.id === batch.product_id);
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{product?.name || '-'}</span>
          </div>
        );
      }
    },
    {
      key: 'batch_number',
      label: 'Lote',
      render: (_, batch) => (
        <span className="font-mono text-sm text-muted-foreground">{batch.batch_number}</span>
      )
    },
    {
      key: 'location',
      label: 'Local',
      render: (_, batch) => {
        const location = locations.find(l => l.id === batch.location_id);
        return <span className="text-muted-foreground">{location?.name || '-'}</span>;
      }
    },
    {
      key: 'quantity',
      label: 'Quantidade',
      className: 'text-center',
      render: (_, batch) => (
        <StatusBadge status="info" label={batch.quantity} />
      )
    },
    {
      key: 'manufacturing_date',
      label: 'Fabricacao',
      render: (_, batch) => (
        <span className="text-muted-foreground text-sm">{safeFormatDate(batch.manufacturing_date)}</span>
      )
    },
    {
      key: 'expiry_date',
      label: 'Validade',
      render: (_, batch) => {
        if (!batch.expiry_date) return <span className="text-muted-foreground">-</span>;
        const expiryStatus = getExpiryStatus(batch.expiry_date);
        return (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{safeFormatDate(batch.expiry_date)}</span>
            {expiryStatus && <StatusBadge status={expiryStatus.status} label={expiryStatus.label} />}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, batch) => {
        const { status, label } = getStatusBadge(batch.status);
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
        title="Lotes de Estoque"
        subtitle="Controle de lotes e validades"
        icon={Layers}
        actions={
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Lote
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Lotes"
          value={batches.length}
          icon={Layers}
        />
        <MiniMetric
          label="Lotes Ativos"
          value={activeBatches}
          icon={Package}
          status="success"
        />
        <MiniMetric
          label="Vencendo (30d)"
          value={expiringBatches}
          icon={AlertTriangle}
          status={expiringBatches > 0 ? 'warning' : 'default'}
        />
        <MiniMetric
          label="Vencidos"
          value={expiredBatches}
          icon={Calendar}
          status={expiredBatches > 0 ? 'danger' : 'default'}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto ou lote..."
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
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredBatches}
          columns={columns}
          emptyMessage="Nenhum lote encontrado"
        />
      </CardSection>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Lote</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Produto *</Label>
              <Select value={formData.product_id} onValueChange={(v) => setFormData({...formData, product_id: v})}>
                <SelectTrigger className="border-[#E2E8F0] rounded-lg">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Número do Lote *</Label>
              <Input
                value={formData.batch_number}
                onChange={(e) => setFormData({...formData, batch_number: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Local</Label>
              <Select value={formData.location_id} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                <SelectTrigger className="border-[#E2E8F0] rounded-lg">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Preço de Custo</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Data de Fabricação</Label>
              <Input
                type="date"
                value={formData.manufacturing_date}
                onChange={(e) => setFormData({...formData, manufacturing_date: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div>
              <Label>Data de Validade</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
            
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}