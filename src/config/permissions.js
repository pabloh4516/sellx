// ============================================================================
// SISTEMA DE PERMISSÕES E PERFIS DE ACESSO
// ============================================================================

// Definição dos perfis de usuário
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin', // Dono do SaaS
  OWNER: 'owner',             // Dono de uma organizacao/loja
  ADMIN: 'admin',
  MANAGER: 'gerente',
  SELLER: 'vendedor',
  CASHIER: 'caixa',
  STOCKIST: 'estoquista',
};

// Labels para exibição
export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.OWNER]: 'Proprietario',
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.MANAGER]: 'Gerente',
  [USER_ROLES.SELLER]: 'Vendedor',
  [USER_ROLES.CASHIER]: 'Operador de Caixa',
  [USER_ROLES.STOCKIST]: 'Estoquista',
};

// Descrições dos perfis
export const ROLE_DESCRIPTIONS = {
  [USER_ROLES.SUPER_ADMIN]: 'Dono do SaaS - acesso total a todas as organizacoes e configuracoes da plataforma',
  [USER_ROLES.OWNER]: 'Dono do sistema - acesso total incluindo faturamento e assinatura',
  [USER_ROLES.ADMIN]: 'Acesso total a todas as funcionalidades do sistema (exceto billing)',
  [USER_ROLES.MANAGER]: 'Acesso a vendas, estoque, relatorios e cadastros (sem configuracoes)',
  [USER_ROLES.SELLER]: 'Acesso ao PDV, consultas e cadastro de clientes',
  [USER_ROLES.CASHIER]: 'Acesso apenas ao PDV e operacoes de caixa',
  [USER_ROLES.STOCKIST]: 'Acesso apenas a gestao de estoque',
};

// Definição das permissões por módulo
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_MANAGER_VIEW: 'dashboard.manager.view',
  DASHBOARD_SELLER_VIEW: 'dashboard.seller.view',

  // PDV
  PDV_ACCESS: 'pdv.access',
  PDV_DISCOUNT: 'pdv.discount',
  PDV_CANCEL_ITEM: 'pdv.cancel_item',
  PDV_CANCEL_SALE: 'pdv.cancel_sale',

  // Caixa
  CASH_OPEN: 'cash.open',
  CASH_CLOSE: 'cash.close',
  CASH_WITHDRAW: 'cash.withdraw',
  CASH_SUPPLY: 'cash.supply',
  CASH_VIEW_ALL: 'cash.view_all',

  // Vendas
  SALES_VIEW: 'sales.view',
  SALES_VIEW_ALL: 'sales.view_all',
  SALES_CANCEL: 'sales.cancel',
  SALES_EXPORT: 'sales.export',

  // Produtos
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_EDIT_PRICE: 'products.edit_price',
  PRODUCTS_VIEW_COST: 'products.view_cost',

  // Clientes
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_VIEW_CREDIT: 'customers.view_credit',
  CUSTOMERS_EDIT_CREDIT: 'customers.edit_credit',

  // Fornecedores
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DELETE: 'suppliers.delete',

  // Estoque
  STOCK_VIEW: 'stock.view',
  STOCK_ADJUST: 'stock.adjust',
  STOCK_TRANSFER: 'stock.transfer',
  STOCK_INVENTORY: 'stock.inventory',

  // Compras
  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_EDIT: 'purchases.edit',

  // Financeiro
  FINANCIAL_VIEW: 'financial.view',
  FINANCIAL_PAYABLES: 'financial.payables',
  FINANCIAL_RECEIVABLES: 'financial.receivables',
  FINANCIAL_EXPENSES: 'financial.expenses',
  FINANCIAL_CASHFLOW: 'financial.cashflow',

  // Relatórios
  REPORTS_SALES: 'reports.sales',
  REPORTS_STOCK: 'reports.stock',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_COMMISSIONS: 'reports.commissions',

  // Configurações
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_USERS: 'settings.users',
  SETTINGS_COMPANY: 'settings.company',
  SETTINGS_SYSTEM: 'settings.system',
  AUDIT_LOG: 'settings.audit_log',

  // Outros
  SERVICE_ORDERS_VIEW: 'service_orders.view',
  SERVICE_ORDERS_CREATE: 'service_orders.create',
  QUOTES_VIEW: 'quotes.view',
  QUOTES_CREATE: 'quotes.create',
  PROMOTIONS_VIEW: 'promotions.view',
  PROMOTIONS_MANAGE: 'promotions.manage',
  LOYALTY_VIEW: 'loyalty.view',
  LOYALTY_MANAGE: 'loyalty.manage',

  // Billing (apenas Owner)
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',
  SUBSCRIPTION_VIEW: 'subscription.view',
  SUBSCRIPTION_MANAGE: 'subscription.manage',
  ORGANIZATION_MANAGE: 'organization.manage',
  INVITE_USERS: 'users.invite',

  // Super Admin (Dono do SaaS)
  SAAS_DASHBOARD: 'saas.dashboard',
  SAAS_ORGANIZATIONS: 'saas.organizations',
  SAAS_USERS: 'saas.users',
  SAAS_SUBSCRIPTIONS: 'saas.subscriptions',
  SAAS_FINANCIAL: 'saas.financial',
  SAAS_PLANS: 'saas.plans',
  SAAS_SETTINGS: 'saas.settings',
  SAAS_SUPPORT: 'saas.support',
};

