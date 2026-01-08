import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminSubdomain } from '@/utils/subdomain';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package,
  Bell,
  Moon,
  Sun,
  Shield,
  ArrowLeft,
  Sparkles,
  Crown,
  Zap,
  Activity,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';

// Detecta o prefixo baseado no modo
const getPrefix = () => isAdminSubdomain() ? '' : '/admin';

const getMenuItems = () => {
  const prefix = getPrefix();
  return [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: prefix || '/',
      description: 'Visao geral',
    },
    {
      title: 'Organizacoes',
      icon: Building2,
      path: `${prefix}/organizations`,
      description: 'Empresas',
    },
    {
      title: 'Usuarios',
      icon: Users,
      path: `${prefix}/users`,
      description: 'Contas',
    },
    {
      title: 'Assinaturas',
      icon: CreditCard,
      path: `${prefix}/subscriptions`,
      description: 'Planos ativos',
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      path: `${prefix}/financial`,
      description: 'Receitas',
    },
    {
      title: 'Planos',
      icon: Package,
      path: `${prefix}/plans`,
      description: 'Configurar',
    },
    {
      title: 'Configuracoes',
      icon: Settings,
      path: `${prefix}/settings`,
      description: 'Sistema',
    },
  ];
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const prefix = getPrefix();
  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await logout();
    sessionStorage.removeItem('dev_subdomain');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'SA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentPageTitle = () => {
    const current = menuItems.find(item => {
      const dashboardPath = prefix || '/';
      return location.pathname === item.path ||
        (item.path !== dashboardPath && item.path !== '/admin' && location.pathname.startsWith(item.path));
    });
    return current?.title || 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Premium */}
      <aside
        className={cn(
          'flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 shadow-xl',
          collapsed ? 'w-20' : 'w-72'
        )}
      >
        {/* Logo Premium */}
        <div className="flex items-center h-20 px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>
            {!collapsed && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Sellx
                  </span>
                  <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] px-1.5 py-0">
                    ADMIN
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">Painel Administrativo</span>
              </div>
            )}
          </div>
        </div>

        {/* User Quick Info */}
        {!collapsed && (
          <div className="p-4 mx-3 mt-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-violet-500/30">
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-sm font-bold">
                  {getInitials(user?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.full_name || 'Admin'}</p>
                <div className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => {
              const dashboardPath = prefix || '/';
              const isActive = location.pathname === item.path ||
                (item.path !== dashboardPath && item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <div className={cn(
                    'p-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-white/20'
                      : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  )}>
                    <item.icon className={cn('w-5 h-5', collapsed && 'mx-auto')} />
                  </div>
                  {!collapsed && (
                    <div className="flex-1">
                      <span className="block">{item.title}</span>
                      <span className={cn(
                        'text-xs',
                        isActive ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-3 space-y-2 border-t border-slate-200 dark:border-slate-800">
          {/* Voltar ao Sistema */}
          <button
            onClick={() => {
              sessionStorage.removeItem('dev_subdomain');
              window.location.href = '/';
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full',
              'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <ArrowLeft className={cn('w-4 h-4', collapsed && 'mx-auto')} />
            </div>
            {!collapsed && <span>Voltar ao Sistema</span>}
          </button>

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Premium */}
        <header className="flex items-center justify-between h-20 px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/50 dark:to-purple-900/50">
                <Activity className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {getCurrentPageTitle()}
                </h1>
                <p className="text-sm text-muted-foreground">Painel de controle Sellx</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Search className="w-5 h-5 text-slate-500" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-500" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5 text-slate-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </Button>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 px-3 py-2 h-auto rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Avatar className="w-10 h-10 border-2 border-violet-500/30">
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-sm font-bold">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold">{user?.full_name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <div className="px-3 py-3 mb-2 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-violet-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold">
                        {getInitials(user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Super Admin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenuItem
                  onClick={() => navigate(`${prefix}/settings`)}
                  className="rounded-lg cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-3 text-slate-500" />
                  <span>Configuracoes</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-lg cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/50"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
