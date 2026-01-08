import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, Clock, Maximize2, Minimize2, ShoppingCart, Search, Printer, Plus, X, CreditCard, Banknote, Ban, AlertTriangle, Coins, LogOut, Check, User, Keyboard, Lock, Unlock, RefreshCw, ChevronDown } from 'lucide-react';
import { USER_ROLES, ROLE_LABELS } from '@/config/permissions';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDVModeToggle } from '@/components/pdv/PDVModeToggle';
import ReceiptPrint from '../components/pos/ReceiptPrint';
import A4ReceiptPrint from '../components/pos/A4ReceiptPrint';
import QuickCustomerForm from '../components/pos/QuickCustomerForm';
import { cn } from '@/lib/utils';
import { playSound } from '@/utils/beep';
import { loadSystemSettings, getDefaultSettings } from '@/utils/settingsHelper';
import { UserPlus } from 'lucide-react';
import {
  PageContainer,
  CardSection,
} from '@/components/nexo';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Motivos de cancelamento pre-definidos
const CANCELLATION_REASONS = [
  { value: 'cliente_desistiu', label: 'Cliente desistiu' },
  { value: 'produto_errado', label: 'Produto errado' },
  { value: 'sem_estoque', label: 'Sem estoque' },
  { value: 'problema_pagamento', label: 'Problema no pagamento' },
  { value: 'erro_operador', label: 'Erro de operador' },
  { value: 'cliente_sem_dinheiro', label: 'Cliente sem dinheiro' },
  { value: 'preco_incorreto', label: 'Preco incorreto' },
  { value: 'outro', label: 'Outro motivo' },
];

