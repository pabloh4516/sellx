import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Monitor,
  Cloud,
  Globe,
  CreditCard,
  Save,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSiteSettingsAdmin } from '@/hooks/useSiteSettings';

const CATEGORY_INFO = {
  offline: {
    title: 'Sistema Offline',
    description: 'Configuracoes do sistema desktop (pagamento unico)',
    icon: Monitor,
    color: 'amber',
  },
  plans: {
    title: 'Planos Online',
    description: 'Precos e recursos dos planos do sistema SaaS',
    icon: Cloud,
    color: 'blue',
  },
  landing: {
    title: 'Landing Page',
    description: 'Textos e conteudos da pagina inicial',
    icon: Globe,
    color: 'green',
  },
  payment: {
    title: 'Pagamentos',
    description: 'Configuracoes de gateway e formas de pagamento',
    icon: CreditCard,
    color: 'violet',
  },
  general: {
    title: 'Geral',
    description: 'Informacoes gerais da empresa e contato',
    icon: Settings,
    color: 'gray',
  },
};

export default function AdminSiteSettings() {
  const { settings, loading, error, refetch, updateSetting } = useSiteSettingsAdmin();
  const [saving, setSaving] = useState({});
  const [editedValues, setEditedValues] = useState({});

  // Sincronizar valores editados quando carregar settings
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const values = {};
      Object.values(settings).flat().forEach(item => {
        values[item.key] = item.parsedValue;
      });
      setEditedValues(values);
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));

    const result = await updateSetting(key, editedValues[key]);

    if (result.success) {
      toast.success('Configuracao salva!');
    } else {
      toast.error('Erro ao salvar: ' + result.error);
    }

    setSaving(prev => ({ ...prev, [key]: false }));
  };

  const handleSaveAll = async (category) => {
    const categorySettings = settings[category] || [];
    setSaving(prev => ({ ...prev, [category]: true }));

    let hasError = false;
    for (const item of categorySettings) {
      if (editedValues[item.key] !== item.parsedValue) {
        const result = await updateSetting(item.key, editedValues[item.key]);
        if (!result.success) {
          hasError = true;
        }
      }
    }

    if (hasError) {
      toast.error('Alguns itens nao foram salvos');
    } else {
      toast.success('Todas as configuracoes salvas!');
    }

    setSaving(prev => ({ ...prev, [category]: false }));
  };

  const renderField = (item) => {
    const value = editedValues[item.key] ?? item.parsedValue;
    const isSaving = saving[item.key];
    const hasChanges = JSON.stringify(value) !== JSON.stringify(item.parsedValue);

    return (
      <div key={item.key} className="space-y-2 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium">
              {item.label || item.key}
              {hasChanges && (
                <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                  Alterado
                </Badge>
              )}
            </Label>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
          </div>
          {hasChanges && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave(item.key)}
              disabled={isSaving}
              className="flex-shrink-0"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {item.field_type === 'boolean' ? (
          <div className="flex items-center gap-2">
            <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleChange(item.key, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        ) : item.field_type === 'textarea' ? (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(item.key, e.target.value)}
            rows={3}
          />
        ) : item.field_type === 'json' ? (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(item.key, parsed);
              } catch {
                handleChange(item.key, e.target.value);
              }
            }}
            rows={4}
            className="font-mono text-xs"
            placeholder='["item1", "item2", "item3"]'
          />
        ) : item.field_type === 'number' ? (
          <Input
            type="number"
            step="0.01"
            value={value || ''}
            onChange={(e) => handleChange(item.key, parseFloat(e.target.value) || 0)}
          />
        ) : (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(item.key, e.target.value)}
          />
        )}
      </div>
    );
  };

  const renderCategory = (categoryKey) => {
    const info = CATEGORY_INFO[categoryKey] || {
      title: categoryKey,
      description: '',
      icon: Settings,
      color: 'gray',
    };
    const Icon = info.icon;
    const categorySettings = settings[categoryKey] || [];
    const isSaving = saving[categoryKey];

    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${info.color}-100 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${info.color}-600`} />
              </div>
              <div>
                <CardTitle className="text-lg">{info.title}</CardTitle>
                <CardDescription>{info.description}</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => handleSaveAll(categoryKey)}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Tudo
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorySettings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma configuracao encontrada nesta categoria.
            </p>
          ) : (
            categorySettings.map(renderField)
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600 mb-4">Erro ao carregar configuracoes: {error}</p>
          <Button onClick={refetch}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuracoes do Site</h1>
          <p className="text-muted-foreground">
            Edite precos, textos e configuracoes das paginas publicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Site
            </a>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              As alteracoes sao aplicadas imediatamente
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Apos salvar, as mudancas aparecerao no site publico automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="offline" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Offline</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Landing</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagamento</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offline" className="mt-6">
          {renderCategory('offline')}
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          {renderCategory('plans')}
        </TabsContent>

        <TabsContent value="landing" className="mt-6">
          {renderCategory('landing')}
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          {renderCategory('payment')}
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          {renderCategory('general')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
