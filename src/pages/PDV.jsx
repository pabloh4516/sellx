import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, User, Barcode,
  Percent, X, Check, Wallet, Clock, Package,
  AlertTriangle, DollarSign, UserPlus, Printer, LayoutGrid, List,
  Lock, Unlock, Keyboard, ChevronDown, ArrowDownCircle, ArrowUpCircle, Maximize2, Minimize2,
  Crown, Camera, LogOut, Ban, FileText, Coins, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReceiptPrint from '../components/pos/ReceiptPrint';
import A4ReceiptPrint from '../components/pos/A4ReceiptPrint';
import BarcodeScanner from '../components/pos/BarcodeScanner';
import CameraScanner from '../components/pos/CameraScanner';
import KeyboardShortcuts from '../components/pos/KeyboardShortcuts';
import QuickCustomerForm from '../components/pos/QuickCustomerForm';
import CustomerHistory from '../components/pos/CustomerHistory';
import LoyaltyDisplay from '../components/pos/LoyaltyDisplay';
import { Switch } from '@/components/ui/switch';
import { Award, Clock as ClockIcon, Tag } from 'lucide-react';
import { PDVModeToggle } from '@/components/pdv/PDVModeToggle';
import { cn } from '@/lib/utils';
import { playSound } from '@/utils/beep';
import { loadSystemSettings, getCashRegisterMode, getDefaultSettings } from '@/utils/settingsHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { USER_ROLES, ROLE_LABELS } from '@/config/permissions';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePlanLimits } from '@/hooks/usePlanLimits';

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

