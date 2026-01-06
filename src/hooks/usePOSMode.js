import { useState, useCallback } from 'react';

const STORAGE_KEY = 'pos-mode-preference';

export function usePOSMode() {
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return (saved === 'quick' || saved === 'detailed') ? saved : 'detailed';
    } catch {
      return 'detailed';
    }
  });

  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save POS mode preference:', error);
    }
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'quick' ? 'detailed' : 'quick';
    setMode(newMode);
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    toggleMode,
    isQuickMode: mode === 'quick',
    isDetailedMode: mode === 'detailed',
  };
}
