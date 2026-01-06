import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Globe,
  Mail,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  Key,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);

  // General Settings
  const [platformName, setPlatformName] = useState('Sellx');
  const [platformUrl, setPlatformUrl] = useState('https://sellx.com.br');
  const [supportEmail, setSupportEmail] = useState('suporte@sellx.com.br');

  // Email Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Notifications
  const [emailNewOrg, setEmailNewOrg] = useState(true);
  const [emailNewSubscription, setEmailNewSubscription] = useState(true);
  const [emailCancelation, setEmailCancelation] = useState(true);

  // Features
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [allowGoogleLogin, setAllowGoogleLogin] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simular salvamento
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Configuracoes salvas com sucesso!');
    setSaving(false);
  };

  const SettingCard = ({ icon: Icon, title, description, children }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-muted-foreground">Configuracoes gerais da plataforma</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alteracoes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notificacoes</TabsTrigger>
          <TabsTrigger value="security">Seguranca</TabsTrigger>
          <TabsTrigger value="integrations">Integracoes</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <SettingCard
            icon={Globe}
            title="Informacoes da Plataforma"
            description="Configuracoes basicas do Sellx"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Plataforma</Label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Sellx"
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Plataforma</Label>
                <Input
                  value={platformUrl}
                  onChange={(e) => setPlatformUrl(e.target.value)}
                  placeholder="https://sellx.com.br"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email de Suporte</Label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="suporte@sellx.com.br"
                />
              </div>
            </div>
          </SettingCard>

          <SettingCard
            icon={Shield}
            title="Modo de Manutencao"
            description="Ative para bloquear acesso de clientes durante manutencao"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo Manutencao</p>
                <p className="text-sm text-muted-foreground">
                  Apenas Super Admins poderao acessar
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
              />
            </div>
          </SettingCard>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email" className="space-y-6">
          <SettingCard
            icon={Mail}
            title="Configuracao SMTP"
            description="Configure o servidor de email para envio de notificacoes"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host SMTP</Label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button variant="outline" className="mt-4">
              Testar Conexao
            </Button>
          </SettingCard>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <SettingCard
            icon={Bell}
            title="Notificacoes por Email"
            description="Configure quais eventos enviam email para voce"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nova Organizacao</p>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando um novo cliente se cadastrar
                  </p>
                </div>
                <Switch
                  checked={emailNewOrg}
                  onCheckedChange={setEmailNewOrg}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nova Assinatura</p>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando alguem assinar um plano pago
                  </p>
                </div>
                <Switch
                  checked={emailNewSubscription}
                  onCheckedChange={setEmailNewSubscription}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cancelamento</p>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando alguem cancelar assinatura
                  </p>
                </div>
                <Switch
                  checked={emailCancelation}
                  onCheckedChange={setEmailCancelation}
                />
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <SettingCard
            icon={Key}
            title="Autenticacao"
            description="Configure as opcoes de login e registro"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Permitir Novos Registros</p>
                  <p className="text-sm text-muted-foreground">
                    Permitir que novos usuarios se cadastrem
                  </p>
                </div>
                <Switch
                  checked={allowRegistration}
                  onCheckedChange={setAllowRegistration}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Verificacao de Email</p>
                  <p className="text-sm text-muted-foreground">
                    Exigir confirmacao de email no cadastro
                  </p>
                </div>
                <Switch
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login com Google</p>
                  <p className="text-sm text-muted-foreground">
                    Permitir login via conta Google
                  </p>
                </div>
                <Switch
                  checked={allowGoogleLogin}
                  onCheckedChange={setAllowGoogleLogin}
                />
              </div>
            </div>
          </SettingCard>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <SettingCard
            icon={CreditCard}
            title="Gateway de Pagamento"
            description="Configure a integracao com processador de pagamentos"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stripe Secret Key</Label>
                <Input type="password" placeholder="sk_live_..." />
              </div>
              <div className="space-y-2">
                <Label>Stripe Publishable Key</Label>
                <Input placeholder="pk_live_..." />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input type="password" placeholder="whsec_..." />
              </div>
            </div>
          </SettingCard>

          <SettingCard
            icon={MessageSquare}
            title="WhatsApp"
            description="Configure a integracao com WhatsApp Business"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Token de Acesso</Label>
                <Input type="password" placeholder="Token do WhatsApp Business API" />
              </div>
              <div className="space-y-2">
                <Label>Numero de Telefone</Label>
                <Input placeholder="+55 11 99999-9999" />
              </div>
            </div>
          </SettingCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