export default function PDV({ onModeChange, currentMode, operator, onChangeOperator, cashRegister: propCashRegister, cashRegisterMode: propCashRegisterMode }) {
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
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashRegister, setCashRegister] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loyaltyProgram, setLoyaltyProgram] = useState(null);
  const [customerPoints, setCustomerPoints] = useState(null);

  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // Vendedor e o operador atual por padrao
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percent');

  // Permissoes do operador
  const operatorPermissions = {
    can_give_discount: operator?.can_give_discount ?? true,
    max_discount: operator?.max_discount ?? 100,
    can_cancel_own_sale: operator?.can_cancel_own_sale ?? true,
    can_cancel_any_sale: operator?.can_cancel_any_sale ?? false,
    can_change_price: operator?.can_change_price ?? true,
  };
  const [vipDiscount, setVipDiscount] = useState(0);
  const [useWholesale, setUseWholesale] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [isFutureOrder, setIsFutureOrder] = useState(false);
  const [futureOrderData, setFutureOrderData] = useState({
    expected_date: '',
    advance_payment: 0,
    notes: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [payments, setPayments] = useState([]);
  const [currentPayment, setCurrentPayment] = useState({ method_id: '', amount: 0, installments: 1 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('items');
  const [saleNumber, setSaleNumber] = useState(1);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showA4Receipt, setShowA4Receipt] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState('thermal');
  const [completedSale, setCompletedSale] = useState(null);
  const [company, setCompany] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  // Estado para preco livre/aberto
  const [showOpenPriceModal, setShowOpenPriceModal] = useState(false);
  const [openPriceProduct, setOpenPriceProduct] = useState(null);
  const [openPriceValue, setOpenPriceValue] = useState('');
  const [openPriceQuantity, setOpenPriceQuantity] = useState(1);
  // Estado para scanner de camera
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const barcodeInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
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

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
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
      // Registrar cancelamento no banco
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
        total_value: calculateSubtotal(),
        discount_value: calculateDiscount(),
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
      setSelectedItem(null);
      setDiscount(0);
      setVipDiscount(0);
      setPointsToUse(0);
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
      // Mesmo com erro, limpar o carrinho mas avisar
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      setSelectedItem(null);
      setDiscount(0);
      setVipDiscount(0);
      toast.warning('Venda cancelada (erro ao registrar no historico)');
      setShowCancelModal(false);
      setShowExitBlockModal(false);
    }
  };

  // Limpar venda apos finalizar (sem tela de espera)
  const resetAfterSale = () => {
    setCompletedSale(null);
    setRealTimePayment(0);
    // Focar no campo de busca para proxima venda
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  const loadData = async () => {
    try {
      const [productsData, customersData, sellersData, methodsData, cashData, companyData, promotionsData, loyaltyData, salesData] = await Promise.all([
        base44.entities.Product.filter({ is_active: true }),
        base44.entities.Customer.list(),
        base44.entities.Seller.filter({ is_active: true }),
        base44.entities.PaymentMethod.filter({ is_active: true }),
        base44.entities.CashRegister.filter({ status: 'aberto' }),
        base44.entities.Company.list(),
        base44.entities.Promotion.filter({ is_active: true }),
        base44.entities.LoyaltyProgram.filter({ is_active: true }),
        base44.entities.Sale.list()
      ]);

      setProducts(productsData);
      setCustomers(customersData);
      setSellers(sellersData);
      setPaymentMethods(methodsData);
      setPromotions(promotionsData);

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

      if (loyaltyData.length > 0) {
        setLoyaltyProgram(loyaltyData[0]);
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

  const handleBarcodeSearch = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = e.target.value.trim();
      if (term) {
        let searchTermValue = term;
        if (term.length === 13 && term.startsWith('2')) {
          searchTermValue = term.substring(0, 7);
        }

        const product = products.find(p =>
          p.barcode === term ||
          p.barcode === searchTermValue ||
          p.code === term ||
          p.code === searchTermValue ||
          p.name.toLowerCase().includes(term.toLowerCase())
        );

        if (product) {
          let quantity = 1;
          if (term.length === 13 && term.startsWith('2')) {
            const weightCode = term.substring(7, 12);
            quantity = parseInt(weightCode) / 1000;
          }

          addToCart(product, quantity);
          setSearchTerm('');

          setTimeout(() => {
            if (barcodeInputRef.current) {
              barcodeInputRef.current.focus();
            }
          }, 100);
        } else {
          toast.error('Produto nao encontrado');
          setSearchTerm('');
        }
      }
    }
  }, [products]);

  useEffect(() => {
    if (selectedCustomer) {
      // Load loyalty points if program exists
      if (loyaltyProgram) {
        loadCustomerPoints(selectedCustomer.id);
      }

      // Apply VIP discount automatically
      if (selectedCustomer.is_vip && selectedCustomer.vip_discount_percent > 0) {
        setVipDiscount(selectedCustomer.vip_discount_percent);
        toast.success(`Cliente VIP! Desconto de ${selectedCustomer.vip_discount_percent}% aplicado automaticamente.`);
      } else {
        setVipDiscount(0);
      }
    } else {
      setCustomerPoints(null);
      setPointsToUse(0);
      setVipDiscount(0);
    }
  }, [selectedCustomer, loyaltyProgram]);

  const addToCart = (product, quantity = 1, customPrice = null) => {
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

    // Se produto tem preco livre e nao foi fornecido preco customizado, abrir modal para escolher
    if (product.allow_open_price && customPrice === null) {
      setOpenPriceProduct(product);
      setOpenPriceQuantity(quantity);
      // Preencher com preco atual como sugestao, se existir
      setOpenPriceValue(product.sale_price ? product.sale_price.toString() : '');
      setShowOpenPriceModal(true);
      return;
    }

    // Verificar estoque - usa config global OU config do produto
    const shouldBlockNoStock = blockSaleNoStock || product.block_sale_no_stock;
    const isService = product.is_service || false;
    const stockQty = product.stock_quantity || 0;

    if (!isFutureOrder && !isService && shouldBlockNoStock && stockQty <= 0) {
      // Admin/Gerente podem confirmar e prosseguir
      if (canOverrideStock) {
        setPendingStockProduct(product);
        setPendingStockQuantity(quantity);
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

    // Usar preco customizado se fornecido, senao usar preco normal
    const price = customPrice || (useWholesale && product.wholesale_price ? product.wholesale_price : product.sale_price);

    // Usar forma funcional do setCart para evitar stale closure
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id);

      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        const newQty = newCart[existingIndex].quantity + quantity;

        // Verificar estoque - usa config global OU config do produto
        const shouldBlockNoStock = blockSaleNoStock || product.block_sale_no_stock;
        const isService = product.is_service || false;
        const stockQty = product.stock_quantity || 0;

        if (!isFutureOrder && !isService && shouldBlockNoStock && newQty > stockQty) {
          if (canOverrideStock) {
            // Admin/Gerente - mostrar aviso mas permitir (via modal)
            toast.warning(
              <div>
                <strong>Quantidade excede o estoque!</strong>
                <p className="text-sm mt-1">Disponivel: {stockQty} | Solicitado: {newQty}</p>
              </div>,
              { duration: 3000 }
            );
            // Continua adicionando mesmo assim para admin/gerente
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
        newCart[existingIndex].total = newQty * newCart[existingIndex].unit_price;
        return newCart;
      } else {
        const newItem = {
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          quantity: quantity,
          unit_price: price,
          cost_price: product.cost_price || 0,
          discount: 0,
          total: price * quantity,
          commission_percent: product.commission_percent || 0,
          photo_url: product.photo_url,
          is_open_price: product.allow_open_price || false
        };
        setSelectedItem(newItem);
        return [...prevCart, newItem];
      }
    });

    toast.success(`${product.name} adicionado`);
    playSound('productAdded');
  };

  // Confirmar preco livre
  const handleConfirmOpenPrice = () => {
    const price = parseFloat(openPriceValue);
    if (!price || price <= 0) {
      toast.error('Informe um preco valido');
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
    const quantity = pendingStockQuantity;
    const customPrice = pendingStockPrice;
    const price = customPrice || (useWholesale && product.wholesale_price ? product.wholesale_price : product.sale_price);

    // Adiciona diretamente ao carrinho sem verificar estoque
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id);

      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].unit_price;
        return newCart;
      } else {
        const newItem = {
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          quantity: quantity,
          unit_price: price,
          cost_price: product.cost_price || 0,
          discount: 0,
          total: price * quantity,
          commission_percent: product.commission_percent || 0,
          photo_url: product.photo_url,
          is_open_price: product.allow_open_price || false,
          sold_without_stock: true // Marca que foi vendido sem estoque
        };
        setSelectedItem(newItem);
        return [...prevCart, newItem];
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

  const loadCustomerPoints = async (customerId) => {
    try {
      const points = await base44.entities.CustomerPoints.filter({ customer_id: customerId });
      if (points.length > 0) {
        setCustomerPoints(points[0]);
      } else {
        setCustomerPoints(null);
      }
    } catch (error) {
      console.error('Error loading customer points:', error);
    }
  };

  const updateCartItem = (index, field, value) => {
    const newCart = [...cart];
    newCart[index][field] = value;

    if (field === 'quantity' || field === 'unit_price' || field === 'discount') {
      const qty = newCart[index].quantity;
      const price = newCart[index].unit_price;
      const itemDiscount = newCart[index].discount || 0;
      newCart[index].total = (qty * price) - itemDiscount;
    }

    setCart(newCart);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.total, 0);

  // Funcao para validar e aplicar desconto
  const handleDiscountChange = (value, type = discountType) => {
    const newValue = parseFloat(value) || 0;

    // Verificar se pode dar desconto
    if (!operatorPermissions.can_give_discount && newValue > 0) {
      toast.error('Voce nao tem permissao para dar desconto');
      return;
    }

    // Validar desconto maximo (em %)
    if (type === 'percent') {
      if (newValue > operatorPermissions.max_discount) {
        toast.error(`Desconto maximo permitido: ${operatorPermissions.max_discount}%`);
        setDiscount(operatorPermissions.max_discount);
        return;
      }
    } else {
      // Se for em valor, calcular o percentual equivalente
      const subtotal = calculateSubtotal();
      if (subtotal > 0) {
        const percentEquivalent = (newValue / subtotal) * 100;
        if (percentEquivalent > operatorPermissions.max_discount) {
          const maxValueDiscount = (subtotal * operatorPermissions.max_discount) / 100;
          toast.error(`Desconto maximo permitido: ${formatCurrency(maxValueDiscount)} (${operatorPermissions.max_discount}%)`);
          setDiscount(maxValueDiscount);
          return;
        }
      }
    }

    setDiscount(newValue);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    let totalDiscount = 0;

    // VIP discount (always percentage)
    if (vipDiscount > 0) {
      totalDiscount += (subtotal * vipDiscount) / 100;
    }

    // Manual discount
    if (discountType === 'percent') {
      totalDiscount += (subtotal * discount) / 100;
    } else {
      totalDiscount += discount;
    }

    // Loyalty points discount
    if (loyaltyProgram && pointsToUse > 0) {
      totalDiscount += pointsToUse * loyaltyProgram.reais_per_point;
    }

    return totalDiscount;
  };

  const calculateVipDiscount = () => {
    if (vipDiscount > 0) {
      return (calculateSubtotal() * vipDiscount) / 100;
    }
    return 0;
  };

  const calculateTotal = () => calculateSubtotal() - calculateDiscount();
  const calculateCost = () => cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
  const calculateTotalPaid = () => payments.reduce((sum, p) => sum + p.amount, 0);
  const calculateChange = () => calculateTotalPaid() - calculateTotal();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleFutureOrder = async () => {
    setProcessing(true);
    try {
      const allOrders = await base44.entities.FutureOrder.list();
      const nextNumber = allOrders.length > 0 ? Math.max(...allOrders.map(o => o.order_number || 0)) + 1 : 1;

      const orderData = {
        order_number: nextNumber,
        customer_id: selectedCustomer?.id,
        seller_id: operator?.id || selectedSeller?.id,
        items: cart,
        total: calculateTotal(),
        advance_payment: futureOrderData.advance_payment || 0,
        remaining_payment: calculateTotal() - (futureOrderData.advance_payment || 0),
        expected_date: futureOrderData.expected_date,
        notes: futureOrderData.notes,
        status: futureOrderData.advance_payment > 0 ? 'parcial' : 'pendente',
        order_date: new Date().toISOString()
      };

      await base44.entities.FutureOrder.create(orderData);
      toast.success(`Pedido futuro #${nextNumber} criado!`);

      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setIsFutureOrder(false);
      setFutureOrderData({ expected_date: '', advance_payment: 0, notes: '' });
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error creating future order:', error);
      toast.error('Erro ao criar pedido futuro');
    } finally {
      setProcessing(false);
    }
  };

  const addPayment = () => {
    if (!currentPayment.method_id || currentPayment.amount <= 0) {
      toast.error('Selecione forma de pagamento e valor');
      return;
    }

    const method = paymentMethods.find(m => m.id === currentPayment.method_id);
    const fee = method?.fee_percent ? (currentPayment.amount * method.fee_percent / 100) : 0;

    setPayments([...payments, {
      ...currentPayment,
      method_name: method?.name,
      fee
    }]);

    setCurrentPayment({ method_id: '', amount: calculateTotal() - calculateTotalPaid() - currentPayment.amount, installments: 1 });
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
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

    if (isFutureOrder) {
      if (!selectedCustomer) {
        toast.error('Selecione um cliente para pedido futuro');
        return;
      }
      if (!futureOrderData.expected_date) {
        toast.error('Informe a data prevista de entrega');
        return;
      }
      return handleFutureOrder();
    }

    if (calculateTotalPaid() < calculateTotal()) {
      toast.error('Pagamento insuficiente');
      return;
    }

    if (!cashRegister?.id) {
      toast.error('Caixa nao esta aberto. Abra o caixa primeiro.');
      return;
    }

    setProcessing(true);
    try {
      // Preparar itens para salvar
      const saleItems = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        discount: item.discount || 0,
        total: item.total,
        commission_percent: item.commission_percent || 0
      }));

      // Preparar pagamentos para salvar
      const salePayments = payments.map(p => ({
        method_id: p.method_id,
        method_name: p.method_name,
        amount: p.amount,
        installments: p.installments || 1
      }));

      // Funcao para criar venda com retry em caso de conflito
      const createSaleWithRetry = async (maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            // Buscar numero da venda no momento da criacao
            const allSales = await base44.entities.Sale.list();
            const newSaleNumber = allSales.length > 0
              ? Math.max(...allSales.map(s => s.sale_number || 0)) + 1
              : 1;

            const saleData = {
              sale_number: newSaleNumber + attempt,
              customer_id: selectedCustomer?.id || null,
              customer_name: selectedCustomer?.name || null,
              seller_id: selectedSeller?.id || null, // Deve ser ID da tabela sellers, nao do operador
              operator_id: operator?.id || null, // ID do operador (tabela profiles)
              items: saleItems,
              subtotal: calculateSubtotal(),
              discount: calculateDiscount(),
              total: calculateTotal(),
              cost_total: calculateCost(),
              profit: calculateTotal() - calculateCost(),
              payments: salePayments,
              status: 'concluida',
              sale_date: new Date().toISOString(),
              cash_register_id: cashRegister.id,
              use_wholesale_price: useWholesale || false
            };

            const sale = await base44.entities.Sale.create(saleData);
            return { sale, saleNumber: newSaleNumber + attempt };
          } catch (error) {
            if (error?.code === '409' || error?.status === 409 || error?.message?.includes('409')) {
              console.log(`Tentativa ${attempt + 1} falhou com conflito, tentando novamente...`);
              if (attempt === maxRetries - 1) throw error;
              continue;
            }
            throw error;
          }
        }
      };

      const { sale, saleNumber: newSaleNumber } = await createSaleWithRetry();

      // Update stock
      for (const item of cart) {
        const product = products.find(p => p.id === item.product_id);
        if (product && !product.is_service) {
          await base44.entities.Product.update(item.product_id, {
            stock_quantity: (product.stock_quantity || 0) - item.quantity
          });

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

      toast.success(`Venda #${newSaleNumber} finalizada!`);
      playSound('saleComplete');

      const currentCustomer = selectedCustomer;

      setCompletedSale({
        ...sale,
        customer: currentCustomer
      });
      setShowReceipt(true);

      // Reset cart and payment states (waiting mode will be triggered after receipt dialog closes)
      setCart([]);
      setPayments([]);
      setSelectedCustomer(null);
      setSelectedItem(null);
      setDiscount(0);
      setVipDiscount(0);
      setPointsToUse(0);
      setCustomerPoints(null);
      setShowPaymentModal(false);
      setSaleNumber(newSaleNumber + 1);

      loadData();
      refreshUsage(); // Atualizar contagem de uso do plano

    } catch (error) {
      console.error('Error finalizing sale:', error);
      toast.error('Erro ao finalizar venda');
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyboardShortcut = useCallback((action) => {
    switch (action) {
      case 'focus_search':
        barcodeInputRef.current?.focus();
        break;
      case 'select_customer':
        setShowCustomerModal(true);
        break;
      case 'clear_cart':
        // F5 agora abre modal de cancelamento se tiver itens
        if (cart.length > 0) {
          handleOpenCancelModal();
        } else {
          toast.info('Carrinho ja esta vazio');
        }
        break;
      case 'open_payment':
        if (cart.length > 0) {
          setCurrentPayment({ method_id: '', amount: calculateTotal(), installments: 1 });
          setShowPaymentModal(true);
        }
        break;
      case 'finalize_sale':
        if (cart.length > 0 && calculateTotalPaid() >= calculateTotal()) {
          finalizeSale();
        }
        break;
      case 'toggle_fullscreen':
        toggleFullscreen();
        break;
      case 'cancel_sale':
        // ESC ou F6 para cancelar venda
        handleOpenCancelModal();
        break;
    }
  }, [cart, payments]);

  const handleBarcodeScan = useCallback((barcode) => {
    const term = barcode.trim();
    if (term) {
      let searchTermValue = term;
      if (term.length === 13 && term.startsWith('2')) {
        searchTermValue = term.substring(0, 7);
      }

      const product = products.find(p =>
        p.barcode === term ||
        p.barcode === searchTermValue ||
        p.code === term ||
        p.code === searchTermValue
      );

      if (product) {
        let quantity = 1;
        if (term.length === 13 && term.startsWith('2')) {
          const weightCode = term.substring(7, 12);
          quantity = parseInt(weightCode) / 1000;
        }

        addToCart(product, quantity);
      } else {
        toast.error('Produto nao encontrado: ' + term);
      }
    }
  }, [products]);

  const filteredProducts = searchTerm.length >= 2
    ? products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
      ).slice(0, 20)
    : [];

  const selectProductFromSearch = (product) => {
    addToCart(product, 1);
    setSearchTerm('');
    setShowProductSearch(false);
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf_cnpj?.includes(searchTerm)
  );

  const lastItem = cart.length > 0 ? cart[cart.length - 1] : null;
  const isOpen = !!cashRegister;

  if (!cashRegister) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Caixa Fechado</h2>
          <p className="text-muted-foreground mb-6">E necessario abrir o caixa para realizar vendas.</p>
          <Button onClick={() => window.location.href = '/CashRegister'} className="bg-primary hover:bg-primary/90">
            <Wallet className="w-4 h-4 mr-2" />
            Abrir Caixa
          </Button>
        </div>
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
    <>
      <BarcodeScanner onScan={handleBarcodeScan} enabled={!showPaymentModal && !showCustomerModal} />
      <KeyboardShortcuts onShortcut={handleKeyboardShortcut} enabled={!showPaymentModal && !showCustomerModal} />

      <div className="h-screen flex flex-col overflow-hidden bg-background">
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
              onClick={() => setShowCustomerModal(true)}
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
                <DropdownMenuItem className="flex justify-between" onClick={() => setShowCustomerModal(true)}>
                  <span>Selecionar cliente</span>
                  <span className="text-muted-foreground text-xs">F4</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between" onClick={handleOpenCancelModal}>
                  <span>Cancelar venda</span>
                  <span className="text-muted-foreground text-xs">F5</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex justify-between">
                  <span>Pagamento</span>
                  <span className="text-muted-foreground text-xs">F8</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between" onClick={toggleFullscreen}>
                  <span>Tela cheia</span>
                  <span className="text-muted-foreground text-xs">F11</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex justify-between">
                  <span>Finalizar venda</span>
                  <span className="text-muted-foreground text-xs">F12</span>
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
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 pb-2 border-b border-border">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Codigo de barras ou nome do produto... (F2)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowProductSearch(e.target.value.length >= 2);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowProductSearch(false);
                        return;
                      }
                      if (e.key === 'ArrowDown' && filteredProducts.length > 0) {
                        e.preventDefault();
                        setShowProductSearch(true);
                        return;
                      }
                      handleBarcodeSearch(e);
                      if (e.key === 'Enter') {
                        setShowProductSearch(false);
                      }
                    }}
                    onFocus={() => searchTerm.length >= 2 && setShowProductSearch(true)}
                    onBlur={() => setTimeout(() => setShowProductSearch(false), 200)}
                    className="pl-10 h-12 text-lg"
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
                        {filteredProducts.length} produto(s) encontrado(s) - clique para adicionar
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
                              selectProductFromSearch(product);
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => setShowCameraScanner(true)}
                  title="Scanner por camera"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* View Tabs */}
            <Tabs value={viewMode} onValueChange={setViewMode} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b border-border">
                <TabsList className="h-9">
                  <TabsTrigger value="items" className="gap-2">
                    <List className="w-4 h-4" />
                    Itens da Venda
                  </TabsTrigger>
                  <TabsTrigger value="products" className="gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Produtos
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Items Tab */}
              <TabsContent value="items" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
                {/* Last Item Added */}
                {lastItem && (
                  <div className="p-4 pb-2">
                    <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                            <Package className="w-6 h-6 text-success" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{lastItem.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {lastItem.quantity} x {formatCurrency(lastItem.unit_price)}
                            </p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-success tabular-nums">
                          {formatCurrency(lastItem.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <ScrollArea className="flex-1 px-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Carrinho vazio</p>
                      <p className="text-sm">Escaneie ou busque produtos para adicionar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-4">
                      {cart.map((item, index) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer transition-all",
                            selectedItem?.id === item.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                {item.photo_url ? (
                                  <img src={item.photo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{item.product_name}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="tabular-nums">{item.quantity} x {formatCurrency(item.unit_price)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-lg tabular-nums">{formatCurrency(item.total)}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Quantity Controls when selected */}
                          {selectedItem?.id === item.id && (
                            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => { e.stopPropagation(); updateCartItem(index, 'quantity', Math.max(0.001, item.quantity - 1)); }}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={item.quantity}
                                  onChange={(e) => updateCartItem(index, 'quantity', Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                                  className="h-8 w-20 text-center"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => { e.stopPropagation(); updateCartItem(index, 'quantity', item.quantity + 1); }}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Preco Unit.</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateCartItem(index, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="h-8"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Totals */}
                <div className="p-4 pt-2 border-t border-border bg-secondary/30">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Itens</p>
                      <p className="font-bold text-lg">{cart.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subtotal</p>
                      <p className="font-bold text-lg tabular-nums">{formatCurrency(calculateSubtotal())}</p>
                    </div>
                    {calculateDiscount() > 0 && (
                      <div>
                        <p className="text-muted-foreground">Desconto</p>
                        <p className="font-bold text-lg text-success tabular-nums">-{formatCurrency(calculateDiscount())}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="flex-1 overflow-y-auto m-0 p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="p-3 rounded-xl border border-border bg-card hover:border-primary cursor-pointer transition-all"
                      onClick={() => addToCart(product)}
                    >
                      {product.photo_url ? (
                        <img
                          src={product.photo_url}
                          alt={product.name}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-24 bg-secondary rounded-lg mb-2 flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-primary font-bold">{formatCurrency(product.sale_price)}</p>
                      <p className="text-xs text-muted-foreground">Estoque: {product.stock_quantity || 0}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Shortcuts Bar */}
            <div className="border-t border-border bg-card px-4 py-2">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {[
                    { key: 'F2', label: 'Buscar', action: () => barcodeInputRef.current?.focus() },
                    { key: 'F4', label: 'Cliente', action: () => setShowCustomerModal(true) },
                    { key: 'F5', label: 'Limpar', action: () => { setCart([]); setSelectedItem(null); } },
                    { key: 'F8', label: 'Pagamento', action: () => cart.length > 0 && setShowPaymentModal(true), disabled: cart.length === 0 },
                  ].map(shortcut => (
                    <button
                      key={shortcut.key}
                      onClick={shortcut.action}
                      disabled={shortcut.disabled}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                        shortcut.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-secondary"
                      )}
                    >
                      <span className="font-bold text-primary">{shortcut.key}</span>
                      <span className="text-muted-foreground hidden sm:inline">{shortcut.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Cart Summary */}
          <div className="w-[320px] xl:w-[380px] hidden lg:flex flex-col border-l border-border bg-card shadow-xl">
            {/* Customer */}
            <div className="p-4 border-b border-border">
              <button
                onClick={() => setShowCustomerModal(true)}
                className={cn(
                  "w-full p-3 rounded-xl border transition-colors flex items-center gap-3",
                  selectedCustomer?.is_vip
                    ? "border-warning/50 bg-warning/5 hover:border-warning"
                    : "border-dashed border-border hover:border-primary"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedCustomer?.is_vip ? "bg-warning/20" : "bg-secondary"
                )}>
                  {selectedCustomer?.is_vip ? (
                    <Crown className="w-5 h-5 text-warning" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  {selectedCustomer ? (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        {selectedCustomer.is_vip && (
                          <span className="px-1.5 py-0.5 bg-warning/20 text-warning text-xs font-bold rounded">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.cpf_cnpj || selectedCustomer.phone}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-muted-foreground">Selecionar Cliente</p>
                      <p className="text-sm text-muted-foreground">Opcional - F4</p>
                    </>
                  )}
                </div>
                {selectedCustomer && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </button>

              {/* VIP Discount Indicator */}
              {selectedCustomer?.is_vip && vipDiscount > 0 && (
                <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium">Desconto VIP</span>
                  </div>
                  <span className="font-bold text-warning">{vipDiscount}%</span>
                </div>
              )}

              {/* Loyalty Display */}
              {selectedCustomer && loyaltyProgram && (
                <div className="mt-3">
                  <LoyaltyDisplay
                    customerPoints={customerPoints}
                    loyaltyProgram={loyaltyProgram}
                    earnedPoints={Math.floor(calculateTotal() * (loyaltyProgram.points_per_real || 0))}
                  />
                </div>
              )}

              {/* Seller Selection - apenas para admin/gerente/owner */}
              {operator && [USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(operator.role) && (
                <div className="mt-3">
                  <Select value={selectedSeller?.id || '_current'} onValueChange={(v) => setSelectedSeller(v === '_current' ? null : sellers.find(s => s.id === v))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecionar outro vendedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_current">Usar operador atual</SelectItem>
                      {sellers.map(seller => (
                        <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para registrar no seu nome
                  </p>
                </div>
              )}

              {/* Future Order Toggle */}
              <div className="mt-3 flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Pedido Futuro</span>
                </div>
                <Switch checked={isFutureOrder} onCheckedChange={setIsFutureOrder} />
              </div>

              {isFutureOrder && (
                <div className="mt-3 space-y-2 p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <div>
                    <Label className="text-xs">Data Prevista</Label>
                    <Input
                      type="date"
                      value={futureOrderData.expected_date}
                      onChange={(e) => setFutureOrderData({...futureOrderData, expected_date: e.target.value})}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sinal (Opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={futureOrderData.advance_payment || ''}
                      onChange={(e) => setFutureOrderData({...futureOrderData, advance_payment: parseFloat(e.target.value) || 0})}
                      className="h-8"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items Mini */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {cart.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-bold tabular-nums">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Discount */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder={operatorPermissions.can_give_discount ? `Desconto (max ${operatorPermissions.max_discount}%)` : 'Sem permissao'}
                  value={discount || ''}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  disabled={!operatorPermissions.can_give_discount}
                  className="flex-1 h-9"
                />
                <Select value={discountType} onValueChange={(v) => { setDiscountType(v); handleDiscountChange(discount, v); }}>
                  <SelectTrigger className="w-20 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="value">R$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!operatorPermissions.can_give_discount && (
                <p className="text-xs text-destructive">Voce nao tem permissao para dar desconto</p>
              )}
              {operatorPermissions.can_give_discount && operatorPermissions.max_discount < 100 && (
                <p className="text-xs text-muted-foreground">Limite: {operatorPermissions.max_discount}% de desconto</p>
              )}
            </div>

            {/* Totals */}
            <div className="p-4 border-t border-border bg-secondary/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {vipDiscount > 0 && (
                  <div className="flex justify-between text-warning">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      VIP ({vipDiscount}%)
                    </span>
                    <span className="tabular-nums">-{formatCurrency(calculateVipDiscount())}</span>
                  </div>
                )}
                {(discount > 0 || pointsToUse > 0) && (
                  <div className="flex justify-between text-success">
                    <span>Outros Descontos</span>
                    <span className="tabular-nums">-{formatCurrency(calculateDiscount() - calculateVipDiscount())}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>

            {/* Troco em Tempo Real */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Valor Recebido (R$)</Label>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={realTimePayment || ''}
                    onChange={(e) => setRealTimePayment(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="h-12 text-lg font-bold text-center"
                  />
                  {realTimePayment > 0 && (
                    <div className={cn(
                      "p-3 rounded-lg border",
                      realTimePayment >= calculateTotal()
                        ? "bg-success/10 border-success/20"
                        : "bg-warning/10 border-warning/20"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {realTimePayment >= calculateTotal() ? 'Troco:' : 'Falta:'}
                        </span>
                        <span className={cn(
                          "text-xl font-bold tabular-nums",
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

            {/* Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Button
                className={cn(
                  "w-full h-14 text-lg font-semibold",
                  isFutureOrder ? "bg-warning hover:bg-warning/90" : "bg-success hover:bg-success/90"
                )}
                disabled={cart.length === 0}
                onClick={() => {
                  if (isFutureOrder) {
                    finalizeSale();
                  } else {
                    setCurrentPayment({ method_id: '', amount: calculateTotal(), installments: 1 });
                    setShowPaymentModal(true);
                  }
                }}
              >
                {isFutureOrder ? (
                  <>
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Criar Pedido Futuro
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pagamento (F8)
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={cart.length === 0}
                  onClick={handleOpenCancelModal}
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Cancelar (F5)
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={cart.length === 0}
                >
                  <Tag className="w-4 h-4 mr-1" />
                  Promocoes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex justify-between text-lg font-bold">
                <span>Total a Pagar</span>
                <span className="text-primary tabular-nums">{formatCurrency(calculateTotal())}</span>
              </div>
              {calculateTotalPaid() > 0 && (
                <>
                  <div className="flex justify-between text-success mt-2">
                    <span>Pago</span>
                    <span className="tabular-nums">{formatCurrency(calculateTotalPaid())}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-1">
                    <span>Restante</span>
                    <span className="tabular-nums">{formatCurrency(calculateTotal() - calculateTotalPaid())}</span>
                  </div>
                </>
              )}
            </div>

            {/* Added Payments */}
            {payments.length > 0 && (
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div>
                      <p className="font-medium">{payment.method_name}</p>
                      {payment.installments > 1 && (
                        <p className="text-xs text-muted-foreground">{payment.installments}x</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">{formatCurrency(payment.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePayment(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Payment Form */}
            {calculateTotalPaid() < calculateTotal() && (
              <div className="space-y-3 p-4 border border-border rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={currentPayment.method_id}
                      onValueChange={(v) => setCurrentPayment({...currentPayment, method_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name} {method.fee_percent > 0 && `(${method.fee_percent}%)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPayment.amount || ''}
                      onChange={(e) => setCurrentPayment({...currentPayment, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {paymentMethods.find(m => m.id === currentPayment.method_id)?.type === 'credito_parcelado' && (
                  <div>
                    <Label>Parcelas</Label>
                    <Select
                      value={String(currentPayment.installments)}
                      onValueChange={(v) => setCurrentPayment({...currentPayment, installments: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={addPayment} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Pagamento
                </Button>
              </div>
            )}

            {/* Change */}
            {calculateChange() > 0 && (
              <div className="p-4 bg-success/10 rounded-xl border border-success/20">
                <div className="flex justify-between text-lg font-bold text-success">
                  <span>Troco</span>
                  <span className="tabular-nums">{formatCurrency(calculateChange())}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-success hover:bg-success/90"
              disabled={calculateTotalPaid() < calculateTotal() || processing}
              onClick={finalizeSale}
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Finalizar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Customer Selection Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            onClick={() => {
              setShowCustomerModal(false);
              setShowQuickCustomerForm(true);
            }}
            className="w-full bg-primary hover:bg-primary/90 mb-3"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Cadastrar Novo Cliente
          </Button>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                    customer.is_vip
                      ? "border-warning/30 bg-warning/5 hover:border-warning"
                      : "border-border hover:border-primary"
                  )}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-3">
                    {customer.is_vip ? (
                      <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-warning" />
                      </div>
                    ) : customer.photo_url ? (
                      <img src={customer.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{customer.name}</p>
                        {customer.is_vip && (
                          <span className="px-1.5 py-0.5 bg-warning/20 text-warning text-xs font-bold rounded">
                            VIP {customer.vip_discount_percent > 0 && `${customer.vip_discount_percent}%`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{customer.cpf_cnpj || customer.phone}</p>
                    </div>
                  </div>
                  {customer.credit_limit > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Limite</p>
                      <p className="text-sm font-medium text-success">
                        {formatCurrency((customer.credit_limit || 0) - (customer.used_credit || 0))}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Form */}
      <QuickCustomerForm
        open={showQuickCustomerForm}
        onOpenChange={setShowQuickCustomerForm}
        onCustomerCreated={(customer) => {
          setSelectedCustomer(customer);
          setCustomers([...customers, customer]);
        }}
      />

      {/* Camera Scanner */}
      <CameraScanner
        open={showCameraScanner}
        onOpenChange={setShowCameraScanner}
        onScan={(barcode) => {
          handleBarcodeScan(barcode);
          setShowCameraScanner(false);
        }}
      />

      {/* Open Price Modal */}
      <Dialog open={showOpenPriceModal} onOpenChange={(open) => {
        setShowOpenPriceModal(open);
        if (!open) {
          setOpenPriceProduct(null);
          setOpenPriceValue('');
          setOpenPriceQuantity(1);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-warning" />
              Informar Preco
            </DialogTitle>
          </DialogHeader>

          {openPriceProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                    {openPriceProduct.photo_url ? (
                      <img src={openPriceProduct.photo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{openPriceProduct.name}</p>
                    <p className="text-sm text-warning font-medium">Preco Livre</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={openPriceQuantity}
                  onChange={(e) => setOpenPriceQuantity(parseFloat(e.target.value) || 1)}
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <Label>Preco Unitario (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={openPriceValue}
                  onChange={(e) => setOpenPriceValue(e.target.value)}
                  className="h-14 text-2xl font-bold text-center"
                  placeholder="0,00"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmOpenPrice();
                    }
                  }}
                />
              </div>

              {openPriceValue && parseFloat(openPriceValue) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(parseFloat(openPriceValue) * openPriceQuantity)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowOpenPriceModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-success hover:bg-success/90"
              onClick={handleConfirmOpenPrice}
              disabled={!openPriceValue || parseFloat(openPriceValue) <= 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
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
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              {calculateDiscount() > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-medium text-success">-{formatCurrency(calculateDiscount())}</span>
                </div>
              )}
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
                Este cancelamento sera registrado e ficara visivel para gerentes e administradores no relatorio de cancelamentos.
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
    </>
  );
}
