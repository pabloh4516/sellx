import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileEdit, Plus, Search, TrendingUp, TrendingDown, Upload, Package } from 'lucide-react';
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

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    batch_id: '',
    type: 'correcao',
    reason: 'inventario',
    quantity: 0,
    previous_quantity: 0,
    unit_cost: 0,
    justification: '',
    attachments: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [adjustmentsData, productsData, locationsData, batchesData, currentUser] = await Promise.all([
        base44.entities.StockAdjustment.list('-created_date'),
        base44.entities.Product.list(),
        base44.entities.StockLocation.list(),
        base44.entities.StockBatch.list(),
        base44.auth.me()
      ]);
      setAdjustments(adjustmentsData);
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

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      previous_quantity: product?.stock_quantity || 0,
      unit_cost: product?.cost_price || 0
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.product_id || !formData.justification) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      const allAdjustments = await base44.entities.StockAdjustment.list();
      const nextNumber = allAdjustments.length > 0 ? Math.max(...allAdjustments.map(a => a.adjustment_number || 0)) + 1 : 1;

      const newQuantity = formData.previous_quantity + formData.quantity;
      const totalValue = Math.abs(formData.quantity) * formData.unit_cost;

      await base44.entities.StockAdjustment.create({
        ...formData,
        adjustment_number: nextNumber,
        new_quantity: newQuantity,
        total_value: totalValue,
        approved_by: user?.email,
        adjustment_date: new Date().toISOString()
      });

      // Update product stock
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        await base44.entities.Product.update(formData.product_id, {
          stock_quantity: newQuantity
        });

        // Record stock movement
        await base44.entities.StockMovement.create({
          product_id: formData.product_id,
          type: 'ajuste',
          quantity: Math.abs(formData.quantity),
          previous_stock: formData.previous_quantity,
          new_stock: newQuantity,
          reference_type: 'ajuste',
          reason: formData.reason,
          movement_date: new Date().toISOString()
        });
      }

      toast.success('Ajuste registrado');
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast.error('Erro ao salvar ajuste');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        attachments: [...formData.attachments, result.file_url]
      });
      toast.success('Arquivo anexado');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao anexar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      location_id: '',
      batch_id: '',
      type: 'correcao',
      reason: 'inventario',
      quantity: 0,
      previous_quantity: 0,
      unit_cost: 0,
      justification: '',
      attachments: []
    });
  };

  const filteredAdjustments = adjustments.filter(adj => {
    const product = products.find(p => p.id === adj.product_id);
    const matchSearch = product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       adj.adjustment_number?.toString().includes(searchTerm);
    const matchType = typeFilter === 'all' || adj.type === typeFilter;
    return matchSearch && matchType;
  });

  const reasonLabels = {
    inventario: 'Inventario',
    avaria: 'Avaria',
    vencimento: 'Vencimento',
    perda: 'Perda',
    roubo: 'Roubo',
    devolucao: 'Devolucao',
    erro_sistema: 'Erro de Sistema',
    contagem: 'Contagem',
    outro: 'Outro'
  };

  const totalEntradas = adjustments.filter(a => a.quantity > 0).length;
  const totalSaidas = adjustments.filter(a => a.quantity < 0).length;
  const totalValue = adjustments.reduce((sum, a) => sum + (a.total_value || 0), 0);

  const getTypeStatus = (type) => {
    const typeMap = {
      entrada: { status: 'success', label: 'Entrada' },
      saida: { status: 'danger', label: 'Saida' },
      correcao: { status: 'info', label: 'Correcao' },
    };
    return typeMap[type] || { status: 'default', label: type };
  };

  const columns = [
    {
      key: 'number',
      label: '#',
      render: (_, adj) => (
        <span className="font-mono text-sm text-muted-foreground">#{adj.adjustment_number}</span>
      )
    },
    {
      key: 'product',
      label: 'Produto',
      render: (_, adj) => {
        const product = products.find(p => p.id === adj.product_id);
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{product?.name || '-'}</span>
          </div>
        );
      }
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (_, adj) => {
        const { status, label } = getTypeStatus(adj.type);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (_, adj) => (
        <span className="text-sm text-muted-foreground">{reasonLabels[adj.reason] || adj.reason}</span>
      )
    },
    {
      key: 'quantity',
      label: 'Quantidade',
      className: 'text-center',
      render: (_, adj) => {
        const isPositive = adj.quantity > 0;
        return (
          <div className="flex items-center justify-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className={`font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{adj.quantity}
            </span>
          </div>
        );
      }
    },
    {
      key: 'stock',
      label: 'Estoque',
      render: (_, adj) => (
        <span className="text-sm text-muted-foreground">
          {adj.previous_quantity} → <span className="font-medium text-foreground">{adj.new_quantity}</span>
        </span>
      )
    },
    {
      key: 'value',
      label: 'Valor',
      render: (_, adj) => (
        <span className="text-sm text-muted-foreground">R$ {(adj.total_value || 0).toFixed(2)}</span>
      )
    },
    {
      key: 'date',
      label: 'Data',
      render: (_, adj) => (
        <span className="text-sm text-muted-foreground">
          {safeFormatDate(adj.adjustment_date || adj.created_date, 'dd/MM/yyyy HH:mm')}
        </span>
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
        title="Ajustes de Estoque"
        subtitle="Registro de ajustes e justificativas"
        icon={FileEdit}
        actions={
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Ajuste
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Total de Ajustes"
          value={adjustments.length}
          icon={FileEdit}
        />
        <MiniMetric
          label="Entradas"
          value={totalEntradas}
          icon={TrendingUp}
          status="success"
        />
        <MiniMetric
          label="Saidas"
          value={totalSaidas}
          icon={TrendingDown}
          status="danger"
        />
        <MiniMetric
          label="Valor Total"
          value={`R$ ${totalValue.toFixed(2)}`}
          icon={Package}
          status="info"
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ajuste..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saida</SelectItem>
              <SelectItem value="correcao">Correcao</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredAdjustments}
          columns={columns}
          emptyMessage="Nenhum ajuste encontrado"
        />
      </CardSection>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ajuste de Estoque</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Produto *</Label>
                <Select value={formData.product_id} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Estoque: {product.stock_quantity || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saida</SelectItem>
                    <SelectItem value="correcao">Correcao</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Motivo *</Label>
                <Select value={formData.reason} onValueChange={(v) => setFormData({...formData, reason: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reasonLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantidade * (use negativo para saida)</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label>Custo Unitario</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            {formData.product_id && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Estoque Atual: <strong className="text-foreground">{formData.previous_quantity}</strong></p>
                  <p>Novo Estoque: <strong className="text-foreground">{formData.previous_quantity + formData.quantity}</strong></p>
                  {formData.unit_cost > 0 && (
                    <p>Valor Total: <strong className="text-foreground">
                      R$ {(Math.abs(formData.quantity) * formData.unit_cost).toFixed(2)}
                    </strong></p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label>Justificativa * (minimo 20 caracteres)</Label>
              <Textarea
                value={formData.justification}
                onChange={(e) => setFormData({...formData, justification: e.target.value})}
                rows={3}
                placeholder="Descreva detalhadamente o motivo do ajuste..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.justification.length}/20 caracteres
              </p>
            </div>

            <div>
              <Label>Anexos (fotos, documentos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
              </div>
              {formData.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {formData.attachments.map((url, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Anexo {idx + 1}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.product_id || !formData.justification || formData.justification.length < 20}
            >
              Registrar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
