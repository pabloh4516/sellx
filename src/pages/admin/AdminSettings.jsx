import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  RefreshCcw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_SETTINGS = {
  // General
  platform_name: 'Sellx',
  platform_url: 'https://sellx.com.br',
  support_email: 'suporte@sellx.com.br',
  // SMTP
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  // Notifications
  notify_new_org: true,
  notify_new_subscription: true,
  notify_cancelation: true,
  // Features
  allow_registration: true,
  require_email_verification: true,
  allow_google_login: false,
  maintenance_mode: false,
  // Integrations
  stripe_secret_key: '',
  stripe_publishable_key: '',
  stripe_webhook_secret: '',
  whatsapp_token: '',
  whatsapp_phone: '',
};

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for first load
        console.error('Error loading settings:', error);
      }

      if (data?.settings) {
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if settings row exists
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('platform_settings')
          .update({
            settings: settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            settings: settings,
          });

        if (error) throw error;
      }

      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success('Configuracoes salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestSmtp = async () => {
    if (!settings.smtp_host || !settings.smtp_user) {
      toast.error('Configure o host e usuario SMTP primeiro');
      return;
    }
    // This would need a backend function to actually test SMTP
    toast.info('Funcionalidade de teste SMTP requer configuracao do servidor');
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando configuracoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-muted-foreground">
            Configuracoes gerais da plataforma
            {hasChanges && (
              <span className="ml-2 text-amber-500 text-sm">(alteracoes nao salvas)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={saving}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Salvando...' : 'Salvar Alteracoes'}
          </Button>
        </div>
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
                  value={settings.platform_name}
                  onChange={(e) => updateSetting('platform_name', e.target.value)}
                  placeholder="Sellx"
                />
              </div>
              <div className="space-y-2">
                <Label>URL da Plataforma</Label>
                <Input
                  value={settings.platform_url}
                  onChange={(e) => updateSetting('platform_url', e.target.value)}
                  placeholder="https://sellx.com.br"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email de Suporte</Label>
                <Input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => updateSetting('support_email', e.target.value)}
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
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
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
                  value={settings.smtp_host}
                  onChange={(e) => updateSetting('smtp_host', e.target.value)}
                  placeholder="smtp.exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  value={settings.smtp_port}
                  onChange={(e) => updateSetting('smtp_port', e.target.value)}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Input
                  value={settings.smtp_user}
                  onChange={(e) => updateSetting('smtp_user', e.target.value)}
                  placeholder="usuario@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => updateSetting('smtp_password', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button variant="outline" className="mt-4" onClick={handleTestSmtp}>
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
                  checked={settings.notify_new_org}
                  onCheckedChange={(checked) => updateSetting('notify_new_org', checked)}
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
                  checked={settings.notify_new_subscription}
                  onCheckedChange={(checked) => updateSetting('notify_new_subscription', checked)}
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
                  checked={settings.notify_cancelation}
                  onCheckedChange={(checked) => updateSetting('notify_cancelation', checked)}
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
                  checked={settings.allow_registration}
                  onCheckedChange={(checked) => updateSetting('allow_registration', checked)}
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
                  checked={settings.require_email_verification}
                  onCheckedChange={(checked) => updateSetting('require_email_verification', checked)}
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
                  checked={settings.allow_google_login}
                  onCheckedChange={(checked) => updateSetting('allow_google_login', checked)}
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
                <Input
                  type="password"
                  placeholder="sk_live_..."
                  value={settings.stripe_secret_key}
                  onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Publishable Key</Label>
                <Input
                  placeholder="pk_live_..."
                  value={settings.stripe_publishable_key}
                  onChange={(e) => updateSetting('stripe_publishable_key', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  type="password"
                  placeholder="whsec_..."
                  value={settings.stripe_webhook_secret}
                  onChange={(e) => updateSetting('stripe_webhook_secret', e.target.value)}
                />
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
                <Input
                  type="password"
                  placeholder="Token do WhatsApp Business API"
                  value={settings.whatsapp_token}
                  onChange={(e) => updateSetting('whatsapp_token', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Numero de Telefone</Label>
                <Input
                  placeholder="+55 11 99999-9999"
                  value={settings.whatsapp_phone}
                  onChange={(e) => updateSetting('whatsapp_phone', e.target.value)}
                />
              </div>
            </div>
          </SettingCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
