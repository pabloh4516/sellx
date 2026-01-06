import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar a instalação do PWA
 * Captura o evento beforeinstallprompt e fornece métodos para instalar o app
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Capturar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevenir o mini-infobar automático
      e.preventDefault();
      // Salvar o evento para usar depois
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Detectar quando o app foi instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA instalado com sucesso!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Função para instalar o app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('Prompt de instalação não disponível');
      return { success: false, reason: 'no_prompt' };
    }

    try {
      // Mostrar o prompt de instalação
      deferredPrompt.prompt();

      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Usuário aceitou instalar o PWA');
        setDeferredPrompt(null);
        setIsInstallable(false);
        return { success: true, outcome };
      } else {
        console.log('Usuário recusou instalar o PWA');
        return { success: false, outcome };
      }
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
      return { success: false, error };
    }
  }, [deferredPrompt]);

  // Instruções para iOS (não suporta beforeinstallprompt)
  const getIOSInstructions = () => {
    return {
      steps: [
        'Toque no botão de compartilhar (ícone de quadrado com seta)',
        'Role para baixo e toque em "Adicionar à Tela de Início"',
        'Toque em "Adicionar" para confirmar',
      ],
      browser: 'Safari',
    };
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    installApp,
    getIOSInstructions,
    // Permitir verificar se o prompt está disponível
    hasPrompt: !!deferredPrompt,
  };
}

export default usePWAInstall;
