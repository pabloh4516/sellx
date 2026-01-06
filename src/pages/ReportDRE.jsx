import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileText, TrendingUp, TrendingDown, DollarSign, Calculator, Lock } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MiniMetric,
} from '@/components/nexo';

export default function ReportDRE() {
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
            Voce nao tem permissao para acessar o DRE.
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

  const receitaBruta = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const custoMercadoria = filteredSales.reduce((sum, s) => sum + (s.cost_total || 0), 0);
  const lucroBruto = receitaBruta - custoMercadoria;
  const despesasOperacionais = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const lucroLiquido = lucroBruto - despesasOperacionais;

  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

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
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="DRE - Demonstracao do Resultado"
        subtitle="Demonstrativo de receitas e despesas"
        icon={FileText}
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

      {/* DRE Statement */}
      <CardSection title="Demonstracao do Resultado do Exercicio" icon={Calculator}>
        <div className="space-y-4">
          {/* Receita Bruta */}
          <div className="flex justify-between items-center p-4 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-success" />
              <span className="font-semibold text-success">Receita Bruta</span>
            </div>
            <span className="font-bold text-xl text-success">{formatCurrency(receitaBruta)}</span>
          </div>

          {/* CMV */}
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">(-) Custo das Mercadorias Vendidas</span>
            </div>
            <span className="font-medium text-muted-foreground">{formatCurrency(custoMercadoria)}</span>
          </div>

          <Separator />

          {/* Lucro Bruto */}
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Lucro Bruto</span>
              </div>
              <p className="text-xs text-primary/70 mt-1 ml-8">Margem: {margemBruta.toFixed(1)}%</p>
            </div>
            <span className="font-bold text-xl text-primary">{formatCurrency(lucroBruto)}</span>
          </div>

          {/* Despesas Operacionais */}
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">(-) Despesas Operacionais</span>
            </div>
            <span className="font-medium text-muted-foreground">{formatCurrency(despesasOperacionais)}</span>
          </div>

          <Separator className="my-4" />

          {/* Lucro Liquido */}
          <div className={`flex justify-between items-center p-5 rounded-lg ${
            lucroLiquido >= 0 ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            <div>
              <div className="flex items-center gap-3">
                <DollarSign className={`w-6 h-6 ${lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`} />
                <span className={`font-bold text-lg ${lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {lucroLiquido >= 0 ? 'Lucro Liquido' : 'Prejuizo'}
                </span>
              </div>
              <p className={`text-xs mt-1 ml-9 ${lucroLiquido >= 0 ? 'text-success/70' : 'text-destructive/70'}`}>
                Margem: {margemLiquida.toFixed(1)}%
              </p>
            </div>
            <span className={`font-bold text-2xl ${lucroLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(lucroLiquido))}
            </span>
          </div>
        </div>
      </CardSection>

      {/* Summary */}
      <CardSection title="Resumo do Periodo" icon={FileText}>
        <Grid cols={4}>
          <MiniMetric
            label="Numero de Vendas"
            value={filteredSales.length}
            icon={TrendingUp}
          />
          <MiniMetric
            label="Ticket Medio"
            value={formatCurrency(filteredSales.length > 0 ? receitaBruta / filteredSales.length : 0)}
            icon={DollarSign}
          />
          <MiniMetric
            label="Despesas"
            value={filteredExpenses.length}
            icon={TrendingDown}
          />
          <MiniMetric
            label="CMV Medio"
            value={`${receitaBruta > 0 ? ((custoMercadoria / receitaBruta) * 100).toFixed(1) : 0}%`}
            icon={Calculator}
          />
        </Grid>
      </CardSection>

      {/* Analysis */}
      <CardSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${margemBruta >= 30 ? 'bg-success/5 border border-success/20' : 'bg-warning/5 border border-warning/20'}`}>
            <p className="text-sm text-muted-foreground mb-1">Margem Bruta</p>
            <p className={`text-2xl font-bold ${margemBruta >= 30 ? 'text-success' : 'text-warning'}`}>
              {margemBruta.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {margemBruta >= 30 ? 'Saudavel' : 'Atencao'}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${margemLiquida >= 10 ? 'bg-success/5 border border-success/20' : 'bg-warning/5 border border-warning/20'}`}>
            <p className="text-sm text-muted-foreground mb-1">Margem Liquida</p>
            <p className={`text-2xl font-bold ${margemLiquida >= 10 ? 'text-success' : 'text-warning'}`}>
              {margemLiquida.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {margemLiquida >= 10 ? 'Saudavel' : 'Atencao'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground mb-1">Despesas / Receita</p>
            <p className="text-2xl font-bold">
              {receitaBruta > 0 ? ((despesasOperacionais / receitaBruta) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Comprometimento
            </p>
          </div>
        </div>
      </CardSection>
    </PageContainer>
  );
}
