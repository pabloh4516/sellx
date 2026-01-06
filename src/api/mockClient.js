// ============================================================================
// MOCK CLIENT - Para testes visuais sem backend
// ============================================================================

// Dados mockados
const mockData = {
  products: [
    { id: '1', code: 'PROD001', barcode: '7891234567890', name: 'Camiseta Basica Preta', description: 'Camiseta 100% algodao', photo_url: '', group_id: '1', supplier_id: '1', unit: 'UN', cost_price: 25.00, sale_price: 49.90, stock_quantity: 150, min_stock: 20, is_active: true, created_date: '2024-01-15' },
    { id: '2', code: 'PROD002', barcode: '7891234567891', name: 'Calca Jeans Slim', description: 'Calca jeans masculina', photo_url: '', group_id: '1', supplier_id: '1', unit: 'UN', cost_price: 45.00, sale_price: 129.90, stock_quantity: 80, min_stock: 15, is_active: true, created_date: '2024-01-15' },
    { id: '3', code: 'PROD003', barcode: '7891234567892', name: 'Tenis Esportivo', description: 'Tenis para corrida', photo_url: '', group_id: '2', supplier_id: '2', unit: 'PAR', cost_price: 89.00, sale_price: 199.90, stock_quantity: 45, min_stock: 10, is_active: true, created_date: '2024-01-16' },
    { id: '4', code: 'PROD004', barcode: '7891234567893', name: 'Bone Aba Reta', description: 'Bone estilo snapback', photo_url: '', group_id: '3', supplier_id: '1', unit: 'UN', cost_price: 15.00, sale_price: 39.90, stock_quantity: 5, min_stock: 10, is_active: true, created_date: '2024-01-17' },
    { id: '5', code: 'PROD005', barcode: '7891234567894', name: 'Mochila Executiva', description: 'Mochila para notebook 15"', photo_url: '', group_id: '3', supplier_id: '2', unit: 'UN', cost_price: 55.00, sale_price: 149.90, stock_quantity: 25, min_stock: 5, is_active: true, created_date: '2024-01-18' },
    { id: '6', code: 'PROD006', barcode: '7891234567895', name: 'Relogio Digital', description: 'Relogio esportivo a prova d agua', photo_url: '', group_id: '3', supplier_id: '3', unit: 'UN', cost_price: 35.00, sale_price: 89.90, stock_quantity: 30, min_stock: 8, is_active: true, created_date: '2024-01-19' },
    { id: '7', code: 'PROD007', barcode: '7891234567896', name: 'Cinto de Couro', description: 'Cinto masculino couro legitimo', photo_url: '', group_id: '3', supplier_id: '1', unit: 'UN', cost_price: 22.00, sale_price: 59.90, stock_quantity: 40, min_stock: 10, is_active: true, created_date: '2024-01-20' },
    { id: '8', code: 'PROD008', barcode: '7891234567897', name: 'Oculos de Sol', description: 'Oculos com protecao UV', photo_url: '', group_id: '3', supplier_id: '3', unit: 'UN', cost_price: 28.00, sale_price: 79.90, stock_quantity: 3, min_stock: 5, is_active: true, created_date: '2024-01-21' },
  ],

  customers: [
    { id: '1', name: 'Joao Silva', cpf_cnpj: '123.456.789-00', phone: '(11) 99999-1234', email: 'joao@email.com', city: 'Sao Paulo', state: 'SP', credit_limit: 5000, used_credit: 1500, is_blocked: false, created_date: '2024-01-10' },
    { id: '2', name: 'Maria Santos', cpf_cnpj: '987.654.321-00', phone: '(11) 98888-5678', email: 'maria@email.com', city: 'Campinas', state: 'SP', credit_limit: 3000, used_credit: 0, is_blocked: false, created_date: '2024-01-11' },
    { id: '3', name: 'Pedro Oliveira', cpf_cnpj: '456.789.123-00', phone: '(11) 97777-9012', email: 'pedro@email.com', city: 'Santos', state: 'SP', credit_limit: 2000, used_credit: 2000, is_blocked: false, created_date: '2024-01-12' },
    { id: '4', name: 'Ana Costa', cpf_cnpj: '321.654.987-00', phone: '(11) 96666-3456', email: 'ana@email.com', city: 'Guarulhos', state: 'SP', credit_limit: 4000, used_credit: 500, is_blocked: false, created_date: '2024-01-13' },
    { id: '5', name: 'Carlos Ferreira', cpf_cnpj: '789.123.456-00', phone: '(11) 95555-7890', email: 'carlos@email.com', city: 'Osasco', state: 'SP', credit_limit: 1000, used_credit: 1200, is_blocked: true, created_date: '2024-01-14' },
    { id: '6', name: 'Empresa ABC Ltda', cpf_cnpj: '12.345.678/0001-90', phone: '(11) 3333-4444', email: 'contato@empresaabc.com', city: 'Sao Paulo', state: 'SP', credit_limit: 20000, used_credit: 5000, is_blocked: false, created_date: '2024-01-15' },
  ],

  productGroups: [
    { id: '1', name: 'Vestuario', parent_group_id: null },
    { id: '2', name: 'Calcados', parent_group_id: null },
    { id: '3', name: 'Acessorios', parent_group_id: null },
    { id: '4', name: 'Camisetas', parent_group_id: '1' },
    { id: '5', name: 'Calcas', parent_group_id: '1' },
  ],

  suppliers: [
    { id: '1', name: 'Fornecedor Nacional Ltda', cnpj: '11.222.333/0001-44', phone: '(11) 2222-3333', email: 'contato@fornecedor.com' },
    { id: '2', name: 'Distribuidora Central', cnpj: '44.555.666/0001-77', phone: '(11) 4444-5555', email: 'vendas@distribuidora.com' },
    { id: '3', name: 'Importadora Global', cnpj: '77.888.999/0001-00', phone: '(11) 6666-7777', email: 'compras@importadora.com' },
  ],

  sales: [
    { id: '1', sale_number: 1001, customer_id: '1', seller_id: '1', sale_date: '2024-01-20T10:30:00', total: 249.70, discount: 0, status: 'concluida', payment_method: 'credit_card', created_date: '2024-01-20' },
    { id: '2', sale_number: 1002, customer_id: '2', seller_id: '1', sale_date: '2024-01-20T14:15:00', total: 199.90, discount: 10, status: 'concluida', payment_method: 'pix', created_date: '2024-01-20' },
    { id: '3', sale_number: 1003, customer_id: '3', seller_id: '2', sale_date: '2024-01-21T09:00:00', total: 459.60, discount: 0, status: 'concluida', payment_method: 'cash', created_date: '2024-01-21' },
    { id: '4', sale_number: 1004, customer_id: '1', seller_id: '1', sale_date: '2024-01-21T16:45:00', total: 329.70, discount: 20, status: 'concluida', payment_method: 'debit_card', created_date: '2024-01-21' },
    { id: '5', sale_number: 1005, customer_id: '6', seller_id: '2', sale_date: new Date().toISOString(), total: 1589.40, discount: 50, status: 'concluida', payment_method: 'credit_card', created_date: new Date().toISOString().split('T')[0] },
    { id: '6', sale_number: 1006, customer_id: '4', seller_id: '1', sale_date: new Date().toISOString(), total: 289.70, discount: 0, status: 'concluida', payment_method: 'pix', created_date: new Date().toISOString().split('T')[0] },
    { id: '7', sale_number: 1007, customer_id: '2', seller_id: '1', sale_date: new Date().toISOString(), total: 149.90, discount: 0, status: 'concluida', payment_method: 'cash', created_date: new Date().toISOString().split('T')[0] },
  ],

  saleItems: [
    { id: '1', sale_id: '1', product_id: '1', quantity: 2, unit_price: 49.90, total: 99.80 },
    { id: '2', sale_id: '1', product_id: '3', quantity: 1, unit_price: 149.90, total: 149.90 },
  ],

  installments: [
    { id: '1', customer_id: '1', sale_id: '1', amount: 249.70, due_date: '2024-02-20', installment_number: 1, total_installments: 1, status: 'pago', paid_date: '2024-02-18' },
    { id: '2', customer_id: '3', sale_id: '3', amount: 153.20, due_date: '2024-02-21', installment_number: 1, total_installments: 3, status: 'pago', paid_date: '2024-02-21' },
    { id: '3', customer_id: '3', sale_id: '3', amount: 153.20, due_date: '2024-03-21', installment_number: 2, total_installments: 3, status: 'atrasado', paid_date: null },
    { id: '4', customer_id: '3', sale_id: '3', amount: 153.20, due_date: '2024-04-21', installment_number: 3, total_installments: 3, status: 'pendente', paid_date: null },
    { id: '5', customer_id: '5', sale_id: '4', amount: 329.70, due_date: '2024-01-30', installment_number: 1, total_installments: 1, status: 'atrasado', paid_date: null },
  ],

  cashRegisters: [
    { id: '1', status: 'aberto', opening_date: new Date().toISOString(), opening_balance: 500.00, current_balance: 2029.00, user_id: '1' }
  ],

  cashMovements: [
    { id: '1', cash_register_id: '1', type: 'entrada', amount: 500, description: 'Abertura de caixa', created_date: new Date().toISOString() },
    { id: '2', cash_register_id: '1', type: 'entrada', amount: 1529, description: 'Vendas do dia', created_date: new Date().toISOString() },
  ],

  expenses: [
    { id: '1', description: 'Aluguel', amount: 2500, due_date: '2024-02-05', status: 'pago', category: 'Fixas' },
    { id: '2', description: 'Energia Eletrica', amount: 450, due_date: '2024-02-10', status: 'pendente', category: 'Utilidades' },
    { id: '3', description: 'Internet', amount: 150, due_date: '2024-02-15', status: 'pendente', category: 'Utilidades' },
  ],

  sellers: [
    { id: '1', name: 'Vendedor 1', commission_percent: 5, is_active: true },
    { id: '2', name: 'Vendedor 2', commission_percent: 4, is_active: true },
  ],

  companies: [
    { id: '1', trade_name: 'Sellx', legal_name: 'Sellx Sistemas Ltda', cnpj: '12.345.678/0001-90', logo_url: '' }
  ],

  paymentMethods: [
    { id: '1', name: 'Dinheiro', type: 'cash', is_active: true, accepts_installments: false },
    { id: '2', name: 'Cartao de Credito', type: 'credit_card', is_active: true, accepts_installments: true, max_installments: 12 },
    { id: '3', name: 'Cartao de Debito', type: 'debit_card', is_active: true, accepts_installments: false },
    { id: '4', name: 'PIX', type: 'pix', is_active: true, accepts_installments: false },
    { id: '5', name: 'Crediario', type: 'store_credit', is_active: true, accepts_installments: true, max_installments: 6 },
  ],

  promotions: [
    { id: '1', name: 'Black Friday', discount_percent: 20, start_date: '2024-11-25', end_date: '2024-11-30', is_active: false },
    { id: '2', name: 'Natal', discount_percent: 15, start_date: '2024-12-01', end_date: '2024-12-25', is_active: false },
  ],

  loyaltyConfigs: [
    { id: '1', points_per_real: 1, min_points_redeem: 100, point_value: 0.10, is_active: true }
  ],

  loyaltyPrograms: [
    { id: '1', name: 'Programa Fidelidade', points_per_real: 1, min_points_redeem: 100, point_value: 0.10, is_active: true }
  ],

  users: [
    { id: '1', email: 'admin@teste.com', full_name: 'Administrador', role: 'admin', is_active: true, created_date: '2024-01-01' },
    { id: '2', email: 'gerente@teste.com', full_name: 'Maria Gerente', role: 'gerente', is_active: true, created_date: '2024-01-02' },
    { id: '3', email: 'vendedor@teste.com', full_name: 'Joao Vendedor', role: 'vendedor', is_active: true, created_date: '2024-01-05' },
    { id: '4', email: 'caixa@teste.com', full_name: 'Ana Caixa', role: 'caixa', is_active: true, created_date: '2024-01-06' },
    { id: '5', email: 'estoquista@teste.com', full_name: 'Pedro Estoque', role: 'estoquista', is_active: true, created_date: '2024-01-07' },
  ],

  loyaltyTransactions: [
    { id: '1', customer_id: '1', points: 250, type: 'earned', sale_id: '1', created_date: '2024-01-20' },
    { id: '2', customer_id: '2', points: 200, type: 'earned', sale_id: '2', created_date: '2024-01-20' },
  ],

  futureOrders: [],

  quotes: [
    { id: '1', quote_number: 1, customer_id: '1', total: 599.70, status: 'pendente', valid_until: '2024-02-15', created_date: '2024-01-20' },
  ],

  returns: [],

  serviceOrders: [
    { id: '1', order_number: 1, customer_id: '1', description: 'Conserto de relogio', status: 'em_andamento', total: 150, created_date: '2024-01-22' },
  ],

  purchases: [
    { id: '1', supplier_id: '1', total: 5000, status: 'recebida', purchase_date: '2024-01-10', created_date: '2024-01-10' },
  ],

  stockMovements: [
    { id: '1', product_id: '1', quantity: 100, type: 'entrada', reason: 'Compra', created_date: '2024-01-10' },
    { id: '2', product_id: '1', quantity: -5, type: 'saida', reason: 'Venda', created_date: '2024-01-20' },
  ],

  stockLocations: [
    { id: '1', name: 'Loja Principal', address: 'Rua Principal, 100', is_active: true },
    { id: '2', name: 'Deposito', address: 'Rua Secundaria, 200', is_active: true },
  ],

  stockBatches: [
    { id: '1', product_id: '1', batch_number: 'LOTE001', quantity: 100, expiry_date: '2025-12-31', created_date: '2024-01-10' },
  ],

  stockTransfers: [],

  stockAdjustments: [
    { id: '1', product_id: '1', quantity: -2, reason: 'Avaria', created_date: '2024-01-15' },
  ],

  bankAccounts: [
    { id: '1', name: 'Conta Corrente Banco X', bank: 'Banco X', agency: '1234', account: '56789-0', balance: 15000, is_active: true },
    { id: '2', name: 'Conta Poupanca', bank: 'Banco Y', agency: '4321', account: '98765-1', balance: 5000, is_active: true },
  ],

  checks: [
    { id: '1', customer_id: '1', amount: 500, due_date: '2024-02-15', status: 'pendente', bank: 'Banco X', check_number: '000123' },
  ],

  payables: [
    { id: '1', supplier_id: '1', description: 'Compra de mercadorias', amount: 5000, due_date: '2024-02-10', status: 'pendente' },
  ],

  receivables: [
    { id: '1', customer_id: '3', description: 'Venda parcelada', amount: 306.40, due_date: '2024-03-21', status: 'pendente' },
  ],

  settings: [
    { id: '1', key: 'store_name', value: 'Sellx' },
    { id: '2', key: 'print_receipt', value: 'true' },
  ],

  themeSettings: [
    { id: '1', theme: 'system', primaryColor: '#3b82f6', borderRadius: 8, fontSize: 'medium', sidebarStyle: 'default', compactMode: false, showAnimations: true }
  ],

  sellerGoals: [],
  commissionPayments: [],
};

