import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, DollarSign, Printer, Wallet, ArrowUpDown, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  MiniMetric,
} from '@/components/nexo';

export default function CashFlow() {
  const [cashRegisters, setCashRegisters] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [operatorFilter, setOperatorFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [registersData, salesData, expensesData, methodsData, operatorsData] = await Promise.all([
        base44.entities.CashRegister.list('-created_date'),
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.Expense.filter({ status: 'pago' }),
        base44.entities.PaymentMethod.list(),
        base44.entities.Profile.list()
      ]);

      setCashRegisters(registersData);
      setSales(salesData);
      setExpenses(expensesData);
      setPaymentMethods(methodsData);
      setOperators(operatorsData);
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
    const dateMatch = saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
    const operatorMatch = operatorFilter === 'all' ||
      sale.operator_id === operatorFilter ||
      sale.seller_id === operatorFilter;
    return dateMatch && operatorMatch;
  });

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.paid_date || expense.created_date);
    return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
  });

  // Calculate totals
  const initialBalance = cashRegisters
    .filter(r => new Date(r.opening_date) < new Date(startDate))
    .reduce((sum, r) => sum + ((r.closing_balance || r.opening_balance) || 0), 0);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalWithdrawals = cashRegisters.reduce((sum, r) => 
    sum + (r.withdrawals?.reduce((s, w) => s + w.amount, 0) || 0), 0);
  const totalDeposits = cashRegisters.reduce((sum, r) => 
    sum + (r.deposits?.reduce((s, d) => s + d.amount, 0) || 0), 0);

  const finalBalance = initialBalance + totalRevenue + totalDeposits - totalExpenses - totalWithdrawals;

  // Detailed transactions
  const transactions = [];

  // Add initial balance
  transactions.push({
    date: startDate,
    description: 'CAIXA INICIAL',
    type: 'entrada',
    amount: initialBalance
  });

  // Add deposits
  cashRegisters.forEach(register => {
    register.deposits?.forEach(deposit => {
      transactions.push({
        date: deposit.date,
        description: `DESPESA - ${deposit.reason}`,
        type: 'entrada',
        amount: deposit.amount
      });
    });
  });

  // Add sales
  filteredSales.forEach(sale => {
    transactions.push({
      date: sale.sale_date || sale.created_date,
      description: `VENDA Nº ${sale.sale_number} - Tot.Venda ${formatCurrency(sale.total)}`,
      type: 'entrada',
      amount: sale.total
    });
  });

  // Add expenses
  filteredExpenses.forEach(expense => {
    transactions.push({
      date: expense.paid_date || expense.created_date,
      description: `DESPESA - ${expense.description}`,
      type: 'saida',
      amount: expense.amount
    });
  });

  // Add withdrawals
  cashRegisters.forEach(register => {
    register.withdrawals?.forEach(withdrawal => {
      transactions.push({
        date: withdrawal.date,
        description: `SANGRIA - ${withdrawal.reason}`,
        type: 'saida',
        amount: withdrawal.amount
    });
    });
  });

  // Sort by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Sales by payment method
  const salesByMethod = {};
  filteredSales.forEach(sale => {
    sale.payments?.forEach(payment => {
      const methodName = payment.method_name || 'Outros';
      if (!salesByMethod[methodName]) {
        salesByMethod[methodName] = 0;
      }
      salesByMethod[methodName] += payment.amount;
    });
  });

  const transactionColumns = [
    {
      key: 'date',
      label: 'Data',
      render: (_, transaction) => (
        <span className="font-medium">{safeFormatDate(transaction.date)}</span>
      )
    },
    {
      key: 'description',
      label: 'Descricao',
      render: (_, transaction) => (
        <span className="text-sm">{transaction.description}</span>
      )
    },
    {
      key: 'entrada',
      label: 'Entradas',
      className: 'text-right',
      render: (_, transaction) => (
        <span className="font-medium text-success">
          {transaction.type === 'entrada' ? formatCurrency(transaction.amount) : '-'}
        </span>
      )
    },
    {
      key: 'saida',
      label: 'Saidas',
      className: 'text-right',
      render: (_, transaction) => (
        <span className="font-medium text-destructive">
          {transaction.type === 'saida' ? formatCurrency(transaction.amount) : '-'}
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
        title="Fluxo de Caixa"
        subtitle="Resumido e Detalhado"
        icon={ArrowUpDown}
        actions={
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        }
      />

      {/* Filtros de Periodo */}
      <CardSection>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-40">
            <Label>Periodo de</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Label>Ate</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Label>Operador</Label>
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos operadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Operadores</SelectItem>
                {operators.map(op => (
                  <SelectItem key={op.id} value={op.id}>{op.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={loadData}>Filtrar</Button>
        </div>
      </CardSection>

      {/* Metricas */}
      <Grid cols={4}>
        <MiniMetric
          label="Caixa Inicial"
          value={formatCurrency(initialBalance)}
          icon={Wallet}
        />
        <MiniMetric
          label="Entradas"
          value={formatCurrency(totalRevenue + totalDeposits)}
          icon={TrendingUp}
          status="success"
        />
        <MiniMetric
          label="Saidas"
          value={formatCurrency(totalExpenses + totalWithdrawals)}
          icon={TrendingDown}
          status="danger"
        />
        <MiniMetric
          label="Saldo Final"
          value={formatCurrency(finalBalance)}
          icon={DollarSign}
          status={finalBalance >= 0 ? 'success' : 'danger'}
        />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo */}
        <CardSection title="Resumo de Caixa" icon={Wallet}>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-border">
              <span className="font-medium">Caixa Inicial:</span>
              <span className="font-bold">{formatCurrency(initialBalance)}</span>
            </div>

            <div className="flex justify-between p-2 bg-success/5 rounded-lg">
              <span className="font-medium">Recebimento e Receitas:</span>
              <span className="font-bold text-success">{formatCurrency(totalRevenue)}</span>
            </div>

            <div className="flex justify-between p-2 bg-destructive/5 rounded-lg">
              <span className="font-medium">Despesas:</span>
              <span className="font-bold text-destructive">{formatCurrency(totalExpenses)}</span>
            </div>

            <div className="flex justify-between p-2 bg-destructive/5 rounded-lg">
              <span className="font-medium">Sangrias:</span>
              <span className="font-bold text-destructive">{formatCurrency(totalWithdrawals)}</span>
            </div>

            <Separator className="my-3" />

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-bold mb-3">Resumo de Vendas</h4>
              <div className="space-y-2 text-sm">
                <h5 className="font-semibold">Formas Pagamento:</h5>
                {Object.entries(salesByMethod).map(([method, total]) => (
                  <div key={method} className="flex justify-between">
                    <span>{method}:</span>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Vendas:</span>
                  <span>{formatCurrency(totalRevenue)}</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-3 rounded-lg border-2 border-primary/20">
              <div className="flex justify-between text-lg">
                <span className="font-bold">(+) Entradas:</span>
                <span className="font-bold text-success">{formatCurrency(totalRevenue + totalDeposits)}</span>
              </div>
              <div className="flex justify-between text-lg mt-1">
                <span className="font-bold">(-) Saidas:</span>
                <span className="font-bold text-destructive">{formatCurrency(totalExpenses + totalWithdrawals)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-xl">
                <span className="font-bold">(=) Saldo:</span>
                <span className={`font-bold ${finalBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(finalBalance)}
                </span>
              </div>
            </div>
          </div>
        </CardSection>

        {/* Detalhado */}
        <CardSection title="Fluxo de Caixa - Detalhado" icon={ArrowUpDown}>
          <div className="text-sm mb-4 text-center font-medium text-muted-foreground">
            PERIODO DE {safeFormatDate(startDate)} A {safeFormatDate(endDate)}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <DataTable
              data={transactions}
              columns={transactionColumns}
              keyExtractor={(_, index) => index}
              emptyMessage="Nenhuma movimentacao"
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between p-3 bg-success/10 rounded-lg">
              <span className="font-bold">(+) ENTRADAS:</span>
              <span className="font-bold text-success text-lg">
                {formatCurrency(totalRevenue + totalDeposits + initialBalance)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-destructive/10 rounded-lg">
              <span className="font-bold">(-) SAIDAS:</span>
              <span className="font-bold text-destructive text-lg">
                {formatCurrency(totalExpenses + totalWithdrawals)}
              </span>
            </div>
            <div className="flex justify-between p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <span className="font-bold text-lg">(=) TOTAL:</span>
              <span className="font-bold text-primary text-2xl">
                {formatCurrency(finalBalance)}
              </span>
            </div>
          </div>
        </CardSection>
      </div>
    </PageContainer>
  );
}