// Mapeamento de permissões por perfil
export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // Super Admin tem TODAS as permissoes

  [USER_ROLES.OWNER]: Object.values(PERMISSIONS).filter(p =>
    !p.startsWith('saas.') // Owner nao tem acesso ao painel SaaS
  ),

  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS).filter(p =>
    !p.startsWith('billing.') && !p.startsWith('subscription.') && p !== 'organization.manage'
  ), // Admin tem todas exceto billing

  [USER_ROLES.MANAGER]: [
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_MANAGER_VIEW,
    // PDV
    PERMISSIONS.PDV_ACCESS,
    PERMISSIONS.PDV_DISCOUNT,
    PERMISSIONS.PDV_CANCEL_ITEM,
    PERMISSIONS.PDV_CANCEL_SALE,
    // Caixa
    PERMISSIONS.CASH_OPEN,
    PERMISSIONS.CASH_CLOSE,
    PERMISSIONS.CASH_WITHDRAW,
    PERMISSIONS.CASH_SUPPLY,
    PERMISSIONS.CASH_VIEW_ALL,
    // Vendas
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_VIEW_ALL,
    PERMISSIONS.SALES_CANCEL,
    PERMISSIONS.SALES_EXPORT,
    // Produtos
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_EDIT_PRICE,
    PERMISSIONS.PRODUCTS_VIEW_COST,
    // Clientes
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.CUSTOMERS_VIEW_CREDIT,
    PERMISSIONS.CUSTOMERS_EDIT_CREDIT,
    // Fornecedores
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_EDIT,
    // Estoque
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.STOCK_TRANSFER,
    PERMISSIONS.STOCK_INVENTORY,
    // Compras
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.PURCHASES_EDIT,
    // Financeiro
    PERMISSIONS.FINANCIAL_VIEW,
    PERMISSIONS.FINANCIAL_PAYABLES,
    PERMISSIONS.FINANCIAL_RECEIVABLES,
    PERMISSIONS.FINANCIAL_EXPENSES,
    PERMISSIONS.FINANCIAL_CASHFLOW,
    // Relatórios
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.REPORTS_STOCK,
    PERMISSIONS.REPORTS_FINANCIAL,
    PERMISSIONS.REPORTS_COMMISSIONS,
    // Outros
    PERMISSIONS.SERVICE_ORDERS_VIEW,
    PERMISSIONS.SERVICE_ORDERS_CREATE,
    PERMISSIONS.QUOTES_VIEW,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.PROMOTIONS_VIEW,
    PERMISSIONS.PROMOTIONS_MANAGE,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_MANAGE,
    // Configurações limitadas
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_COMPANY,
  ],

  [USER_ROLES.SELLER]: [
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.DASHBOARD_SELLER_VIEW,
    // PDV
    PERMISSIONS.PDV_ACCESS,
    PERMISSIONS.PDV_DISCOUNT,
    // Caixa (vendedor pode abrir/fechar)
    PERMISSIONS.CASH_OPEN,
    PERMISSIONS.CASH_CLOSE,
    // Vendas (apenas próprias)
    PERMISSIONS.SALES_VIEW,
    // Produtos (apenas consulta)
    PERMISSIONS.PRODUCTS_VIEW,
    // Clientes
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    // Estoque (apenas consulta)
    PERMISSIONS.STOCK_VIEW,
    // Orçamentos
    PERMISSIONS.QUOTES_VIEW,
    PERMISSIONS.QUOTES_CREATE,
    // Ordem de serviço
    PERMISSIONS.SERVICE_ORDERS_VIEW,
    PERMISSIONS.SERVICE_ORDERS_CREATE,
  ],

  [USER_ROLES.CASHIER]: [
    // PDV
    PERMISSIONS.PDV_ACCESS,
    // Caixa
    PERMISSIONS.CASH_OPEN,
    PERMISSIONS.CASH_CLOSE,
    PERMISSIONS.CASH_WITHDRAW,
    PERMISSIONS.CASH_SUPPLY,
    // Vendas (apenas visualizar)
    PERMISSIONS.SALES_VIEW,
    // Produtos (apenas consulta para PDV)
    PERMISSIONS.PRODUCTS_VIEW,
    // Clientes (apenas consulta)
    PERMISSIONS.CUSTOMERS_VIEW,
  ],

  [USER_ROLES.STOCKIST]: [
    // Dashboard
    PERMISSIONS.DASHBOARD_VIEW,
    // Produtos
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    // Estoque
    PERMISSIONS.STOCK_VIEW,
    PERMISSIONS.STOCK_ADJUST,
    PERMISSIONS.STOCK_TRANSFER,
    PERMISSIONS.STOCK_INVENTORY,
    // Compras
    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.PURCHASES_EDIT,
    // Fornecedores
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_EDIT,
    // Relatórios de estoque
    PERMISSIONS.REPORTS_STOCK,
  ],
};

