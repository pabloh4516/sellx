import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/contexts/OperatorContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Lock, LogIn, Search, ShieldCheck, UserCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, USER_ROLES } from '@/config/permissions';

export default function OperatorLogin({ open, onOpenChange, onOperatorLogin }) {
  const { user } = useAuth();
  const { loginOperator } = useOperator();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUser(null);
      setPin('');
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      // Buscar usuarios do profiles com campo pin
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, pin, employee_code')
        .eq('is_active', true)
        .in('role', [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.SELLER, USER_ROLES.CASHIER])
        .order('full_name');

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar operadores');
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setPin('');
  };

  const handleLogin = async () => {
    if (!selectedUser) {
      toast.error('Selecione um operador');
      return;
    }

    if (!selectedUser.pin) {
      toast.error('Este operador nao possui PIN configurado. Configure no menu Usuarios.');
      return;
    }

    if (!pin) {
      toast.error('Digite o PIN');
      return;
    }

    setLoading(true);
    try {
      const result = await loginOperator({ id: selectedUser.id }, pin);

      if (result) {
        toast.success(`Operador ${selectedUser.full_name} logado`);
        onOperatorLogin?.(selectedUser);
        onOpenChange(false);
        setSelectedUser(null);
        setPin('');
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error logging in operator:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentUser = async () => {
    if (!user) return;

    // Buscar dados do usuario atual incluindo PIN
    const currentUserData = users.find(u => u.id === user.id);
    if (currentUserData) {
      setSelectedUser(currentUserData);
      setPin('');
    } else {
      toast.error('Usuario nao encontrado na lista de operadores');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Login do Operador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usar usuario atual */}
          {user && !selectedUser && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-muted-foreground mb-2">Usuario logado no sistema:</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</p>
                  </div>
                </div>
                <Button onClick={handleUseCurrentUser} disabled={loading} variant="outline">
                  Selecionar
                </Button>
              </div>
            </div>
          )}

          {!selectedUser && (
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
              <p className="relative z-10 mx-auto w-fit bg-background px-2 text-xs text-muted-foreground">
                ou selecione outro operador
              </p>
            </div>
          )}

          {/* Busca e lista (apenas se nao tiver usuario selecionado) */}
          {!selectedUser && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar operador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        !u.pin ? 'opacity-60' : ''
                      } border-border hover:border-primary/50`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.OWNER
                            ? 'bg-destructive/10'
                            : u.role === USER_ROLES.MANAGER
                              ? 'bg-warning/10'
                              : 'bg-secondary'
                        }`}>
                          {u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.OWNER ? (
                            <ShieldCheck className="w-5 h-5 text-destructive" />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.role] || u.role}</p>
                            {!u.pin && (
                              <span className="text-xs text-destructive">(Sem PIN)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Usuario selecionado - pedir PIN */}
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedUser.role === USER_ROLES.ADMIN || selectedUser.role === USER_ROLES.OWNER
                        ? 'bg-destructive/10'
                        : selectedUser.role === USER_ROLES.MANAGER
                          ? 'bg-warning/10'
                          : 'bg-primary/10'
                    }`}>
                      {selectedUser.role === USER_ROLES.ADMIN || selectedUser.role === USER_ROLES.OWNER ? (
                        <ShieldCheck className="w-5 h-5 text-destructive" />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedUser.role] || selectedUser.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Trocar
                  </Button>
                </div>
              </div>

              {!selectedUser.pin ? (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
                  <Lock className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm font-medium text-destructive">PIN nao configurado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure um PIN no menu Usuarios para este operador
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">PIN de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPin ? 'text' : 'password'}
                      placeholder="Digite o PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="pl-10 pr-10"
                      maxLength={6}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">PIN de 4-6 digitos</p>
                </div>
              )}
            </div>
          )}

          {/* Botao de login */}
          <Button
            className="w-full"
            disabled={!selectedUser || !selectedUser.pin || !pin || loading}
            onClick={handleLogin}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Entrar como Operador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