export default function PDVQuick({ onModeChange, currentMode, operator, onChangeOperator, cashRegister: propCashRegister, cashRegisterMode: propCashRegisterMode }) {
  // Carregar configuracoes do sistema
  const [systemSettings, setSystemSettings] = useState(() => {
    // Valor inicial do cache/localStorage
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try { return JSON.parse(saved); } catch { return getDefaultSettings(); }
    }
    return getDefaultSettings();
  });

  // Carregar configuracoes do banco ao montar
  useEffect(() => {
    loadSystemSettings().then(settings => {
      setSystemSettings(settings);
    });
  }, []);

  const cashRegisterMode = systemSettings.cashRegisterMode || 'shared';
  const blockSaleNoStock = systemSettings.blockSaleNoStock ?? true; // Default true para bloquear

  // Hook de limites do plano
  const { checkLimitAndNotify, refreshUsage } = usePlanLimits();

  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);
  const [company, setCompany] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados para cancelamento e bloqueio de saida
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showExitBlockModal, setShowExitBlockModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [pendingModeChange, setPendingModeChange] = useState(null);

  // Estados para confirmacao de venda sem estoque
  const [showStockWarningModal, setShowStockWarningModal] = useState(false);
  const [pendingStockProduct, setPendingStockProduct] = useState(null);
  const [pendingStockQuantity, setPendingStockQuantity] = useState(1);
  const [pendingStockPrice, setPendingStockPrice] = useState(null);

  // Verificar se operador pode ignorar bloqueio de estoque (admin, gerente, owner)
  const canOverrideStock = operator?.role === USER_ROLES.ADMIN ||
                           operator?.role === USER_ROLES.MANAGER ||
                           operator?.role === USER_ROLES.OWNER ||
                           operator?.role === USER_ROLES.SUPER_ADMIN;

  // Troco em tempo real
  const [realTimePayment, setRealTimePayment] = useState(0);

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [showA4Receipt, setShowA4Receipt] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('thermal');
  const [completedSale, setCompletedSale] = useState(null);
  const [saleNumber, setSaleNumber] = useState(1);

  // Estados para preco livre
  const [showOpenPriceModal, setShowOpenPriceModal] = useState(false);
  const [openPriceProduct, setOpenPriceProduct] = useState(null);
  const [openPriceValue, setOpenPriceValue] = useState('');
  const [openPriceQuantity, setOpenPriceQuantity] = useState(1);

  // Estado para editar quantidade no carrinho
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  const barcodeInputRef = useRef(null);
  const containerRef = useRef(null);
  const searchDropdownRef = useRef(null);

  // Filtered products for search dropdown
  const filteredProducts = barcodeInput.length >= 2
    ? products.filter(p =>
        p.name?.toLowerCase().includes(barcodeInput.toLowerCase()) ||
        p.code?.toLowerCase().includes(barcodeInput.toLowerCase()) ||
        p.barcode?.includes(barcodeInput)
      ).slice(0, 10)
    : [];

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadData = async () => {
    try {
      const [productsData, methodsData, cashData, companyData, sellersData, customersData, salesData] = await Promise.all([
        base44.entities.Product.filter({ is_active: true }),
        base44.entities.PaymentMethod.filter({ is_active: true }),
        base44.entities.CashRegister.filter({ status: 'aberto' }),
        base44.entities.Company.list(),
        base44.entities.Seller.filter({ is_active: true }),
        base44.entities.Customer.list(),
        base44.entities.Sale.list()
      ]);

      setProducts(productsData);
      setPaymentMethods(methodsData);
      setSellers(sellersData);
      setCustomers(customersData);

      // Filtrar caixa baseado no modo
      if (cashData.length > 0) {
        if (cashRegisterMode === 'per_operator' && operator?.id) {
          // Modo por operador: buscar o caixa do operador atual
          const myRegister = cashData.find(r => r.opened_by_id === operator.id);
          setCashRegister(myRegister || null);
        } else {
          // Modo compartilhado: usar o primeiro caixa aberto
          setCashRegister(cashData[0]);
        }
      } else {
        setCashRegister(null);
      }

      if (companyData.length > 0) {
        setCompany(companyData[0]);
      }

      // Set next sale number
      const nextNumber = salesData.length > 0 ? Math.max(...salesData.map(s => s.sale_number || 0)) + 1 : 1;
      setSaleNumber(nextNumber);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast.error('Erro ao alternar tela cheia');
    }
  };

  // Funcao para tentar sair do PDV - verifica se tem venda pendente
  const handleExitPDV = (targetMode) => {
    if (cart.length > 0) {
      // Tem venda pendente - bloquear saida
      setPendingModeChange(targetMode);
      setShowExitBlockModal(true);
    } else {
      // Sem venda pendente - pode sair
      if (targetMode && onModeChange) {
        onModeChange(targetMode);
      }
    }
  };

  // Funcao para abrir modal de cancelamento
  const handleOpenCancelModal = () => {
    if (cart.length === 0) {
      toast.info('Nao ha itens para cancelar');
      return;
    }
    setCancelReason('');
    setCancelNotes('');
    setShowCancelModal(true);
  };

  // Funcao para confirmar cancelamento
  const handleConfirmCancel = async () => {
    if (!cancelReason) {
      toast.error('Selecione o motivo do cancelamento');
      return;
    }

    try {
      const reasonLabel = CANCELLATION_REASONS.find(r => r.value === cancelReason)?.label || cancelReason;

      await base44.entities.SaleCancellation.create({
        operator_id: operator?.id,
        operator_name: operator?.full_name || 'Operador',
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        })),
        total_value: calculateTotal(),
        discount_value: 0,
        final_value: calculateTotal(),
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || null,
        reason: cancelReason,
        reason_label: reasonLabel,
        notes: cancelNotes || null,
        cancelled_at: new Date().toISOString(),
        cash_register_id: cashRegister?.id
      });

      // Limpar carrinho
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      setCurrentPaymentMethod('');
      setCurrentPaymentAmount(0);
      setRealTimePayment(0);

      toast.success('Venda cancelada e registrada');
      playSound('error');

      setShowCancelModal(false);
      setShowExitBlockModal(false);

      // Se tinha uma troca de modo pendente, executar agora
      if (pendingModeChange && onModeChange) {
        onModeChange(pendingModeChange);
        setPendingModeChange(null);
      }
    } catch (error) {
      console.error('Erro ao registrar cancelamento:', error);
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      toast.warning('Venda cancelada (erro ao registrar no historico)');
      setShowCancelModal(false);
      setShowExitBlockModal(false);
    }
  };

  // Limpar apos finalizar venda
  const resetAfterSale = () => {
    setCompletedSale(null);
    setRealTimePayment(0);
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  const selectProduct = (product) => {
    addToCart(product, quantity);
    setBarcodeInput('');
    setQuantity(1);
    setShowProductSearch(false);
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  const handleBarcodeSearch = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowProductSearch(false);
      return;
    }

    if (e.key === 'ArrowDown' && filteredProducts.length > 0) {
      e.preventDefault();
      setShowProductSearch(true);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const term = barcodeInput.trim();
      if (term) {
        let searchTerm = term;
        if (term.length === 13 && term.startsWith('2')) {
          searchTerm = term.substring(0, 7);
        }

        const product = products.find(p =>
          p.barcode === term ||
          p.barcode === searchTerm ||
          p.code === term ||
          p.code === searchTerm ||
          p.name.toLowerCase().includes(term.toLowerCase())
        );

        if (product) {
          let qty = quantity;
          if (term.length === 13 && term.startsWith('2')) {
            const weightCode = term.substring(7, 12);
            qty = parseInt(weightCode) / 1000;
          }

          addToCart(product, qty);
          setBarcodeInput('');
          setQuantity(1);
          setShowProductSearch(false);

          setTimeout(() => {
            if (barcodeInputRef.current) {
              barcodeInputRef.current.focus();
            }
          }, 100);
        } else {
          toast.error('Produto nao encontrado');
          setBarcodeInput('');
        }
      }
    }
  }, [barcodeInput, quantity, products, filteredProducts]);

  const addToCart = (product, qty, customPrice = null) => {
    // Verificar se o caixa está aberto
    if (!cashRegister) {
      toast.error(
        cashRegisterMode === 'per_operator'
          ? 'Abra seu caixa antes de adicionar produtos'
          : 'O caixa precisa estar aberto',
        { duration: 3000 }
      );
      return;
    }

    // Verificar se produto tem preco livre e nao foi passado preco customizado
    if (product.allow_open_price && customPrice === null) {
      setOpenPriceProduct(product);
      setOpenPriceValue(product.sale_price > 0 ? product.sale_price.toString() : '');
      setOpenPriceQuantity(qty);
      setShowOpenPriceModal(true);
      return;
    }

    // Verificar estoque - usa config global OU config do produto
    const shouldBlockNoStock = blockSaleNoStock || product.block_sale_no_stock;
    const isService = product.is_service || false;
    const stockQty = product.stock_quantity || 0;

    if (!isService && shouldBlockNoStock && stockQty <= 0) {
      // Admin/Gerente podem confirmar e prosseguir
      if (canOverrideStock) {
        setPendingStockProduct(product);
        setPendingStockQuantity(qty);
        setPendingStockPrice(customPrice);
        setShowStockWarningModal(true);
        return;
      } else {
        // Outros perfis sao bloqueados
        toast.error(
          <div>
            <strong>Produto sem estoque!</strong>
            <p className="text-sm mt-1">{product.name}</p>
            <p className="text-xs text-muted-foreground">Estoque atual: {stockQty} unidade(s)</p>
          </div>,
          { duration: 4000 }
        );
        return;
      }
    }

    const finalPrice = customPrice !== null ? customPrice : product.sale_price;

    // Usar forma funcional do setCart para evitar stale closure
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id && item.unit_price === finalPrice);

      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        const newQty = newCart[existingIndex].quantity + qty;

        // Verificar se nova quantidade excede o estoque
        if (!isService && shouldBlockNoStock && newQty > stockQty) {
          if (canOverrideStock) {
            // Admin/Gerente - mostrar aviso mas permitir
            toast.warning(
              <div>
                <strong>Quantidade excede o estoque!</strong>
                <p className="text-sm mt-1">Disponivel: {stockQty} | Solicitado: {newQty}</p>
              </div>,
              { duration: 3000 }
            );
            // Continua adicionando
          } else {
            toast.error(
              <div>
                <strong>Quantidade excede o estoque!</strong>
                <p className="text-sm mt-1">{product.name}</p>
                <p className="text-xs text-muted-foreground">Disponivel: {stockQty} unidade(s)</p>
              </div>,
              { duration: 4000 }
            );
            return prevCart;
          }
        }

        newCart[existingIndex].quantity = newQty;
        newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
        return newCart;
      } else {
        // Verificar se quantidade inicial excede o estoque
        if (!isService && shouldBlockNoStock && qty > stockQty) {
          if (canOverrideStock) {
            toast.warning(
              <div>
                <strong>Quantidade excede o estoque!</strong>
                <p className="text-sm mt-1">Disponivel: {stockQty} | Solicitado: {qty}</p>
              </div>,
              { duration: 3000 }
            );
          } else {
            toast.error(
              <div>
                <strong>Quantidade excede o estoque!</strong>
                <p className="text-sm mt-1">{product.name}</p>
                <p className="text-xs text-muted-foreground">Disponivel: {stockQty} unidade(s)</p>
              </div>,
              { duration: 4000 }
            );
            return prevCart;
          }
        }

        return [...prevCart, {
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          unit_price: finalPrice,
          cost_price: product.cost_price || 0,
          total: finalPrice * qty,
          sold_without_stock: stockQty <= 0 || qty > stockQty
        }];
      }
    });

    toast.success(`${product.name} adicionado`);
    playSound('productAdded');
  };

  // Confirmar produto com preco livre
  const confirmOpenPriceProduct = () => {
    const price = parseFloat(openPriceValue);
    if (isNaN(price) || price <= 0) {
      toast.error('Informe um valor valido');
      return;
    }

    addToCart(openPriceProduct, openPriceQuantity, price);
    setShowOpenPriceModal(false);
    setOpenPriceProduct(null);
    setOpenPriceValue('');
    setOpenPriceQuantity(1);

    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  // Confirmar venda sem estoque (apenas admin/gerente)
  const handleConfirmStockOverride = () => {
    if (!pendingStockProduct) return;

    const product = pendingStockProduct;
    const qty = pendingStockQuantity;
    const customPrice = pendingStockPrice;
    const finalPrice = customPrice !== null ? customPrice : product.sale_price;

    // Adiciona diretamente ao carrinho sem verificar estoque
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id && item.unit_price === finalPrice);

      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += qty;
        newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
        return newCart;
      } else {
        return [...prevCart, {
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          unit_price: finalPrice,
          cost_price: product.cost_price || 0,
          total: finalPrice * qty,
          sold_without_stock: true
        }];
      }
    });

    toast.warning(`${product.name} adicionado (SEM ESTOQUE)`, { duration: 3000 });
    playSound('productAdded');

    // Limpar estados
    setShowStockWarningModal(false);
    setPendingStockProduct(null);
    setPendingStockQuantity(1);
    setPendingStockPrice(null);

    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  // Cancelar venda sem estoque
  const handleCancelStockOverride = () => {
    setShowStockWarningModal(false);
    setPendingStockProduct(null);
    setPendingStockQuantity(1);
    setPendingStockPrice(null);

    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  // Editar quantidade de item no carrinho
  const startEditQuantity = (index) => {
    setEditingItemIndex(index);
    setEditingQuantity(cart[index].quantity.toString());
  };

  const confirmEditQuantity = () => {
    const newQty = parseFloat(editingQuantity);
    if (isNaN(newQty) || newQty <= 0) {
      toast.error('Quantidade invalida');
      setEditingItemIndex(null);
      return;
    }

    // Verificar estoque antes de permitir alteracao
    const item = cart[editingItemIndex];
    const product = products.find(p => p.id === item.product_id);

    if (product) {
      const shouldBlockNoStock = blockSaleNoStock || product.block_sale_no_stock;
      const isService = product.is_service || false;
      const stockQty = product.stock_quantity || 0;

      if (!isService && shouldBlockNoStock && newQty > stockQty) {
        if (canOverrideStock) {
          // Admin/Gerente - mostrar aviso mas permitir
          toast.warning(
            <div>
              <strong>Quantidade excede o estoque!</strong>
              <p className="text-sm mt-1">Disponivel: {stockQty} | Solicitado: {newQty}</p>
            </div>,
            { duration: 3000 }
          );
        } else {
          toast.error(
            <div>
              <strong>Quantidade excede o estoque!</strong>
              <p className="text-sm mt-1">{product.name}</p>
              <p className="text-xs text-muted-foreground">Disponivel: {stockQty} unidade(s)</p>
            </div>,
            { duration: 4000 }
          );
          setEditingItemIndex(null);
          return;
        }
      }
    }

    setCart(prevCart => {
      const newCart = [...prevCart];
      newCart[editingItemIndex].quantity = newQty;
      newCart[editingItemIndex].total = newQty * newCart[editingItemIndex].unit_price;
      return newCart;
    });

    setEditingItemIndex(null);
    setEditingQuantity('');
  };

  const removeFromCart = (index) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
    toast.info('Item removido');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateRemaining = () => {
    return Math.max(0, calculateTotal() - calculateTotalPaid());
  };

  const calculateChange = () => {
    return Math.max(0, calculateTotalPaid() - calculateTotal());
  };

  const addPayment = () => {
    if (!currentPaymentMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    if (currentPaymentAmount <= 0) {
      toast.error('Informe o valor');
      return;
    }

    const method = paymentMethods.find(m => m.id === currentPaymentMethod);
    setPayments([...payments, {
      method_id: currentPaymentMethod,
      method_name: method?.name,
      amount: currentPaymentAmount,
      installments: 1
    }]);

    // Prepare for next payment
    const remaining = calculateTotal() - calculateTotalPaid() - currentPaymentAmount;
    setCurrentPaymentMethod('');
    setCurrentPaymentAmount(remaining > 0 ? remaining : 0);

    toast.success(`${method?.name}: ${formatCurrency(currentPaymentAmount)}`);
  };

  const removePayment = (index) => {
    const newPayments = payments.filter((_, i) => i !== index);
    setPayments(newPayments);
  };

  // Cancelar venda (abre modal se tiver itens)
  const newSale = () => {
    if (cart.length > 0) {
      handleOpenCancelModal();
    } else {
      setPayments([]);
      setCurrentPaymentMethod('');
      setCurrentPaymentAmount(0);
      setSelectedCustomer(null);
      setBarcodeInput('');
      setQuantity(1);
      setRealTimePayment(0);
      toast.info('Pronto para nova venda');
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    // Verificar limite de vendas do plano
    if (!checkLimitAndNotify('sales_per_month')) {
      return;
    }

    if (payments.length === 0) {
      toast.error('Adicione pelo menos uma forma de pagamento');
      return;
    }

    if (calculateTotalPaid() < calculateTotal()) {
      toast.error('Pagamento insuficiente');
      return;
    }

    if (!cashRegister?.id) {
      toast.error('Caixa nao esta aberto. Abra o caixa primeiro.');
      return;
    }

    try {
      // Funcao para criar venda com retry em caso de conflito
      const createSaleWithRetry = async (maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // Buscar numero da venda no momento da criacao
            const allSales = await base44.entities.Sale.list();
            const nextNumber = allSales.length > 0
              ? Math.max(...allSales.map(s => s.sale_number || 0)) + 1
              : 1;

            const saleData = {
              sale_number: nextNumber + attempt, // Adiciona tentativa para evitar conflito
              customer_id: selectedCustomer?.id || null,
              customer_name: selectedCustomer?.name || null,
              seller_id: selectedSeller?.id || null, // Deve ser ID da tabela sellers, nao do operador
              operator_id: operator?.id || null, // ID do operador (tabela profiles)
              items: cart,
              subtotal: calculateTotal(),
              discount: 0,
              total: calculateTotal(),
              cost_total: cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0),
              profit: calculateTotal() - cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0),
              payments: payments,
              status: 'concluida',
              sale_date: new Date().toISOString(),
              cash_register_id: cashRegister.id,
              use_wholesale_price: false
            };

            console.log('Tentando criar venda com dados:', saleData);
            const sale = await base44.entities.Sale.create(saleData);
            return { sale, saleData, saleNumber: nextNumber + attempt };
          } catch (error) {
            console.error('Erro ao criar venda:', {
              code: error?.code,
              message: error?.message,
              details: error?.details,
              hint: error?.hint,
              attempt: attempt + 1
            });
            // Se for erro 409 (conflito), tentar novamente
            if (error?.code === '409' || error?.status === 409 || error?.code === 'PGRST116' || error?.code === '23505') {
              console.log(`Tentativa ${attempt + 1} falhou com conflito, tentando novamente...`);
              if (attempt === maxRetries - 1) throw error;
              continue;
            }
            throw error;
          }
        }
      };

      const { sale, saleData, saleNumber } = await createSaleWithRetry();

      // Update stock and create stock movements
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product && !product.is_service) {
          // Update product stock
          await base44.entities.Product.update(item.product_id, {
            stock_quantity: (product.stock_quantity || 0) - item.quantity
          });

          // Create stock movement record
          await base44.entities.StockMovement.create({
            product_id: item.product_id,
            type: 'saida',
            quantity: item.quantity,
            previous_stock: product.stock_quantity || 0,
            new_stock: (product.stock_quantity || 0) - item.quantity,
            reference_type: 'venda',
            reference_id: sale.id,
            movement_date: new Date().toISOString()
          });
        }
      }

      toast.success(`Venda #${saleNumber} finalizada!`);
      playSound('saleComplete');

      if (calculateChange() > 0) {
        toast.info(`Troco: ${formatCurrency(calculateChange())}`);
      }

      // Store completed sale for receipt printing
      const currentCustomer = selectedCustomer;
      setCompletedSale({
        ...saleData,
        sale_number: saleNumber,
        customer: currentCustomer
      });
      setShowReceipt(true);

      // Reset cart and payment states (waiting mode will be triggered after receipt dialog closes)
      setCart([]);
      setPayments([]);
      setCurrentPaymentMethod('');
      setCurrentPaymentAmount(0);
      setSelectedCustomer(null);
      setBarcodeInput('');
      setQuantity(1);

      loadData();
      refreshUsage(); // Atualizar contagem de uso do plano

    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erro ao finalizar venda');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        // F5 agora abre modal de cancelamento se tiver itens
        if (cart.length > 0) {
          handleOpenCancelModal();
        } else {
          toast.info('Carrinho ja esta vazio');
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        finalizeSale();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart, currentPaymentAmount, currentPaymentMethod]);

  if (!cashRegister) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CardSection className="max-w-md w-full text-center">
          <p className="text-lg text-muted-foreground mb-4">Caixa fechado. Abra o caixa para iniciar.</p>
          <Button onClick={() => window.location.href = '/CashRegister'}>
            Abrir Caixa
          </Button>
        </CardSection>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center animate-pulse">
            <ShoppingCart className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Carregando PDV...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header Unificado */}
      <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4 gap-4">
        {/* Left - Mode Toggle, Operator & Register Status */}
        <div className="flex items-center gap-3">
          {onModeChange && (
            <PDVModeToggle mode={currentMode} onModeChange={(mode) => handleExitPDV(mode)} />
          )}

          {/* Separador */}
          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Operador */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  operator?.role === USER_ROLES.ADMIN || operator?.role === USER_ROLES.OWNER
                    ? 'bg-destructive/10'
                    : operator?.role === USER_ROLES.MANAGER
                      ? 'bg-warning/10'
                      : 'bg-primary/10'
                )}>
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium leading-tight">{operator?.full_name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {ROLE_LABELS[operator?.role] || operator?.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <div className="px-2 py-1.5 border-b border-border">
                <p className="font-medium text-sm">{operator?.full_name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[operator?.role]}</p>
              </div>
              <DropdownMenuItem onClick={onChangeOperator} className="text-destructive focus:text-destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Trocar Operador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separador */}
          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Status do Caixa */}
          <Link to={createPageUrl('CashRegister')}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
              (propCashRegister || cashRegister)
                ? "bg-success/10 hover:bg-success/20 text-success"
                : "bg-destructive/10 hover:bg-destructive/20 text-destructive"
            )}>
              {(propCashRegister || cashRegister) ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span className="font-semibold text-sm hidden sm:block">
                {(propCashRegister || cashRegister) ? 'Caixa Aberto' : 'Caixa Fechado'}
              </span>
              {(propCashRegister || cashRegister) && (
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              )}
            </div>
          </Link>

          {/* Indicador de venda em andamento */}
          {cart.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="w-4 h-4" />
              <span className="font-semibold text-sm">{cart.length}</span>
            </div>
          )}
        </div>

        {/* Center - Sale Number & Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary rounded-xl">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Venda</span>
            <span className="font-bold tabular-nums">#{saleNumber.toString().padStart(6, '0')}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="tabular-nums font-medium">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowQuickCustomerForm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
            title="Cliente (F4)"
          >
            <User className="w-4 h-4" />
            <span className="hidden lg:block max-w-24 truncate">{selectedCustomer?.name || 'Cliente'}</span>
          </button>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Sair da tela cheia (F11)" : "Tela cheia (F11)"}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Atalhos">
                <Keyboard className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex justify-between">
                <span>Buscar produto</span>
                <span className="text-muted-foreground text-xs">F2</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex justify-between" onClick={() => setShowQuickCustomerForm(true)}>
                <span>Novo cliente</span>
                <span className="text-muted-foreground text-xs">F4</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex justify-between" onClick={handleOpenCancelModal}>
                <span>Cancelar venda</span>
                <span className="text-muted-foreground text-xs">F5</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex justify-between">
                <span>Finalizar venda</span>
                <span className="text-muted-foreground text-xs">F12</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex justify-between" onClick={toggleFullscreen}>
                <span>Tela cheia</span>
                <span className="text-muted-foreground text-xs">F11</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onChangeOperator}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Trocar Operador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botao Sair */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExitPDV(null)}
            className="text-muted-foreground hover:text-destructive"
            title="Sair do PDV"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Side - Input Fields */}
          <div className="lg:col-span-7 space-y-3">
            {/* Barcode Input */}
            <div className="bg-card p-3 sm:p-4 rounded-xl border border-border relative">
              <Label className="text-xs sm:text-sm font-medium mb-2 block text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Codigo de Barras / Produto
              </Label>
              <div className="relative">
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setShowProductSearch(e.target.value.length >= 2);
                  }}
                  onKeyDown={handleBarcodeSearch}
                  onFocus={() => barcodeInput.length >= 2 && setShowProductSearch(true)}
                  onBlur={() => setTimeout(() => setShowProductSearch(false), 200)}
                  className="text-xl sm:text-2xl h-12 sm:h-14 text-center font-semibold"
                  placeholder="Escanear ou digitar..."
                  autoFocus
                />

                {/* Search Dropdown */}
                {showProductSearch && filteredProducts.length > 0 && (
                  <div
                    ref={searchDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2 border-b border-border bg-muted/50">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        {filteredProducts.length} produto(s) encontrado(s)
                      </p>
                    </div>
                    <ScrollArea className="max-h-[300px]">
                      <div className="p-1">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectProduct(product);
                            }}
                          >
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              {product.photo_url ? (
                                <img src={product.photo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                {product.code && <span>Cod: {product.code}</span>}
                                {product.barcode && <span>| {product.barcode}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{formatCurrency(product.sale_price)}</p>
                              <p className="text-xs text-muted-foreground">Est: {product.stock_quantity || 0}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center">Digite para buscar | ENTER para adicionar</p>
            </div>

            {/* Quantity and Unit Price */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-card p-3 rounded-xl border border-border">
                <Label className="text-xs sm:text-sm font-medium mb-2 block text-muted-foreground">Quantidade</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                  className="text-xl sm:text-2xl h-10 sm:h-12 text-center font-semibold"
                />
              </div>

              <div className="bg-card p-3 rounded-xl border border-border">
                <Label className="text-xs sm:text-sm font-medium mb-2 block text-muted-foreground">Preco Unitario</Label>
                <div className="text-xl sm:text-2xl h-10 sm:h-12 flex items-center justify-center font-semibold text-foreground bg-muted/50 rounded-lg border border-border tabular-nums">
                  {cart.length > 0 ? formatCurrency(cart[cart.length - 1].unit_price) : 'R$ 0,00'}
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="bg-card p-3 rounded-xl border border-border h-[calc(100vh-420px)] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                <h3 className="font-semibold text-base text-foreground">Itens no Carrinho</h3>
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-sm font-medium border border-border">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Carrinho vazio</p>
                    <p className="text-xs">Escaneie produtos para iniciar</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-all duration-150 group">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {editingItemIndex === index ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.001"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmEditQuantity();
                                  if (e.key === 'Escape') setEditingItemIndex(null);
                                }}
                                className="w-20 h-7 text-sm text-center"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-success hover:text-success"
                                onClick={confirmEditQuantity}
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setEditingItemIndex(null)}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditQuantity(index)}
                              className="text-xs text-muted-foreground font-medium tabular-nums hover:text-primary hover:underline cursor-pointer"
                              title="Clique para editar quantidade"
                            >
                              <span className="text-primary">{item.quantity}</span> x {formatCurrency(item.unit_price)}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xl text-foreground tabular-nums">
                          {formatCurrency(item.total)}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                          onClick={() => removeFromCart(index)}
                          title="Remover item"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Totals and Payment */}
          <div className="lg:col-span-5 space-y-3">
            {/* Totals */}
            <div className="space-y-2">
              <div className="bg-gradient-to-br from-primary to-primary/90 p-3 sm:p-4 rounded-xl shadow-lg">
                <p className="text-[10px] sm:text-xs text-primary-foreground/80 mb-1 font-medium uppercase tracking-wide">Total da Venda</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-foreground tabular-nums">
                  {formatCurrency(calculateTotal())}
                </p>
              </div>

              {payments.length > 0 && (
                <div className="bg-card p-3 rounded-xl border border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Recebido</p>
                  <p className="text-xl sm:text-2xl font-semibold text-success tabular-nums">
                    {formatCurrency(calculateTotalPaid())}
                  </p>
                </div>
              )}

              {calculateRemaining() > 0 && payments.length > 0 && (
                <div className="bg-warning/10 p-3 rounded-xl border border-warning/30">
                  <p className="text-[10px] sm:text-xs text-warning mb-1 font-medium uppercase tracking-wide">Falta Pagar</p>
                  <p className="text-xl sm:text-2xl font-semibold text-warning tabular-nums">
                    {formatCurrency(calculateRemaining())}
                  </p>
                </div>
              )}

              {calculateChange() > 0 && (
                <div className="bg-gradient-to-br from-success to-success/90 p-3 sm:p-4 rounded-xl shadow-lg">
                  <p className="text-[10px] sm:text-xs text-success-foreground/80 mb-1 font-medium uppercase tracking-wide">Troco a Devolver</p>
                  <p className="text-2xl sm:text-3xl font-bold text-success-foreground tabular-nums">
                    {formatCurrency(calculateChange())}
                  </p>
                </div>
              )}
            </div>

            {/* Added Payments List */}
            {payments.length > 0 && (
              <div className="bg-card p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Pagamentos Adicionados
                </p>
                <div className="space-y-2">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{payment.method_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums">{formatCurrency(payment.amount)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removePayment(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Payment Form */}
            {calculateRemaining() > 0 || payments.length === 0 ? (
              <div className="bg-card p-4 rounded-xl border border-border space-y-3">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Pagamento
                </p>

                <Select value={currentPaymentMethod} onValueChange={(v) => {
                  setCurrentPaymentMethod(v);
                  if (currentPaymentAmount === 0) {
                    setCurrentPaymentAmount(calculateRemaining() || calculateTotal());
                  }
                }}>
                  <SelectTrigger className="h-11 text-base font-medium">
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id} className="text-base">
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentPaymentAmount || ''}
                    onChange={(e) => setCurrentPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="text-2xl h-12 text-center font-semibold tabular-nums"
                    placeholder="0,00"
                  />
                </div>

                <Button
                  onClick={addPayment}
                  disabled={!currentPaymentMethod || currentPaymentAmount <= 0}
                  className="w-full h-10"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            ) : null}

            {/* Troco em Tempo Real */}
            {cart.length > 0 && (
              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-xs font-medium">Valor Recebido (R$)</Label>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={realTimePayment || ''}
                    onChange={(e) => setRealTimePayment(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="h-10 text-lg font-bold text-center"
                  />
                  {realTimePayment > 0 && (
                    <div className={cn(
                      "p-2 rounded-lg border",
                      realTimePayment >= calculateTotal()
                        ? "bg-success/10 border-success/20"
                        : "bg-warning/10 border-warning/20"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium">
                          {realTimePayment >= calculateTotal() ? 'Troco:' : 'Falta:'}
                        </span>
                        <span className={cn(
                          "text-lg font-bold tabular-nums",
                          realTimePayment >= calculateTotal() ? "text-success" : "text-warning"
                        )}>
                          {formatCurrency(Math.abs(realTimePayment - calculateTotal()))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={finalizeSale}
                disabled={cart.length === 0 || payments.length === 0 || calculateTotalPaid() < calculateTotal()}
                className="w-full h-14 text-lg font-semibold bg-success hover:bg-success/90"
              >
                Finalizar Venda (F8)
              </Button>
              <Button
                onClick={handleOpenCancelModal}
                variant="outline"
                className="w-full h-10 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={cart.length === 0}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar Venda (F5)
              </Button>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-card p-3 rounded-xl text-xs space-y-1 border border-border">
              <p className="font-semibold mb-2 text-sm text-foreground">Atalhos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-muted-foreground">
                <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F2</kbd> Busca</p>
                <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F5</kbd> Cancelar</p>
                <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F8</kbd> Finalizar</p>
                <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">F11</kbd> Tela cheia</p>
                <p><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> Adicionar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>

      {/* Receipt Selection Modal */}
      <Dialog open={showReceipt} onOpenChange={(open) => {
        setShowReceipt(open);
        if (!open) resetAfterSale();
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Imprimir Cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              className="w-full h-16 text-lg"
              onClick={() => {
                setReceiptFormat('thermal');
                setShowReceipt(false);
                setTimeout(() => setShowA4Receipt(true), 100);
              }}
            >
              <Printer className="w-5 h-5 mr-2" />
              Cupom Termico (58/80mm)
            </Button>
            <Button
              className="w-full h-16 text-lg"
              variant="outline"
              onClick={() => {
                setReceiptFormat('a4');
                setShowReceipt(false);
                setTimeout(() => setShowA4Receipt(true), 100);
              }}
            >
              <Printer className="w-5 h-5 mr-2" />
              Nota A4 com Logotipo
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowReceipt(false);
                resetAfterSale();
              }}
            >
              Nao Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thermal Receipt Print Modal */}
      <Dialog open={showA4Receipt && receiptFormat === 'thermal'} onOpenChange={(open) => {
        setShowA4Receipt(open);
        if (!open) resetAfterSale();
      }}>
        <DialogContent className="max-w-md">
          {completedSale && (
            <ReceiptPrint
              sale={completedSale}
              company={company}
              customer={completedSale.customer || customers.find(c => c.id === completedSale.customer_id)}
              operator={operator?.full_name}
              onClose={() => {
                setShowA4Receipt(false);
                resetAfterSale();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* A4 Receipt Print Modal */}
      <Dialog open={showA4Receipt && receiptFormat === 'a4'} onOpenChange={(open) => {
        setShowA4Receipt(open);
        if (!open) resetAfterSale();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {completedSale && (
            <A4ReceiptPrint
              sale={completedSale}
              company={company}
              customer={completedSale.customer || customers.find(c => c.id === completedSale.customer_id)}
              operator={operator?.full_name}
              onClose={() => {
                setShowA4Receipt(false);
                resetAfterSale();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Preco Livre */}
      <Dialog open={showOpenPriceModal} onOpenChange={(open) => {
        if (!open) {
          setShowOpenPriceModal(false);
          setOpenPriceProduct(null);
          setOpenPriceValue('');
          setOpenPriceQuantity(1);
          setTimeout(() => {
            if (barcodeInputRef.current) {
              barcodeInputRef.current.focus();
            }
          }, 100);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Informe o Valor</DialogTitle>
          </DialogHeader>
          {openPriceProduct && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium text-foreground">{openPriceProduct.name}</p>
                <p className="text-sm text-muted-foreground">Produto com preco livre</p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Quantidade</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={openPriceQuantity}
                  onChange={(e) => setOpenPriceQuantity(parseFloat(e.target.value) || 1)}
                  className="text-xl h-12 text-center font-semibold"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Valor Unitario (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={openPriceValue}
                  onChange={(e) => setOpenPriceValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmOpenPriceProduct();
                  }}
                  className="text-2xl h-14 text-center font-semibold"
                  placeholder="0,00"
                  autoFocus
                />
              </div>

              {openPriceValue && parseFloat(openPriceValue) > 0 && (
                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(parseFloat(openPriceValue) * openPriceQuantity)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowOpenPriceModal(false);
                    setOpenPriceProduct(null);
                    setTimeout(() => {
                      if (barcodeInputRef.current) {
                        barcodeInputRef.current.focus();
                      }
                    }, 100);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmOpenPriceProduct}
                  disabled={!openPriceValue || parseFloat(openPriceValue) <= 0}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Cancelar Venda
            </DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Esta informacao sera registrada para auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumo da venda */}
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Itens no carrinho:</span>
                <span className="font-medium">{cart.length}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-destructive/20">
                <span>Total a cancelar:</span>
                <span className="text-destructive">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <Label className="text-sm font-medium">Motivo do Cancelamento *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observacoes */}
            <div>
              <Label className="text-sm font-medium">Observacoes (opcional)</Label>
              <Textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Detalhes adicionais sobre o cancelamento..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Este cancelamento sera registrado e ficara visivel para gerentes e administradores.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={!cancelReason}
            >
              <Ban className="w-4 h-4 mr-2" />
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Bloqueio de Saida */}
      <Dialog open={showExitBlockModal} onOpenChange={setShowExitBlockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Venda em Andamento
            </DialogTitle>
            <DialogDescription>
              Voce possui uma venda em andamento. Finalize ou cancele antes de sair.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="font-semibold">{cart.length} item(ns) no carrinho</p>
                  <p className="text-sm text-muted-foreground">Total: {formatCurrency(calculateTotal())}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Para sair do PDV, voce precisa finalizar esta venda ou cancela-la informando um motivo.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExitBlockModal(false)} className="flex-1">
              Continuar Venda
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowExitBlockModal(false);
                setShowCancelModal(true);
              }}
              className="flex-1"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancelar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Aviso de Estoque (Admin/Gerente) */}
      <Dialog open={showStockWarningModal} onOpenChange={setShowStockWarningModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Produto Sem Estoque
            </DialogTitle>
            <DialogDescription>
              Este produto esta sem estoque disponivel. Como administrador/gerente, voce pode autorizar a venda mesmo assim.
            </DialogDescription>
          </DialogHeader>

          {pendingStockProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  {pendingStockProduct.photo_url ? (
                    <img
                      src={pendingStockProduct.photo_url}
                      alt={pendingStockProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Package className="w-8 h-8 text-warning" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{pendingStockProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Codigo: {pendingStockProduct.code || pendingStockProduct.barcode || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs">Estoque Atual</p>
                    <p className="font-bold text-destructive text-lg">
                      {pendingStockProduct.stock_quantity || 0} un.
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded-lg">
                    <p className="text-muted-foreground text-xs">Quantidade Solicitada</p>
                    <p className="font-bold text-lg">{pendingStockQuantity} un.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Atencao!</p>
                  <p className="text-muted-foreground">
                    Ao confirmar, o estoque ficara negativo. Esta acao sera registrada para auditoria.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCancelStockOverride} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmStockOverride}
              className="flex-1 bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Check className="w-4 h-4 mr-2" />
              Autorizar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Form */}
      <QuickCustomerForm
        open={showQuickCustomerForm}
        onOpenChange={setShowQuickCustomerForm}
        onCustomerCreated={(customer) => {
          setSelectedCustomer(customer);
          setCustomers([...customers, customer]);
          toast.success(`Cliente ${customer.name} cadastrado e selecionado!`);
        }}
      />
    </div>
  );
}
