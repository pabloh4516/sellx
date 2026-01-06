import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OperatorProvider, useOperator } from '@/contexts/OperatorContext';
import { PWAProvider } from '@/contexts/PWAContext';
import { USER_ROLES } from '@/config/permissions';
import { InstallAppFab } from '@/components/pwa';
import CashWarningModal from '@/components/CashWarningModal';

// Landing Page
import LandingPage from "./LandingPage";

// Auth Pages
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import OperatorSelect from "./OperatorSelect";

// App Layout
import Layout from "./Layout.jsx";

// Admin Pages
import {
  AdminLayout,
  AdminDashboard,
  AdminOrganizations,
  AdminUsers,
  AdminSubscriptions,
  AdminFinancial,
  AdminPlans,
  AdminSettings,
} from "./admin";

// Pages
import BankAccounts from "./BankAccounts";
import Birthdays from "./Birthdays";
import CashFlow from "./CashFlow";
import CashRegister from "./CashRegister";
import Checks from "./Checks";
import CompanySettings from "./CompanySettings";
import Customers from "./Customers";
import Dashboard from "./Dashboard";
import DashboardManager from "./DashboardManager";
import DashboardSeller from "./DashboardSeller";
import Expenses from "./Expenses";
import FutureOrders from "./FutureOrders";
import ImportXML from "./ImportXML";
import Inventory from "./Inventory";
import Labels from "./Labels";
import LoyaltyProgram from "./LoyaltyProgram";
import OverdueCustomers from "./OverdueCustomers";
import PDV from "./PDV";
import PDVQuick from "./PDVQuick";
import PDVMain from "./PDVMain";
import Payables from "./Payables";
import PaymentMethods from "./PaymentMethods";
import ProductGroups from "./ProductGroups";
import Products from "./Products";
import Promotions from "./Promotions";
import Purchases from "./Purchases";
import Quotes from "./Quotes";
import Receivables from "./Receivables";
import ReportCommissions from "./ReportCommissions";
import ReportDRE from "./ReportDRE";
import ReportFinancial from "./ReportFinancial";
import ReportSales from "./ReportSales";
import ReportStock from "./ReportStock";
import Returns from "./Returns";
import Sales from "./Sales";
import SearchProducts from "./SearchProducts";
import Sellers from "./Sellers";
import ServiceOrders from "./ServiceOrders";
import Settings from "./Settings";
import Stock from "./Stock";
import StockMovements from "./StockMovements";
import Suppliers from "./Suppliers";
import StockLocations from "./StockLocations";
import StockBatches from "./StockBatches";
import StockTransfers from "./StockTransfers";
import StockAdjustments from "./StockAdjustments";
import AuditLog from "./AuditLog";
import Users from "./Users";
import Reports from "./Reports";
import DataImport from "./DataImport";
import BackupRestore from "./BackupRestore";
import ThemeSettings from "./ThemeSettings";
import Billing from "./Billing";
import Cancellations from "./Cancellations";

const PAGES = {
  BankAccounts,
  Birthdays,
  CashFlow,
  CashRegister,
  Checks,
  CompanySettings,
  Customers,
  Dashboard,
  DashboardManager,
  DashboardSeller,
  Expenses,
  FutureOrders,
  ImportXML,
  Inventory,
  Labels,
  LoyaltyProgram,
  OverdueCustomers,
  PDV: PDVMain,
  PDVQuick: PDVMain,
  Payables,
  PaymentMethods,
  ProductGroups,
  Products,
  Promotions,
  Purchases,
  Quotes,
  Receivables,
  ReportCommissions,
  ReportDRE,
  ReportFinancial,
  ReportSales,
  ReportStock,
  Reports,
  DataImport,
  BackupRestore,
  ThemeSettings,
  Returns,
  Sales,
  SearchProducts,
  Sellers,
  ServiceOrders,
  Settings,
  Stock,
  StockMovements,
  Suppliers,
  StockLocations,
  StockBatches,
  StockTransfers,
  StockAdjustments,
  AuditLog,
  Users,
  Billing,
  Cancellations,
};

function _getCurrentPage(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }

  const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
  return pageName || 'Dashboard';
}

