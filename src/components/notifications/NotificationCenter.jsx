import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell, Package, FileText, DollarSign, Gift, CreditCard,
  AlertTriangle, AlertCircle, Info, X, RefreshCw, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const ICON_MAP = {
  Package: Package,
  FileText: FileText,
  DollarSign: DollarSign,
  Gift: Gift,
  CreditCard: CreditCard,
};

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning text-warning-foreground',
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: 'text-primary',
    badge: 'bg-primary text-primary-foreground',
  },
};

const TYPE_LINKS = {
  low_stock: 'Stock',
  upcoming_bill: 'Payables',
  overdue_receivable: 'Receivables',
  birthday: 'Birthdays',
  pending_check: 'Checks',
};

export default function NotificationCenter() {
  const { notifications, counts, loading, refresh, dismissNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return AlertCircle;
      default:
        return Info;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="w-5 h-5" />
          {counts.total > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1",
              notifications.some(n => n.severity === 'critical')
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            )}>
              {counts.total > 99 ? '99+' : counts.total}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold">Notificacoes</h3>
            <p className="text-xs text-muted-foreground">
              {counts.total} alerta(s) pendente(s)
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Resumo por tipo */}
        {counts.total > 0 && (
          <div className="flex gap-2 p-3 border-b border-border bg-muted/30 overflow-x-auto">
            {counts.lowStock > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-lg text-xs shrink-0">
                <Package className="w-3.5 h-3.5 text-warning" />
                <span>{counts.lowStock} estoque</span>
              </div>
            )}
            {counts.upcomingBills > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded-lg text-xs shrink-0">
                <FileText className="w-3.5 h-3.5 text-destructive" />
                <span>{counts.upcomingBills} contas</span>
              </div>
            )}
            {counts.overdueReceivables > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-lg text-xs shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-warning" />
                <span>{counts.overdueReceivables} recebiveis</span>
              </div>
            )}
            {counts.birthdays > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg text-xs shrink-0">
                <Gift className="w-3.5 h-3.5 text-primary" />
                <span>{counts.birthdays} aniver.</span>
              </div>
            )}
            {counts.pendingChecks > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg text-xs shrink-0">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                <span>{counts.pendingChecks} cheques</span>
              </div>
            )}
          </div>
        )}

        {/* Lista de notificacoes */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Tudo em dia!</p>
              <p className="text-sm">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => {
                const Icon = ICON_MAP[notification.icon] || Bell;
                const SeverityIcon = getSeverityIcon(notification.severity);
                const styles = SEVERITY_STYLES[notification.severity];
                const linkPage = TYPE_LINKS[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      styles.bg,
                      styles.border
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      styles.bg
                    )}>
                      <Icon className={cn("w-4 h-4", styles.icon)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <SeverityIcon className={cn("w-3.5 h-3.5", styles.icon)} />
                        <span className="text-xs font-medium text-muted-foreground">
                          {notification.title}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>

                      {linkPage && (
                        <Link
                          to={createPageUrl(linkPage)}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          Ver detalhes
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex gap-2">
              <Link
                to={createPageUrl('Stock')}
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Estoque
                </Button>
              </Link>
              <Link
                to={createPageUrl('Payables')}
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Contas
                </Button>
              </Link>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
