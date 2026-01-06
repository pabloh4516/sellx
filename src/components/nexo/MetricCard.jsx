import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// METRIC CARD - Card principal para métricas
// ============================================================================

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  footer,
  variant = 'default',
  size = 'md',
  className,
}) {
  const variants = {
    default: {
      accent: 'bg-primary',
      iconBg: 'bg-primary/10 text-primary',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    primary: {
      accent: 'bg-primary',
      iconBg: 'bg-primary/10 text-primary',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    success: {
      accent: 'bg-success',
      iconBg: 'bg-success/10 text-success',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    warning: {
      accent: 'bg-warning',
      iconBg: 'bg-warning/10 text-warning',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    danger: {
      accent: 'bg-destructive',
      iconBg: 'bg-destructive/10 text-destructive',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    info: {
      accent: 'bg-blue-500',
      iconBg: 'bg-blue-500/10 text-blue-500',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
    error: {
      accent: 'bg-destructive',
      iconBg: 'bg-destructive/10 text-destructive',
      trendUp: 'text-success',
      trendDown: 'text-destructive',
    },
  };

  const sizes = {
    sm: {
      padding: 'p-4',
      iconSize: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      labelSize: 'text-xs',
      valueSize: 'text-xl',
    },
    md: {
      padding: 'p-5',
      iconSize: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      labelSize: 'text-sm',
      valueSize: 'text-2xl',
    },
    lg: {
      padding: 'p-6',
      iconSize: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      labelSize: 'text-sm',
      valueSize: 'text-3xl',
    },
  };

  const v = variants[variant];
  const s = sizes[size];

  const TrendIcon = trend?.value && trend.value > 0
    ? TrendingUp
    : trend?.value && trend.value < 0
      ? TrendingDown
      : Minus;

  const trendColor = trend?.value && trend.value > 0
    ? v.trendUp
    : trend?.value && trend.value < 0
      ? v.trendDown
      : 'text-muted-foreground';

  return (
    <div className={cn(
      'relative bg-card rounded-xl border border-border overflow-hidden',
      'transition-all duration-200 hover:shadow-md',
      s.padding,
      className
    )}>
      {/* Accent bar */}
      <div className={cn('absolute top-0 left-0 w-full h-1', v.accent)} />

      {/* Content */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn('text-muted-foreground font-medium mb-1', s.labelSize)}>
            {label}
          </p>
          <p className={cn('font-bold text-foreground tracking-tight', s.valueSize)}>
            {value}
          </p>

          {/* Trend */}
          {trend && (
            <div className={cn('flex items-center gap-1.5 mt-2', trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {trend.value > 0 ? '+' : ''}{trend.value}%
                {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={cn('rounded-lg flex items-center justify-center shrink-0', v.iconBg, s.iconSize)}>
            <Icon className={s.iconInner} />
          </div>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HIGHLIGHT METRIC - Card de destaque com fundo colorido
// ============================================================================

export function HighlightMetric({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}) {
  return (
    <div className={cn(
      'relative bg-primary text-primary-foreground rounded-xl p-6 overflow-hidden',
      'transition-all duration-200',
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          {Icon && (
            <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
          )}

          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md',
              trend >= 0 ? 'bg-white/15' : 'bg-black/15'
            )}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>

        {subtitle && (
          <p className="text-sm opacity-60 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MINI METRIC - Card compacto para stats secundárias
// ============================================================================

export function MiniMetric({
  label,
  value,
  icon: Icon,
  status = 'default',
  className,
}) {
  const statusStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
  };

  return (
    <div className={cn(
      'bg-card rounded-lg border border-border p-4 flex items-center gap-3',
      'transition-all duration-150 hover:border-border/80',
      className
    )}>
      {Icon && (
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          statusStyles[status]
        )}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn('font-semibold truncate', valueStyles[status])}>{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS METRIC - Card com barra de progresso
// ============================================================================

export function ProgressMetric({
  label,
  value,
  max,
  format,
  icon: Icon,
  variant = 'default',
  className,
}) {
  const percentage = Math.min((value / max) * 100, 100);

  const barColors = {
    default: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
  };

  const displayValue = format
    ? format(value, max)
    : `${value.toLocaleString()} / ${max.toLocaleString()}`;

  return (
    <div className={cn(
      'bg-card rounded-lg border border-border p-4',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-sm font-semibold text-foreground">{percentage.toFixed(0)}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground mt-2">{displayValue}</p>
    </div>
  );
}
