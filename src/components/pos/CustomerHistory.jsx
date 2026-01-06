import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock, ShoppingBag, TrendingUp, Package, Star, Heart,
  Calendar, DollarSign, Repeat, AlertCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CustomerHistory({ customerId, onAddToCart, compact = false }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [pendingReceivables, setPendingReceivables] = useState([]);

  useEffect(() => {
    if (customerId) {
      loadHistory();
    } else {
      setSales([]);
      setFavoriteProducts([]);
      setPendingReceivables([]);
      setLoading(false);
    }
  }, [customerId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Carregar vendas do cliente
      const customerSales = await base44.entities.Sale.filter({
        customer_id: customerId,
        status: 'concluida'
      });
      const sortedSales = customerSales.sort((a, b) =>
        new Date(b.sale_date) - new Date(a.sale_date)
      );
      setSales(sortedSales);

      // Calcular produtos favoritos (mais comprados)
      const productCount = {};
      sortedSales.forEach(sale => {
        (sale.items || []).forEach(item => {
          const key = item.product_id;
          if (!productCount[key]) {
            productCount[key] = {
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: 0,
              total_spent: 0,
              last_price: item.unit_price,
            };
          }
          productCount[key].quantity += item.quantity;
          productCount[key].total_spent += item.total;
        });
      });

      const favorites = Object.values(productCount)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      setFavoriteProducts(favorites);

      // Carregar pendencias financeiras
      try {
        const receivables = await base44.entities.Receivable.filter({
          customer_id: customerId,
        });
        const pending = receivables.filter(r => r.status !== 'recebido');
        setPendingReceivables(pending);
      } catch (e) {
        // Ignore if receivables not available
        setPendingReceivables([]);
      }

    } catch (error) {
      console.error('Error loading customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateStats = () => {
    if (sales.length === 0) {
      return { total: 0, count: 0, avg: 0, daysSinceLastPurchase: null };
    }

    const total = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const count = sales.length;
    const avg = count > 0 ? total / count : 0;

    const lastPurchaseDate = sales[0]?.sale_date;
    const daysSinceLastPurchase = lastPurchaseDate
      ? differenceInDays(new Date(), new Date(lastPurchaseDate))
      : null;

    return { total, count, avg, daysSinceLastPurchase };
  };

  const totalPending = pendingReceivables.reduce((sum, r) => sum + (r.amount || 0), 0);

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customerId) {
    return null;
  }

  const stats = calculateStats();

  if (compact) {
    return (
      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            Historico
          </span>
          <span className="text-xs font-bold">{stats.count} compras</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total gasto</span>
          <span className="text-xs font-bold text-success">{formatCurrency(stats.total)}</span>
        </div>
        {stats.daysSinceLastPurchase !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Ultima compra</span>
            <span className="text-xs">
              {stats.daysSinceLastPurchase === 0
                ? 'Hoje'
                : `${stats.daysSinceLastPurchase} dia(s) atras`}
            </span>
          </div>
        )}
        {totalPending > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-warning/20">
            <span className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Pendente
            </span>
            <span className="text-xs font-bold text-warning">{formatCurrency(totalPending)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Historico do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alerta de pendencias */}
        {totalPending > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Valor pendente</span>
            </div>
            <span className="font-bold text-warning">{formatCurrency(totalPending)}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card p-2 rounded-lg border text-center">
            <p className="text-xs text-muted-foreground">Compras</p>
            <p className="text-lg font-bold text-primary">{stats.count}</p>
          </div>
          <div className="bg-card p-2 rounded-lg border text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-success">{formatCurrency(stats.total)}</p>
          </div>
          <div className="bg-card p-2 rounded-lg border text-center">
            <p className="text-xs text-muted-foreground">Ticket Medio</p>
            <p className="text-sm font-bold">{formatCurrency(stats.avg)}</p>
          </div>
          <div className="bg-card p-2 rounded-lg border text-center">
            <p className="text-xs text-muted-foreground">Ultima</p>
            <p className="text-sm font-bold">
              {stats.daysSinceLastPurchase !== null
                ? (stats.daysSinceLastPurchase === 0 ? 'Hoje' : `${stats.daysSinceLastPurchase}d`)
                : '-'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="favorites" className="text-xs">
              <Heart className="w-3.5 h-3.5 mr-1" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Ultimas
            </TabsTrigger>
          </TabsList>

          {/* Produtos Favoritos */}
          <TabsContent value="favorites" className="mt-3">
            {favoriteProducts.length > 0 ? (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {favoriteProducts.map((product, index) => (
                    <div
                      key={product.product_id}
                      className="flex items-center justify-between p-2 bg-card rounded-lg border text-sm hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => onAddToCart?.(product)}
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && <Star className="w-3.5 h-3.5 text-warning fill-warning" />}
                        <div>
                          <p className="font-medium text-xs truncate max-w-[150px]">
                            {product.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.quantity}x comprado
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{formatCurrency(product.last_price)}</p>
                        {onAddToCart && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart?.(product);
                            }}
                          >
                            <Repeat className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Primeira compra!</p>
              </div>
            )}
          </TabsContent>

          {/* Ultimas Compras */}
          <TabsContent value="history" className="mt-3">
            {sales.length > 0 ? (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {sales.slice(0, 10).map((sale) => (
                    <div
                      key={sale.id}
                      className="flex justify-between items-center p-2 bg-card rounded-lg border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">
                            {format(new Date(sale.sale_date || sale.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs py-0">
                            {sale.items?.length || 0} itens
                          </Badge>
                        </div>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(sale.total)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Nenhuma compra registrada</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
