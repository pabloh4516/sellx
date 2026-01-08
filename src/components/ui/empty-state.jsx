import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Package, Users, ShoppingCart, FileText, Search, Inbox,
  FolderOpen, ClipboardList, Wallet, TrendingUp, AlertCircle,
  Plus, Upload, RefreshCw
} from "lucide-react";

// Ícones padrão para cada contexto
const contextIcons = {
  products: Package,
  customers: Users,
  sales: ShoppingCart,
  orders: ClipboardList,
  reports: FileText,
  search: Search,
  inbox: Inbox,
  files: FolderOpen,
  financial: Wallet,
  analytics: TrendingUp,
  error: AlertCircle,
  default: Inbox,
};

// Mensagens padrão para cada contexto
const contextMessages = {
  products: {
    title: "Nenhum produto cadastrado",
    description: "Comece cadastrando seus produtos para poder vender.",
    actionLabel: "Cadastrar Produto",
  },
  customers: {
    title: "Nenhum cliente cadastrado",
    description: "Cadastre seus clientes para acompanhar vendas e fidelidade.",
    actionLabel: "Cadastrar Cliente",
  },
  sales: {
    title: "Nenhuma venda encontrada",
    description: "Suas vendas aparecerão aqui. Que tal fazer a primeira?",
    actionLabel: "Ir para PDV",
  },
  orders: {
    title: "Nenhum pedido encontrado",
    description: "Os pedidos realizados aparecerão aqui.",
    actionLabel: null,
  },
  search: {
    title: "Nenhum resultado encontrado",
    description: "Tente buscar por outros termos ou ajuste os filtros.",
    actionLabel: "Limpar Filtros",
  },
  error: {
    title: "Erro ao carregar dados",
    description: "Não foi possível carregar os dados. Tente novamente.",
    actionLabel: "Tentar Novamente",
  },
  default: {
    title: "Nenhum dado encontrado",
    description: "Não há dados para exibir no momento.",
    actionLabel: null,
  },
};

export function EmptyState({
  // Contexto pré-definido (products, customers, sales, etc)
  context,
  // Ou personalizado
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  // Estilo
  className,
  size = "default", // "sm", "default", "lg"
  variant = "default", // "default", "card", "inline"
}) {
  // Obter configurações do contexto ou usar valores personalizados
  const contextConfig = context ? contextMessages[context] || contextMessages.default : contextMessages.default;
  const Icon = CustomIcon || (context ? contextIcons[context] : contextIcons.default) || Inbox;

  const displayTitle = title || contextConfig.title;
  const displayDescription = description || contextConfig.description;
  const displayActionLabel = actionLabel !== undefined ? actionLabel : contextConfig.actionLabel;

  // Determinar ícone da ação
  const displayActionIcon = ActionIcon || (
    displayActionLabel?.toLowerCase().includes('cadastrar') ? Plus :
    displayActionLabel?.toLowerCase().includes('importar') ? Upload :
    displayActionLabel?.toLowerCase().includes('tentar') ? RefreshCw :
    null
  );

  // Classes de tamanho
  const sizeClasses = {
    sm: {
      container: "p-4",
      icon: "w-10 h-10",
      iconInner: "w-5 h-5",
      title: "text-sm",
      description: "text-xs",
      button: "h-8 text-xs",
    },
    default: {
      container: "p-6 sm:p-8",
      icon: "w-14 h-14",
      iconInner: "w-6 h-6",
      title: "text-base",
      description: "text-sm",
      button: "h-9",
    },
    lg: {
      container: "p-8 sm:p-12",
      icon: "w-20 h-20",
      iconInner: "w-8 h-8",
      title: "text-lg",
      description: "text-base",
      button: "h-10",
    },
  };

  const sizes = sizeClasses[size] || sizeClasses.default;

  // Variante inline (para dentro de cards existentes)
  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-center text-center", sizes.container, className)}>
        <div className={cn("rounded-full bg-muted flex items-center justify-center mb-3", sizes.icon)}>
          <Icon className={cn("text-muted-foreground", sizes.iconInner)} />
        </div>
        <p className={cn("font-medium text-foreground mb-1", sizes.title)}>{displayTitle}</p>
        <p className={cn("text-muted-foreground mb-4 max-w-sm", sizes.description)}>{displayDescription}</p>
        {displayActionLabel && onAction && (
          <Button onClick={onAction} size="sm" className={sizes.button}>
            {displayActionIcon && <displayActionIcon className="w-4 h-4 mr-2" />}
            {displayActionLabel}
          </Button>
        )}
      </div>
    );
  }

  // Variante padrão (com card)
  return (
    <div className={cn(
      "rounded-xl border bg-card text-center",
      variant === "card" && "shadow-sm",
      sizes.container,
      className
    )}>
      <div className={cn("rounded-full bg-muted flex items-center justify-center mx-auto mb-4", sizes.icon)}>
        <Icon className={cn("text-muted-foreground", sizes.iconInner)} />
      </div>
      <h3 className={cn("font-semibold text-foreground mb-2", sizes.title)}>{displayTitle}</h3>
      <p className={cn("text-muted-foreground mb-6 max-w-md mx-auto", sizes.description)}>{displayDescription}</p>
      {displayActionLabel && onAction && (
        <Button onClick={onAction} className={sizes.button}>
          {displayActionIcon && <displayActionIcon className="w-4 h-4 mr-2" />}
          {displayActionLabel}
        </Button>
      )}
    </div>
  );
}

// Variantes pré-configuradas para uso rápido
export function EmptyProducts({ onAction, ...props }) {
  return <EmptyState context="products" onAction={onAction} {...props} />;
}

export function EmptyCustomers({ onAction, ...props }) {
  return <EmptyState context="customers" onAction={onAction} {...props} />;
}

export function EmptySales({ onAction, ...props }) {
  return <EmptyState context="sales" onAction={onAction} {...props} />;
}

export function EmptySearch({ onAction, ...props }) {
  return <EmptyState context="search" onAction={onAction} {...props} />;
}

export function EmptyError({ onAction, ...props }) {
  return <EmptyState context="error" onAction={onAction} {...props} />;
}

export default EmptyState;
