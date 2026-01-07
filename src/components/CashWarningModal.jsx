/**
 * Modal de Aviso de Caixa Aberto
 * Exibido quando o operador tenta trocar/sair com caixa aberto
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperator } from '@/contexts/OperatorContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, DollarSign, Receipt, Lock, X } from 'lucide-react';

export default function CashWarningModal() {
  const navigate = useNavigate();
  const {
    showCashWarning,
    openCashRegister,
    confirmLogoutWithOpenCash,
    cancelLogout,
    operator,
  } = useOperator();

  if (!showCashWarning || !openCashRegister) return null;

  // Calcular valores do caixa
  const openingBalance = parseFloat(openCashRegister.opening_balance) || 0;
  const totalSales = parseFloat(openCashRegister.total_sales) || 0;
  const cashSales = parseFloat(openCashRegister.cash_sales) || 0;
  const totalWithdrawals = parseFloat(openCashRegister.total_withdrawals) || 0;
  const totalDeposits = parseFloat(openCashRegister.total_deposits) || 0;
  // Saldo esperado em dinheiro: abertura + vendas em dinheiro + suprimentos - sangrias
  const expectedBalance = openingBalance + cashSales + totalDeposits - totalWithdrawals;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCloseCash = async () => {
    const result = await confirmLogoutWithOpenCash('close');
    if (result.action === 'close_cash') {
      navigate('/CashRegister');
    }
  };

  return (
    <Dialog open={showCashWarning} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" hideCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle>Feche o Caixa Primeiro</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {operator?.full_name}, voce precisa fechar seu caixa antes de trocar de operador
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Alerta */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Troca de operador bloqueada</p>
              <p className="text-muted-foreground mt-1">
                Por seguranca, e obrigatorio fechar o caixa e conferir os valores antes de trocar de operador.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo do Caixa */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground mb-2">Resumo do seu caixa:</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Abertura</span>
            <span className="font-medium">{formatCurrency(openingBalance)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Receipt className="w-4 h-4" />
              Vendas ({openCashRegister.sales_count || 0})
            </span>
            <span className="font-medium">{formatCurrency(totalSales)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground pl-5">- Em dinheiro</span>
            <span className="font-medium text-green-600">+{formatCurrency(cashSales)}</span>
          </div>
          {totalDeposits > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suprimentos</span>
              <span className="font-medium text-green-600">+{formatCurrency(totalDeposits)}</span>
            </div>
          )}
          {totalWithdrawals > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sangrias</span>
              <span className="font-medium text-red-600">-{formatCurrency(totalWithdrawals)}</span>
            </div>
          )}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="font-medium flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Saldo Esperado (Dinheiro)
            </span>
            <span className="text-lg font-bold text-primary">{formatCurrency(expectedBalance)}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={cancelLogout} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleCloseCash} className="w-full sm:w-auto">
            <DollarSign className="w-4 h-4 mr-2" />
            Ir para Fechar Caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
