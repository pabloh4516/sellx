import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { isToday, isTomorrow, isThisWeek, parseISO, differenceInDays } from 'date-fns';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    lowStock: 0,
    upcomingBills: 0,
    overdueReceivables: 0,
    birthdays: 0,
    pendingChecks: 0,
    total: 0,
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const allNotifications = [];

    try {
      // 1. Produtos com estoque baixo
      const products = await base44.entities.Product.list();
      const lowStockProducts = products.filter(p => {
        const minStock = p.min_stock || 0;
        const currentStock = p.stock_quantity || 0;
        return currentStock <= minStock && currentStock >= 0;
      });

      lowStockProducts.forEach(product => {
        allNotifications.push({
          id: `stock-${product.id}`,
          type: 'low_stock',
          severity: product.stock_quantity === 0 ? 'critical' : 'warning',
          title: 'Estoque Baixo',
          message: `${product.name} - Estoque: ${product.stock_quantity || 0} (Min: ${product.min_stock || 0})`,
          data: product,
          icon: 'Package',
        });
      });

      // 2. Contas a pagar proximas de vencer
      const payables = await base44.entities.Payable.list();
      const upcomingPayables = payables.filter(p => {
        if (p.status === 'pago') return false;
        try {
          const dueDate = parseISO(p.due_date);
          const daysUntilDue = differenceInDays(dueDate, new Date());
          return daysUntilDue <= 7 && daysUntilDue >= -30; // Proximos 7 dias ou atrasados ate 30 dias
        } catch {
          return false;
        }
      });

      upcomingPayables.forEach(payable => {
        try {
          const dueDate = parseISO(payable.due_date);
          const daysUntilDue = differenceInDays(dueDate, new Date());
          const isOverdue = daysUntilDue < 0;

          allNotifications.push({
            id: `payable-${payable.id}`,
            type: 'upcoming_bill',
            severity: isOverdue ? 'critical' : (daysUntilDue <= 3 ? 'warning' : 'info'),
            title: isOverdue ? 'Conta Atrasada' : 'Conta a Vencer',
            message: `${payable.description || 'Conta a pagar'} - R$ ${(payable.amount || 0).toFixed(2)} - ${isOverdue ? `Atrasado ${Math.abs(daysUntilDue)} dias` : (daysUntilDue === 0 ? 'Vence hoje' : `Vence em ${daysUntilDue} dias`)}`,
            data: payable,
            icon: 'FileText',
          });
        } catch {
          // Ignore invalid dates
        }
      });

      // 3. Contas a receber atrasadas
      const receivables = await base44.entities.Receivable.list();
      const overdueReceivables = receivables.filter(r => {
        if (r.status === 'recebido') return false;
        try {
          const dueDate = parseISO(r.due_date);
          return differenceInDays(new Date(), dueDate) > 0;
        } catch {
          return false;
        }
      });

      overdueReceivables.forEach(receivable => {
        try {
          const dueDate = parseISO(receivable.due_date);
          const daysOverdue = differenceInDays(new Date(), dueDate);

          allNotifications.push({
            id: `receivable-${receivable.id}`,
            type: 'overdue_receivable',
            severity: daysOverdue > 30 ? 'critical' : 'warning',
            title: 'Recebivel Atrasado',
            message: `${receivable.customer_name || 'Cliente'} - R$ ${(receivable.amount || 0).toFixed(2)} - Atrasado ${daysOverdue} dias`,
            data: receivable,
            icon: 'DollarSign',
          });
        } catch {
          // Ignore invalid dates
        }
      });

      // 4. Aniversariantes do dia
      const customers = await base44.entities.Customer.list();
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      const birthdayCustomers = customers.filter(c => {
        if (!c.birth_date) return false;
        try {
          const birthDate = parseISO(c.birth_date);
          return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
        } catch {
          return false;
        }
      });

      birthdayCustomers.forEach(customer => {
        allNotifications.push({
          id: `birthday-${customer.id}`,
          type: 'birthday',
          severity: 'info',
          title: 'Aniversariante do Dia',
          message: `${customer.name} faz aniversario hoje!`,
          data: customer,
          icon: 'Gift',
        });
      });

      // 5. Cheques a compensar
      const checks = await base44.entities.Check?.list() || [];
      const pendingChecks = checks.filter(c => {
        if (c.status !== 'pendente') return false;
        try {
          const compensationDate = parseISO(c.compensation_date || c.due_date);
          const daysUntilCompensation = differenceInDays(compensationDate, new Date());
          return daysUntilCompensation <= 3 && daysUntilCompensation >= 0;
        } catch {
          return false;
        }
      });

      pendingChecks.forEach(check => {
        allNotifications.push({
          id: `check-${check.id}`,
          type: 'pending_check',
          severity: 'info',
          title: 'Cheque a Compensar',
          message: `Cheque ${check.number || ''} - R$ ${(check.amount || 0).toFixed(2)}`,
          data: check,
          icon: 'CreditCard',
        });
      });

      // Ordenar por severidade (critical > warning > info)
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      allNotifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      setNotifications(allNotifications);
      setCounts({
        lowStock: lowStockProducts.length,
        upcomingBills: upcomingPayables.length,
        overdueReceivables: overdueReceivables.length,
        birthdays: birthdayCustomers.length,
        pendingChecks: pendingChecks.length,
        total: allNotifications.length,
      });

    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Atualizar a cada 5 minutos
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return {
    notifications,
    counts,
    loading,
    refresh: loadNotifications,
    dismissNotification,
  };
}