// Função para verificar se um perfil tem uma permissão
export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

// Função para verificar se um perfil tem alguma das permissões
export const hasAnyPermission = (role, permissions = []) => {
  if (!role || !permissions.length) return false;
  return permissions.some(permission => hasPermission(role, permission));
};

// Função para verificar se um perfil tem todas as permissões
export const hasAllPermissions = (role, permissions = []) => {
  if (!role || !permissions.length) return false;
  return permissions.every(permission => hasPermission(role, permission));
};

// Mapeamento de páginas para permissões necessárias
export const PAGE_PERMISSIONS = {
  Dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  DashboardManager: [PERMISSIONS.DASHBOARD_MANAGER_VIEW],
  DashboardSeller: [PERMISSIONS.DASHBOARD_SELLER_VIEW],
  PDV: [PERMISSIONS.PDV_ACCESS],
  PDVMain: [PERMISSIONS.PDV_ACCESS],
  Sales: [PERMISSIONS.SALES_VIEW],
  Quotes: [PERMISSIONS.QUOTES_VIEW],
  Returns: [PERMISSIONS.SALES_VIEW],
  FutureOrders: [PERMISSIONS.SALES_VIEW],
  Products: [PERMISSIONS.PRODUCTS_VIEW],
  ProductGroups: [PERMISSIONS.PRODUCTS_VIEW],
  Customers: [PERMISSIONS.CUSTOMERS_VIEW],
  Suppliers: [PERMISSIONS.SUPPLIERS_VIEW],
  Sellers: [PERMISSIONS.SETTINGS_VIEW],
  PaymentMethods: [PERMISSIONS.SETTINGS_VIEW],
  Promotions: [PERMISSIONS.PROMOTIONS_VIEW],
  LoyaltyProgram: [PERMISSIONS.LOYALTY_VIEW],
  Stock: [PERMISSIONS.STOCK_VIEW],
  StockBatches: [PERMISSIONS.STOCK_VIEW],
  StockLocations: [PERMISSIONS.STOCK_VIEW],
  StockTransfers: [PERMISSIONS.STOCK_TRANSFER],
  StockAdjustments: [PERMISSIONS.STOCK_ADJUST],
  StockMovements: [PERMISSIONS.STOCK_VIEW],
  Inventory: [PERMISSIONS.STOCK_INVENTORY],
  Labels: [PERMISSIONS.PRODUCTS_VIEW],
  Purchases: [PERMISSIONS.PURCHASES_VIEW],
  ImportXML: [PERMISSIONS.PURCHASES_CREATE],
  ServiceOrders: [PERMISSIONS.SERVICE_ORDERS_VIEW],
  CashRegister: [PERMISSIONS.CASH_OPEN],
  CashFlow: [PERMISSIONS.FINANCIAL_CASHFLOW],
  Payables: [PERMISSIONS.FINANCIAL_PAYABLES],
  Receivables: [PERMISSIONS.FINANCIAL_RECEIVABLES],
  Expenses: [PERMISSIONS.FINANCIAL_EXPENSES],
  Checks: [PERMISSIONS.FINANCIAL_VIEW],
  BankAccounts: [PERMISSIONS.FINANCIAL_VIEW],
  ReportSales: [PERMISSIONS.REPORTS_SALES],
  ReportStock: [PERMISSIONS.REPORTS_STOCK],
  ReportFinancial: [PERMISSIONS.REPORTS_FINANCIAL],
  ReportCommissions: [PERMISSIONS.REPORTS_COMMISSIONS],
  ReportDRE: [PERMISSIONS.REPORTS_FINANCIAL],
  SearchProducts: [PERMISSIONS.PRODUCTS_VIEW],
  OverdueCustomers: [PERMISSIONS.CUSTOMERS_VIEW_CREDIT],
  Birthdays: [PERMISSIONS.CUSTOMERS_VIEW],
  Settings: [PERMISSIONS.SETTINGS_VIEW],
  CompanySettings: [PERMISSIONS.SETTINGS_COMPANY],
  AuditLog: [PERMISSIONS.AUDIT_LOG],
  Users: [PERMISSIONS.SETTINGS_USERS],
  Cancellations: [PERMISSIONS.SALES_VIEW_ALL], // Apenas quem pode ver todas as vendas
};

