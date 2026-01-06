import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, DollarSign, TrendingUp, Package, Mail, Download, ShoppingCart, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReportScheduler from '../components/reports/ReportScheduler';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
} from '@/components/nexo';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  '#8B5CF6',
  '#EC4899'
];

export default function ReportSales() {
  const { can } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [showScheduler, setShowScheduler] = useState(false);

  // Verificar permissao de acesso
  if (!can('reports.sales')) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Voce nao tem permissao para acessar os relatorios de vendas.
          </p>
        </div>
      </PageContainer>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, productsData] = await Promise.all([
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Product.list()
      ]);
      setSales(salesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
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

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date || sale.created_date);
    return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const avgTicket = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

  // Top products
  const productSales = {};
  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0
        };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Daily sales trend
  const today = new Date(endDate);
  const dailySales = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const daySales = filteredSales.filter(s => {
      const saleDate = new Date(s.sale_date || s.created_date);
      return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
    dailySales.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      vendas: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
      quantidade: daySales.length
    });
  }

  const totalItemsSold = filteredSales.reduce((sum, s) =>
    sum + (s.items?.reduce((total, item) => total + item.quantity, 0) || 0), 0
  );

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
        title="Relatorio de Vendas"
        subtitle="Analise detalhada das vendas"
        icon={ShoppingCart}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowScheduler(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar/Agendar
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <CardSection>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label>Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button>Filtrar</Button>
        </div>
      </CardSection>

      {/* KPIs */}
      <Grid cols={4}>
        <MetricCard
          label="Total Vendido"
          value={formatCurrency(totalSales)}
          icon={DollarSign}
          variant="success"
          subtitle={`${filteredSales.length} vendas`}
        />
        <MetricCard
          label="Lucro"
          value={formatCurrency(totalProfit)}
          icon={TrendingUp}
          variant="primary"
          subtitle={totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% margem` : '0%'}
        />
        <MetricCard
          label="Ticket Medio"
          value={formatCurrency(avgTicket)}
          icon={Calendar}
          variant="info"
        />
        <MetricCard
          label="Itens Vendidos"
          value={totalItemsSold}
          icon={Package}
          variant="warning"
        />
      </Grid>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Evolucao Diaria de Vendas" icon={TrendingUp}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="vendas" stroke="hsl(var(--primary))" strokeWidth={2} name="Vendas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        <CardSection title="Top 5 Produtos Mais Vendidos" icon={Package}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <YAxis dataKey="name" type="category" className="text-muted-foreground" fontSize={12} width={150} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSection>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSection title="Produtos Mais Vendidos (Quantidade)" icon={Package}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts}
                  dataKey="quantity"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name.substring(0, 15)} ${(percent * 100).toFixed(0)}%`}
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardSection>

        <CardSection title="Comparativo de Receita" icon={DollarSign}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Legend />
                <Bar dataKey="vendas" fill="hsl(var(--success))" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardSection>
      </div>

      {showScheduler && (
        <ReportScheduler
          reportType="vendas"
          reportData={{ filteredSales, topProducts, totalSales, totalProfit }}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </PageContainer>
  );
}
