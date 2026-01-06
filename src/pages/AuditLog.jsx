import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FileText, Search, Filter, Clock, User, Trash2, Download,
  ShieldCheck, Wallet, ShoppingCart, Package, Users, Settings,
  LogIn, LogOut, AlertTriangle, RefreshCw
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PageContainer,
  PageHeader,
  CardSection,
  EmptyState,
} from '@/components/nexo';

// Mapeamento de acoes para icones e cores
const ACTION_CONFIG = {
  OPERATOR_LOGIN: { icon: LogIn, color: 'text-primary', bg: 'bg-primary/10', label: 'Login de Operador' },
  OPERATOR_LOGOUT: { icon: LogOut, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Logout de Operador' },
  CASH_OPEN: { icon: Wallet, color: 'text-success', bg: 'bg-success/10', label: 'Abertura de Caixa' },
  CASH_CLOSE: { icon: Wallet, color: 'text-warning', bg: 'bg-warning/10', label: 'Fechamento de Caixa' },
  CASH_WITHDRAW: { icon: Wallet, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Sangria' },
  CASH_SUPPLY: { icon: Wallet, color: 'text-success', bg: 'bg-success/10', label: 'Suprimento' },
  SALE_CREATE: { icon: ShoppingCart, color: 'text-success', bg: 'bg-success/10', label: 'Nova Venda' },
  SALE_CANCEL: { icon: ShoppingCart, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Cancelamento de Venda' },
  PRODUCT_CREATE: { icon: Package, color: 'text-primary', bg: 'bg-primary/10', label: 'Produto Criado' },
  PRODUCT_UPDATE: { icon: Package, color: 'text-warning', bg: 'bg-warning/10', label: 'Produto Atualizado' },
  PRODUCT_DELETE: { icon: Package, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Produto Excluido' },
  CUSTOMER_CREATE: { icon: Users, color: 'text-primary', bg: 'bg-primary/10', label: 'Cliente Criado' },
  SETTINGS_UPDATE: { icon: Settings, color: 'text-warning', bg: 'bg-warning/10', label: 'Configuracoes Alteradas' },
  DEFAULT: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Acao' },
};

export default function AuditLog() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
      setLogs(storedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = () => {
    if (confirm('Tem certeza que deseja limpar todos os logs de auditoria?')) {
      localStorage.setItem('auditLogs', '[]');
      setLogs([]);
      toast.success('Logs limpos');
    }
  };

  const handleExportLogs = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Logs exportados');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const getActionConfig = (action) => {
    return ACTION_CONFIG[action] || ACTION_CONFIG.DEFAULT;
  };

  const formatDetails = (details) => {
    if (!details) return null;
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return Object.entries(parsed).map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs">
          <span className="text-muted-foreground">{key}:</span>
          <span className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
        </span>
      ));
    } catch {
      return <span className="text-xs text-muted-foreground">{details}</span>;
    }
  };

  const formatLogDate = (timestamp) => {
    try {
      const date = parseISO(timestamp);
      if (isToday(date)) {
        return `Hoje, ${format(date, 'HH:mm:ss')}`;
      }
      if (isYesterday(date)) {
        return `Ontem, ${format(date, 'HH:mm:ss')}`;
      }
      return format(date, "dd/MM/yyyy 'as' HH:mm:ss", { locale: ptBR });
    } catch {
      return timestamp;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          log.action?.toLowerCase().includes(searchLower) ||
          log.user_name?.toLowerCase().includes(searchLower) ||
          log.operator_name?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de acao
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Filtro de data
      if (dateFilter !== 'all') {
        try {
          const logDate = parseISO(log.timestamp);
          if (dateFilter === 'today' && !isToday(logDate)) return false;
          if (dateFilter === 'yesterday' && !isYesterday(logDate)) return false;
          if (dateFilter === 'week' && !isThisWeek(logDate, { locale: ptBR })) return false;
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action));
    return Array.from(actions);
  }, [logs]);

  if (!isAdmin()) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas administradores podem visualizar os logs de auditoria.
          </p>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Log de Auditoria"
        subtitle="Registro de todas as acoes do sistema"
        icon={ShieldCheck}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Logs
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <CardSection>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por acao" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as acoes</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {getActionConfig(action).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px]">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo periodo</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardSection>

      {/* Lista de Logs */}
      <CardSection>
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum log encontrado"
            description={searchTerm || actionFilter !== 'all' || dateFilter !== 'all'
              ? "Nenhum registro corresponde aos filtros selecionados"
              : "Ainda nao ha registros de auditoria"}
          />
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredLogs.map((log, index) => {
                const config = getActionConfig(log.action);
                const Icon = config.icon;

                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                          {log.action}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {(log.operator_name || log.user_name) && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {log.operator_name || log.user_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatLogDate(log.timestamp)}
                        </span>
                      </div>

                      {log.details && log.details !== '{}' && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {formatDetails(log.details)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
          <span>Total: {filteredLogs.length} registro(s)</span>
          <span>Mostrando registros armazenados localmente</span>
        </div>
      </CardSection>
    </PageContainer>
  );
}
