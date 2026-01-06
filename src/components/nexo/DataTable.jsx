import { cn } from '@/lib/utils';
import { ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

// ============================================================================
// DATA TABLE - Tabela de dados moderna com suporte mobile
// ============================================================================

export function DataTable({
  data,
  columns,
  keyExtractor = (item) => item.id,
  onRowClick,
  emptyMessage = 'Nenhum dado encontrado',
  loading = false,
  className,
  mobileCardRender, // Funcao custom para renderizar card mobile
  mobileColumns, // Array de keys para mostrar no mobile card (usa primeiras 3 por padrao)
}) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
        <div className="p-6 sm:p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
        <div className="p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile) {
    const displayColumns = mobileColumns
      ? columns.filter(c => mobileColumns.includes(c.key))
      : columns.slice(0, 4); // Primeiras 4 colunas por padrao

    return (
      <div className={cn('space-y-2', className)}>
        {data.map((item, index) => (
          <div
            key={keyExtractor(item)}
            className={cn(
              'bg-card rounded-xl border border-border p-3 sm:p-4 transition-colors',
              onRowClick && 'cursor-pointer active:bg-muted/50'
            )}
            onClick={() => onRowClick?.(item)}
          >
            {mobileCardRender ? (
              mobileCardRender(item, index)
            ) : (
              <div className="space-y-2">
                {/* Primeira coluna como titulo principal */}
                {displayColumns[0] && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground truncate flex-1">
                      {displayColumns[0].render
                        ? displayColumns[0].render(item[displayColumns[0].key], item, index)
                        : item[displayColumns[0].key]}
                    </div>
                    {onRowClick && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                )}
                {/* Demais colunas em grid */}
                {displayColumns.length > 1 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {displayColumns.slice(1).map((column) => (
                      <div key={column.key} className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                          {column.header || column.label}
                        </p>
                        <p className="text-sm text-foreground truncate">
                          {column.render
                            ? column.render(item[column.key], item, index)
                            : item[column.key] || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                    !column.align && !column.className?.includes('text-') && 'text-left',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header || column.label}
                </th>
              ))}
              {onRowClick && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/30'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 sm:px-4 py-2.5 sm:py-3 text-sm',
                      !column.align && !column.className?.includes('text-') && 'text-left',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                    style={{ width: column.width }}
                  >
                    {column.render
                      ? column.render(item[column.key], item, index)
                      : item[column.key]}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE CARD - Tabela com header e ações (responsivo)
// ============================================================================

export function TableCard({
  title,
  subtitle,
  searchPlaceholder = 'Buscar...',
  onSearch,
  actions,
  className,
  ...tableProps
}) {
  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{title}</h3>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onSearch && (
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-9 w-full sm:w-[200px] h-9 text-sm"
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            )}
            {actions}
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable {...tableProps} className="border-0 rounded-none" />
    </div>
  );
}

// ============================================================================
// STATUS BADGE - Badge de status
// ============================================================================

export function StatusBadge({ status, label, className }) {
  const styles = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-info/10 text-info border-info/20',
    default: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      styles[status],
      className
    )}>
      {label}
    </span>
  );
}

// ============================================================================
// AVATAR - Avatar para tabelas
// ============================================================================

export function TableAvatar({ name, subtitle, image, src, fallbackIcon: FallbackIcon, className }) {
  const displayName = name || '';
  const imageUrl = image || src;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={displayName} className="w-8 h-8 rounded-lg object-cover" />
      ) : FallbackIcon ? (
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <FallbackIcon className="w-4 h-4" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
          {initials || '?'}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{displayName || '-'}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// CURRENCY - Formatação de moeda
// ============================================================================

export function Currency({ value, className, showSign = false }) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));

  const isNegative = value < 0;
  const color = showSign
    ? isNegative
      ? 'text-destructive'
      : 'text-success'
    : 'text-foreground';

  return (
    <span className={cn('font-medium tabular-nums', color, className)}>
      {showSign && (isNegative ? '-' : '+')}
      {formatted}
    </span>
  );
}