// Componente de rota protegida
function ProtectedRoute({ children }) {
  const { user, loading, isUsingSupabase } = useAuth();
  const { operator, operatorLoading, showOperatorSelect } = useOperator();

  // Se nao esta usando Supabase (modo mock), permite acesso
  if (!isUsingSupabase) {
    return children;
  }

  // Se esta carregando auth ou operador, mostra loading
  if (loading || operatorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se nao esta autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se nao tem operador selecionado, mostra tela de selecao
  if (!operator || showOperatorSelect) {
    return <OperatorSelect />;
  }

  return children;
}

// Componente de rota publica (redireciona se ja estiver logado)
function PublicRoute({ children }) {
  const { user, loading, isUsingSupabase } = useAuth();

  // Se nao esta usando Supabase, permite acesso normal
  if (!isUsingSupabase) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se ja esta autenticado, redireciona para dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Componente de rota protegida para Super Admin
function SuperAdminRoute({ children }) {
  const { user, loading, isUsingSupabase } = useAuth();

  // Se nao esta usando Supabase (modo mock), permite acesso
  if (!isUsingSupabase) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se nao esta autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se nao e super admin, redireciona para dashboard
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Conteudo principal do app (autenticado)
function AppContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/BankAccounts" element={<BankAccounts />} />
        <Route path="/Birthdays" element={<Birthdays />} />
        <Route path="/CashFlow" element={<CashFlow />} />
        <Route path="/CashRegister" element={<CashRegister />} />
        <Route path="/Checks" element={<Checks />} />
        <Route path="/CompanySettings" element={<CompanySettings />} />
        <Route path="/Customers" element={<Customers />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/DashboardManager" element={<DashboardManager />} />
        <Route path="/DashboardSeller" element={<DashboardSeller />} />
        <Route path="/Expenses" element={<Expenses />} />
        <Route path="/FutureOrders" element={<FutureOrders />} />
        <Route path="/ImportXML" element={<ImportXML />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Labels" element={<Labels />} />
        <Route path="/LoyaltyProgram" element={<LoyaltyProgram />} />
        <Route path="/OverdueCustomers" element={<OverdueCustomers />} />
        <Route path="/PDV" element={<PDVMain />} />
        <Route path="/PDVQuick" element={<PDVMain />} />
        <Route path="/Payables" element={<Payables />} />
        <Route path="/PaymentMethods" element={<PaymentMethods />} />
        <Route path="/ProductGroups" element={<ProductGroups />} />
        <Route path="/Products" element={<Products />} />
        <Route path="/Promotions" element={<Promotions />} />
        <Route path="/Purchases" element={<Purchases />} />
        <Route path="/Quotes" element={<Quotes />} />
        <Route path="/Receivables" element={<Receivables />} />
        <Route path="/ReportCommissions" element={<ReportCommissions />} />
        <Route path="/ReportDRE" element={<ReportDRE />} />
        <Route path="/ReportFinancial" element={<ReportFinancial />} />
        <Route path="/ReportSales" element={<ReportSales />} />
        <Route path="/ReportStock" element={<ReportStock />} />
        <Route path="/Returns" element={<Returns />} />
        <Route path="/Sales" element={<Sales />} />
        <Route path="/SearchProducts" element={<SearchProducts />} />
        <Route path="/Sellers" element={<Sellers />} />
        <Route path="/ServiceOrders" element={<ServiceOrders />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/Stock" element={<Stock />} />
        <Route path="/StockMovements" element={<StockMovements />} />
        <Route path="/Suppliers" element={<Suppliers />} />
        <Route path="/StockLocations" element={<StockLocations />} />
        <Route path="/StockBatches" element={<StockBatches />} />
        <Route path="/StockTransfers" element={<StockTransfers />} />
        <Route path="/StockAdjustments" element={<StockAdjustments />} />
        <Route path="/AuditLog" element={<AuditLog />} />
        <Route path="/Users" element={<Users />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/DataImport" element={<DataImport />} />
        <Route path="/BackupRestore" element={<BackupRestore />} />
        <Route path="/ThemeSettings" element={<ThemeSettings />} />
        <Route path="/Billing" element={<Billing />} />
        <Route path="/Cancellations" element={<Cancellations />} />
      </Routes>
    </Layout>
  );
}

// Componente para Landing Page (mostra landing se nao logado, redireciona se logado)
function LandingRoute() {
  const { user, loading, isUsingSupabase } = useAuth();

  // Se nao esta usando Supabase (modo mock), mostra dashboard direto
  if (!isUsingSupabase) {
    return <Navigate to="/Dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se ja esta autenticado, redireciona para dashboard
  if (user) {
    return <Navigate to="/Dashboard" replace />;
  }

  // Se nao esta autenticado, mostra landing page
  return <LandingPage />;
}

// Router principal
function AppRouter() {
  return (
    <Routes>
      {/* Landing Page - rota raiz */}
      <Route path="/" element={<LandingRoute />} />

      {/* Rotas publicas (auth) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Rotas do Admin (Super Admin) */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="organizations" element={<AdminOrganizations />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="financial" element={<AdminFinancial />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Rotas protegidas (app) */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function Pages() {
  return (
    <PWAProvider>
      <AuthProvider>
        <OperatorProvider>
          <Router>
            <AppRouter />
            <CashWarningModal />
            <InstallAppFab />
          </Router>
        </OperatorProvider>
      </AuthProvider>
    </PWAProvider>
  );
}
