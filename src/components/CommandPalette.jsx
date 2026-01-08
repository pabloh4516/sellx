import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, DollarSign,
  FileText, Settings, ClipboardList, BarChart3, Search, Wrench, CreditCard,
  Receipt, TrendingUp, Wallet, PiggyBank, FileCheck, Tag, UserCircle, Warehouse,
  Shield, ShieldCheck, Palette, Ban, Building2, RotateCcw, Command
} from 'lucide-react';

// Mapa de ícones por nome
const iconMap = {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, DollarSign,
  FileText, Settings, ClipboardList, BarChart3, Search, Wrench, CreditCard,
  Receipt, TrendingUp, Wallet, PiggyBank, FileCheck, Tag, UserCircle, Warehouse,
  Shield, ShieldCheck, Palette, Ban, Building2, RotateCcw
};

// Todas as páginas do sistema com keywords para busca
const allPages = [
  // OPERACIONAL
  { name: 'Dashboard', page: 'Dashboard', icon: 'LayoutDashboard', category: 'Operacional', keywords: ['inicio', 'home', 'painel', 'resumo'] },
  { name: 'PDV - Ponto de Venda', page: 'PDV', icon: 'ShoppingCart', category: 'Operacional', keywords: ['vender', 'venda', 'caixa', 'balcao', 'frente'] },
  { name: 'Caixa', page: 'CashRegister', icon: 'DollarSign', category: 'Operacional', keywords: ['abrir', 'fechar', 'sangria', 'suprimento', 'gaveta'] },
  { name: 'Ordem de Serviço', page: 'ServiceOrders', icon: 'Wrench', category: 'Operacional', keywords: ['os', 'servico', 'manutencao', 'reparo', 'conserto'] },

  // COMERCIAL
  { name: 'Histórico de Vendas', page: 'Sales', icon: 'ClipboardList', category: 'Comercial', keywords: ['vendas', 'historico', 'cupom', 'nota'] },
  { name: 'Orçamentos', page: 'Quotes', icon: 'FileCheck', category: 'Comercial', keywords: ['orcamento', 'proposta', 'cotacao'] },
  { name: 'Pedidos Futuros', page: 'FutureOrders', icon: 'ClipboardList', category: 'Comercial', keywords: ['encomenda', 'reserva', 'agendado'] },
  { name: 'Devoluções', page: 'Returns', icon: 'RotateCcw', category: 'Comercial', keywords: ['devolucao', 'troca', 'retorno'] },
  { name: 'Cancelamentos', page: 'Cancellations', icon: 'Ban', category: 'Comercial', keywords: ['cancelar', 'estorno', 'anular'] },
  { name: 'Registro de Compras', page: 'Purchases', icon: 'FileText', category: 'Comercial', keywords: ['compra', 'entrada', 'nfe'] },
  { name: 'Importar XML', page: 'ImportXML', icon: 'FileCheck', category: 'Comercial', keywords: ['xml', 'nfe', 'importar', 'nota'] },
  { name: 'Promoções', page: 'Promotions', icon: 'Tag', category: 'Comercial', keywords: ['promocao', 'desconto', 'oferta', 'campanha'] },
  { name: 'Fidelidade', page: 'LoyaltyProgram', icon: 'TrendingUp', category: 'Comercial', keywords: ['pontos', 'fidelidade', 'cashback', 'programa'] },

  // CADASTROS
  { name: 'Clientes', page: 'Customers', icon: 'Users', category: 'Cadastros', keywords: ['cliente', 'consumidor', 'pessoa', 'cpf', 'cnpj'] },
  { name: 'Fornecedores', page: 'Suppliers', icon: 'Truck', category: 'Cadastros', keywords: ['fornecedor', 'distribuidor', 'fabricante'] },
  { name: 'Produtos', page: 'Products', icon: 'Package', category: 'Cadastros', keywords: ['produto', 'item', 'mercadoria', 'codigo', 'barras'] },
  { name: 'Grupos/Categorias', page: 'ProductGroups', icon: 'Tag', category: 'Cadastros', keywords: ['grupo', 'categoria', 'departamento', 'secao'] },
  { name: 'Vendedores', page: 'Sellers', icon: 'UserCircle', category: 'Cadastros', keywords: ['vendedor', 'atendente', 'funcionario', 'comissao'] },

  // ESTOQUE
  { name: 'Controle de Estoque', page: 'Stock', icon: 'Package', category: 'Estoque', keywords: ['estoque', 'quantidade', 'saldo'] },
  { name: 'Lotes e Validade', page: 'StockBatches', icon: 'Package', category: 'Estoque', keywords: ['lote', 'validade', 'vencimento', 'perecivel'] },
  { name: 'Locais/Filiais', page: 'StockLocations', icon: 'Building2', category: 'Estoque', keywords: ['local', 'filial', 'deposito', 'armazem'] },
  { name: 'Transferências', page: 'StockTransfers', icon: 'Truck', category: 'Estoque', keywords: ['transferencia', 'mover', 'enviar'] },
  { name: 'Ajustes de Estoque', page: 'StockAdjustments', icon: 'FileText', category: 'Estoque', keywords: ['ajuste', 'correcao', 'acerto'] },
  { name: 'Movimentações', page: 'StockMovements', icon: 'TrendingUp', category: 'Estoque', keywords: ['movimento', 'entrada', 'saida'] },
  { name: 'Inventário', page: 'Inventory', icon: 'ClipboardList', category: 'Estoque', keywords: ['inventario', 'contagem', 'balanco'] },
  { name: 'Etiquetas', page: 'Labels', icon: 'Tag', category: 'Estoque', keywords: ['etiqueta', 'codigo', 'barras', 'imprimir'] },

  // FINANCEIRO
  { name: 'Análise de Caixa', page: 'CashAnalysis', icon: 'BarChart3', category: 'Financeiro', keywords: ['analise', 'caixa', 'movimento'] },
  { name: 'Fluxo de Caixa', page: 'CashFlow', icon: 'TrendingUp', category: 'Financeiro', keywords: ['fluxo', 'previsao', 'projecao'] },
  { name: 'Contas a Pagar', page: 'Payables', icon: 'FileText', category: 'Financeiro', keywords: ['pagar', 'despesa', 'conta', 'boleto', 'fornecedor'] },
  { name: 'Contas a Receber', page: 'Receivables', icon: 'Receipt', category: 'Financeiro', keywords: ['receber', 'credito', 'parcela', 'cliente'] },
  { name: 'Despesas', page: 'Expenses', icon: 'PiggyBank', category: 'Financeiro', keywords: ['despesa', 'gasto', 'custo'] },
  { name: 'Cheques', page: 'Checks', icon: 'CreditCard', category: 'Financeiro', keywords: ['cheque', 'compensar', 'devolvido'] },
  { name: 'Contas Bancárias', page: 'BankAccounts', icon: 'Building2', category: 'Financeiro', keywords: ['banco', 'conta', 'extrato', 'saldo'] },

  // RELATÓRIOS
  { name: 'Central de Relatórios', page: 'Reports', icon: 'FileText', category: 'Relatórios', keywords: ['relatorio', 'exportar', 'imprimir'] },
  { name: 'Dashboard Gerencial', page: 'DashboardManager', icon: 'BarChart3', category: 'Relatórios', keywords: ['gerencial', 'gestor', 'indicador', 'kpi'] },
  { name: 'Dashboard Vendedor', page: 'DashboardSeller', icon: 'TrendingUp', category: 'Relatórios', keywords: ['vendedor', 'meta', 'comissao'] },
  { name: 'Relatório de Vendas', page: 'ReportSales', icon: 'Receipt', category: 'Relatórios', keywords: ['vendas', 'faturamento', 'receita'] },
  { name: 'Relatório de Estoque', page: 'ReportStock', icon: 'Package', category: 'Relatórios', keywords: ['estoque', 'posicao', 'curva'] },
  { name: 'Relatório Financeiro', page: 'ReportFinancial', icon: 'DollarSign', category: 'Relatórios', keywords: ['financeiro', 'lucro', 'resultado'] },
  { name: 'Relatório de Comissões', page: 'ReportCommissions', icon: 'TrendingUp', category: 'Relatórios', keywords: ['comissao', 'vendedor', 'pagamento'] },
  { name: 'DRE', page: 'ReportDRE', icon: 'BarChart3', category: 'Relatórios', keywords: ['dre', 'demonstrativo', 'resultado', 'lucro'] },
  { name: 'Consulta de Produtos', page: 'SearchProducts', icon: 'Package', category: 'Relatórios', keywords: ['buscar', 'produto', 'preco'] },
  { name: 'Clientes em Atraso', page: 'OverdueCustomers', icon: 'Users', category: 'Relatórios', keywords: ['atraso', 'inadimplente', 'devedor'] },
  { name: 'Aniversariantes', page: 'Birthdays', icon: 'Users', category: 'Relatórios', keywords: ['aniversario', 'data', 'nascimento'] },

  // CONFIGURAÇÕES
  { name: 'Configurações da Empresa', page: 'CompanySettings', icon: 'Building2', category: 'Configurações', keywords: ['empresa', 'loja', 'cnpj', 'endereco', 'logo'] },
  { name: 'Configurações Gerais', page: 'Settings', icon: 'Settings', category: 'Configurações', keywords: ['configuracao', 'opcao', 'sistema', 'geral'] },
  { name: 'Usuários', page: 'Users', icon: 'Users', category: 'Configurações', keywords: ['usuario', 'acesso', 'senha', 'permissao', 'login'] },
  { name: 'Formas de Pagamento', page: 'PaymentMethods', icon: 'CreditCard', category: 'Configurações', keywords: ['pagamento', 'cartao', 'dinheiro', 'pix', 'forma'] },
  { name: 'Personalização', page: 'ThemeSettings', icon: 'Palette', category: 'Configurações', keywords: ['tema', 'cor', 'aparencia', 'visual', 'personalizar'] },
  { name: 'Importar Dados', page: 'DataImport', icon: 'FileText', category: 'Configurações', keywords: ['importar', 'csv', 'excel', 'migrar', 'dados'] },
  { name: 'Backup/Restaurar', page: 'BackupRestore', icon: 'Shield', category: 'Configurações', keywords: ['backup', 'restaurar', 'copia', 'seguranca'] },
  { name: 'Log de Auditoria', page: 'AuditLog', icon: 'ShieldCheck', category: 'Configurações', keywords: ['log', 'auditoria', 'historico', 'alteracao'] },
  { name: 'Faturamento', page: 'Billing', icon: 'CreditCard', category: 'Configurações', keywords: ['plano', 'assinatura', 'pagamento', 'fatura'], ownerOnly: true },
];

