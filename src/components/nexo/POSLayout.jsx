import { useState } from 'react';
import { Loader2, X, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// POS LAYOUT - Layout responsivo para PDV
// ============================================================================

export function POSLayout({
  header,
  leftPanel,
  rightPanel,
  modals,
  isLoading,
  cartItemsCount = 0,
  cartTotal = 0,
}) {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Carregando PDV...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      {header}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Products/Search Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {leftPanel}
        </div>

        {/* Right Panel - Cart (Desktop only) */}
        <div className="w-[320px] xl:w-[380px] hidden lg:flex flex-col border-l border-border bg-card shadow-xl">
          {rightPanel}
        </div>

        {/* Mobile Cart Drawer Overlay */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
            isMobileCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setIsMobileCartOpen(false)}
        />

        {/* Mobile Cart Drawer */}
        <div
          className={cn(
            "lg:hidden fixed right-0 top-0 bottom-0 w-full sm:w-[340px] md:w-[380px] bg-card z-50 shadow-2xl transition-transform duration-300 ease-out safe-area-inset",
            isMobileCartOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 border-b border-border">
            <span className="font-semibold text-foreground text-sm sm:text-base">Carrinho</span>
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-secondary flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Drawer Content */}
          <div className="h-[calc(100%-3rem)] sm:h-[calc(100%-3.5rem)] overflow-hidden">
            {rightPanel}
          </div>
        </div>
      </div>

      {/* Mobile Cart Button (Fixed at bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2 sm:p-3 bg-background/95 backdrop-blur border-t border-border z-30 safe-area-inset-bottom">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full h-12 sm:h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-between px-3 sm:px-5 shadow-lg active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-primary text-[10px] sm:text-xs font-bold flex items-center justify-center">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </div>
            <span className="font-semibold text-sm sm:text-base">Ver Carrinho</span>
          </div>
          <span className="font-bold text-base sm:text-lg tabular-nums">
            {formatCurrency(cartTotal)}
          </span>
        </button>
      </div>

      {/* Spacer for fixed mobile cart button */}
      <div className="lg:hidden h-16 sm:h-20" />

      {/* All Modals */}
      {modals}
    </div>
  );
}

// ============================================================================
// POS HEADER - Header do PDV (responsivo)
// ============================================================================

export function POSHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
  className,
}) {
  return (
    <div className={cn(
      "h-12 sm:h-14 flex items-center justify-between px-2 sm:px-4 border-b border-border bg-card shrink-0",
      className
    )}>
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {leftContent}
        <div className="min-w-0">
          <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">{title}</h1>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {rightContent}
      </div>
    </div>
  );
}

// ============================================================================
// SHORTCUTS BAR - Barra de atalhos do PDV (responsivo - esconde em mobile pequeno)
// ============================================================================

export function ShortcutsBar({ shortcuts }) {
  return (
    <div className="hidden sm:flex h-9 sm:h-10 items-center gap-1 px-2 sm:px-4 border-b border-border bg-muted/30 overflow-x-auto nexo-scrollbar">
      {shortcuts.map((shortcut, index) => (
        <button
          key={index}
          onClick={shortcut.onClick}
          disabled={shortcut.disabled}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap",
            "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
            shortcut.disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <kbd className="hidden sm:inline px-1 sm:px-1.5 py-0.5 rounded bg-background text-[9px] sm:text-[10px] font-mono border border-border">
            {shortcut.key}
          </kbd>
          <span>{shortcut.label}</span>
        </button>
      ))}
    </div>
  );
}
