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
import { AlertTriangle, DollarSign, Receipt, ArrowRight, X } from 'lucide-react';

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
  const totalWithdrawals = parseFloat(openCashRegister.total_withdrawals) || 0;
  const totalDeposits = parseFloat(openCashRegister.total_deposits) || 0;
  const expectedBalance = openingBalance + totalSales + totalDeposits - totalWithdrawals;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCloseCash = async () => {
    const result = await confirmLogoutWithOpenCash('close');
    if (result.action === 'close_cash') {
      navigate('/caixa');
    }
  };

  const handleTransfer = async () => {
    await confirmLogoutWithOpenCash('transfer');
  };

  return (
    <Dialog open={showCashWarning} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" hideCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <DialogTitle>Caixa Aberto</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {operator?.full_name}, voce tem um caixa em aberto
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do Caixa */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Abertura</span>
            <span className="font-medium">{formatCurrency(openingBalance)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Receipt className="w-4 h-4" />
              Vendas
            </span>
            <span className="font-medium text-green-600">+{formatCurrency(totalSales)}</span>
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
              Valor Esperado
            </span>
            <span className="text-lg font-bold text-primary">{formatCurrency(expectedBalance)}</span>
          </div>
        </div>

        {/* Opcoes */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>O que deseja fazer?</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Fechar Caixa:</strong> Encerra seu turno e confere os valores</li>
            <li>• <strong>Transferir:</strong> Deixa o caixa aberto para o proximo operador</li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={cancelLogout} className="w-full sm:w-auto">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button variant="secondary" onClick={handleTransfer} className="w-full sm:w-auto">
            <ArrowRight className="w-4 h-4 mr-2" />
            Transferir
          </Button>
          <Button onClick={handleCloseCash} className="w-full sm:w-auto">
            <DollarSign className="w-4 h-4 mr-2" />
            Fechar Caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
