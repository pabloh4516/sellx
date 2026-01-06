import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES, ROLE_LABELS } from '@/config/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings as SettingsIcon, Database, Shield, Bell, Users,
  Download, Upload, AlertTriangle, Save, Mail, ShoppingCart, Monitor,
  Barcode, Volume2, VolumeX, Camera, Wallet, Users2, User, Lock, Unlock,
  Info, CheckCircle2, Percent, Edit2, X, Eye, DollarSign, Tag
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  StatusBadge,
} from '@/components/nexo';

export default function Settings() {
  const { operator } = useAuth();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  // Verificar se pode gerenciar usuarios (owner, admin, manager)
  const canManageUsers = operator?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(operator.role);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(USER_ROLES.SELLER);
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiring: true,
    overdue: true,
    dailyReport: false
  });
  const [systemSettings, setSystemSettings] = useState(() => {
    // Carrega configuracoes salvas do localStorage
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback para valores padrao
      }
    }
    return {
      autoBackup: false,
      blockSaleNoStock: true,
      requireCustomer: false,
      printAutomatically: false,
      pdvWaitingMode: true,
      // Configuracoes do Scanner
      pdvSoundEnabled: true,
      scannerPrefix: '',
      scannerSuffix: '',
      scannerMinLength: 3,
      scannerTimeout: 100,
      scannerEnterAsSubmit: true,
      // Configuracoes do Caixa
      cashRegisterMode: 'shared', // 'shared' ou 'per_operator'
      // Configuracoes de Permissoes por Role
      permissions: {
        // Limites de desconto por role (em %)
        discountLimits: {
          owner: 100,     // Dono pode dar 100%
          admin: 50,      // Admin pode dar ate 50%
          manager: 30,    // Gerente pode dar ate 30%
          seller: 10,     // Vendedor pode dar ate 10%
          cashier: 5,     // Caixa pode dar ate 5%
        },
        // Permissoes por role
        canEditSale: {
          owner: true,
          admin: true,
          manager: true,
          seller: false,
          cashier: false,
        },
        canCancelSale: {
          owner: true,
          admin: true,
          manager: true,
          seller: false,
          cashier: false,
        },
        canApplyDiscount: {
          owner: true,
          admin: true,
          manager: true,
          seller: true,
          cashier: false,
        },
        canOpenPrice: {
          owner: true,
          admin: true,
          manager: true,
          seller: true,
          cashier: true,
        },
        canViewCost: {
          owner: true,
          admin: true,
          manager: true,
          seller: false,
          cashier: false,
        },
        canViewProfit: {
          owner: true,
          admin: true,
          manager: true,
          seller: false,
          cashier: false,
        },
      }
    };
  });

  useEffect(() => {
    loadData();
  }, [operator]);

  const loadData = async () => {
    try {
      // Usar operator do contexto se disponivel
      let currentOperator = operator;
      if (operator) {
        setUser(operator);
      } else {
        currentOperator = await base44.auth.me();
        setUser(currentOperator);
      }

      // Carregar todos os usuarios (profiles) se tem permissao
      const hasPermission = currentOperator?.role && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(currentOperator.role);
      if (hasPermission) {
        const allUsers = await base44.entities.Profile.list();
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error('Informe o e-mail');
      return;
    }

    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success('Convite enviado com sucesso!');
      setShowInviteDialog(false);
      setInviteEmail('');
      loadData();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Erro ao enviar convite');
    }
  };

  const handleExportData = async () => {
    try {
      toast.info('Exportando dados...');

      const [sales, products, customers] = await Promise.all([
        base44.entities.Sale.list(),
        base44.entities.Product.list(),
        base44.entities.Customer.list()
      ]);

      const data = { sales, products, customers, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = (customMessage = null) => {
    setSaving(true);

    // Pequeno delay para dar feedback visual
    setTimeout(() => {
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      localStorage.setItem('notifications', JSON.stringify(notifications));
      setSaving(false);
      toast.success(customMessage || 'Configuracoes salvas com sucesso!', {
        description: 'As alteracoes foram aplicadas.',
        duration: 3000,
      });
    }, 300);
  };

  const handleSaveCashMode = () => {
    const modeLabel = systemSettings.cashRegisterMode === 'shared'
      ? 'Caixa Compartilhado'
      : 'Caixa por Operador';
    handleSaveSettings(`Modo "${modeLabel}" ativado!`);
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

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title="Configuracoes"
        subtitle="Gerencie as configuracoes do sistema"
        icon={SettingsIcon}
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-6">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="cash">Caixa</TabsTrigger>
          <TabsTrigger value="permissions">Permissoes</TabsTrigger>
          <TabsTrigger value="scanner">PDV/Scanner</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="notifications">Notificacoes</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <CardSection>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Configuracoes Gerais
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bloquear venda sem estoque</Label>
                  <p className="text-sm text-muted-foreground">
                    Impede que produtos sem estoque sejam vendidos
                  </p>
                </div>
                <Switch
                  checked={systemSettings.blockSaleNoStock}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, blockSaleNoStock: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir cliente na venda</Label>
                  <p className="text-sm text-muted-foreground">
                    Torna obrigatorio selecionar um cliente ao vender
                  </p>
                </div>
                <Switch
                  checked={systemSettings.requireCustomer}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, requireCustomer: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Imprimir cupom automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Abre tela de impressao automaticamente apos venda
                  </p>
                </div>
                <Switch
                  checked={systemSettings.printAutomatically}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, printAutomatically: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Modo espera no PDV
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe tela de boas-vindas aguardando F2 para iniciar venda
                  </p>
                </div>
                <Switch
                  checked={systemSettings.pdvWaitingMode}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, pdvWaitingMode: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Backup automatico</Label>
                  <p className="text-sm text-muted-foreground">
                    Realiza backup automatico dos dados semanalmente
                  </p>
                </div>
                <Switch
                  checked={systemSettings.autoBackup}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, autoBackup: v})}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSaveSettings()} disabled={saving}>
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configuracoes'}
                </Button>
              </div>
            </div>
          </CardSection>
        </TabsContent>

        {/* Cash Register Settings */}
        <TabsContent value="cash">
          <div className="space-y-6">
            <CardSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Modo de Operacao do Caixa
              </h3>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-1">Escolha como o caixa vai funcionar na sua loja</p>
                    <p className="text-muted-foreground">
                      Esta configuracao define se todos os operadores compartilham o mesmo caixa ou se cada um tem seu proprio controle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opcao Compartilhado */}
                <div
                  onClick={() => setSystemSettings({...systemSettings, cashRegisterMode: 'shared'})}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    systemSettings.cashRegisterMode === 'shared'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users2 className="w-6 h-6 text-primary" />
                    </div>
                    {systemSettings.cashRegisterMode === 'shared' && (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Caixa Compartilhado</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Um unico caixa para toda a loja. Ideal para lojas pequenas ou quando ha um responsavel pelo caixa.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="w-4 h-4 text-warning" />
                      <span>Apenas admin/gerente abre e fecha</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Todos os operadores vendem no mesmo caixa</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="w-4 h-4 text-success" />
                      <span>Um fechamento consolida todas as vendas</span>
                    </div>
                  </div>
                </div>

                {/* Opcao Por Operador */}
                <div
                  onClick={() => setSystemSettings({...systemSettings, cashRegisterMode: 'per_operator'})}
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    systemSettings.cashRegisterMode === 'per_operator'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-success" />
                    </div>
                    {systemSettings.cashRegisterMode === 'per_operator' && (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Caixa por Operador</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cada operador controla seu proprio caixa. Ideal para lojas com varios vendedores ou turnos.
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Unlock className="w-4 h-4 text-success" />
                      <span>Cada operador abre e fecha seu caixa</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 text-primary" />
                      <span>Vendas vinculadas ao caixa do operador</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="w-4 h-4 text-warning" />
                      <span>Admin visualiza todos os caixas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela Comparativa */}
              <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Comparacao dos Modos
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium">Situacao</th>
                        <th className="text-center py-2 px-4 font-medium">Compartilhado</th>
                        <th className="text-center py-2 pl-4 font-medium">Por Operador</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Quem abre o caixa?</td>
                        <td className="text-center py-2 px-4">Admin/Gerente</td>
                        <td className="text-center py-2 pl-4">Cada operador</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Quem fecha o caixa?</td>
                        <td className="text-center py-2 px-4">Admin/Gerente</td>
                        <td className="text-center py-2 pl-4">Cada operador</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Joao vende R$100</td>
                        <td className="text-center py-2 px-4">Vai pro caixa da loja</td>
                        <td className="text-center py-2 pl-4">Vai pro caixa do Joao</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4">Maria entra no turno</td>
                        <td className="text-center py-2 px-4">Usa o mesmo caixa</td>
                        <td className="text-center py-2 pl-4">Abre seu proprio caixa</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Fim do dia</td>
                        <td className="text-center py-2 px-4">1 fechamento total</td>
                        <td className="text-center py-2 pl-4">Cada um fecha o seu</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button onClick={handleSaveCashMode} disabled={saving}>
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Configuracao'}
                </Button>
              </div>
            </CardSection>
          </div>
        </TabsContent>

        {/* Permissions Settings */}
        <TabsContent value="permissions">
          <div className="space-y-6">
            <CardSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Gerenciamento de Permissoes
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure as permissoes e limites para cada tipo de usuario do sistema.
                Essas configuracoes afetam o que cada role pode fazer no PDV e no sistema.
              </p>

              {/* Limites de Desconto */}
              <div className="mb-8">
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-warning" />
                  Limites de Desconto
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Define o desconto maximo (%) que cada tipo de usuario pode aplicar em uma venda.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { key: 'owner', label: 'Proprietario', color: 'text-destructive' },
                    { key: 'admin', label: 'Administrador', color: 'text-primary' },
                    { key: 'manager', label: 'Gerente', color: 'text-warning' },
                    { key: 'seller', label: 'Vendedor', color: 'text-success' },
                    { key: 'cashier', label: 'Caixa', color: 'text-muted-foreground' },
                  ].map(role => (
                    <div key={role.key} className="p-4 bg-muted/50 rounded-xl border border-border">
                      <Label className={`text-sm font-medium ${role.color}`}>{role.label}</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={systemSettings.permissions?.discountLimits?.[role.key] ?? 0}
                          onChange={(e) => {
                            const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setSystemSettings({
                              ...systemSettings,
                              permissions: {
                                ...systemSettings.permissions,
                                discountLimits: {
                                  ...systemSettings.permissions?.discountLimits,
                                  [role.key]: value
                                }
                              }
                            });
                          }}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Permissoes por Role */}
              <div>
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-destructive" />
                  Permissoes por Funcao
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Ative ou desative permissoes especificas para cada tipo de usuario.
                </p>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-6">
                    {/* Editar Venda */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Edit2 className="w-4 h-4 text-primary" />
                        <span className="font-medium">Editar Venda</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite alterar itens, quantidades e precos de vendas ja finalizadas.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canEditSale?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canEditSale: { ...systemSettings.permissions?.canEditSale, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cancelar Venda */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <X className="w-4 h-4 text-destructive" />
                        <span className="font-medium">Cancelar Venda</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite cancelar vendas ja concluidas.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canCancelSale?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canCancelSale: { ...systemSettings.permissions?.canCancelSale, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aplicar Desconto */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-warning" />
                        <span className="font-medium">Aplicar Desconto</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite aplicar descontos nas vendas (respeitando o limite configurado).
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canApplyDiscount?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canApplyDiscount: { ...systemSettings.permissions?.canApplyDiscount, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preco Livre */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-success" />
                        <span className="font-medium">Alterar Preco (Preco Livre)</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite alterar o preco de produtos durante a venda.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canOpenPrice?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canOpenPrice: { ...systemSettings.permissions?.canOpenPrice, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ver Custo */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Visualizar Custo dos Produtos</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite ver o preco de custo dos produtos no sistema.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canViewCost?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canViewCost: { ...systemSettings.permissions?.canViewCost, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ver Lucro */}
                    <div className="p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-success" />
                        <span className="font-medium">Visualizar Lucro</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permite ver o lucro nas vendas e relatorios.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {['owner', 'admin', 'manager', 'seller', 'cashier'].map(role => (
                          <div key={role} className="flex items-center gap-2">
                            <Switch
                              checked={systemSettings.permissions?.canViewProfit?.[role] ?? false}
                              onCheckedChange={(v) => setSystemSettings({
                                ...systemSettings,
                                permissions: {
                                  ...systemSettings.permissions,
                                  canViewProfit: { ...systemSettings.permissions?.canViewProfit, [role]: v }
                                }
                              })}
                            />
                            <span className="text-sm capitalize">{role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Gerente' : role === 'seller' ? 'Vendedor' : role === 'cashier' ? 'Caixa' : role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <Separator className="my-6" />

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSaveSettings('Permissoes salvas com sucesso!')}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Permissoes'}
                </Button>
              </div>
            </CardSection>
          </div>
        </TabsContent>

        {/* PDV/Scanner Settings */}
        <TabsContent value="scanner">
          <div className="space-y-6">
            {/* Som */}
            <CardSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {systemSettings.pdvSoundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                Som do PDV
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Beep de confirmacao</Label>
                  <p className="text-sm text-muted-foreground">
                    Toca um som ao escanear codigo de barras ou adicionar produto
                  </p>
                </div>
                <Switch
                  checked={systemSettings.pdvSoundEnabled}
                  onCheckedChange={(v) => setSystemSettings({...systemSettings, pdvSoundEnabled: v})}
                />
              </div>
            </CardSection>

            {/* Scanner */}
            <CardSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-primary" />
                Leitor de Codigo de Barras
              </h3>

              <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Configure o comportamento do leitor de codigo de barras USB.
                    Alguns leitores adicionam caracteres extras (prefixo/sufixo) que precisam ser removidos.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prefixo do Leitor</Label>
                    <Input
                      placeholder="Ex: ]C1"
                      value={systemSettings.scannerPrefix}
                      onChange={(e) => setSystemSettings({...systemSettings, scannerPrefix: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Caracteres adicionados no inicio do codigo
                    </p>
                  </div>
                  <div>
                    <Label>Sufixo do Leitor</Label>
                    <Input
                      placeholder="Ex: ~"
                      value={systemSettings.scannerSuffix}
                      onChange={(e) => setSystemSettings({...systemSettings, scannerSuffix: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Caracteres adicionados no final do codigo
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Comprimento minimo do codigo</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={systemSettings.scannerMinLength}
                      onChange={(e) => setSystemSettings({...systemSettings, scannerMinLength: parseInt(e.target.value) || 3})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Codigos menores serao ignorados
                    </p>
                  </div>
                  <div>
                    <Label>Timeout (ms)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="500"
                      step="10"
                      value={systemSettings.scannerTimeout}
                      onChange={(e) => setSystemSettings({...systemSettings, scannerTimeout: parseInt(e.target.value) || 100})}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tempo entre teclas para detectar scanner
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enter como confirmacao</Label>
                    <p className="text-sm text-muted-foreground">
                      Usa a tecla Enter/Tab para confirmar o codigo escaneado
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.scannerEnterAsSubmit}
                    onCheckedChange={(v) => setSystemSettings({...systemSettings, scannerEnterAsSubmit: v})}
                  />
                </div>
              </div>
            </CardSection>

            {/* Camera Scanner */}
            <CardSection>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Scanner por Camera
              </h3>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm">
                  O PDV suporta leitura de codigo de barras pela camera do celular ou webcam.
                  No PDV, clique no icone de camera ao lado do campo de busca para abrir o scanner.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Suporta: EAN-13, EAN-8, UPC, Code 128, Code 39, QR Code e outros
                </p>
              </div>
            </CardSection>

            <div className="flex justify-end">
              <Button onClick={() => handleSaveSettings()} disabled={saving}>
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Salvando...' : 'Salvar Configuracoes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users">
          <CardSection>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gerenciar Usuarios
              </h3>
              {canManageUsers && (
                <Button onClick={() => setShowInviteDialog(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Convidar Usuario
                </Button>
              )}
            </div>

            {canManageUsers ? (
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum usuario encontrado</p>
                  </div>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name || u.email}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={u.is_active !== false ? 'success' : 'default'}
                          label={u.is_active !== false ? 'Ativo' : 'Inativo'}
                        />
                        <StatusBadge
                          status={[USER_ROLES.OWNER, USER_ROLES.ADMIN].includes(u.role) ? 'info' : 'default'}
                          label={ROLE_LABELS[u.role] || u.role || 'Usuario'}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Apenas administradores podem gerenciar usuarios</p>
              </div>
            )}
          </CardSection>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <CardSection>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificacoes e Alertas
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alerta de estoque baixo</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifica quando produtos atingem o estoque minimo
                  </p>
                </div>
                <Switch
                  checked={notifications.lowStock}
                  onCheckedChange={(v) => setNotifications({...notifications, lowStock: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produtos proximos da validade</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerta para produtos que vencem em ate 30 dias
                  </p>
                </div>
                <Switch
                  checked={notifications.expiring}
                  onCheckedChange={(v) => setNotifications({...notifications, expiring: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Clientes em atraso</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifica sobre parcelas vencidas
                  </p>
                </div>
                <Switch
                  checked={notifications.overdue}
                  onCheckedChange={(v) => setNotifications({...notifications, overdue: v})}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatorio diario por e-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Recebe resumo das vendas do dia por e-mail
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(v) => setNotifications({...notifications, dailyReport: v})}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSaveSettings()} disabled={saving}>
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Preferencias'}
                </Button>
              </div>
            </div>
          </CardSection>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup">
          <CardSection>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Backup e Restauracao
            </h3>

            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Importante</p>
                <p className="text-muted-foreground">Realize backups regulares dos seus dados para garantir a seguranca das informacoes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardSection className="bg-muted/30">
                <Download className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-2">Exportar Dados</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Baixe uma copia de todos os dados do sistema em formato JSON
                </p>
                <Button onClick={handleExportData} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Fazer Backup
                </Button>
              </CardSection>

              <CardSection className="bg-muted/30">
                <Upload className="w-8 h-8 text-success mb-3" />
                <h4 className="font-semibold mb-2">Importar Dados</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Restaure dados de um backup anterior
                </p>
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Restaurar Backup
                </Button>
              </CardSection>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Ultimo Backup</h4>
              <p className="text-sm text-muted-foreground">Nenhum backup realizado ainda</p>
            </div>
          </CardSection>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Tipo de Acesso</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant={inviteRole === USER_ROLES.SELLER ? 'default' : 'outline'}
                  onClick={() => setInviteRole(USER_ROLES.SELLER)}
                  className="justify-start"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Vendedor
                </Button>
                <Button
                  type="button"
                  variant={inviteRole === USER_ROLES.CASHIER ? 'default' : 'outline'}
                  onClick={() => setInviteRole(USER_ROLES.CASHIER)}
                  className="justify-start"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Caixa
                </Button>
                <Button
                  type="button"
                  variant={inviteRole === USER_ROLES.MANAGER ? 'default' : 'outline'}
                  onClick={() => setInviteRole(USER_ROLES.MANAGER)}
                  className="justify-start"
                >
                  <User className="w-4 h-4 mr-2" />
                  Gerente
                </Button>
                <Button
                  type="button"
                  variant={inviteRole === USER_ROLES.ADMIN ? 'default' : 'outline'}
                  onClick={() => setInviteRole(USER_ROLES.ADMIN)}
                  className="justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {inviteRole === USER_ROLES.ADMIN || inviteRole === USER_ROLES.OWNER
                  ? 'Acesso completo a todas as funcionalidades'
                  : inviteRole === USER_ROLES.MANAGER
                  ? 'Acesso a vendas, estoque, relatorios e cadastros'
                  : inviteRole === USER_ROLES.CASHIER
                  ? 'Acesso ao PDV e operacoes de caixa'
                  : 'Acesso ao PDV e cadastro de clientes'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInviteUser}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
