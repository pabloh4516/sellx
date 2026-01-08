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
import { loadSystemSettings, getCashRegisterMode } from '@/utils/settingsHelper';

export default function PDVMain() {
  const { mode, setMode } = usePOSMode();
  const { user, operator, logoutOperator, can } = useAuth();
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cashRegister, setCashRegister] = useState(null);

  // Carregar configuracao do modo de caixa
  const [cashRegisterMode, setCashRegisterMode] = useState(() => getCashRegisterMode());

  // Carregar configuracoes do banco ao montar
  useEffect(() => {
    loadSystemSettings().then(settings => {
      setCashRegisterMode(settings.cashRegisterMode || 'shared');
    });
  }, []);

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

  // Atualiza o relogio a cada minuto (otimizado - antes era 1s)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
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

  // Props comuns para os PDVs
  const pdvProps = {
    onModeChange: setMode,
    currentMode: mode,
    operator,
    onChangeOperator: handleChangeOperator,
    cashRegister,
    cashRegisterMode,
  };

  if (mode === 'quick') {
    return <PDVQuick {...pdvProps} />;
  }

  return <PDV {...pdvProps} />;
}
