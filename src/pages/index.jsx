import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OperatorProvider, useOperator } from '@/contexts/OperatorContext';
import { PWAProvider } from '@/contexts/PWAContext';
import { USER_ROLES } from '@/config/permissions';
import { InstallAppFab } from '@/components/pwa';
import CashWarningModal from '@/components/CashWarningModal';

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Landing Page - carrega estatico (primeira pagina)
import LandingPage from "./LandingPage";

// Auth Pages - carrega estatico (essenciais)
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import OperatorSelect from "./OperatorSelect";

// App Layout - carrega estatico (estrutura principal)
import Layout from "./Layout.jsx";

// Admin Pages - lazy load
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminOrganizations = lazy(() => import("./admin/AdminOrganizations"));
const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminSubscriptions = lazy(() => import("./admin/AdminSubscriptions"));
const AdminFinancial = lazy(() => import("./admin/AdminFinancial"));
const AdminPlans = lazy(() => import("./admin/AdminPlans"));
const AdminSettings = lazy(() => import("./admin/AdminSettings"));

// Pages - lazy load (carregam sob demanda)
const BankAccounts = lazy(() => import("./BankAccounts"));
const Birthdays = lazy(() => import("./Birthdays"));
const CashFlow = lazy(() => import("./CashFlow"));
const CashRegister = lazy(() => import("./CashRegister"));
const CashAnalysis = lazy(() => import("./CashAnalysis"));
const Checks = lazy(() => import("./Checks"));
const CompanySettings = lazy(() => import("./CompanySettings"));
const Customers = lazy(() => import("./Customers"));
const Dashboard = lazy(() => import("./Dashboard"));
const DashboardManager = lazy(() => import("./DashboardManager"));
const DashboardSeller = lazy(() => import("./DashboardSeller"));
const Expenses = lazy(() => import("./Expenses"));
const FutureOrders = lazy(() => import("./FutureOrders"));
const ImportXML = lazy(() => import("./ImportXML"));
const Inventory = lazy(() => import("./Inventory"));
const Labels = lazy(() => import("./Labels"));
const LoyaltyProgram = lazy(() => import("./LoyaltyProgram"));
const OverdueCustomers = lazy(() => import("./OverdueCustomers"));
const PDV = lazy(() => import("./PDV"));
const PDVQuick = lazy(() => import("./PDVQuick"));
const PDVMain = lazy(() => import("./PDVMain"));
const Payables = lazy(() => import("./Payables"));
const PaymentMethods = lazy(() => import("./PaymentMethods"));
const ProductGroups = lazy(() => import("./ProductGroups"));
const Products = lazy(() => import("./Products"));
const Promotions = lazy(() => import("./Promotions"));
const Purchases = lazy(() => import("./Purchases"));
const Quotes = lazy(() => import("./Quotes"));
const Receivables = lazy(() => import("./Receivables"));
const ReportCommissions = lazy(() => import("./ReportCommissions"));
const ReportDRE = lazy(() => import("./ReportDRE"));
const ReportFinancial = lazy(() => import("./ReportFinancial"));
const ReportSales = lazy(() => import("./ReportSales"));
const ReportStock = lazy(() => import("./ReportStock"));
const Returns = lazy(() => import("./Returns"));
const Sales = lazy(() => import("./Sales"));
const SearchProducts = lazy(() => import("./SearchProducts"));
const Sellers = lazy(() => import("./Sellers"));
const ServiceOrders = lazy(() => import("./ServiceOrders"));
const Settings = lazy(() => import("./Settings"));
const Stock = lazy(() => import("./Stock"));
const StockMovements = lazy(() => import("./StockMovements"));
const Suppliers = lazy(() => import("./Suppliers"));
const StockLocations = lazy(() => import("./StockLocations"));
const StockBatches = lazy(() => import("./StockBatches"));
const StockTransfers = lazy(() => import("./StockTransfers"));
const StockAdjustments = lazy(() => import("./StockAdjustments"));
const AuditLog = lazy(() => import("./AuditLog"));
const Users = lazy(() => import("./Users"));
const Reports = lazy(() => import("./Reports"));
const DataImport = lazy(() => import("./DataImport"));
const BackupRestore = lazy(() => import("./BackupRestore"));
const ThemeSettings = lazy(() => import("./ThemeSettings"));
const Billing = lazy(() => import("./Billing"));
const Cancellations = lazy(() => import("./Cancellations"));

const PAGES = {
  BankAccounts,
  Birthdays,
  CashFlow,
  CashRegister,
  CashAnalysis,
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        <Route path="/BankAccounts" element={<BankAccounts />} />
        <Route path="/Birthdays" element={<Birthdays />} />
        <Route path="/CashFlow" element={<CashFlow />} />
        <Route path="/CashRegister" element={<CashRegister />} />
        <Route path="/CashAnalysis" element={<CashAnalysis />} />
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
      </Suspense>
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
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          </SuperAdminRoute>
        }
      >
        <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
        <Route path="organizations" element={<Suspense fallback={<PageLoader />}><AdminOrganizations /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
        <Route path="subscriptions" element={<Suspense fallback={<PageLoader />}><AdminSubscriptions /></Suspense>} />
        <Route path="financial" element={<Suspense fallback={<PageLoader />}><AdminFinancial /></Suspense>} />
        <Route path="plans" element={<Suspense fallback={<PageLoader />}><AdminPlans /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />
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
