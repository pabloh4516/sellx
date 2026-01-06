import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Palette, Sun, Moon, Monitor, Type, Layout, Image, Sliders, Eye,
  RotateCcw, Check, Paintbrush, Square, Circle, LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
} from '@/components/nexo';

// Cores predefinidas
const PRESET_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f59e0b' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Indigo', value: '#6366f1' },
];

// Configuracoes padrao
const DEFAULT_SETTINGS = {
  theme: 'system',
  primaryColor: '#3b82f6',
  borderRadius: 8,
  fontSize: 'medium',
  sidebarStyle: 'default',
  compactMode: false,
  showAnimations: true,
  headerStyle: 'default',
};

export default function ThemeSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Verificar se houve mudancas
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings));
    // Aplicar preview em tempo real
    applyThemePreview(settings);
  }, [settings]);

  // Converter snake_case do banco para camelCase do frontend
  const fromDbFormat = (data) => ({
    theme: data.theme || DEFAULT_SETTINGS.theme,
    primaryColor: data.primary_color || data.primaryColor || DEFAULT_SETTINGS.primaryColor,
    borderRadius: data.border_radius ?? data.borderRadius ?? DEFAULT_SETTINGS.borderRadius,
    fontSize: data.font_size || data.fontSize || DEFAULT_SETTINGS.fontSize,
    sidebarStyle: data.sidebar_style || data.sidebarStyle || DEFAULT_SETTINGS.sidebarStyle,
    compactMode: data.compact_mode ?? data.compactMode ?? DEFAULT_SETTINGS.compactMode,
    showAnimations: data.show_animations ?? data.showAnimations ?? DEFAULT_SETTINGS.showAnimations,
    headerStyle: data.header_style || data.headerStyle || DEFAULT_SETTINGS.headerStyle,
  });

  // Converter camelCase do frontend para snake_case do banco
  const toDbFormat = (data) => ({
    theme: data.theme,
    primary_color: data.primaryColor,
    border_radius: data.borderRadius,
    font_size: data.fontSize,
    sidebar_style: data.sidebarStyle,
    compact_mode: data.compactMode,
    show_animations: data.showAnimations,
    header_style: data.headerStyle,
  });

  const loadSettings = async () => {
    try {
      const savedSettings = await base44.entities.ThemeSettings?.list() || [];
      if (savedSettings.length > 0) {
        const loaded = fromDbFormat(savedSettings[0]);
        setSettings(loaded);
        setOriginalSettings(loaded);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyThemePreview = (config) => {
    const root = document.documentElement;

    // Aplicar cor primaria
    if (config.primaryColor) {
      root.style.setProperty('--primary-preview', config.primaryColor);
    }

    // Aplicar border radius
    root.style.setProperty('--radius', `${config.borderRadius}px`);

    // Aplicar tema claro/escuro
    if (config.theme === 'dark') {
      document.body.classList.add('dark');
    } else if (config.theme === 'light') {
      document.body.classList.remove('dark');
    }

    // Aplicar tamanho de fonte
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--font-size-base', fontSizes[config.fontSize] || '16px');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const savedSettings = await base44.entities.ThemeSettings?.list() || [];
      const dataToSave = toDbFormat(settings);

      if (savedSettings.length > 0) {
        await base44.entities.ThemeSettings?.update(savedSettings[0].id, dataToSave);
      } else {
        await base44.entities.ThemeSettings?.create(dataToSave);
      }

      setOriginalSettings(settings);
      toast.success('Configuracoes salvas!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    applyThemePreview(DEFAULT_SETTINGS);
    toast.info('Configuracoes restauradas para o padrao');
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
    <PageContainer>
      <PageHeader
        title="Personalizacao Visual"
        subtitle="Customize a aparencia do sistema"
        icon={Palette}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrao
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              {saving ? (
                'Salvando...'
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Alteracoes
                </>
              )}
            </Button>
          </div>
        }
      />

      <Grid cols={2}>
        {/* Tema */}
        <CardSection title="Modo de Tema" icon={Sun}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'dark', label: 'Escuro', icon: Moon },
                { value: 'system', label: 'Sistema', icon: Monitor },
              ].map(theme => (
                <div
                  key={theme.value}
                  onClick={() => updateSetting('theme', theme.value)}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer text-center transition-all",
                    settings.theme === theme.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <theme.icon className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    settings.theme === theme.value ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{theme.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardSection>

        {/* Cor Primaria */}
        <CardSection title="Cor Primaria" icon={Paintbrush}>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map(color => (
                <div
                  key={color.value}
                  onClick={() => updateSetting('primaryColor', color.value)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer text-center transition-all border-2",
                    settings.primaryColor === color.value
                      ? "border-foreground"
                      : "border-transparent hover:border-muted"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full mx-auto mb-1 ring-2 ring-offset-2 ring-offset-background"
                    style={{
                      backgroundColor: color.value,
                      ringColor: settings.primaryColor === color.value ? color.value : 'transparent'
                    }}
                  />
                  <span className="text-xs">{color.name}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Label>Cor Personalizada:</Label>
              <Input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-14 h-10 p-1"
              />
              <Input
                value={settings.primaryColor}
                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                className="w-28"
                placeholder="#000000"
              />
            </div>
          </div>
        </CardSection>

        {/* Bordas */}
        <CardSection title="Arredondamento das Bordas" icon={Square}>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-20">Quadrado</span>
              <Slider
                value={[settings.borderRadius]}
                onValueChange={([value]) => updateSetting('borderRadius', value)}
                max={20}
                min={0}
                step={2}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-20 text-right">Arredondado</span>
            </div>
            <div className="flex gap-2">
              {[0, 4, 8, 12, 16, 20].map(radius => (
                <div
                  key={radius}
                  onClick={() => updateSetting('borderRadius', radius)}
                  className={cn(
                    "w-12 h-12 border-2 cursor-pointer transition-all",
                    settings.borderRadius === radius
                      ? "border-primary bg-primary/20"
                      : "border-muted hover:border-primary/50 bg-muted"
                  )}
                  style={{ borderRadius: `${radius}px` }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Valor atual: {settings.borderRadius}px
            </p>
          </div>
        </CardSection>

        {/* Tamanho de Fonte */}
        <CardSection title="Tamanho da Fonte" icon={Type}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'small', label: 'Pequena', example: 'Aa' },
                { value: 'medium', label: 'Media', example: 'Aa' },
                { value: 'large', label: 'Grande', example: 'Aa' },
              ].map(size => (
                <div
                  key={size.value}
                  onClick={() => updateSetting('fontSize', size.value)}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer text-center transition-all",
                    settings.fontSize === size.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className={cn(
                    "font-bold block mb-1",
                    size.value === 'small' && "text-sm",
                    size.value === 'medium' && "text-base",
                    size.value === 'large' && "text-lg"
                  )}>
                    {size.example}
                  </span>
                  <span className="text-xs text-muted-foreground">{size.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardSection>

        {/* Estilo do Sidebar */}
        <CardSection title="Estilo da Barra Lateral" icon={Layout}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'default', label: 'Padrao' },
                { value: 'compact', label: 'Compacto' },
              ].map(style => (
                <div
                  key={style.value}
                  onClick={() => updateSetting('sidebarStyle', style.value)}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer text-center transition-all",
                    settings.sidebarStyle === style.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <LayoutDashboard className={cn(
                    "w-6 h-6 mx-auto mb-2",
                    settings.sidebarStyle === style.value ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{style.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardSection>

        {/* Opcoes Adicionais */}
        <CardSection title="Opcoes Adicionais" icon={Sliders}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Modo Compacto</p>
                <p className="text-sm text-muted-foreground">
                  Reduz espacamentos e tamanhos
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(v) => updateSetting('compactMode', v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Animacoes</p>
                <p className="text-sm text-muted-foreground">
                  Transicoes e animacoes visuais
                </p>
              </div>
              <Switch
                checked={settings.showAnimations}
                onCheckedChange={(v) => updateSetting('showAnimations', v)}
              />
            </div>
          </div>
        </CardSection>
      </Grid>

      {/* Preview */}
      <CardSection title="Preview" icon={Eye}>
        <div className="p-6 border rounded-lg bg-background">
          <div className="flex gap-4 mb-4">
            <Button style={{ backgroundColor: settings.primaryColor }}>
              Botao Primario
            </Button>
            <Button variant="outline">Botao Secundario</Button>
            <Button variant="ghost">Botao Ghost</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-4 border bg-card"
              style={{ borderRadius: `${settings.borderRadius}px` }}
            >
              <h4 className="font-medium mb-2">Card de Exemplo</h4>
              <p className="text-sm text-muted-foreground">
                Este e um texto de exemplo para visualizar as configuracoes.
              </p>
            </div>
            <div
              className="p-4 border"
              style={{
                borderRadius: `${settings.borderRadius}px`,
                backgroundColor: settings.primaryColor + '10'
              }}
            >
              <h4 className="font-medium mb-2" style={{ color: settings.primaryColor }}>
                Card Colorido
              </h4>
              <p className="text-sm text-muted-foreground">
                Veja como a cor primaria e aplicada.
              </p>
            </div>
            <div
              className="p-4 bg-muted"
              style={{ borderRadius: `${settings.borderRadius}px` }}
            >
              <Badge style={{ backgroundColor: settings.primaryColor }}>
                Badge
              </Badge>
              <Badge variant="outline" className="ml-2">Outline</Badge>
            </div>
          </div>
        </div>
      </CardSection>
    </PageContainer>
  );
}
