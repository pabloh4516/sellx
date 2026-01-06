import { base44 } from './base44Client';

// ============================================================================
// ENTIDADES COM TABELAS SQL CORRESPONDENTES
// ============================================================================

export const Company = base44.entities.Company;

export const Customer = base44.entities.Customer;

export const Supplier = base44.entities.Supplier;

export const ProductGroup = base44.entities.ProductGroup;

export const Product = base44.entities.Product;

// NOTA: ProductVariation nao tem tabela SQL - comentado para evitar erros
// export const ProductVariation = base44.entities.ProductVariation;

export const Seller = base44.entities.Seller;

export const PaymentMethod = base44.entities.PaymentMethod;

export const Sale = base44.entities.Sale;

export const SaleItem = base44.entities.SaleItem;

export const Installment = base44.entities.Installment;

export const CashRegister = base44.entities.CashRegister;

export const CashMovement = base44.entities.CashMovement;

export const Expense = base44.entities.Expense;

export const Payable = base44.entities.Payable;

export const Purchase = base44.entities.Purchase;

export const PurchaseItem = base44.entities.PurchaseItem;

export const StockMovement = base44.entities.StockMovement;

export const ServiceOrder = base44.entities.ServiceOrder;

export const BankAccount = base44.entities.BankAccount;

// NOTA: BankTransaction nao tem tabela SQL - comentado para evitar erros
// export const BankTransaction = base44.entities.BankTransaction;

export const Check = base44.entities.Check;

// NOTA: StoreCredit nao tem tabela SQL - comentado para evitar erros
// export const StoreCredit = base44.entities.StoreCredit;

export const LoyaltyProgram = base44.entities.LoyaltyProgram;

export const LoyaltyTransaction = base44.entities.LoyaltyTransaction;

export const CustomerPoints = base44.entities.CustomerPoints;

export const Promotion = base44.entities.Promotion;

export const FutureOrder = base44.entities.FutureOrder;

export const Quote = base44.entities.Quote;

export const QuoteItem = base44.entities.QuoteItem;

export const Return = base44.entities.Return;

export const ReturnItem = base44.entities.ReturnItem;

export const StockBatch = base44.entities.StockBatch;

export const StockLocation = base44.entities.StockLocation;

export const StockTransfer = base44.entities.StockTransfer;

export const StockAdjustment = base44.entities.StockAdjustment;

export const AuditLog = base44.entities.AuditLog;

export const Setting = base44.entities.Setting;

export const Plan = base44.entities.Plan;

export const Subscription = base44.entities.Subscription;

export const Invitation = base44.entities.Invitation;

export const SellerGoal = base44.entities.SellerGoal;

export const CommissionPayment = base44.entities.CommissionPayment;

// auth sdk:
export const User = base44.auth;