import React, { useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/utils/beep';

/**
 * Obtem configuracoes do scanner do localStorage
 */
const getScannerSettings = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    return {
      prefix: settings.scannerPrefix || '',
      suffix: settings.scannerSuffix || '',
      minLength: settings.scannerMinLength || 3,
      timeout: settings.scannerTimeout || 100,
      soundEnabled: settings.pdvSoundEnabled !== false,
      enterAsSubmit: settings.scannerEnterAsSubmit !== false,
    };
  } catch {
    return {
      prefix: '',
      suffix: '',
      minLength: 3,
      timeout: 100,
      soundEnabled: true,
      enterAsSubmit: true,
    };
  }
};

/**
 * Processa o codigo de barras removendo prefixo e sufixo
 */
const processBarcode = (barcode, settings) => {
  let processed = barcode.trim();

  // Remove prefixo se configurado
  if (settings.prefix && processed.startsWith(settings.prefix)) {
    processed = processed.substring(settings.prefix.length);
  }

  // Remove sufixo se configurado
  if (settings.suffix && processed.endsWith(settings.suffix)) {
    processed = processed.substring(0, processed.length - settings.suffix.length);
  }

  return processed.trim();
};

/**
 * Component to handle barcode scanner input
 * Detects rapid keypresses (barcode scanner) vs manual typing
 */
export default function BarcodeScanner({ onScan, enabled = true, onError }) {
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const settingsRef = useRef(getScannerSettings());

  // Atualiza configuracoes periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      settingsRef.current = getScannerSettings();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleScan = useCallback((rawBarcode) => {
    const settings = settingsRef.current;
    const barcode = processBarcode(rawBarcode, settings);

    // Verifica comprimento minimo
    if (barcode.length < settings.minLength) {
      if (onError) {
        onError(`Codigo muito curto: ${barcode}`);
      }
      return;
    }

    // Toca som de confirmacao
    if (settings.soundEnabled) {
      playSound('scan');
    }

    // Chama callback
    onScan(barcode);
  }, [onScan, onError]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e) => {
      const settings = settingsRef.current;
      const now = Date.now();

      // Ignore if user is typing in an input field (except barcode inputs)
      if (
        e.target.tagName === 'INPUT' &&
        !e.target.classList.contains('barcode-input') &&
        e.target.type !== 'button'
      ) {
        return;
      }

      // Se passou muito tempo desde a ultima tecla, limpa o buffer
      if (now - lastKeyTimeRef.current > settings.timeout) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Add character to buffer
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // Enter key indicates end of barcode scan
      if ((e.key === 'Enter' || e.key === 'Tab') && settings.enterAsSubmit && bufferRef.current.length > 0) {
        e.preventDefault();
        handleScan(bufferRef.current);
        bufferRef.current = '';
        return;
      }

      // Reset buffer after timeout of inactivity (manual typing is slower)
      timeoutRef.current = setTimeout(() => {
        // Se o buffer tem tamanho de codigo de barras, processa automaticamente
        // (alguns leitores nao enviam Enter no final)
        if (bufferRef.current.length >= 8) {
          handleScan(bufferRef.current);
        }
        bufferRef.current = '';
      }, settings.timeout);
    };

    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, handleScan]);

  return null;
}

// Hook para usar o scanner em qualquer componente
export function useBarcodeScanner(onScan, enabled = true) {
  const settings = getScannerSettings();

  const handleManualInput = useCallback((value) => {
    const barcode = processBarcode(value, settings);

    if (barcode.length >= settings.minLength) {
      if (settings.soundEnabled) {
        playSound('scan');
      }
      onScan(barcode);
      return true;
    }
    return false;
  }, [onScan, settings]);

  return { handleManualInput, settings };
}