// Ordem das categorias
const categoryOrder = ['Operacional', 'Comercial', 'Cadastros', 'Estoque', 'Financeiro', 'Relatórios', 'Configurações'];

export function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate();
  const { canAccess, isOwner } = useAuth();
  const userIsOwner = isOwner();

  // Filtrar páginas baseado em permissões
  const filteredPages = useMemo(() => {
    return allPages.filter(page => {
      if (page.ownerOnly && !userIsOwner) return false;
      return canAccess(page.page);
    });
  }, [canAccess, userIsOwner]);

  // Agrupar por categoria
  const groupedPages = useMemo(() => {
    const groups = {};
    categoryOrder.forEach(cat => {
      const pages = filteredPages.filter(p => p.category === cat);
      if (pages.length > 0) {
        groups[cat] = pages;
      }
    });
    return groups;
  }, [filteredPages]);

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === 'F3') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const handleSelect = (page) => {
    setOpen(false);
    navigate(createPageUrl(page));
  };

  const getIcon = (iconName) => {
    const Icon = iconMap[iconName] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar página, função ou configuração..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <Search className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Tente buscar por outra palavra-chave</p>
          </div>
        </CommandEmpty>

        {Object.entries(groupedPages).map(([category, pages], idx) => (
          <React.Fragment key={category}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={category}>
              {pages.map((item) => (
                <CommandItem
                  key={item.page}
                  value={`${item.name} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.page)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      {getIcon(item.icon)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>

      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
            navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
            selecionar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
            fechar
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Command className="w-3 h-3" />
          <span>Ctrl+K</span>
        </div>
      </div>
    </CommandDialog>
  );
}

export default CommandPalette;
