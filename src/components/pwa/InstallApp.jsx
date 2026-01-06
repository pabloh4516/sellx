/**
 * Componente para instalar o PWA
 * Mostra botao para instalar o app no dispositivo
 */

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Armazenar evento de instalacao
let deferredPrompt = null;

export default function InstallApp({ className, variant = 'default' }) {
  const [canInstall, setCanInstall] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Verificar se ja esta instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listener para evento de instalacao disponivel
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    // Listener para quando o app e instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Mostrar instrucoes manuais
      setShowDialog(true);
      return;
    }

    setInstalling(true);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } catch (error) {
      console.error('Erro ao instalar:', error);
    } finally {
      setInstalling(false);
      deferredPrompt = null;
    }
  };

  // Se ja instalado, nao mostrar
  if (isInstalled) {
    return null;
  }

  // Se nao pode instalar via prompt, mostrar apenas se solicitado
  if (!canInstall && variant !== 'always') {
    return null;
  }

  return (
    <>
      <Button
        variant={variant === 'prominent' ? 'default' : 'outline'}
        size={variant === 'small' ? 'sm' : 'default'}
        className={cn(
          'gap-2',
          variant === 'prominent' && 'bg-gradient-to-r from-primary to-accent hover:opacity-90',
          className
        )}
        onClick={handleInstall}
        disabled={installing}
      >
        {installing ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Instalando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {variant === 'small' ? 'Instalar' : 'Instalar App'}
          </>
        )}
      </Button>

      {/* Dialog com instrucoes de instalacao */}
      <InstallInstructionsDialog
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  );
}

// Botao flutuante para instalacao
export function InstallAppFab({ className }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('installFabDismissed') === 'true';
  });

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('installFabDismissed', 'true');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } catch (error) {
      console.error('Erro ao instalar:', error);
    } finally {
      deferredPrompt = null;
    }
  };

  if (isInstalled || !canInstall || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 p-3 bg-card border border-border rounded-xl shadow-lg animate-slide-up',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">Instalar Sellx</p>
          <p className="text-xs text-muted-foreground">Acesso rapido e offline</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button size="sm" onClick={handleInstall} className="gap-1">
          <Download className="w-3.5 h-3.5" />
          Instalar
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Dialog com instrucoes de instalacao
function InstallInstructionsDialog({ open, onOpenChange }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Instalar Sellx
          </DialogTitle>
          <DialogDescription>
            Instale o app para acesso rapido e funcionamento offline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Beneficios */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Beneficios:</p>
            <div className="grid gap-2">
              {[
                'Acesso rapido pelo menu/desktop',
                'Funciona sem internet',
                'Notificacoes em tempo real',
                'Experiencia de app nativo',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-success" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* Instrucoes por dispositivo */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            {isIOS && (
              <>
                <div className="flex items-center gap-2 font-medium">
                  <Smartphone className="w-4 h-4" />
                  iPhone/iPad
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Toque no botao de compartilhar (quadrado com seta)</li>
                  <li>Role ate encontrar "Adicionar a Tela de Inicio"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </>
            )}

            {isAndroid && (
              <>
                <div className="flex items-center gap-2 font-medium">
                  <Smartphone className="w-4 h-4" />
                  Android
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Toque no menu (3 pontos) do navegador</li>
                  <li>Selecione "Adicionar a tela inicial" ou "Instalar app"</li>
                  <li>Confirme a instalacao</li>
                </ol>
              </>
            )}

            {isDesktop && (
              <>
                <div className="flex items-center gap-2 font-medium">
                  <Monitor className="w-4 h-4" />
                  Computador
                </div>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Clique no icone de instalacao na barra de endereco</li>
                  <li>Ou acesse o menu do navegador</li>
                  <li>Selecione "Instalar Sellx"</li>
                </ol>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
