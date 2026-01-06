import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search, Eye, FileText, DollarSign, Users, ShoppingCart, Plus, Edit,
  Trash2, Copy, Send, Printer, CheckCircle, XCircle, Clock, MoreVertical,
  MessageCircle, Calendar, AlertTriangle, ArrowRight, Package
} from 'lucide-react';
import { safeFormatDate, formatCurrency, cn } from '@/lib/utils';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  MetricCard,
  StatusBadge,
} from '@/components/nexo';
import { WhatsAppDialog } from '@/components/whatsapp/WhatsAppIntegration';

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Dialogs
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    seller_id: '',
    validity_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    notes: '',
    items: [],
    discount: 0,
    discount_type: 'percent',
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, customersData, productsData, sellersData] = await Promise.all([
        base44.entities.Sale.filter({ status: 'orcamento' }),
        base44.entities.Customer.list(),
        base44.entities.Product.list(),
        base44.entities.Seller.list()
      ]);
      setQuotes(salesData);
      setCustomers(customersData);
      setProducts(productsData);
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast.error('Erro ao carregar orcamentos');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';
  const getCustomer = (id) => customers.find(c => c.id === id);
  const getSellerName = (id) => sellers.find(s => s.id === id)?.name || '-';

  // Calcular estatisticas
  const stats = useMemo(() => {
    const now = new Date();
    const total = quotes.length;
    const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const expired = quotes.filter(q => q.validity_date && isBefore(parseISO(q.validity_date), now)).length;
    const expiringSoon = quotes.filter(q => {
      if (!q.validity_date) return false;
      const validity = parseISO(q.validity_date);
      const threeDaysFromNow = addDays(now, 3);
      return isAfter(validity, now) && isBefore(validity, threeDaysFromNow);
    }).length;

    return { total, totalValue, expired, expiringSoon };
  }, [quotes]);

  // Filtrar orcamentos
  const filteredQuotes = useMemo(() => {
    let filtered = quotes;

    // Filtro por tab
    const now = new Date();
    if (activeTab === 'active') {
      filtered = filtered.filter(q => !q.validity_date || isAfter(parseISO(q.validity_date), now));
    } else if (activeTab === 'expired') {
      filtered = filtered.filter(q => q.validity_date && isBefore(parseISO(q.validity_date), now));
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.sale_number?.toString().includes(term) ||
        getCustomerName(q.customer_id).toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [quotes, activeTab, searchTerm]);

  const getQuoteStatus = (quote) => {
    if (!quote.validity_date) return { status: 'info', label: 'Sem Validade' };

    const now = new Date();
    const validity = parseISO(quote.validity_date);
    const threeDaysFromNow = addDays(now, 3);

    if (isBefore(validity, now)) {
      return { status: 'error', label: 'Expirado' };
    }
    if (isBefore(validity, threeDaysFromNow)) {
      return { status: 'warning', label: 'Expirando' };
    }
    return { status: 'success', label: 'Valido' };
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    let discount = 0;
    if (formData.discount_type === 'percent') {
      discount = (subtotal * formData.discount) / 100;
    } else {
      discount = formData.discount;
    }
    return Math.max(0, subtotal - discount);
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: productQuantity,
      unit_price: product.sale_price,
      total: productQuantity * product.sale_price
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setSelectedProduct('');
    setProductQuantity(1);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItemQuantity = (index, quantity) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            quantity,
            total: quantity * item.unit_price
          };
        }
        return item;
      })
    }));
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast.error('Selecione um cliente');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    try {
      const total = calculateTotal();
      const quoteData = {
        customer_id: formData.customer_id,
        seller_id: formData.seller_id,
        status: 'orcamento',
        items: formData.items,
        subtotal: formData.items.reduce((sum, item) => sum + item.total, 0),
        discount: formData.discount,
        discount_type: formData.discount_type,
        total,
        validity_date: formData.validity_date,
        notes: formData.notes,
      };

      if (editingQuote) {
        await base44.entities.Sale.update(editingQuote.id, quoteData);
        toast.success('Orcamento atualizado!');
      } else {
        await base44.entities.Sale.create(quoteData);
        toast.success('Orcamento criado!');
      }

      setShowFormDialog(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Erro ao salvar orcamento');
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setFormData({
      customer_id: quote.customer_id || '',
      seller_id: quote.seller_id || '',
      validity_date: quote.validity_date || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      notes: quote.notes || '',
      items: quote.items || [],
      discount: quote.discount || 0,
      discount_type: quote.discount_type || 'percent',
    });
    setShowFormDialog(true);
  };

  const handleDuplicate = (quote) => {
    setEditingQuote(null);
    setFormData({
      customer_id: quote.customer_id || '',
      seller_id: quote.seller_id || '',
      validity_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      notes: quote.notes || '',
      items: quote.items || [],
      discount: quote.discount || 0,
      discount_type: quote.discount_type || 'percent',
    });
    setShowFormDialog(true);
    toast.info('Orcamento duplicado - edite e salve');
  };

  const handleConvertToSale = async (quote) => {
    if (!confirm('Deseja converter este orcamento em venda?')) return;

    try {
      await base44.entities.Sale.update(quote.id, {
        status: 'concluida',
        sale_date: new Date().toISOString()
      });
      toast.success('Orcamento convertido em venda!');
      loadData();
    } catch (error) {
      console.error('Error converting quote:', error);
      toast.error('Erro ao converter orcamento');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este orcamento?')) return;

    try {
      await base44.entities.Sale.delete(id);
      toast.success('Orcamento excluido!');
      loadData();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Erro ao excluir orcamento');
    }
  };

  const handleView = (quote) => {
    setSelectedQuote(quote);
    setShowViewDialog(true);
  };

  const handleSendWhatsApp = (quote) => {
    const customer = getCustomer(quote.customer_id);
    if (!customer) {
      toast.error('Cliente nao encontrado');
      return;
    }
    setSelectedQuote({ ...quote, customer });
    setShowWhatsAppDialog(true);
  };

  const handlePrint = (quote) => {
    // Gerar conteudo para impressao
    const customer = getCustomer(quote.customer_id);
    const printContent = `
      <html>
      <head>
        <title>Orcamento #${quote.sale_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .total { font-size: 18px; font-weight: bold; text-align: right; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <h1>ORCAMENTO #${quote.sale_number}</h1>
        <p><strong>Cliente:</strong> ${customer?.name || '-'}</p>
        <p><strong>Data:</strong> ${safeFormatDate(quote.created_date)}</p>
        <p><strong>Validade:</strong> ${quote.validity_date ? safeFormatDate(quote.validity_date) : 'Nao definida'}</p>

        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Preco Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items?.map(item => `
              <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>R$ ${item.unit_price?.toFixed(2)}</td>
                <td>R$ ${item.total?.toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <p class="total">TOTAL: R$ ${quote.total?.toFixed(2)}</p>

        ${quote.notes ? `<p><strong>Observacoes:</strong> ${quote.notes}</p>` : ''}

        <div class="footer">
          <p>Este orcamento e valido ate ${quote.validity_date ? safeFormatDate(quote.validity_date) : 'data nao definida'}.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      seller_id: '',
      validity_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      notes: '',
      items: [],
      discount: 0,
      discount_type: 'percent',
    });
    setEditingQuote(null);
    setSelectedProduct('');
    setProductQuantity(1);
  };

  const columns = [
    {
      key: 'sale_number',
      label: 'Numero',
      render: (_, quote) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="font-mono font-medium">#{quote.sale_number}</span>
        </div>
      )
    },
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, quote) => (
        <span className="font-medium">{getCustomerName(quote.customer_id)}</span>
      )
    },
    {
      key: 'date',
      label: 'Data',
      render: (_, quote) => (
        <span className="text-muted-foreground text-sm">
          {safeFormatDate(quote.created_date)}
        </span>
      )
    },
    {
      key: 'validity',
      label: 'Validade',
      render: (_, quote) => {
        const { status, label } = getQuoteStatus(quote);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{quote.validity_date ? safeFormatDate(quote.validity_date) : '-'}</span>
            <StatusBadge status={status} label={label} />
          </div>
        );
      }
    },
    {
      key: 'items',
      label: 'Itens',
      className: 'text-center',
      render: (_, quote) => (
        <Badge variant="outline">{quote.items?.length || 0}</Badge>
      )
    },
    {
      key: 'total',
      label: 'Total',
      className: 'text-right',
      render: (_, quote) => (
        <span className="font-bold text-primary">{formatCurrency(quote.total)}</span>
      )
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, quote) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(quote)}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(quote)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSendWhatsApp(quote)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint(quote)}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleConvertToSale(quote)}>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Converter em Venda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        title="Orcamentos"
        subtitle="Gerencie seus orcamentos e propostas comerciais"
        icon={FileText}
        actions={
          <Button onClick={() => { resetForm(); setShowFormDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Orcamento
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MetricCard
          title="Total de Orcamentos"
          value={stats.total}
          icon={FileText}
        />
        <MetricCard
          title="Valor Total"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          variant="success"
        />
        <MetricCard
          title="Expirando em Breve"
          value={stats.expiringSoon}
          icon={Clock}
          variant={stats.expiringSoon > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Expirados"
          value={stats.expired}
          icon={AlertTriangle}
          variant={stats.expired > 0 ? "error" : "default"}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              Todos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active">
              Validos
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expirados ({stats.expired})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredQuotes}
          columns={columns}
          emptyMessage="Nenhum orcamento encontrado"
        />
      </CardSection>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { setShowFormDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuote ? 'Editar' : 'Novo'} Orcamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Dados basicos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select value={formData.seller_id} onValueChange={(v) => setFormData({...formData, seller_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(seller => (
                      <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Validade do Orcamento</Label>
              <Input
                type="date"
                value={formData.validity_date}
                onChange={(e) => setFormData({...formData, validity_date: e.target.value})}
              />
            </div>

            {/* Adicionar produtos */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <Label>Adicionar Produto</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.sale_price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-24"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                />
                <Button type="button" onClick={handleAddItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lista de itens */}
            {formData.items.length > 0 && (
              <div>
                <Label>Itens do Orcamento</Label>
                <div className="border rounded-lg mt-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-16 h-8"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                            min={1}
                          />
                          <span className="text-sm text-muted-foreground">x {formatCurrency(item.unit_price)}</span>
                        </div>
                        <span className="font-medium w-24 text-right">{formatCurrency(item.total)}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Desconto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desconto</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})}
                  />
                  <Select value={formData.discount_type} onValueChange={(v) => setFormData({...formData, discount_type: v})}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="value">R$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total do Orcamento</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            </div>

            {/* Observacoes */}
            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Observacoes adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFormDialog(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingQuote ? 'Atualizar' : 'Criar'} Orcamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Orcamento #{selectedQuote?.sale_number}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{getCustomerName(selectedQuote.customer_id)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{safeFormatDate(selectedQuote.created_date)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Validade</p>
                  <p className="font-medium">{selectedQuote.validity_date ? safeFormatDate(selectedQuote.validity_date) : '-'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{getSellerName(selectedQuote.seller_id)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Itens</h4>
                <div className="border rounded-lg">
                  {selectedQuote.items?.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="text-right">
                  {selectedQuote.discount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Desconto: -{selectedQuote.discount_type === 'percent' ? `${selectedQuote.discount}%` : formatCurrency(selectedQuote.discount)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary">{formatCurrency(selectedQuote.total)}</p>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Observacoes</p>
                  <p>{selectedQuote.notes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => handlePrint(selectedQuote)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={() => { setShowViewDialog(false); handleSendWhatsApp(selectedQuote); }}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={() => { setShowViewDialog(false); handleConvertToSale(selectedQuote); }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Converter em Venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      {selectedQuote?.customer && (
        <WhatsAppDialog
          open={showWhatsAppDialog}
          onOpenChange={setShowWhatsAppDialog}
          customer={selectedQuote.customer}
          sale={selectedQuote}
        />
      )}
    </PageContainer>
  );
}