// Paginas de Billing (apenas Owner)
export const BILLING_PAGES = {
  Billing: [PERMISSIONS.BILLING_VIEW],
  Subscription: [PERMISSIONS.SUBSCRIPTION_VIEW],
  Organization: [PERMISSIONS.ORGANIZATION_MANAGE],
};

// Paginas do Super Admin (Painel SaaS)
export const SAAS_ADMIN_PAGES = {
  AdminDashboard: [PERMISSIONS.SAAS_DASHBOARD],
  AdminOrganizations: [PERMISSIONS.SAAS_ORGANIZATIONS],
  AdminUsers: [PERMISSIONS.SAAS_USERS],
  AdminSubscriptions: [PERMISSIONS.SAAS_SUBSCRIPTIONS],
  AdminFinancial: [PERMISSIONS.SAAS_FINANCIAL],
  AdminPlans: [PERMISSIONS.SAAS_PLANS],
  AdminSettings: [PERMISSIONS.SAAS_SETTINGS],
  AdminSupport: [PERMISSIONS.SAAS_SUPPORT],
};

// Adicionar paginas de billing ao PAGE_PERMISSIONS
Object.assign(PAGE_PERMISSIONS, BILLING_PAGES);
Object.assign(PAGE_PERMISSIONS, SAAS_ADMIN_PAGES);

// Funcao para verificar acesso a uma pagina
export const canAccessPage = (role, pageName) => {
  if (role === USER_ROLES.SUPER_ADMIN) return true; // Super Admin tem acesso total
  if (role === USER_ROLES.OWNER) {
    // Owner nao pode acessar paginas do SaaS Admin
    if (SAAS_ADMIN_PAGES[pageName]) return false;
    return true;
  }
  if (role === USER_ROLES.ADMIN) {
    // Admin nao pode acessar paginas de billing nem SaaS
    if (BILLING_PAGES[pageName] || SAAS_ADMIN_PAGES[pageName]) return false;
    return true;
  }
  const requiredPermissions = PAGE_PERMISSIONS[pageName];
  if (!requiredPermissions) return true; // Pagina sem restricao
  return hasAnyPermission(role, requiredPermissions);
};

// Funcao para verificar se e super admin
export const isSuperAdmin = (role) => {
  return role === USER_ROLES.SUPER_ADMIN;
};