// Mock user
const mockUser = {
  id: '1',
  email: 'admin@teste.com',
  full_name: 'Administrador',
  role: 'owner'
};

// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createEntityMethods = (entityData = []) => ({
  list: async (orderBy) => {
    await delay(100);
    let data = [...entityData];
    if (orderBy && typeof orderBy === 'string' && orderBy.startsWith('-')) {
      const field = orderBy.substring(1);
      data.sort((a, b) => new Date(b[field] || 0) - new Date(a[field] || 0));
    }
    return data;
  },
  filter: async (filters = {}) => {
    await delay(100);
    return entityData.filter(item => {
      return Object.entries(filters).every(([key, value]) => item[key] === value);
    });
  },
  get: async (id) => {
    await delay(50);
    return entityData.find(item => item.id === id);
  },
  create: async (data) => {
    await delay(100);
    const newItem = { ...data, id: String(Date.now()), created_date: new Date().toISOString() };
    entityData.push(newItem);
    return newItem;
  },
  update: async (id, data) => {
    await delay(100);
    const index = entityData.findIndex(item => item.id === id);
    if (index !== -1) {
      entityData[index] = { ...entityData[index], ...data };
      return entityData[index];
    }
    throw new Error('Item not found');
  },
  delete: async (id) => {
    await delay(100);
    const index = entityData.findIndex(item => item.id === id);
    if (index !== -1) {
      entityData.splice(index, 1);
      return true;
    }
    throw new Error('Item not found');
  },
  count: async () => {
    await delay(50);
    return entityData.length;
  },
  upsert: async (data) => {
    await delay(100);
    const index = entityData.findIndex(item => item.id === data.id);
    if (index !== -1) {
      entityData[index] = { ...entityData[index], ...data };
      return entityData[index];
    }
    const newItem = { ...data, id: data.id || String(Date.now()), created_date: new Date().toISOString() };
    entityData.push(newItem);
    return newItem;
  },
});

