import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Wallet, DollarSign, TrendingUp, AlertCircle,
  Minus, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, Clock, User,
  CreditCard, Banknote, QrCode, Receipt, Printer, FileText, CheckCircle,
  Calculator, ShoppingBag, Coins, Users2, Info, Settings, Eye, Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { USER_ROLES } from '@/config/permissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MetricCard,
  EmptyState,
} from '@/components/nexo';

export default function CashRegister() {
  const { user, operator, logAuditAction, can, PERMISSIONS } = useAuth();
  const currentUser = operator || user;

  // Carregar configuracao do modo de caixa
  const [cashRegisterMode, setCashRegisterMode] = useState(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.cashRegisterMode || 'shared';
      } catch {
        return 'shared';
      }
    }
    return 'shared';
  });

  // Verificar se usuario pode gerenciar caixa baseado no modo
  const isAdminOrManager = currentUser?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(currentUser.role);
  const canManageCash = cashRegisterMode === 'shared' ? isAdminOrManager : true;

  const [cashRegister, setCashRegister] = useState(null);
  const [allOpenRegisters, setAllOpenRegisters] = useState([]); // Para admin ver todos os caixas
  const [sales, setSales] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashMovements, setCashMovements] = useState([]); // Sangrias e suprimentos
  const [loading, setLoading] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [withdrawalData, setWithdrawalData] = useState({ amount: 0, reason: '' });
  const [depositData, setDepositData] = useState({ amount: 0, reason: '' });
  const [closeTab, setCloseTab] = useState('resumo');
  const [cashCount, setCashCount] = useState({
    c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
    m100: 0, m50: 0, m25: 0, m10: 0, m05: 0, m01: 0
  });
  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [currentUser?.id, cashRegisterMode]);

  const loadData = async () => {
    try {
      const [registers, salesData, methodsData] = await Promise.all([
        base44.entities.CashRegister.filter({ status: 'aberto' }),
        base44.entities.Sale.filter({ status: 'concluida' }),
        base44.entities.PaymentMethod.list()
      ]);

      setPaymentMethods(methodsData);
      setAllOpenRegisters(registers); // Guardar todos os caixas abertos para admin

      // Para admin em modo por operador, guardar todas as vendas de todos os caixas abertos
      if (cashRegisterMode === 'per_operator' && isAdminOrManager && registers.length > 0) {
        const allRegisterIds = registers.map(r => r.id);
        const allRegisterSales = salesData.filter(s => allRegisterIds.includes(s.cash_register_id));
        setSales(allRegisterSales);
      }

      if (registers.length > 0) {
        let register = null;

        if (cashRegisterMode === 'per_operator') {
          // Modo por operador: buscar o caixa do operador atual
          register = registers.find(r => r.opened_by_id === currentUser?.id);
        } else {
          // Modo compartilhado: usar o primeiro caixa aberto (unico)
          register = registers[0];
        }

        if (register) {
          setCashRegister(register);

          // Para o proprio caixa, filtrar apenas suas vendas
          const registerSales = salesData.filter(s =>
            s.cash_register_id === register.id
          );
          if (!(cashRegisterMode === 'per_operator' && isAdminOrManager)) {
            setSales(registerSales);
          }

          // Carregar movimentacoes do caixa (sangrias e suprimentos)
          try {
            const movements = await base44.entities.CashMovement.filter({
              cash_register_id: register.id
            });
            setCashMovements(movements || []);
          } catch (e) {
            console.log('Cash movements table may not exist, using empty array');
            setCashMovements([]);
          }
        } else {
          setCashRegister(null);
          setSales([]);
          setCashMovements([]);
        }
      } else {
        setCashRegister(null);
        setSales([]);
        setCashMovements([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCashRegister = async () => {
    try {
      const data = {
        opening_date: new Date().toISOString(),
        opening_balance: openingBalance,
        status: 'aberto',
        opened_by: currentUser?.full_name || currentUser?.email,
        opened_by_id: currentUser?.id,
      };

      const register = await base44.entities.CashRegister.create(data);
      setCashRegister(register);
      setShowOpenDialog(false);
      setOpeningBalance(0);

      // Log de auditoria
      await logAuditAction('CASH_OPEN', {
        register_id: register.id,
        opening_balance: openingBalance,
      });

      toast.success('Caixa aberto com sucesso!');
    } catch (error) {
      console.error('Error opening cash register:', error);
      toast.error('Erro ao abrir caixa');
    }
  };

  const handleCloseCashRegister = async () => {
    try {
      const expected = calculateExpectedBalance();
      const difference = closingBalance - expected;

      const data = {
        closing_date: new Date().toISOString(),
        closing_balance: closingBalance,
        expected_balance: expected,
        difference: difference,
        status: 'fechado',
        closed_by: currentUser?.full_name || currentUser?.email,
        closed_by_id: currentUser?.id
      };

      await base44.entities.CashRegister.update(cashRegister.id, data);

      // Log de auditoria
      await logAuditAction('CASH_CLOSE', {
        register_id: cashRegister.id,
        expected_balance: expected,
        closing_balance: closingBalance,
        difference: difference,
        total_sales: calculateTotalSales(),
        total_withdrawals: calculateTotalWithdrawals(),
        total_deposits: calculateTotalDeposits(),
      });

      setCashRegister(null);
      setSales([]);
      setShowCloseDialog(false);
      setClosingBalance(0);
      toast.success('Caixa fechado com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error closing cash register:', error);
      toast.error('Erro ao fechar caixa');
    }
  };

  const handleWithdrawal = async () => {
    if (withdrawalData.amount <= 0 || !withdrawalData.reason) {
      toast.error('Informe o valor e motivo da sangria');
      return;
    }

    try {
      const movementData = {
        cash_register_id: cashRegister.id,
        type: 'withdrawal', // sangria
        amount: withdrawalData.amount,
        description: withdrawalData.reason,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name || currentUser?.email,
      };

      const movement = await base44.entities.CashMovement.create(movementData);

      // Log de auditoria
      await logAuditAction('CASH_WITHDRAW', {
        register_id: cashRegister.id,
        amount: withdrawalData.amount,
        reason: withdrawalData.reason,
      });

      setCashMovements([...cashMovements, movement]);
      setShowWithdrawalDialog(false);
      setWithdrawalData({ amount: 0, reason: '' });
      toast.success('Sangria registrada');
    } catch (error) {
      console.error('Error registering withdrawal:', error);
      toast.error('Erro ao registrar sangria');
    }
  };

  const handleDeposit = async () => {
    if (depositData.amount <= 0 || !depositData.reason) {
      toast.error('Informe o valor e motivo do suprimento');
      return;
    }

    try {
      const movementData = {
        cash_register_id: cashRegister.id,
        type: 'deposit', // suprimento
        amount: depositData.amount,
        description: depositData.reason,
        user_id: currentUser?.id,
        user_name: currentUser?.full_name || currentUser?.email,
      };

      const movement = await base44.entities.CashMovement.create(movementData);

      // Log de auditoria
      await logAuditAction('CASH_SUPPLY', {
        register_id: cashRegister.id,
        amount: depositData.amount,
        reason: depositData.reason,
      });

      setCashMovements([...cashMovements, movement]);
      setShowDepositDialog(false);
      setDepositData({ amount: 0, reason: '' });
      toast.success('Suprimento registrado');
    } catch (error) {
      console.error('Error registering deposit:', error);
      toast.error('Erro ao registrar suprimento');
    }
  };

  const calculateTotalSales = () => {
    return sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  };

  const calculateTotalWithdrawals = () => {
    return cashMovements
      .filter(m => m.type === 'withdrawal')
      .reduce((sum, w) => sum + (w.amount || 0), 0);
  };

  const calculateTotalDeposits = () => {
    return cashMovements
      .filter(m => m.type === 'deposit')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  // Helpers para obter listas separadas
  const getWithdrawals = () => cashMovements.filter(m => m.type === 'withdrawal');
  const getDeposits = () => cashMovements.filter(m => m.type === 'deposit');

  const calculateExpectedBalance = () => {
    if (!cashRegister) return 0;
    return (cashRegister.opening_balance || 0) +
      calculateCashSales() +
      calculateTotalDeposits() -
      calculateTotalWithdrawals();
  };

  // Helper para parsear payments que podem estar como string JSON ou objeto
  const parsePayments = (sale) => {
    if (!sale.payments) return [];

    let payments = sale.payments;

    // Se payments é string, parsear como JSON
    if (typeof payments === 'string') {
      try {
        payments = JSON.parse(payments);
      } catch (e) {
        console.warn('Erro ao parsear payments:', e);
        return [];
      }
    }

    // Garantir que é array
    if (!Array.isArray(payments)) {
      console.warn('Payments não é array:', typeof payments);
      return [];
    }

    return payments;
  };

  // Verificar se um pagamento é em dinheiro
  const isCashPayment = (payment, methodsList = []) => {
    // Primeiro, verificar pelo method_name diretamente (mais confiável)
    const methodName = (payment.method_name || '').toLowerCase();
    if (methodName === 'dinheiro' || methodName.includes('dinheiro')) {
      return true;
    }

    // Se não tem method_name, tentar pelo method_id
    if (payment.method_id && methodsList.length > 0) {
      const method = methodsList.find(m => m.id === payment.method_id);
      if (method) {
        const methodType = (method.type || '').toLowerCase();
        return methodType === 'dinheiro' || methodType === 'cash';
      }
    }

    return false;
  };

  // Calculate breakdown by payment method
  const calculatePaymentBreakdown = () => {
    const breakdown = {};

    sales.forEach(sale => {
      const payments = parsePayments(sale);

      // Formato novo: array de payments
      if (payments.length > 0) {
        payments.forEach(payment => {
          const methodId = payment.method_id;
          const method = paymentMethods.find(m => m.id === methodId);
          const methodName = payment.method_name || method?.name || 'Outros';
          const methodType = method?.type || 'dinheiro';

          if (!breakdown[methodId]) {
            breakdown[methodId] = {
              id: methodId,
              name: methodName,
              type: methodType,
              total: 0,
              count: 0
            };
          }

          breakdown[methodId].total += parseFloat(payment.amount) || 0;
          breakdown[methodId].count += 1;
        });
      }
      // Formato antigo: payment_method como string
      else if (sale.payment_method || sale.paymentMethod) {
        const pm = sale.payment_method || sale.paymentMethod;
        const pmLower = (pm || '').toLowerCase();

        // Mapear nome para tipo
        let methodType = 'outros';
        let methodName = pm;

        if (pmLower === 'cash' || pmLower === 'dinheiro' || pmLower.includes('dinheiro')) {
          methodType = 'dinheiro';
          methodName = 'Dinheiro';
        } else if (pmLower === 'credit' || pmLower === 'credito' || pmLower.includes('credito') || pmLower.includes('credit')) {
          methodType = 'credito';
          methodName = 'Cartao de Credito';
        } else if (pmLower === 'debit' || pmLower === 'debito' || pmLower.includes('debito') || pmLower.includes('debit')) {
          methodType = 'debito';
          methodName = 'Cartao de Debito';
        } else if (pmLower === 'pix' || pmLower.includes('pix')) {
          methodType = 'pix';
          methodName = 'PIX';
        }

        const methodKey = `legacy_${methodType}`;
        if (!breakdown[methodKey]) {
          breakdown[methodKey] = {
            id: methodKey,
            name: methodName,
            type: methodType,
            total: 0,
            count: 0
          };
        }

        breakdown[methodKey].total += parseFloat(sale.total) || 0;
        breakdown[methodKey].count += 1;
      }
    });

    return Object.values(breakdown).sort((a, b) => b.total - a.total);
  };

  // Calculate only cash sales (dinheiro) - this is what's expected in the physical cash register
  // IMPORTANTE: Desconta o troco! Se cliente pagou R$100 em dinheiro para venda de R$76,
  // o que fica no caixa é R$76 (R$24 voltou como troco)
  const calculateCashSales = () => {
    let cashTotal = 0;

    sales.forEach((sale) => {
      const payments = parsePayments(sale);
      const saleTotal = parseFloat(sale.total) || 0;

      // Verificar se tem array de payments (formato novo)
      if (payments.length > 0) {
        // Calcular total pago e total em dinheiro
        let totalPaid = 0;
        let cashPaid = 0;

        payments.forEach(payment => {
          const amount = parseFloat(payment.amount) || 0;
          totalPaid += amount;
          if (isCashPayment(payment, paymentMethods)) {
            cashPaid += amount;
          }
        });

        // O troco vem do dinheiro
        const change = Math.max(0, totalPaid - saleTotal);
        // Dinheiro que fica no caixa = dinheiro pago - troco
        const cashInRegister = Math.max(0, cashPaid - change);

        cashTotal += cashInRegister;
      }
      // Formato antigo: payment_method como string
      else {
        const pm = sale.payment_method || sale.paymentMethod;
        if (pm) {
          const pmLower = (pm || '').toLowerCase();
          const isCash = pmLower === 'cash' ||
                         pmLower === 'dinheiro' ||
                         pmLower.includes('dinheiro');
          if (isCash) {
            // No formato antigo, usamos o total da venda (já sem troco)
            cashTotal += saleTotal;
          }
        }
      }
    });

    return cashTotal;
  };

  // Calculate non-cash sales
  const calculateNonCashSales = () => {
    return calculateTotalSales() - calculateCashSales();
  };

  // Calculate cash count total
  const calculateCashCountTotal = () => {
    return (
      (cashCount.c200 * 200) +
      (cashCount.c100 * 100) +
      (cashCount.c50 * 50) +
      (cashCount.c20 * 20) +
      (cashCount.c10 * 10) +
      (cashCount.c5 * 5) +
      (cashCount.c2 * 2) +
      (cashCount.m100 * 1) +
      (cashCount.m50 * 0.50) +
      (cashCount.m25 * 0.25) +
      (cashCount.m10 * 0.10) +
      (cashCount.m05 * 0.05) +
      (cashCount.m01 * 0.01)
    );
  };

  // Get payment method icon
  const getPaymentIcon = (type) => {
    switch (type) {
      case 'dinheiro':
        return Banknote;
      case 'credito':
      case 'debito':
      case 'credito_parcelado':
        return CreditCard;
      case 'pix':
        return QrCode;
      default:
        return Receipt;
    }
  };

  // Print closing report
  const handlePrintClosing = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Fechamento de Caixa</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
              h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              td { padding: 5px 0; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .total { border-top: 2px solid #000; font-weight: bold; }
              .diff-positive { color: green; }
              .diff-negative { color: red; }
              hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  // Caixa Fechado
  if (!cashRegister) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto mt-12 space-y-6">
          {/* Card principal */}
          <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {cashRegisterMode === 'per_operator' ? 'Seu Caixa Esta Fechado' : 'Caixa Fechado'}
            </h2>
            <p className="text-muted-foreground mb-8">
              {cashRegisterMode === 'per_operator'
                ? 'Abra seu caixa para comecar a vender'
                : canManageCash
                  ? 'Abra o caixa para comecar as operacoes do dia'
                  : 'Aguarde o administrador ou gerente abrir o caixa'
              }
            </p>

            {canManageCash ? (
              <Button
                onClick={() => setShowOpenDialog(true)}
                className="w-full h-12 text-base"
              >
                <Unlock className="w-5 h-5 mr-2" />
                {cashRegisterMode === 'per_operator' ? 'Abrir Meu Caixa' : 'Abrir Caixa'}
              </Button>
            ) : (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <div className="flex items-center gap-3 justify-center">
                  <Lock className="w-5 h-5 text-warning" />
                  <span className="text-sm font-medium">
                    Apenas administradores e gerentes podem abrir o caixa
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Informacao do modo atual */}
          <div className="bg-muted/50 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {cashRegisterMode === 'shared' ? (
                  <Users2 className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-success" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Modo: {cashRegisterMode === 'shared' ? 'Caixa Compartilhado' : 'Caixa por Operador'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cashRegisterMode === 'shared'
                      ? 'Um caixa unico para toda a loja'
                      : 'Cada operador tem seu proprio caixa'
                    }
                  </p>
                </div>
              </div>
              {isAdminOrManager && (
                <Link to={createPageUrl('Settings')}>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Alterar
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Lista de caixas abertos (apenas para admin em modo por operador) */}
          {cashRegisterMode === 'per_operator' && isAdminOrManager && allOpenRegisters.length > 0 && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Users2 className="w-4 h-4 text-primary" />
                Caixas Abertos ({allOpenRegisters.length})
              </h3>
              <div className="space-y-2">
                {allOpenRegisters.map(reg => {
                  // Calcular total de vendas deste caixa
                  const registerSales = sales.filter(s => s.cash_register_id === reg.id);
                  const registerTotal = registerSales.reduce((sum, s) => sum + (s.total || 0), 0);
                  return (
                    <div key={reg.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{reg.opened_by || 'Operador'}</p>
                          <p className="text-xs text-muted-foreground">
                            Aberto {safeFormatDate(reg.opening_date, "dd/MM 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">{formatCurrency(registerTotal)}</p>
                        <p className="text-xs text-muted-foreground">
                          {registerSales.length} venda{registerSales.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Geral:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(allOpenRegisters.reduce((sum, reg) => {
                        const regSales = sales.filter(s => s.cash_register_id === reg.id);
                        return sum + regSales.reduce((s, sale) => s + (sale.total || 0), 0);
                      }, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {cashRegisterMode === 'per_operator' ? 'Abrir Meu Caixa' : 'Abrir Caixa'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Saldo Inicial</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={openingBalance || ''}
                    onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Informe o valor em dinheiro no caixa
                  </p>
                </div>

                {cashRegisterMode === 'per_operator' && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Operador:</strong> {currentUser?.full_name || currentUser?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este caixa sera vinculado a voce
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleOpenCashRegister}>
                  Abrir Caixa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageContainer>
    );
  }

  // Caixa Aberto
  return (
    <PageContainer>
      <PageHeader
        title={cashRegisterMode === 'per_operator' ? 'Meu Caixa' : 'Caixa'}
        subtitle={
          <span className="flex items-center gap-2">
            <span>Aberto em {safeFormatDate(cashRegister.opening_date, "dd/MM/yyyy 'às' HH:mm")}</span>
            {cashRegister.opened_by && (
              <span className="text-muted-foreground">por {cashRegister.opened_by}</span>
            )}
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-muted">
              {cashRegisterMode === 'shared' ? 'Compartilhado' : 'Por Operador'}
            </span>
          </span>
        }
        icon={Wallet}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDepositDialog(true)}>
              <ArrowUpCircle className="w-4 h-4 mr-2 text-success" />
              Suprimento
            </Button>
            <Button variant="outline" onClick={() => setShowWithdrawalDialog(true)}>
              <ArrowDownCircle className="w-4 h-4 mr-2 text-destructive" />
              Sangria
            </Button>
            {canManageCash && (
              <Button
                variant="destructive"
                onClick={() => {
                  setClosingBalance(calculateExpectedBalance());
                  setShowCloseDialog(true);
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                Fechar Caixa
              </Button>
            )}
          </div>
        }
      />

      {/* Metricas */}
      <Grid cols={4}>
        <MetricCard
          label="Saldo Inicial"
          value={formatCurrency(cashRegister.opening_balance)}
          icon={Wallet}
        />
        <MetricCard
          label="Vendas"
          value={formatCurrency(calculateTotalSales())}
          icon={TrendingUp}
          variant="success"
          trend={{ value: sales.length, label: 'vendas' }}
        />
        <MetricCard
          label="Sangrias"
          value={formatCurrency(calculateTotalWithdrawals())}
          icon={Minus}
          variant="warning"
        />
        <MetricCard
          label="Saldo Esperado"
          value={formatCurrency(calculateExpectedBalance())}
          icon={DollarSign}
          variant="default"
        />
      </Grid>

      {/* Visao do Gerente - Todos os Caixas Abertos */}
      {cashRegisterMode === 'per_operator' && isAdminOrManager && allOpenRegisters.length > 1 && (
        <CardSection
          title={`Visao Geral - ${allOpenRegisters.length} Caixas Abertos`}
          icon={Eye}
        >
          <div className="space-y-4">
            {/* Ranking de Operadores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {(() => {
                // Calcular totais por operador
                const operatorStats = allOpenRegisters.map(reg => {
                  const regSales = sales.filter(s => s.cash_register_id === reg.id);
                  const total = regSales.reduce((sum, s) => sum + (s.total || 0), 0);
                  return {
                    ...reg,
                    totalSales: total,
                    salesCount: regSales.length,
                    avgTicket: regSales.length > 0 ? total / regSales.length : 0
                  };
                }).sort((a, b) => b.totalSales - a.totalSales);

                // Top 3
                return operatorStats.slice(0, 3).map((reg, index) => (
                  <div
                    key={reg.id}
                    className={`p-4 rounded-xl border ${
                      index === 0 ? 'bg-warning/10 border-warning/30' :
                      index === 1 ? 'bg-muted/50 border-[#C0C0C0]/30' :
                      'bg-muted/30 border-[#CD7F32]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-warning/20' :
                        index === 1 ? 'bg-[#C0C0C0]/20' :
                        'bg-[#CD7F32]/20'
                      }`}>
                        {index === 0 ? (
                          <Trophy className={`w-4 h-4 text-warning`} />
                        ) : (
                          <span className={`text-sm font-bold ${
                            index === 1 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]'
                          }`}>{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{reg.opened_by || 'Operador'}</p>
                        <p className="text-xs text-muted-foreground">
                          Desde {safeFormatDate(reg.opening_date, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(reg.totalSales)}</p>
                        <p className="text-xs text-muted-foreground">{reg.salesCount} vendas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Ticket medio</p>
                        <p className="font-medium">{formatCurrency(reg.avgTicket)}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Lista completa */}
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Todos os Operadores</h4>
              <div className="space-y-2">
                {(() => {
                  const operatorStats = allOpenRegisters.map(reg => {
                    const regSales = sales.filter(s => s.cash_register_id === reg.id);
                    const total = regSales.reduce((sum, s) => sum + (s.total || 0), 0);
                    return {
                      ...reg,
                      totalSales: total,
                      salesCount: regSales.length,
                      avgTicket: regSales.length > 0 ? total / regSales.length : 0,
                      isOwn: reg.opened_by_id === currentUser?.id
                    };
                  }).sort((a, b) => b.totalSales - a.totalSales);

                  return operatorStats.map((reg, index) => (
                    <div
                      key={reg.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        reg.isOwn ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-warning/20 text-warning' :
                          index === 1 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                          index === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            reg.isOwn ? 'bg-primary/20' : 'bg-success/10'
                          }`}>
                            <User className={`w-4 h-4 ${reg.isOwn ? 'text-primary' : 'text-success'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {reg.opened_by || 'Operador'}
                              {reg.isOwn && <span className="ml-1 text-xs text-primary">(Voce)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reg.salesCount} venda{reg.salesCount !== 1 ? 's' : ''} | Ticket: {formatCurrency(reg.avgTicket)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(reg.totalSales)}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Total Geral */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Total Geral</p>
                    <p className="text-xs text-muted-foreground">
                      {sales.length} vendas em {allOpenRegisters.length} caixas
                    </p>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(sales.reduce((sum, s) => sum + (s.total || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardSection>
      )}

      {/* Movimentacoes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sangrias */}
        <CardSection
          title="Sangrias"
          icon={ArrowDownCircle}
        >
          {getWithdrawals().length > 0 ? (
            <div className="space-y-3">
              {getWithdrawals().map((withdrawal) => (
                <div key={withdrawal.id} className="flex justify-between items-start p-4 bg-destructive/5 border border-destructive/10 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">{withdrawal.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {withdrawal.user_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {withdrawal.user_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {safeFormatDate(withdrawal.created_at, "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-destructive">{formatCurrency(withdrawal.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sangria registrada
            </div>
          )}
        </CardSection>

        {/* Suprimentos */}
        <CardSection
          title="Suprimentos"
          icon={ArrowUpCircle}
        >
          {getDeposits().length > 0 ? (
            <div className="space-y-3">
              {getDeposits().map((deposit) => (
                <div key={deposit.id} className="flex justify-between items-start p-4 bg-success/5 border border-success/10 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">{deposit.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {deposit.user_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {deposit.user_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {safeFormatDate(deposit.created_at, "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-success">{formatCurrency(deposit.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum suprimento registrado
            </div>
          )}
        </CardSection>
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Sangria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={withdrawalData.amount || ''}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, amount: parseFloat(e.target.value) || 0 })}
                autoFocus
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={withdrawalData.reason}
                onChange={(e) => setWithdrawalData({ ...withdrawalData, reason: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawalDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleWithdrawal}>
              Confirmar Sangria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Suprimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor</Label>
              <Input
                type="number"
                step="0.01"
                value={depositData.amount || ''}
                onChange={(e) => setDepositData({ ...depositData, amount: parseFloat(e.target.value) || 0 })}
                autoFocus
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={depositData.reason}
                onChange={(e) => setDepositData({ ...depositData, reason: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeposit} className="bg-success hover:bg-success/90">
              Confirmar Suprimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Register Dialog - Detailed */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Fechamento de Caixa
            </DialogTitle>
          </DialogHeader>

          <Tabs value={closeTab} onValueChange={setCloseTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="resumo" className="gap-1">
                <Receipt className="w-4 h-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="formas" className="gap-1">
                <CreditCard className="w-4 h-4" />
                Formas Pag.
              </TabsTrigger>
              <TabsTrigger value="contagem" className="gap-1">
                <Coins className="w-4 h-4" />
                Contagem
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="gap-1">
                <FileText className="w-4 h-4" />
                Relatorio
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {/* Tab: Resumo */}
              <TabsContent value="resumo" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="font-medium">Vendas do Periodo</span>
                    </div>
                    <p className="text-3xl font-bold text-primary tabular-nums">
                      {sales.length}
                    </p>
                    <p className="text-lg font-semibold text-success mt-1">
                      {formatCurrency(calculateTotalSales())}
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <Banknote className="w-4 h-4" />
                      <span className="font-medium">Saldo Esperado (Dinheiro)</span>
                    </div>
                    <p className="text-3xl font-bold tabular-nums">
                      {formatCurrency(calculateExpectedBalance())}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Apenas vendas em dinheiro
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Movimentacao do Caixa
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo Inicial:</span>
                      <span className="font-medium">{formatCurrency(cashRegister?.opening_balance)}</span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>+ Vendas em Dinheiro:</span>
                      <span className="font-medium">{formatCurrency(calculateCashSales())}</span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>+ Suprimentos:</span>
                      <span className="font-medium">{formatCurrency(calculateTotalDeposits())}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>- Sangrias:</span>
                      <span className="font-medium">{formatCurrency(calculateTotalWithdrawals())}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Saldo Esperado:</span>
                      <span className="text-primary">{formatCurrency(calculateExpectedBalance())}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <Label className="text-sm font-medium">Saldo Real no Caixa (Dinheiro)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={closingBalance || ''}
                    onChange={(e) => setClosingBalance(parseFloat(e.target.value) || 0)}
                    className="mt-2 text-lg font-bold"
                    placeholder="Informe o valor contado"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilize a aba Contagem para contar cedulas e moedas
                  </p>
                </div>

                {closingBalance > 0 && closingBalance !== calculateExpectedBalance() && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 ${
                    closingBalance > calculateExpectedBalance()
                      ? 'bg-success/10 border border-success/20'
                      : 'bg-destructive/10 border border-destructive/20'
                  }`}>
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      closingBalance > calculateExpectedBalance() ? 'text-success' : 'text-destructive'
                    }`} />
                    <div>
                      <p className="font-medium text-foreground">
                        {closingBalance > calculateExpectedBalance() ? 'Sobra' : 'Falta'} no Caixa
                      </p>
                      <p className={`text-xl font-bold ${
                        closingBalance > calculateExpectedBalance() ? 'text-success' : 'text-destructive'
                      }`}>
                        {formatCurrency(Math.abs(closingBalance - calculateExpectedBalance()))}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Formas de Pagamento */}
              <TabsContent value="formas" className="m-0 space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-semibold mb-4">Resumo por Forma de Pagamento</h4>
                  <div className="space-y-3">
                    {calculatePaymentBreakdown().length > 0 ? (
                      calculatePaymentBreakdown().map((method) => {
                        const Icon = getPaymentIcon(method.type);
                        return (
                          <div key={method.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                (method.type === 'cash' || method.type === 'dinheiro') ? 'bg-success/10' :
                                method.type === 'pix' ? 'bg-primary/10' : 'bg-warning/10'
                              }`}>
                                <Icon className={`w-5 h-5 ${
                                  (method.type === 'cash' || method.type === 'dinheiro') ? 'text-success' :
                                  method.type === 'pix' ? 'text-primary' : 'text-warning'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">{method.name}</p>
                                <p className="text-xs text-muted-foreground">{method.count} transacao(es)</p>
                              </div>
                            </div>
                            <p className="text-lg font-bold tabular-nums">{formatCurrency(method.total)}</p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma venda registrada
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <Banknote className="w-4 h-4" />
                      <span className="font-medium">Dinheiro</span>
                    </div>
                    <p className="text-2xl font-bold text-success">{formatCurrency(calculateCashSales())}</p>
                    <p className="text-xs text-muted-foreground">Permanece no caixa</p>
                  </div>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-medium">Outros Meios</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(calculateNonCashSales())}</p>
                    <p className="text-xs text-muted-foreground">Cartao, PIX, etc.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Contagem */}
              <TabsContent value="contagem" className="m-0 space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Cedulas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'c200', label: 'R$ 200', value: 200 },
                      { key: 'c100', label: 'R$ 100', value: 100 },
                      { key: 'c50', label: 'R$ 50', value: 50 },
                      { key: 'c20', label: 'R$ 20', value: 20 },
                      { key: 'c10', label: 'R$ 10', value: 10 },
                      { key: 'c5', label: 'R$ 5', value: 5 },
                      { key: 'c2', label: 'R$ 2', value: 2 },
                    ].map(({ key, label, value }) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-card rounded-lg border">
                        <span className="w-16 text-sm font-medium">{label}</span>
                        <Input
                          type="number"
                          min="0"
                          value={cashCount[key] || ''}
                          onChange={(e) => setCashCount({ ...cashCount, [key]: parseInt(e.target.value) || 0 })}
                          className="h-8 w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground flex-1 text-right">
                          = {formatCurrency(cashCount[key] * value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Moedas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'm100', label: 'R$ 1,00', value: 1 },
                      { key: 'm50', label: 'R$ 0,50', value: 0.50 },
                      { key: 'm25', label: 'R$ 0,25', value: 0.25 },
                      { key: 'm10', label: 'R$ 0,10', value: 0.10 },
                      { key: 'm05', label: 'R$ 0,05', value: 0.05 },
                      { key: 'm01', label: 'R$ 0,01', value: 0.01 },
                    ].map(({ key, label, value }) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-card rounded-lg border">
                        <span className="w-16 text-sm font-medium">{label}</span>
                        <Input
                          type="number"
                          min="0"
                          value={cashCount[key] || ''}
                          onChange={(e) => setCashCount({ ...cashCount, [key]: parseInt(e.target.value) || 0 })}
                          className="h-8 w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground flex-1 text-right">
                          = {formatCurrency(cashCount[key] * value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Contado:</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {formatCurrency(calculateCashCountTotal())}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => setClosingBalance(calculateCashCountTotal())}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Usar Este Valor no Fechamento
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Relatorio */}
              <TabsContent value="relatorio" className="m-0 space-y-4">
                <div className="flex justify-end mb-2">
                  <Button variant="outline" onClick={handlePrintClosing}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Relatorio
                  </Button>
                </div>

                <div ref={printRef} className="p-6 bg-card rounded-xl border print:bg-white print:border-0">
                  <h1 className="text-center font-bold text-lg mb-4">FECHAMENTO DE CAIXA</h1>
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    {safeFormatDate(new Date().toISOString(), "dd/MM/yyyy 'às' HH:mm")}
                  </p>

                  <h2 className="font-semibold border-b border-border pb-1 mb-2">Informacoes</h2>
                  <table className="w-full text-sm mb-4">
                    <tbody>
                      <tr>
                        <td className="py-1">Operador:</td>
                        <td className="py-1 text-right">{currentUser?.full_name || currentUser?.email}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Abertura:</td>
                        <td className="py-1 text-right">{safeFormatDate(cashRegister?.opening_date, "dd/MM/yyyy HH:mm")}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Fechamento:</td>
                        <td className="py-1 text-right">{safeFormatDate(new Date().toISOString(), "dd/MM/yyyy HH:mm")}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="font-semibold border-b border-border pb-1 mb-2">Movimentacao</h2>
                  <table className="w-full text-sm mb-4">
                    <tbody>
                      <tr>
                        <td className="py-1">Saldo Inicial:</td>
                        <td className="py-1 text-right">{formatCurrency(cashRegister?.opening_balance)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Total Vendas ({sales.length}):</td>
                        <td className="py-1 text-right">{formatCurrency(calculateTotalSales())}</td>
                      </tr>
                      <tr>
                        <td className="py-1">- Vendas em Dinheiro:</td>
                        <td className="py-1 text-right">{formatCurrency(calculateCashSales())}</td>
                      </tr>
                      <tr>
                        <td className="py-1">- Vendas Outros Meios:</td>
                        <td className="py-1 text-right">{formatCurrency(calculateNonCashSales())}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Suprimentos:</td>
                        <td className="py-1 text-right">{formatCurrency(calculateTotalDeposits())}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Sangrias:</td>
                        <td className="py-1 text-right">{formatCurrency(calculateTotalWithdrawals())}</td>
                      </tr>
                    </tbody>
                  </table>

                  <h2 className="font-semibold border-b border-border pb-1 mb-2">Por Forma de Pagamento</h2>
                  <table className="w-full text-sm mb-4">
                    <tbody>
                      {calculatePaymentBreakdown().map((method) => (
                        <tr key={method.id}>
                          <td className="py-1">{method.name}:</td>
                          <td className="py-1 text-right">{formatCurrency(method.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h2 className="font-semibold border-b border-border pb-1 mb-2">Conferencia</h2>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="font-medium">
                        <td className="py-1">Saldo Esperado:</td>
                        <td className="py-1 text-right">{formatCurrency(calculateExpectedBalance())}</td>
                      </tr>
                      <tr className="font-medium">
                        <td className="py-1">Saldo Informado:</td>
                        <td className="py-1 text-right">{formatCurrency(closingBalance)}</td>
                      </tr>
                      <tr className={`font-bold ${closingBalance - calculateExpectedBalance() >= 0 ? 'text-success' : 'text-destructive'}`}>
                        <td className="py-1 border-t border-border">Diferenca:</td>
                        <td className="py-1 border-t border-border text-right">
                          {formatCurrency(closingBalance - calculateExpectedBalance())}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-6 pt-4 border-t border-dashed border-border">
                    <div className="grid grid-cols-2 gap-8 mt-8">
                      <div className="text-center">
                        <div className="border-t border-border pt-2">
                          <p className="text-xs text-muted-foreground">Operador</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="border-t border-border pt-2">
                          <p className="text-xs text-muted-foreground">Supervisor</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => {
              setShowCloseDialog(false);
              setCloseTab('resumo');
              setCashCount({
                c200: 0, c100: 0, c50: 0, c20: 0, c10: 0, c5: 0, c2: 0,
                m100: 0, m50: 0, m25: 0, m10: 0, m05: 0, m01: 0
              });
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseCashRegister}>
              <Lock className="w-4 h-4 mr-2" />
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
