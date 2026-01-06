import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus, Search, Truck, CheckCircle, X, Package, Clock } from 'lucide-react';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    from_location_id: '',
    to_location_id: '',
    items: [],
    notes: '',
    tracking_code: ''
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    batch_id: '',
    quantity: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transfersData, productsData, locationsData, batchesData, currentUser] = await Promise.all([
        base44.entities.StockTransfer.list('-created_date'),
        base44.entities.Product.list(),
        base44.entities.StockLocation.list(),
        base44.entities.StockBatch.list(),
        base44.auth.me()
      ]);
      setTransfers(transfersData);
      setProducts(productsData);
      setLocations(locationsData);
      setBatches(batchesData);
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!currentItem.product_id || !currentItem.quantity) {
      toast.error('Selecione produto e quantidade');
      return;
    }

    const product = products.find(p => p.id === currentItem.product_id);
    const batch = batches.find(b => b.id === currentItem.batch_id);

    setFormData({
      ...formData,
      items: [...formData.items, {
        ...currentItem,
        product_name: product.name,
        batch_number: batch?.batch_number
      }]
    });

    setCurrentItem({ product_id: '', batch_id: '', quantity: 0 });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.from_location_id || !formData.to_location_id || formData.items.length === 0) {
        toast.error('Preencha todos os campos obrigatorios');
        return;
      }

      const allTransfers = await base44.entities.StockTransfer.list();
      const nextNumber = allTransfers.length > 0 ? Math.max(...allTransfers.map(t => t.transfer_number || 0)) + 1 : 1;

      await base44.entities.StockTransfer.create({
        ...formData,
        transfer_number: nextNumber,
        status: 'pendente',
        requested_by: user?.email,
        transfer_date: new Date().toISOString()
      });

      toast.success('Transferencia criada');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving transfer:', error);
      toast.error('Erro ao salvar transferencia');
    }
  };

  const handleReceive = async (transfer) => {
    try {
      await base44.entities.StockTransfer.update(transfer.id, {
        status: 'recebida',
        received_by: user?.email,
        received_date: new Date().toISOString()
      });

      // Update batch locations
      for (const item of transfer.items) {
        if (item.batch_id) {
          const batch = batches.find(b => b.id === item.batch_id);
          if (batch) {
            await base44.entities.StockBatch.update(item.batch_id, {
              location_id: transfer.to_location_id
            });
          }
        }
      }

      toast.success('Transferencia recebida');
      loadData();
    } catch (error) {
      console.error('Error receiving transfer:', error);
      toast.error('Erro ao receber transferencia');
    }
  };

  const handleCancel = async (transfer) => {
    try {
      await base44.entities.StockTransfer.update(transfer.id, {
        status: 'cancelada'
      });
      toast.success('Transferencia cancelada');
      loadData();
    } catch (error) {
      console.error('Error canceling transfer:', error);
      toast.error('Erro ao cancelar transferencia');
    }
  };

  const resetForm = () => {
    setFormData({
      from_location_id: '',
      to_location_id: '',
      items: [],
      notes: '',
      tracking_code: ''
    });
    setCurrentItem({ product_id: '', batch_id: '', quantity: 0 });
  };

  const availableBatches = batches.filter(b =>
    b.product_id === currentItem.product_id &&
    b.location_id === formData.from_location_id &&
    b.status === 'ativo'
  );

  const filteredTransfers = transfers.filter(transfer => {
    const fromLocation = locations.find(l => l.id === transfer.from_location_id);
    const toLocation = locations.find(l => l.id === transfer.to_location_id);
    const matchSearch =
      transfer.transfer_number?.toString().includes(searchTerm) ||
      fromLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toLocation?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || transfer.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      pendente: { status: 'warning', label: 'Pendente' },
      em_transito: { status: 'info', label: 'Em Transito' },
      recebida: { status: 'success', label: 'Recebida' },
      cancelada: { status: 'danger', label: 'Cancelada' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  const totalPendentes = transfers.filter(t => t.status === 'pendente').length;
  const totalEmTransito = transfers.filter(t => t.status === 'em_transito').length;
  const totalRecebidas = transfers.filter(t => t.status === 'recebida').length;

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
        title="Transferencias de Estoque"
        subtitle="Movimentacoes entre locais"
        icon={ArrowRightLeft}
        actions={
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Transferencia
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Transferencias"
          value={transfers.length}
          icon={ArrowRightLeft}
        />
        <MiniMetric
          label="Pendentes"
          value={totalPendentes}
          icon={Clock}
          status={totalPendentes > 0 ? 'warning' : 'default'}
        />
        <MiniMetric
          label="Em Transito"
          value={totalEmTransito}
          icon={Truck}
          status="info"
        />
        <MiniMetric
          label="Recebidas"
          value={totalRecebidas}
          icon={CheckCircle}
          status="success"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transferencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_transito">Em Transito</SelectItem>
              <SelectItem value="recebida">Recebida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Lista de Transferencias */}
      <div className="space-y-4">
        {filteredTransfers.map(transfer => {
          const fromLocation = locations.find(l => l.id === transfer.from_location_id);
          const toLocation = locations.find(l => l.id === transfer.to_location_id);
          const badgeInfo = getStatusBadge(transfer.status);

          return (
            <CardSection key={transfer.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Transferencia #{transfer.transfer_number}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{fromLocation?.name}</span>
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>{toLocation?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={badgeInfo.status} label={badgeInfo.label} />

                  {transfer.status === 'pendente' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReceive(transfer)}
                        className="bg-success hover:bg-success/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Receber
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(transfer)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {transfer.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
                    <span className="font-medium">{item.product_name}</span>
                    <div className="flex items-center gap-4">
                      {item.batch_number && (
                        <span className="text-muted-foreground font-mono text-xs">Lote: {item.batch_number}</span>
                      )}
                      <StatusBadge status="info" label={`${item.quantity} un`} />
                    </div>
                  </div>
                ))}
              </div>

              {transfer.notes && (
                <p className="text-sm text-muted-foreground mt-3 italic">{transfer.notes}</p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>Criado: {safeFormatDate(transfer.created_date, 'dd/MM/yyyy HH:mm')}</span>
                {transfer.received_date && (
                  <span>Recebido: {safeFormatDate(transfer.received_date, 'dd/MM/yyyy HH:mm')}</span>
                )}
              </div>
            </CardSection>
          );
        })}
      </div>

      {filteredTransfers.length === 0 && (
        <CardSection>
          <div className="text-center py-8">
            <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma transferencia encontrada</p>
          </div>
        </CardSection>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Transferencia</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Local de Origem *</Label>
                <Select value={formData.from_location_id} onValueChange={(v) => setFormData({...formData, from_location_id: v})}>
                  <SelectTrigger>
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
                <Label>Local de Destino *</Label>
                <Select value={formData.to_location_id} onValueChange={(v) => setFormData({...formData, to_location_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== formData.from_location_id).map(location => (
                      <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4">
              <Label className="mb-3 block">Adicionar Itens</Label>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <Select value={currentItem.product_id} onValueChange={(v) => setCurrentItem({...currentItem, product_id: v, batch_id: ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-4">
                  <Select value={currentItem.batch_id} onValueChange={(v) => setCurrentItem({...currentItem, batch_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Lote (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batch_number} ({batch.quantity} un)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={currentItem.quantity || ''}
                    onChange={(e) => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="col-span-1">
                  <Button onClick={addItem} className="w-full">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {formData.items.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        {item.batch_number && (
                          <span className="text-xs text-muted-foreground ml-2">Lote: {item.batch_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status="default" label={`${item.quantity} un`} />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Codigo de Rastreamento</Label>
              <Input
                value={formData.tracking_code}
                onChange={(e) => setFormData({...formData, tracking_code: e.target.value})}
              />
            </div>

            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Criar Transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