// Mock base44 client
export const mockClient = {
  auth: {
    me: async () => {
      await delay(50);
      return mockUser;
    },
    logout: () => {
      console.log('Mock logout');
    },
    login: async () => {
      await delay(200);
      return mockUser;
    },
    signUp: async () => {
      await delay(200);
      return { user: mockUser };
    },
    resetPassword: async () => {
      await delay(200);
      return true;
    },
    updatePassword: async () => {
      await delay(200);
      return true;
    },
    getSession: async () => {
      return { user: mockUser };
    },
    onAuthStateChange: (callback) => {
      // Mock - nao faz nada
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  entities: {
    Product: createEntityMethods(mockData.products),
    Customer: createEntityMethods(mockData.customers),
    ProductGroup: createEntityMethods(mockData.productGroups),
    Supplier: createEntityMethods(mockData.suppliers),
    Sale: createEntityMethods(mockData.sales),
    SaleItem: createEntityMethods(mockData.saleItems),
    Installment: createEntityMethods(mockData.installments),
    CashRegister: createEntityMethods(mockData.cashRegisters),
    CashMovement: createEntityMethods(mockData.cashMovements),
    Expense: createEntityMethods(mockData.expenses),
    Seller: createEntityMethods(mockData.sellers),
    Company: createEntityMethods(mockData.companies),
    PaymentMethod: createEntityMethods(mockData.paymentMethods),
    Promotion: createEntityMethods(mockData.promotions),
    LoyaltyConfig: createEntityMethods(mockData.loyaltyConfigs),
    LoyaltyProgram: createEntityMethods(mockData.loyaltyPrograms),
    LoyaltyTransaction: createEntityMethods(mockData.loyaltyTransactions),
    User: createEntityMethods(mockData.users),
    FutureOrder: createEntityMethods(mockData.futureOrders),
    Quote: createEntityMethods(mockData.quotes),
    Return: createEntityMethods(mockData.returns),
    ServiceOrder: createEntityMethods(mockData.serviceOrders),
    Purchase: createEntityMethods(mockData.purchases),
    StockMovement: createEntityMethods(mockData.stockMovements),
    StockLocation: createEntityMethods(mockData.stockLocations),
    StockBatch: createEntityMethods(mockData.stockBatches),
    StockTransfer: createEntityMethods(mockData.stockTransfers),
    StockAdjustment: createEntityMethods(mockData.stockAdjustments),
    BankAccount: createEntityMethods(mockData.bankAccounts),
    Check: createEntityMethods(mockData.checks),
    Payable: createEntityMethods(mockData.payables),
    Receivable: createEntityMethods(mockData.receivables),
    Setting: createEntityMethods(mockData.settings),
    ThemeSettings: createEntityMethods(mockData.themeSettings),
    SellerGoal: createEntityMethods(mockData.sellerGoals),
    CommissionPayment: createEntityMethods(mockData.commissionPayments),
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        await delay(200);
        return { file_url: URL.createObjectURL(file) };
      }
    }
  },
  isConfigured: () => false,
};

export default mockClient;
