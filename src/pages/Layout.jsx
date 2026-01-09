import React, { useState, useEffect, useMemo, Component } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, DollarSign,
  FileText, Settings, ChevronDown, ChevronRight, ChevronLeft, Menu, X, LogOut,
  Building2, ClipboardList, BarChart3, Search, Wrench, CreditCard,
  Receipt, TrendingUp, Wallet, PiggyBank, FileCheck, Tag, UserCircle, Warehouse,
  Shield, ShieldCheck, Palette, RefreshCw, Ban, AlertTriangle, Home, RotateCcw
} from 'lucide-react';

// Error Boundary para capturar erros e manter navegacao
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h2>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado nesta pagina. Use o menu ao lado para navegar para outra pagina ou tente novamente.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                <p className="text-sm font-medium text-destructive mb-1">Detalhes do erro:</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                to="/Dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir para o Inicio
              </Link>
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/contexts/OperatorContext';
import { ROLE_LABELS } from '@/config/permissions';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import CommandPalette from '@/components/CommandPalette';

const menuItems = [
  // ═══════════════════════════════════════
  // OPERACIONAL - Ferramentas do dia-a-dia
  // ═══════════════════════════════════════
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    page: 'Dashboard',
    category: 'Operacional',
  },
  {
    name: 'PDV',
    icon: ShoppingCart,
    page: 'PDV',
    category: 'Operacional',
  },
  {
    name: 'Caixa',
    icon: DollarSign,
    page: 'CashRegister',
    category: 'Operacional',
  },
  {
    name: 'Ordem de Serviço',
    icon: Wrench,
    page: 'ServiceOrders',
    category: 'Operacional',
  },

  // ═══════════════════════════════════════
  // COMERCIAL - Vendas e Marketing
  // ═══════════════════════════════════════
  {
    name: 'Vendas',
    icon: Receipt,
    category: 'Comercial',
    submenu: [
      { name: 'Histórico', icon: ClipboardList, page: 'Sales' },
      { name: 'Orçamentos', icon: FileCheck, page: 'Quotes' },
      { name: 'Pedidos Futuros', icon: ClipboardList, page: 'FutureOrders' },
      { name: 'Devoluções', icon: RotateCcw, page: 'Returns' },
      { name: 'Cancelamentos', icon: Ban, page: 'Cancellations' },
    ]
  },
  {
    name: 'Compras',
    icon: Truck,
    category: 'Comercial',
    submenu: [
      { name: 'Registro de Compras', icon: FileText, page: 'Purchases' },
      { name: 'Importar XML', icon: FileCheck, page: 'ImportXML' },
    ]
  },
  {
    name: 'Promoções',
    icon: Tag,
    page: 'Promotions',
    category: 'Comercial',
  },
  {
    name: 'Fidelidade',
    icon: TrendingUp,
    page: 'LoyaltyProgram',
    category: 'Comercial',
  },

  // ═══════════════════════════════════════
  // CADASTROS - Entidades do sistema
  // ═══════════════════════════════════════
  {
    name: 'Cadastros',
    icon: ClipboardList,
    category: 'Cadastros',
    submenu: [
      { name: 'Clientes', icon: Users, page: 'Customers' },
      { name: 'Fornecedores', icon: Truck, page: 'Suppliers' },
      { name: 'Produtos', icon: Package, page: 'Products' },
      { name: 'Grupos/Categorias', icon: Tag, page: 'ProductGroups' },
      { name: 'Vendedores', icon: UserCircle, page: 'Sellers' },
    ]
  },

  // ═══════════════════════════════════════
  // ESTOQUE - Controle de inventário
  // ═══════════════════════════════════════
  {
    name: 'Estoque',
    icon: Warehouse,
    category: 'Estoque',
    submenu: [
      { name: 'Controle', icon: Package, page: 'Stock' },
      { name: 'Lotes e Validade', icon: Package, page: 'StockBatches' },
      { name: 'Locais/Filiais', icon: Building2, page: 'StockLocations' },
      { name: 'Transferências', icon: Truck, page: 'StockTransfers' },
      { name: 'Ajustes', icon: FileText, page: 'StockAdjustments' },
      { name: 'Movimentações', icon: TrendingUp, page: 'StockMovements' },
      { name: 'Inventário', icon: ClipboardList, page: 'Inventory' },
      { name: 'Etiquetas', icon: Tag, page: 'Labels' },
    ]
  },

  // ═══════════════════════════════════════
  // FINANCEIRO - Gestão financeira
  // ═══════════════════════════════════════
  {
    name: 'Financeiro',
    icon: Wallet,
    category: 'Financeiro',
    submenu: [
      { name: 'Análise de Caixa', icon: BarChart3, page: 'CashAnalysis' },
      { name: 'Fluxo de Caixa', icon: TrendingUp, page: 'CashFlow' },
      { name: 'Contas a Pagar', icon: FileText, page: 'Payables' },
      { name: 'Contas a Receber', icon: Receipt, page: 'Receivables' },
      { name: 'Despesas', icon: PiggyBank, page: 'Expenses' },
      { name: 'Cheques', icon: CreditCard, page: 'Checks' },
      { name: 'Contas Bancárias', icon: Building2, page: 'BankAccounts' },
    ]
  },

  // ═══════════════════════════════════════
  // RELATÓRIOS - Análises e consultas
  // ═══════════════════════════════════════
  {
    name: 'Relatórios',
    icon: BarChart3,
    category: 'Relatórios',
    submenu: [
      { name: 'Central de Relatórios', icon: FileText, page: 'Reports' },
      { name: 'Dashboard Gerencial', icon: BarChart3, page: 'DashboardManager' },
      { name: 'Dashboard Vendedor', icon: TrendingUp, page: 'DashboardSeller' },
      { name: 'Vendas', icon: Receipt, page: 'ReportSales' },
      { name: 'Estoque', icon: Package, page: 'ReportStock' },
      { name: 'Financeiro', icon: DollarSign, page: 'ReportFinancial' },
      { name: 'Comissões', icon: TrendingUp, page: 'ReportCommissions' },
      { name: 'DRE', icon: BarChart3, page: 'ReportDRE' },
    ]
  },
  {
    name: 'Consultas',
    icon: Search,
    category: 'Relatórios',
    submenu: [
      { name: 'Produtos', icon: Package, page: 'SearchProducts' },
      { name: 'Clientes em Atraso', icon: Users, page: 'OverdueCustomers' },
      { name: 'Aniversariantes', icon: Users, page: 'Birthdays' },
    ]
  },

  // ═══════════════════════════════════════
  // CONFIGURAÇÕES - Ajustes do sistema
  // ═══════════════════════════════════════
  {
    name: 'Configurações',
    icon: Settings,
    category: 'Configurações',
    submenu: [
      { name: 'Empresa', icon: Building2, page: 'CompanySettings' },
      { name: 'Geral', icon: Settings, page: 'Settings' },
      { name: 'Usuários', icon: Users, page: 'Users' },
      { name: 'Formas de Pagamento', icon: CreditCard, page: 'PaymentMethods' },
      { name: 'Personalização', icon: Palette, page: 'ThemeSettings' },
      { name: 'Importar Dados', icon: FileText, page: 'DataImport' },
      { name: 'Backup/Restaurar', icon: Shield, page: 'BackupRestore' },
      { name: 'Log de Auditoria', icon: ShieldCheck, page: 'AuditLog' },
      { name: 'Faturamento', icon: CreditCard, page: 'Billing', ownerOnly: true },
      { name: 'Minha Assinatura', icon: Receipt, page: 'Subscription', ownerOnly: true },
      { name: 'Painel Admin', icon: ShieldCheck, href: '/admin', superAdminOnly: true },
    ]
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  // Initialize all submenus as closed (controlled)
  const [openSubmenus, setOpenSubmenus] = useState(() => {
    const initial = {};
    menuItems.forEach(item => {
      if (item.submenu) {
        initial[item.name] = false;
      }
    });
    return initial;
  });

  // Usar contexto de autenticação e operador
  const { user, company, canAccess, getCurrentRole, isOwner, isSuperAdmin, logout } = useAuth();
  const { operator, openOperatorSelect, operatorCode } = useOperator();
  const currentUser = operator || user;
  const currentRole = operator?.role || getCurrentRole();
  const userIsOwner = isOwner();
  const userIsSuperAdmin = isSuperAdmin();

  // Filtrar itens do menu baseado nas permissões
  const filteredMenuItems = useMemo(() => {
    return menuItems.map(item => {
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter(subItem => {
          // Verificar se e superAdminOnly
          if (subItem.superAdminOnly && !userIsSuperAdmin) return false;
          // Verificar se e ownerOnly
          if (subItem.ownerOnly && !userIsOwner) return false;
          // Se tem href (link externo), permite
          if (subItem.href) return true;
          return canAccess(subItem.page);
        });
        if (filteredSubmenu.length === 0) return null;
        return { ...item, submenu: filteredSubmenu };
      }
      if (item.ownerOnly && !userIsOwner) return null;
      if (item.page && !canAccess(item.page)) return null;
      return item;
    }).filter(Boolean);
  }, [canAccess, userIsOwner]);

  const toggleSubmenu = (name) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isChildActive = (item) => {
    if (!item.submenu) return false;
    return item.submenu.some(child => child.page === currentPageName);
  };

  const renderMenuItem = (item, isMobile = false) => {
    const isActive = currentPageName === item.page;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenus[item.name];
    const hasActiveChild = isChildActive(item);

    if (hasSubmenu) {
      if (!sidebarOpen && !isMobile) {
        // Collapsed state - show tooltip with submenu
        return (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleSubmenu(item.name)}
                className={cn(
                  'w-full flex items-center justify-center p-2 rounded-lg text-sm transition-all',
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  hasActiveChild && 'text-sidebar-foreground bg-sidebar-accent/50'
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {item.name}
            </TooltipContent>
          </Tooltip>
        );
      }

      return (
        <Collapsible key={item.name} open={!!isSubmenuOpen} onOpenChange={() => toggleSubmenu(item.name)}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                hasActiveChild && 'text-sidebar-foreground bg-sidebar-accent/50'
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 text-left">{item.name}</span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform text-sidebar-muted",
                !!isSubmenuOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="pl-[30px] mt-1 space-y-0.5">
              {item.submenu.map(subItem => (
                <Link
                  key={subItem.page}
                  to={createPageUrl(subItem.page)}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all',
                    'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                    currentPageName === subItem.page && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    currentPageName === subItem.page ? "bg-primary" : "bg-sidebar-muted"
                  )} />
                  <span>{subItem.name}</span>
                </Link>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Single menu item
    if (!sidebarOpen && !isMobile) {
      return (
        <Tooltip key={item.page}>
          <TooltipTrigger asChild>
            <Link
              to={createPageUrl(item.page)}
              className={cn(
                'relative w-full flex items-center justify-center p-2 rounded-lg text-sm transition-all',
                'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <item.icon className="w-[18px] h-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.page}
        to={createPageUrl(item.page)}
        onClick={() => isMobile && setMobileMenuOpen(false)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
        )}
        <item.icon className="w-[18px] h-[18px] shrink-0" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile Header - Fixed at top */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 sm:h-14 bg-card border-b border-border z-50 flex items-center justify-between px-2 sm:px-4 safe-area-inset">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm sm:text-base">Sellx</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="w-4 h-4" />
          </Button>
          <NotificationCenter />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-12 sm:top-14 bottom-0 w-[280px] sm:w-72 nexo-sidebar overflow-y-auto animate-slide-in-left"
            onClick={e => e.stopPropagation()}
          >
            <nav className="py-3 space-y-0.5 px-2">
              {filteredMenuItems.map(item => renderMenuItem(item, true))}
            </nav>
            {currentUser && (
              <div className="border-t border-sidebar-border p-3">
                {/* Botao Trocar Operador - Destacado */}
                <button
                  onClick={() => { setMobileMenuOpen(false); openOperatorSelect(); }}
                  className="w-full mb-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center gap-2 transition-all group"
                >
                  <RefreshCw className="w-5 h-5 text-primary group-hover:rotate-180 transition-transform duration-300" />
                  <span className="text-sm font-semibold text-primary">Trocar Operador</span>
                </button>

                <div className="flex items-center gap-3 p-2 rounded-lg mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground font-semibold text-sm">
                    {getInitials(currentUser.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.full_name}</p>
                    <p className="text-xs text-sidebar-muted truncate">
                      {operatorCode ? (
                        <span className="text-primary font-medium">{operatorCode}</span>
                      ) : (
                        currentRole && ROLE_LABELS[currentRole]
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sidebar-muted hover:text-destructive hover:bg-destructive/10"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair do Sistema
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex h-screen bg-background w-full">
        {/* Desktop Sidebar - Part of flex layout, not fixed */}
        <aside
          className={cn(
            "hidden lg:flex h-screen nexo-sidebar flex-col transition-all duration-200 relative shrink-0",
            sidebarOpen ? "w-56" : "w-[68px]"
          )}
        >
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "absolute -right-3 top-6 w-6 h-6 rounded-full bg-card text-muted-foreground",
              "flex items-center justify-center shadow-sm hover:bg-primary hover:text-primary-foreground transition-all z-20",
              "border border-border"
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Logo */}
          <div className={cn(
            "h-14 flex items-center justify-between border-b border-sidebar-border px-4",
            !sidebarOpen && "justify-center px-2"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-primary-foreground" />
              </div>
              {sidebarOpen && (
                <span className="font-semibold text-sidebar-foreground tracking-tight">
                  Sellx
                </span>
              )}
            </div>
            {sidebarOpen && (
              <div className="flex items-center gap-1">
                <NotificationCenter />
              </div>
            )}
          </div>

          {/* Search Button */}
          <div className="px-2 py-2">
            {sidebarOpen ? (
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all"
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">Buscar...</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Ctrl K
                </kbd>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCommandPaletteOpen(true)}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground bg-sidebar-accent/50 hover:bg-sidebar-accent transition-all"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Buscar (Ctrl+K)
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto nexo-scrollbar">
            <div className="space-y-0.5 px-2">
              {filteredMenuItems.map(item => renderMenuItem(item))}
            </div>
          </nav>

          {/* User Profile */}
          {currentUser && (
            <div className="p-2 border-t border-sidebar-border">
              {/* Botao Trocar Operador - Destacado */}
              {sidebarOpen ? (
                <button
                  onClick={openOperatorSelect}
                  className="w-full mb-2 px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center gap-2 transition-all group"
                >
                  <RefreshCw className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-300" />
                  <span className="text-sm font-medium text-primary">Trocar Operador</span>
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={openOperatorSelect}
                      className="w-full mb-2 p-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-all group"
                    >
                      <RefreshCw className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-300" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Trocar Operador
                  </TooltipContent>
                </Tooltip>
              )}

              <div className={cn(
                "flex items-center gap-3 p-2 rounded-lg",
                !sidebarOpen && "justify-center p-1"
              )}>
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={cn(
                    "rounded-lg flex items-center justify-center bg-primary text-primary-foreground font-semibold",
                    !sidebarOpen ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm"
                  )}>
                    {getInitials(currentUser.full_name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-sidebar" />
                </div>

                {/* User Info */}
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-sidebar-foreground">
                      {currentUser.full_name}
                    </p>
                    <p className="text-xs text-sidebar-muted truncate flex items-center gap-1">
                      {operatorCode ? (
                        <span className="text-primary font-medium">{operatorCode}</span>
                      ) : (
                        <>
                          <Shield className="w-3 h-3" />
                          {currentRole && ROLE_LABELS[currentRole]}
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Logout Button */}
                {sidebarOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={logout}
                        className="p-1.5 rounded-md text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Sair do Sistema
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Collapsed Logout */}
              {!sidebarOpen && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="w-full p-2 rounded-lg flex items-center justify-center text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Sair do Sistema
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-12 sm:pt-14 lg:pt-0 min-h-screen">
          <ErrorBoundary key={currentPageName}>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Command Palette - Busca Global */}
      <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
    </TooltipProvider>
  );
}
