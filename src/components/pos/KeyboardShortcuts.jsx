import React, { useEffect } from 'react';

export default function KeyboardShortcuts({ onShortcut, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // F2 - Focus barcode input
      if (e.key === 'F2') {
        e.preventDefault();
        onShortcut('focus_search');
      }
      
      // F3 - Search products
      if (e.key === 'F3') {
        e.preventDefault();
        onShortcut('search_products');
      }
      
      // F4 - Select customer
      if (e.key === 'F4') {
        e.preventDefault();
        onShortcut('select_customer');
      }
      
      // F5 - Clear cart
      if (e.key === 'F5') {
        e.preventDefault();
        if (confirm('Limpar carrinho?')) {
          onShortcut('clear_cart');
        }
      }
      
      // F8 - Payment
      if (e.key === 'F8') {
        e.preventDefault();
        onShortcut('open_payment');
      }
      
      // F9 - Finalize sale
      if (e.key === 'F9') {
        e.preventDefault();
        onShortcut('finalize_sale');
      }
      
      // Ctrl+D - Apply discount
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        onShortcut('apply_discount');
      }
      
      // Ctrl+P - Apply promotion
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        onShortcut('apply_promotion');
      }

      // F11 - Toggle fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        onShortcut('toggle_fullscreen');
      }

      // F12 - Finalize sale (alternative)
      if (e.key === 'F12') {
        e.preventDefault();
        onShortcut('finalize_sale');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onShortcut]);

  return null;
}