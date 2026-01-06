import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
} from '@/components/nexo';

export default function ReportFinancial() {
  const { can } = useAuth();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Verificar permissao de acesso
  if (!can('reports.financial')) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Voce nao tem permissao para acessar os relatorios financeiros.
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
      const [salesData, expensesData] = await Promise.all([
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Expense.filter({ status: 'pago' })
      ]);
      setSales(salesData);
      setExpenses(expensesData);
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

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.paid_date || expense.due_date || expense.created_date);
    return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Group expenses by category
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    const cat = exp.category || 'outros';
    acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  const sortedCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a);

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
        title="Relatorio Financeiro"
        subtitle="Receitas, despesas e fluxo de caixa"
        icon={Wallet}
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
      <Grid cols={3}>
        <MetricCard
          label="Receitas"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          variant="success"
          subtitle={`${filteredSales.length} vendas`}
        />
        <MetricCard
          label="Despesas"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          variant="error"
          subtitle={`${filteredExpenses.length} despesas`}
        />
        <MetricCard
          label="Lucro Liquido"
          value={formatCurrency(netProfit)}
          icon={DollarSign}
          variant={netProfit >= 0 ? 'primary' : 'error'}
          subtitle={totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margem` : '0%'}
        />
      </Grid>

      {/* Expenses by Category */}
      <CardSection title="Despesas por Categoria" icon={TrendingDown}>
        <div className="space-y-3">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(([category, amount]) => {
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={category} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-destructive/60 rounded-full" />
                    <span className="capitalize font-medium">{category.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{formatCurrency(amount)}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% do total</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma despesa no periodo
            </div>
          )}
        </div>
      </CardSection>

      {/* Summary */}
      <CardSection title="Resumo do Periodo" icon={DollarSign}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Maior Despesa</p>
            <p className="font-bold text-lg">
              {sortedCategories.length > 0
                ? `${sortedCategories[0][0].replace(/_/g, ' ')}`
                : '-'}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Media por Venda</p>
            <p className="font-bold text-lg">
              {formatCurrency(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Media por Despesa</p>
            <p className="font-bold text-lg">
              {formatCurrency(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Categorias</p>
            <p className="font-bold text-lg">{sortedCategories.length}</p>
          </div>
        </div>
      </CardSection>
    </PageContainer>
  );
}
