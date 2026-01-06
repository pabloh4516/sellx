/**
 * Tela de Selecao de Operador
 * Exibida apos o login do admin para selecionar qual funcionario vai operar
 */

import React, { useState, useEffect } from 'react';
import { useOperator } from '@/contexts/OperatorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  User, Lock, Eye, EyeOff, Loader2, ArrowRight, Users,
  Key, LogOut, Clock, Shield, UserCheck
} from 'lucide-react';
import { ROLE_LABELS } from '@/config/permissions';

export default function OperatorSelect() {
  const { user, logout } = useAuth();
  const { loginOperator } = useOperator();

  const [mode, setMode] = useState('list'); // 'list' ou 'code'
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Form state
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Carregar lista de operadores da organizacao
  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, employee_code, avatar_url, pin')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;

      setOperators(data || []);
    } catch (error) {
      console.error('Erro ao carregar operadores:', error);
      toast.error('Erro ao carregar lista de operadores');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOperator = (op) => {
    setSelectedOperator(op);
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (mode === 'code') {
      if (!employeeCode) {
        toast.error('Digite o codigo do funcionario');
        return;
      }
    } else {
      if (!selectedOperator) {
        toast.error('Selecione um operador');
        return;
      }
    }

    if (!password) {
      toast.error('Digite a senha');
      return;
    }

    setLoginLoading(true);

    try {
      const operatorData = mode === 'code'
        ? { employee_code: employeeCode }
        : { id: selectedOperator.id };

      const success = await loginOperator(operatorData, password);

      if (!success) {
        setPassword('');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogoutSystem = async () => {
    if (confirm('Deseja sair completamente do sistema?')) {
      await logout();
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500';
      case 'manager':
        return 'bg-amber-500/10 text-amber-500';
      case 'seller':
        return 'bg-blue-500/10 text-blue-500';
      case 'cashier':
        return 'bg-green-500/10 text-green-500';
      case 'stockist':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const currentTime = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <div>
              <h1 className="font-semibold">Sellx</h1>
              <p className="text-xs text-muted-foreground">Sistema de Gestao</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentTime}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentDate}</p>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogoutSystem}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold">Quem vai operar?</h1>
            <p className="text-muted-foreground mt-1">
              Selecione seu usuario ou digite seu codigo
            </p>
          </div>

          {/* Toggle Mode */}
          <div className="flex justify-center mb-6">
            <div className="flex rounded-lg border p-1 bg-muted/50">
              <button
                type="button"
                className={`flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'list'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setMode('list'); setEmployeeCode(''); }}
              >
                <Users className="w-4 h-4" />
                Lista
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  mode === 'code'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => { setMode('code'); setSelectedOperator(null); }}
              >
                <Key className="w-4 h-4" />
                Codigo
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            {/* Modo Lista */}
            {mode === 'list' && (
              <div className="bg-card border rounded-xl p-4 mb-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : operators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum operador cadastrado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {operators.map((op) => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => handleSelectOperator(op)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            selectedOperator?.id === op.id
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                              selectedOperator?.id === op.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              {op.avatar_url ? (
                                <img
                                  src={op.avatar_url}
                                  alt={op.full_name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>
                            <p className="font-medium text-sm truncate w-full">
                              {op.full_name?.split(' ')[0]}
                            </p>
                            {op.employee_code && (
                              <p className="text-xs text-muted-foreground">{op.employee_code}</p>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${getRoleColor(op.role)}`}>
                              {ROLE_LABELS[op.role] || op.role}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Modo Codigo */}
            {mode === 'code' && (
              <div className="bg-card border rounded-xl p-6 mb-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="code">Codigo do Funcionario</Label>
                    <div className="relative mt-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="Ex: 001, VENDEDOR1"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                        className="pl-10 text-center text-lg tracking-widest"
                        autoFocus
                        autoCapitalize="characters"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campo de Senha - aparece quando selecionou operador ou digitou codigo */}
            {(selectedOperator || (mode === 'code' && employeeCode)) && (
              <div className="bg-card border rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-bottom-2">
                {selectedOperator && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedOperator.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedOperator.employee_code || selectedOperator.email}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="password">PIN de Acesso</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite seu PIN"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoFocus={!!selectedOperator}
                      maxLength={6}
                      disabled={!selectedOperator?.pin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {!selectedOperator?.pin ? (
                    <p className="text-xs text-destructive mt-1">
                      Este usuario nao possui PIN configurado. Configure no menu Usuarios.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      PIN de 4-6 digitos
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  size="lg"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>

          {/* Info */}
          <p className="text-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 inline mr-1" />
            Sessao iniciada por {user?.email}
          </p>
        </div>
      </main>
    </div>
  );
}
