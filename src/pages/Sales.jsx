import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Eye, Receipt, User, Calendar, TrendingUp, DollarSign, ShoppingBag, Edit2, Save, X, Plus, Minus, Trash2, Lock, Filter, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  Currency,
  MiniMetric,
} from '@/components/nexo';
import { ExportMenu } from '@/components/ui/export-menu';

export default function Sales() {
  const { operator, can } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [saving, setSaving] = useState(false);

  // Verificar se pode ver todas as vendas (admin, owner, gerente)
  const canViewAllSales = can('sales.view_all');
  // Verificar se pode editar vendas (mesma permissao de ver todas)
  const canEditSales = canViewAllSales;
  // Verificar se pode ver lucro/custo (apenas quem tem acesso a relatorios)
  const canViewProfit = can('reports.sales');

  useEffect(() => {
    loadData();
  }, [operator]);

  const loadData = async () => {
    try {
      const [salesData, customersData, sellersData, productsData, operatorsData] = await Promise.all([
        base44.entities.Sale.list('-sale_date'),
        base44.entities.Customer.list(),
        base44.entities.Seller.list(),
        base44.entities.Product.list(),
        base44.entities.Profile.list()
      ]);

      // Se nao pode ver todas as vendas, filtrar apenas as do operador atual
      let filteredSalesData = salesData;
      if (!canViewAllSales && operator?.id) {
        // Filtrar por operator_id (operador) ou seller_id para retrocompatibilidade
        filteredSalesData = salesData.filter(sale =>
          sale.operator_id === operator.id || sale.seller_id === operator.id
        );
      }

      setSales(filteredSalesData);
      setCustomers(customersData);
      setSellers(sellersData);
      setOperators(operatorsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || 'Consumidor Final';
  const getSellerName = (id) => sellers.find(s => s.id === id)?.name || '-';
  const getOperatorName = (id) => operators.find(o => o.id === id)?.full_name || '-';
  // Retorna nome do vendedor, ou do operador como fallback
  const getSaleResponsible = (sale) => {
    if (sale.seller_id) {
      const seller = sellers.find(s => s.id === sale.seller_id);
      if (seller) return seller.name;
    }
    if (sale.operator_id) {
      const op = operators.find(o => o.id === sale.operator_id);
      if (op) return op.full_name;
    }
    return '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Função para verificar se a data está no período selecionado
  const isDateInRange = (dateStr) => {
    if (!dateStr) return false;
    const saleDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        return saleDate >= today && saleDate <= endOfToday;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return saleDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return saleDate >= monthAgo;
      case 'custom':
        if (!startDate && !endDate) return true;
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
      default:
        return true;
    }
  };

  // Extrair formas de pagamento únicas
  const paymentMethods = [...new Set(
    sales.flatMap(s => (s.payments || []).map(p => p.method_name || p.method))
  )].filter(Boolean);

  const filteredSales = sales.filter(sale => {
    const matchSearch =
      sale.sale_number?.toString().includes(searchTerm) ||
      getCustomerName(sale.customer_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || sale.status === statusFilter;
    // Filtro por funcionario (operator_id ou seller_id)
    const matchEmployee = employeeFilter === 'all' ||
      sale.operator_id === employeeFilter ||
      sale.seller_id === employeeFilter;
    // Filtro por data
    const matchDate = dateFilter === 'all' || isDateInRange(sale.sale_date || sale.created_at);
    // Filtro por forma de pagamento
    const matchPayment = paymentFilter === 'all' ||
      (sale.payments || []).some(p => (p.method_name || p.method) === paymentFilter);
    return matchSearch && matchStatus && matchEmployee && matchDate && matchPayment;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      concluida: { status: 'success', label: 'Concluida' },
      orcamento: { status: 'info', label: 'Orcamento' },
      prevenda: { status: 'warning', label: 'Pre-venda' },
      cancelada: { status: 'danger', label: 'Cancelada' },
    };
    return statusMap[status] || { status: 'default', label: status };
  };

  // Funcoes de edicao
  const openEditModal = (sale) => {
    setEditingSale({
      ...sale,
      items: sale.items || [],
      payments: sale.payments || [],
      discount: sale.discount || 0,
      discount_type: sale.discount_type || 'value',
      operator_id: sale.operator_id || null,
      seller_id: sale.seller_id || null
    });
    setShowEditModal(true);
  };

  const updateEditingField = (field, value) => {
    setEditingSale(prev => ({ ...prev, [field]: value }));
  };

  const updateEditingItem = (index, field, value) => {
    const newItems = [...editingSale.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    // Recalcular totais
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discount = editingSale.discount || 0;
    const discountValue = editingSale.discount_type === 'percent'
      ? (subtotal * discount / 100)
      : discount;
    const total = subtotal - discountValue;
    const costTotal = newItems.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);

    setEditingSale(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      total,
      cost_total: costTotal,
      profit: total - costTotal
    }));
  };

  const removeEditingItem = (index) => {
    const newItems = editingSale.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discount = editingSale.discount || 0;
    const discountValue = editingSale.discount_type === 'percent'
      ? (subtotal * discount / 100)
      : discount;
    const total = subtotal - discountValue;
    const costTotal = newItems.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);

    setEditingSale(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      total,
      cost_total: costTotal,
      profit: total - costTotal
    }));
  };

  const recalculateTotals = (sale) => {
    const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
    const discount = sale.discount || 0;
    const discountValue = sale.discount_type === 'percent'
      ? (subtotal * discount / 100)
      : discount;
    const total = subtotal - discountValue;
    const costTotal = sale.items.reduce((sum, item) => sum + ((item.cost_price || 0) * item.quantity), 0);

    return {
      ...sale,
      subtotal,
      total,
      cost_total: costTotal,
      profit: total - costTotal
    };
  };

  const handleDiscountChange = (value) => {
    const discount = parseFloat(value) || 0;
    const updated = recalculateTotals({ ...editingSale, discount });
    setEditingSale(updated);
  };

  const handleDiscountTypeChange = (type) => {
    const updated = recalculateTotals({ ...editingSale, discount_type: type });
    setEditingSale(updated);
  };

  const saveSaleChanges = async () => {
    if (!editingSale) return;

    setSaving(true);
    try {
      const dataToUpdate = {
        customer_id: editingSale.customer_id,
        seller_id: editingSale.seller_id,
        operator_id: editingSale.operator_id,
        items: editingSale.items,
        subtotal: editingSale.subtotal,
        discount: editingSale.discount,
        discount_type: editingSale.discount_type,
        total: editingSale.total,
        cost_total: editingSale.cost_total,
        profit: editingSale.profit,
        status: editingSale.status,
        notes: editingSale.notes
      };

      await base44.entities.Sale.update(editingSale.id, dataToUpdate);

      // Atualizar lista local
      setSales(prev => prev.map(s =>
        s.id === editingSale.id ? { ...s, ...dataToUpdate } : s
      ));

      toast.success('Venda atualizada com sucesso!');
      setShowEditModal(false);
      setEditingSale(null);
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error('Erro ao atualizar venda');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'sale_number',
      label: 'N Venda',
      width: '100px',
      render: (_, sale) => (
        <span className="font-mono font-bold text-primary">#{sale.sale_number}</span>
      )
    },
    {
      key: 'sale_date',
      label: 'Data/Hora',
      width: '160px',
      render: (_, sale) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(sale.sale_date || sale.created_date)}</span>
        </div>
      )
    },
    {
      key: 'customer_id',
      label: 'Cliente',
      render: (_, sale) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium">{getCustomerName(sale.customer_id)}</span>
        </div>
      )
    },
    // Mostrar coluna de vendedor/operador apenas se pode ver todas as vendas
    ...(canViewAllSales ? [{
      key: 'seller_id',
      label: 'Vendedor',
      render: (_, sale) => (
        <span className="text-muted-foreground">{getSaleResponsible(sale)}</span>
      )
    }] : []),
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      width: '120px',
      render: (_, sale) => (
        <span className="font-bold">{formatCurrency(sale.total)}</span>
      )
    },
    // Mostrar coluna de lucro apenas se tem permissao
    ...(canViewProfit ? [{
      key: 'profit',
      label: 'Lucro',
      align: 'right',
      width: '110px',
      render: (_, sale) => (
        <span className="font-medium text-success">{formatCurrency(sale.profit)}</span>
      )
    }] : []),
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      width: '110px',
      render: (_, sale) => {
        const { status, label } = getStatusBadge(sale.status);
        return <StatusBadge status={status} label={label} />;
      }
    },
    {
      key: 'actions',
      label: 'Acoes',
      align: 'center',
      width: '80px',
      render: (_, sale) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedSale(sale);
              setShowDetails(true);
            }}
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canEditSales && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(sale)}
              title="Editar venda"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
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
        title={canViewAllSales ? "Historico de Vendas" : "Minhas Vendas"}
        subtitle={`${filteredSales.length} vendas encontradas`}
        icon={Receipt}
        actions={
          <ExportMenu
            data={filteredSales.map(sale => {
              const baseData = {
                numero: sale.sale_number,
                data: formatDate(sale.sale_date || sale.created_date),
                cliente: getCustomerName(sale.customer_id),
                itens: sale.items?.length || 0,
                subtotal: sale.subtotal || 0,
                desconto: sale.discount || 0,
                total: sale.total || 0,
                status: sale.status,
              };
              // Adicionar dados extras apenas se tem permissao
              if (canViewAllSales) {
                baseData.vendedor = getSaleResponsible(sale);
              }
              if (canViewProfit) {
                baseData.custo = sale.cost_total || 0;
                baseData.lucro = sale.profit || 0;
              }
              return baseData;
            })}
            filename={`vendas-${format(new Date(), 'yyyy-MM-dd')}`}
            columns={[
              { key: 'numero', label: 'N Venda' },
              { key: 'data', label: 'Data/Hora' },
              { key: 'cliente', label: 'Cliente' },
              ...(canViewAllSales ? [{ key: 'vendedor', label: 'Vendedor' }] : []),
              { key: 'itens', label: 'Qtd Itens' },
              { key: 'subtotal', label: 'Subtotal' },
              { key: 'desconto', label: 'Desconto' },
              { key: 'total', label: 'Total' },
              ...(canViewProfit ? [
                { key: 'custo', label: 'Custo' },
                { key: 'lucro', label: 'Lucro' },
              ] : []),
              { key: 'status', label: 'Status' },
            ]}
          />
        }
      />

      {/* Metricas */}
      <Grid cols={canViewProfit ? 4 : 3}>
        <MiniMetric
          label="Total de Vendas"
          value={filteredSales.length}
          icon={ShoppingBag}
        />
        <MiniMetric
          label="Valor Total"
          value={formatCurrency(totalSales)}
          icon={DollarSign}
          status="success"
        />
        {canViewProfit && (
          <MiniMetric
            label="Lucro Total"
            value={formatCurrency(totalProfit)}
            icon={TrendingUp}
            status="success"
          />
        )}
        <MiniMetric
          label="Ticket Medio"
          value={formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
          icon={Receipt}
        />
      </Grid>

      {/* Filtros */}
      <CardSection>
        <div className="space-y-4">
          {/* Linha principal de filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Filtro rapido de periodo */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo periodo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Ultimos 7 dias</SelectItem>
                <SelectItem value="month">Ultimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="concluida">Concluida</SelectItem>
                <SelectItem value="orcamento">Orcamento</SelectItem>
                <SelectItem value="prevenda">Pre-venda</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Mais filtros
            </Button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              {/* Datas customizadas */}
              {dateFilter === 'custom' && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">De:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Ate:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </>
              )}
              {/* Filtro por forma de pagamento */}
              {paymentMethods.length > 0 && (
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-48">
                    <CreditCard className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as formas</SelectItem>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Filtro por funcionario - apenas para admin/gerente/owner */}
              {canViewAllSales && operators.length > 0 && (
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-56">
                    <User className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por funcionario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os funcionarios</SelectItem>
                    {operators.map(op => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.full_name || op.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Botao limpar filtros */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter('all');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setEmployeeFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setSearchTerm('');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </CardSection>

      {/* Tabela */}
      <CardSection noPadding>
        <DataTable
          data={filteredSales}
          columns={columns}
          emptyMessage="Nenhuma venda encontrada"
        />
      </CardSection>

      {/* Modal de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Detalhes da Venda #{selectedSale?.sale_number}
            </DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{getCustomerName(selectedSale.customer_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor/Operador</p>
                  <p className="font-medium">{getSaleResponsible(selectedSale)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {formatDate(selectedSale.sale_date || selectedSale.created_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {(() => {
                    const { status, label } = getStatusBadge(selectedSale.status);
                    return <StatusBadge status={status} label={label} />;
                  })()}
                </div>
              </div>

              {/* Itens */}
              <div>
                <h3 className="font-semibold mb-3">Itens da Venda</h3>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Produto</th>
                        <th className="text-center px-4 py-3 font-semibold">Qtd</th>
                        <th className="text-right px-4 py-3 font-semibold">Preco Un.</th>
                        <th className="text-right px-4 py-3 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-4 py-3">{item.product_name}</td>
                          <td className="text-center px-4 py-3">{item.quantity}</td>
                          <td className="text-right px-4 py-3">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right px-4 py-3 font-medium">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totais */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {/* Pagamentos */}
              {selectedSale.payments && selectedSale.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Formas de Pagamento</h3>
                  <div className="space-y-2">
                    {selectedSale.payments.map((payment, index) => (
                      <div key={index} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                        <span>{payment.method_name}</span>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edicao */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Editar Venda #{editingSale?.sale_number}
            </DialogTitle>
          </DialogHeader>

          {editingSale && (
            <div className="space-y-6">
              {/* Cliente e Vendedor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Select
                    value={editingSale.customer_id || 'none'}
                    onValueChange={(v) => updateEditingField('customer_id', v === 'none' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Consumidor Final</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vendedor/Operador</Label>
                  <Select
                    value={editingSale.operator_id || editingSale.seller_id || 'none'}
                    onValueChange={(v) => {
                      if (v === 'none') {
                        updateEditingField('operator_id', null);
                        updateEditingField('seller_id', null);
                      } else {
                        // Verificar se e um operator ou seller
                        const isOperator = operators.find(o => o.id === v);
                        if (isOperator) {
                          updateEditingField('operator_id', v);
                          updateEditingField('seller_id', null);
                        } else {
                          updateEditingField('seller_id', v);
                          updateEditingField('operator_id', null);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vendedor</SelectItem>
                      {operators.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                            Operadores
                          </div>
                          {operators.map(op => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.full_name || op.email}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {sellers.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">
                            Vendedores Cadastrados
                          </div>
                          {sellers.map(seller => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editingSale.status || 'concluida'}
                    onValueChange={(v) => updateEditingField('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concluida">Concluida</SelectItem>
                      <SelectItem value="orcamento">Orcamento</SelectItem>
                      <SelectItem value="prevenda">Pre-venda</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Desconto</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={editingSale.discount || ''}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      className="flex-1"
                    />
                    <Select
                      value={editingSale.discount_type || 'value'}
                      onValueChange={handleDiscountTypeChange}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="value">R$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Itens */}
              <div>
                <Label className="mb-3 block">Itens da Venda</Label>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Produto</th>
                        <th className="text-center px-4 py-3 font-semibold w-24">Qtd</th>
                        <th className="text-right px-4 py-3 font-semibold w-32">Preco Un.</th>
                        <th className="text-right px-4 py-3 font-semibold w-32">Total</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingSale.items?.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-4 py-3">{item.product_name}</td>
                          <td className="text-center px-2 py-2">
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={item.quantity}
                              onChange={(e) => updateEditingItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-center"
                            />
                          </td>
                          <td className="text-right px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateEditingItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="text-right px-4 py-3 font-medium">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeEditingItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {(!editingSale.items || editingSale.items.length === 0) && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum item na venda
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totais */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(editingSale.subtotal)}</span>
                </div>
                {editingSale.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>
                      Desconto {editingSale.discount_type === 'percent' ? `(${editingSale.discount}%)` : ''}
                    </span>
                    <span>
                      -{formatCurrency(
                        editingSale.discount_type === 'percent'
                          ? (editingSale.subtotal * editingSale.discount / 100)
                          : editingSale.discount
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(editingSale.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custo</span>
                  <span>{formatCurrency(editingSale.cost_total)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Lucro</span>
                  <span>{formatCurrency(editingSale.profit)}</span>
                </div>
              </div>

              {/* Observacoes */}
              <div>
                <Label>Observacoes</Label>
                <Input
                  value={editingSale.notes || ''}
                  onChange={(e) => updateEditingField('notes', e.target.value)}
                  placeholder="Observacoes sobre a venda..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={saveSaleChanges} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
