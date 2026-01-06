import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Users as UsersIcon, Plus, Search, Edit, Trash2, Shield, ShieldCheck,
  User, Mail, Phone, Key, Check, X, UserCheck, UserX, Eye, EyeOff
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  EmptyState,
} from '@/components/nexo';
import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/config/permissions';
import { supabase } from '@/lib/supabase';

// Roles que podem ser atribuídos a funcionários (exclui super_admin e owner)
const ASSIGNABLE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.SELLER,
  USER_ROLES.CASHIER,
  USER_ROLES.STOCKIST,
];

export default function Users() {
  const { user: currentUser, isAdmin, logAuditAction } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: USER_ROLES.SELLER,
    is_active: true,
    password: '',
    employee_code: '', // Codigo do funcionario para login simplificado
    use_simple_login: false, // Se true, usa codigo ao inves de email
    pin: '', // PIN para troca rapida de operador
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await base44.entities.User.list();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name) {
      toast.error('Preencha o nome do funcionario');
      return;
    }

    // Se usar login simplificado, precisa do codigo
    if (formData.use_simple_login) {
      if (!formData.employee_code) {
        toast.error('Informe o codigo do funcionario');
        return;
      }
      // Se tem PIN valido (4+ digitos), senha nao e obrigatoria
      const hasValidPin = formData.pin && formData.pin.length >= 4;
      if (!selectedUser && !hasValidPin) {
        // Sem PIN, precisa de senha
        if (!formData.password) {
          toast.error('Informe uma senha ou PIN para o funcionario');
          return;
        }
        if (formData.password.length < 4) {
          toast.error('A senha deve ter no minimo 4 caracteres');
          return;
        }
      }
      // Se tem PIN mas tambem tem senha, validar a senha
      if (!selectedUser && formData.password && formData.password.length > 0 && formData.password.length < 4) {
        toast.error('A senha deve ter no minimo 4 caracteres');
        return;
      }
    } else {
      // Login tradicional com email
      if (!formData.email) {
        toast.error('Preencha o email');
        return;
      }
      if (!selectedUser && !formData.password) {
        toast.error('Informe uma senha para o novo usuario');
        return;
      }
      if (!selectedUser && formData.password.length < 6) {
        toast.error('A senha deve ter no minimo 6 caracteres');
        return;
      }
    }

    try {
      if (selectedUser) {
        // Atualizar usuario existente via Supabase direto para incluir PIN
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            is_active: formData.is_active,
            employee_code: formData.employee_code || null,
            pin: formData.pin || null,
          })
          .eq('id', selectedUser.id);

        if (updateError) {
          console.error('Update error:', updateError);
          toast.error('Erro ao atualizar usuario');
          return;
        }

        await logAuditAction('USER_UPDATE', {
          user_id: selectedUser.id,
          user_name: formData.full_name,
          role: formData.role,
        });

        toast.success('Usuario atualizado');
      } else {
        // Criar novo usuario via Supabase Auth
        // Primeiro, obter o organization_id do usuario atual
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', currentUser?.id)
          .single();

        if (!currentProfile?.organization_id) {
          toast.error('Erro: organizacao nao encontrada');
          return;
        }

        // Gerar email interno se usar login simplificado
        let userEmail = formData.email;
        if (formData.use_simple_login && formData.employee_code) {
          // Gerar email interno: codigo.org_id@internal.sellx.local
          const orgIdShort = currentProfile.organization_id.substring(0, 8);
          userEmail = `${formData.employee_code.toLowerCase()}.${orgIdShort}@internal.sellx.local`;
        }

        // Verificar se codigo ja existe na organizacao (se usar login simplificado)
        if (formData.use_simple_login && formData.employee_code) {
          const { data: existingCode } = await supabase
            .from('profiles')
            .select('id')
            .eq('organization_id', currentProfile.organization_id)
            .eq('employee_code', formData.employee_code)
            .single();

          if (existingCode) {
            toast.error('Este codigo de funcionario ja esta em uso');
            return;
          }
        }

        // Criar usuario no Supabase Auth
        // Se usar PIN sem senha, gerar senha valida para o Supabase (minimo 6 chars)
        let authPassword = formData.password;
        if (!authPassword && formData.pin) {
          // Usar PIN + sufixo para garantir 6+ caracteres
          authPassword = formData.pin + '@Pin';
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: authPassword,
          options: {
            data: {
              full_name: formData.full_name,
              role: formData.role,
            },
            emailRedirectTo: `${window.location.origin}/Login`,
          },
        });

        if (authError) {
          console.error('Auth error:', authError);
          if (authError.message.includes('already registered')) {
            toast.error('Este email ja esta cadastrado');
          } else {
            toast.error('Erro ao criar usuario: ' + authError.message);
          }
          return;
        }

        if (!authData.user) {
          toast.error('Erro ao criar usuario');
          return;
        }

        // Aguardar um pouco para o trigger do Supabase criar o profile base
        await new Promise(resolve => setTimeout(resolve, 500));

        // Atualizar perfil do usuario com os dados completos
        // Usar UPDATE ao inves de UPSERT para evitar conflitos com o trigger
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: userEmail,
            phone: formData.phone,
            role: formData.role,
            is_active: formData.is_active,
            organization_id: currentProfile.organization_id,
            employee_code: formData.use_simple_login ? formData.employee_code : null,
            pin: formData.pin || null,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error('Profile error:', profileError);
          // Tentar inserir se update falhou (profile ainda nao existe)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              full_name: formData.full_name,
              email: userEmail,
              phone: formData.phone,
              role: formData.role,
              is_active: formData.is_active,
              organization_id: currentProfile.organization_id,
              employee_code: formData.use_simple_login ? formData.employee_code : null,
              pin: formData.pin || null,
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            toast.warning('Usuario criado, mas houve um erro ao salvar o perfil');
          }
        }

        await logAuditAction('USER_CREATE', {
          user_id: authData.user.id,
          user_name: formData.full_name,
          role: formData.role,
          employee_code: formData.use_simple_login ? formData.employee_code : null,
        });

        if (formData.use_simple_login) {
          toast.success(`Funcionario criado! Login: ${formData.employee_code}`);
        } else {
          toast.success('Usuario criado! Um email de confirmacao foi enviado.');
        }
      }

      setShowDialog(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar usuario');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    // Nao pode excluir a si mesmo
    if (selectedUser.id === currentUser?.id) {
      toast.error('Voce nao pode excluir seu proprio usuario');
      return;
    }

    try {
      // Tentar excluir
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) {
        // Erro 409 = conflito (dados relacionados)
        if (error.code === '23503' || error.message?.includes('violates foreign key')) {
          toast.error('Este usuario possui dados vinculados (vendas, caixa, etc.) e nao pode ser excluido.', {
            description: 'Desative o usuario ao inves de excluir.',
            duration: 6000,
          });
          setShowDeleteDialog(false);
          return;
        }
        throw error;
      }

      await logAuditAction('USER_DELETE', {
        user_id: selectedUser.id,
        user_name: selectedUser.full_name,
      });

      toast.success('Usuario excluido');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);

      // Verificar se e erro de constraint
      if (error?.code === '23503' || error?.message?.includes('constraint') || error?.message?.includes('foreign')) {
        toast.error('Este usuario possui dados vinculados e nao pode ser excluido.', {
          description: 'Use a opcao "Desativar" ao inves de excluir.',
          duration: 6000,
        });
      } else {
        toast.error('Erro ao excluir usuario. Tente desativa-lo.');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !formData.password) {
      toast.error('Informe a nova senha');
      return;
    }

    try {
      await base44.entities.User.update(selectedUser.id, {
        password: formData.password,
      });

      await logAuditAction('USER_PASSWORD_RESET', {
        user_id: selectedUser.id,
        user_name: selectedUser.full_name,
      });

      toast.success('Senha alterada');
      setShowPasswordDialog(false);
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erro ao alterar senha');
    }
  };

  const handleToggleActive = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error('Voce nao pode desativar seu proprio usuario');
      return;
    }

    try {
      await base44.entities.User.update(user.id, {
        is_active: !user.is_active,
      });

      await logAuditAction(user.is_active ? 'USER_DEACTIVATE' : 'USER_ACTIVATE', {
        user_id: user.id,
        user_name: user.full_name,
      });

      toast.success(user.is_active ? 'Usuario desativado' : 'Usuario ativado');
      loadUsers();
    } catch (error) {
      console.error('Error toggling user:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || USER_ROLES.SELLER,
      is_active: user.is_active !== false,
      password: '',
      employee_code: user.employee_code || '',
      use_simple_login: !!user.employee_code,
      pin: user.pin || '',
    });
    setShowDialog(true);
  };

  const openNewDialog = () => {
    setSelectedUser(null);
    resetForm();
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: USER_ROLES.SELLER,
      is_active: true,
      password: '',
      employee_code: '',
      use_simple_login: false,
      pin: '',
    });
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case USER_ROLES.MANAGER:
        return 'bg-warning/10 text-warning border-warning/20';
      case USER_ROLES.SELLER:
        return 'bg-primary/10 text-primary border-primary/20';
      case USER_ROLES.CASHIER:
        return 'bg-success/10 text-success border-success/20';
      case USER_ROLES.STOCKIST:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (!isAdmin()) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas administradores podem gerenciar usuarios.
          </p>
        </div>
      </PageContainer>
    );
  }

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
        title="Usuarios"
        subtitle="Gerencie os usuarios do sistema"
        icon={UsersIcon}
        actions={
          <Button onClick={openNewDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuario
          </Button>
        }
      />

      {/* Busca */}
      <CardSection>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardSection>

      {/* Lista de Usuarios */}
      <CardSection>
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum usuario encontrado"
            description={searchTerm ? "Nenhum usuario corresponde a busca" : "Cadastre o primeiro usuario"}
            action={
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuario
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  user.is_active !== false
                    ? 'bg-card border-border hover:border-primary/50'
                    : 'bg-muted/50 border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    user.role === USER_ROLES.ADMIN
                      ? 'bg-destructive/10'
                      : user.role === USER_ROLES.MANAGER
                        ? 'bg-warning/10'
                        : 'bg-primary/10'
                  }`}>
                    {user.role === USER_ROLES.ADMIN ? (
                      <ShieldCheck className="w-6 h-6 text-destructive" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name}</p>
                      {user.is_active === false && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                          Inativo
                        </span>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 rounded text-primary">
                          Voce
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                      {user.employee_code ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Key className="w-3.5 h-3.5" />
                          {user.employee_code}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </span>
                      )}
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getRoleColor(user.role)}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedUser(user);
                        setFormData(prev => ({ ...prev, password: '' }));
                        setShowPasswordDialog(true);
                      }}
                      title="Alterar senha"
                    >
                      <Key className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(user)}
                      disabled={user.id === currentUser?.id}
                      title={user.is_active !== false ? 'Desativar' : 'Ativar'}
                    >
                      {user.is_active !== false ? (
                        <UserX className="w-4 h-4 text-warning" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-success" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteDialog(true);
                      }}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardSection>

      {/* Dialog de Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md" aria-describedby="user-form-description">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuario' : 'Novo Usuario'}
            </DialogTitle>
          </DialogHeader>
          <p id="user-form-description" className="sr-only">
            Formulario para {selectedUser ? 'editar' : 'criar'} usuario
          </p>

          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome do usuario"
              />
            </div>

            {/* Toggle para login simplificado - apenas para novos usuarios */}
            {!selectedUser && (
              <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Login Simplificado</p>
                  <p className="text-xs text-muted-foreground">
                    Use codigo + senha ao inves de email
                  </p>
                </div>
                <Switch
                  checked={formData.use_simple_login}
                  onCheckedChange={(v) => setFormData({ ...formData, use_simple_login: v, email: v ? '' : formData.email })}
                />
              </div>
            )}

            {/* Campo de codigo do funcionario */}
            {formData.use_simple_login && (
              <div>
                <Label>Codigo do Funcionario *</Label>
                <Input
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value.toUpperCase() })}
                  placeholder="Ex: 001, FUNC01, JOAO"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Codigo unico para identificar o funcionario
                </p>
              </div>
            )}

            {/* Campo de PIN para troca de operador */}
            <div>
              <Label>PIN de Acesso (4-6 digitos)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Ex: 1234"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PIN para troca rapida de operador no sistema
              </p>
            </div>

            {/* Email - obrigatorio apenas se nao usar login simplificado */}
            {!formData.use_simple_login && (
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            )}

            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label>Perfil de Acesso *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div>
                        <p className="font-medium">{ROLE_LABELS[role]}</p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedUser && (
              <div>
                <Label>
                  Senha {formData.use_simple_login && formData.pin?.length >= 4 ? '(opcional)' : '*'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={formData.use_simple_login && formData.pin?.length >= 4 ? "Opcional se usar PIN" : "Senha inicial"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {formData.use_simple_login && formData.pin?.length >= 4 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Senha opcional - o funcionario usara o PIN para acessar
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Usuario Ativo</p>
                <p className="text-xs text-muted-foreground">
                  Usuarios inativos nao podem acessar o sistema
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {selectedUser ? 'Salvar' : 'Criar Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alterar Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm" aria-describedby="password-dialog-description">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p id="password-dialog-description" className="text-sm text-muted-foreground">
              Alterando senha de: <strong>{selectedUser?.full_name}</strong>
            </p>

            <div>
              <Label>Nova Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite a nova senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword}>
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Excluir */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm" aria-describedby="delete-user-description">
          <DialogHeader>
            <DialogTitle>Excluir Usuario</DialogTitle>
          </DialogHeader>

          <div className="py-4" id="delete-user-description">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir o usuario{' '}
              <strong>{selectedUser?.full_name}</strong>?
            </p>
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning-foreground">
                <strong>Importante:</strong> Se o usuario tiver dados vinculados (vendas, caixa, etc.),
                a exclusao nao sera possivel. Nesse caso, use a opcao <strong>Desativar</strong>.
              </p>
            </div>
            <p className="text-sm text-destructive mt-2">
              Esta acao nao pode ser desfeita.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteDialog(false);
                if (selectedUser) handleToggleActive(selectedUser);
              }}
            >
              <UserX className="w-4 h-4 mr-2" />
              Desativar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
