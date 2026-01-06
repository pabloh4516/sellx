import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package,
  Bell,
  Moon,
  Sun,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from 'next-themes';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/admin',
  },
  {
    title: 'Organizacoes',
    icon: Building2,
    path: '/admin/organizations',
  },
  {
    title: 'Usuarios',
    icon: Users,
    path: '/admin/users',
  },
  {
    title: 'Assinaturas',
    icon: CreditCard,
    path: '/admin/subscriptions',
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    path: '/admin/financial',
  },
  {
    title: 'Planos',
    icon: Package,
    path: '/admin/plans',
  },
  {
    title: 'Configuracoes',
    icon: Settings,
    path: '/admin/settings',
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div>
                <span className="font-bold text-lg">Sellx</span>
                <span className="text-xs text-muted-foreground block">Admin Panel</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('w-5 h-5', collapsed && 'mx-auto')} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Voltar ao Sistema */}
        <div className="p-2 border-t border-border">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ArrowLeft className={cn('w-5 h-5', collapsed && 'mx-auto')} />
            {!collapsed && <span>Voltar ao Sistema</span>}
          </Link>
        </div>

        {/* Collapse Button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card">
          <div>
            <h1 className="text-lg font-semibold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua plataforma SaaS</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-purple-600 text-white text-xs">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {user?.full_name && (
                    <span className="text-sm font-medium hidden md:block">{user.full_name}</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-violet-600 font-medium mt-1">Super Admin</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
