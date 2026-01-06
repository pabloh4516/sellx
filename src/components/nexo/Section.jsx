import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// SECTION - Seção com título e conteúdo
// ============================================================================

export function Section({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}) {
  const ActionIcon = action?.icon || ChevronRight;

  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              {title && <h2 className="font-semibold text-foreground">{title}</h2>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {action.label}
              <ActionIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
}

// ============================================================================
// CARD SECTION - Seção dentro de um card
// ============================================================================

export function CardSection({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  noPadding = false,
}) {
  return (
    <div className={cn('bg-card rounded-xl border border-border overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-foreground">{title}</h3>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          {action && (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {action.label}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  );
}

// ============================================================================
// PAGE CONTAINER - Container principal da página
// ============================================================================

export function PageContainer({ children, className }) {
  return (
    <div className={cn('p-6 space-y-6 nexo-scrollbar', className)}>
      {children}
    </div>
  );
}

// ============================================================================
// PAGE HEADER - Header da página
// ============================================================================

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className={cn(
                index === breadcrumbs.length - 1
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground cursor-pointer'
              )}>
                {crumb.label}
              </span>
            </div>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// GRID - Grid responsivo
// ============================================================================

export function Grid({ children, cols = 4, gap = 'md', className }) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', colsClass[cols], gapClass[gap], className)}>
      {children}
    </div>
  );
}

// ============================================================================
// EMPTY STATE - Estado vazio
// ============================================================================

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
