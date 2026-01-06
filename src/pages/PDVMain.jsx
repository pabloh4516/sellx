import React, { useState, useEffect } from 'react';
import { usePOSMode } from '@/hooks/usePOSMode';
import { useAuth } from '@/contexts/AuthContext';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PDVQuick from './PDVQuick';
import PDV from './PDV';
import OperatorLogin from '@/components/pos/OperatorLogin';
import { Button } from '@/components/ui/button';
import { User, LogOut, ShieldCheck, Clock, Wallet, Lock, Unlock } from 'lucide-react';
import { ROLE_LABELS, USER_ROLES } from '@/config/permissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/utils';

export default function PDVMain() {
  const { mode, setMode } = usePOSMode();
  const { user, operator, logoutOperator, can } = useAuth();
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cashRegister, setCashRegister] = useState(null);

  // Carregar configuracao do modo de caixa
  const cashRegisterMode = (() => {
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
  })();

  const isAdminOrManager = operator?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(operator.role);
  const canManageCash = cashRegisterMode === 'shared' ? isAdminOrManager : true;
  const canViewAllCash = can('cash.view_all');

  // Verifica se precisa fazer login do operador
  useEffect(() => {
    if (!operator) {
      setShowOperatorLogin(true);
    }
  }, [operator]);

  // Carrega status do caixa
  useEffect(() => {
    const loadCashRegister = async () => {
      try {
        const registers = await base44.entities.CashRegister.filter({ status: 'aberto' });

        if (registers.length > 0) {
          if (cashRegisterMode === 'per_operator' && operator?.id) {
            // Modo por operador: buscar o caixa do operador atual
            const myRegister = registers.find(r => r.opened_by_id === operator.id);
            setCashRegister(myRegister || null);
          } else {
            // Modo compartilhado: usar o primeiro caixa aberto
            setCashRegister(registers[0]);
          }
        } else {
          setCashRegister(null);
        }
      } catch (error) {
        console.error('Error loading cash register:', error);
      }
    };

    if (operator) {
      loadCashRegister();
      // Atualiza a cada 30 segundos
      const interval = setInterval(loadCashRegister, 30000);
      return () => clearInterval(interval);
    }
  }, [operator?.id, cashRegisterMode]);

  // Atualiza o relogio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOperatorLogin = (op) => {
    setShowOperatorLogin(false);
  };

  const handleChangeOperator = async () => {
    await logoutOperator();
    setShowOperatorLogin(true);
  };

  // Se nao tem operador, mostra tela de login
  if (!operator) {
    return (
      <>
        <OperatorLogin
          open={showOperatorLogin}
          onOpenChange={setShowOperatorLogin}
          onOperatorLogin={handleOperatorLogin}
        />

        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Login do Operador</h1>
            <p className="text-muted-foreground mb-6">
              Para acessar o PDV, e necessario identificar o operador responsavel.
            </p>

            <Button
              size="lg"
              className="px-8"
              onClick={() => setShowOperatorLogin(true)}
            >
              <User className="w-5 h-5 mr-2" />
              Identificar Operador
            </Button>

            <p className="mt-4 text-sm text-muted-foreground">
              {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-2xl font-mono mt-2 text-foreground">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Renderiza o PDV com informacao do operador
  const OperatorBar = () => (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 text-sm">
      <div className="flex items-center gap-4">
        {/* Operador */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            operator.role === USER_ROLES.ADMIN || operator.role === USER_ROLES.OWNER
              ? 'bg-destructive/10'
              : operator.role === USER_ROLES.MANAGER
                ? 'bg-warning/10'
                : 'bg-primary/10'
          }`}>
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-medium">{operator.full_name}</span>
          <span className="px-2 py-0.5 rounded text-xs bg-secondary">
            {ROLE_LABELS[operator.role] || operator.role}
          </span>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border" />

        {/* Status do Caixa */}
        <Link to={createPageUrl('CashRegister')}>
          {cashRegister ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 hover:bg-success/20 transition-colors cursor-pointer">
              <Unlock className="w-4 h-4 text-success" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-success flex items-center gap-1">
                  {cashRegisterMode === 'per_operator' ? 'Meu Caixa' : 'Caixa'} Aberto
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                </span>
                {(canViewAllCash || cashRegisterMode === 'per_operator') && cashRegister.opened_by && (
                  <span className="text-[10px] text-muted-foreground">
                    {cashRegisterMode === 'shared' && `por ${cashRegister.opened_by} `}às {safeFormatDate(cashRegister.opening_date, 'HH:mm')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors cursor-pointer">
              <Lock className="w-4 h-4 text-destructive" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-destructive">
                  {cashRegisterMode === 'per_operator' ? 'Meu Caixa' : 'Caixa'} Fechado
                </span>
                {cashRegisterMode === 'shared' && !isAdminOrManager && (
                  <span className="text-[10px] text-muted-foreground">Aguarde admin abrir</span>
                )}
              </div>
            </div>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">{format(currentTime, 'HH:mm')}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleChangeOperator}
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Trocar Operador
        </Button>
      </div>
    </div>
  );

  if (mode === 'quick') {
    return (
      <div className="h-screen flex flex-col">
        <OperatorBar />
        <div className="flex-1 overflow-hidden">
          <PDVQuick onModeChange={setMode} currentMode={mode} operator={operator} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <OperatorBar />
      <div className="flex-1 overflow-hidden">
        <PDV onModeChange={setMode} currentMode={mode} operator={operator} />
      </div>
    </div>
  );
}
