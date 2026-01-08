/**
 * Componente de alerta de limite do plano
 * Exibe avisos quando usuario esta proximo ou atingiu o limite
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Alerta simples de limite atingido
export function LimitReachedAlert({ limitLabel, onUpgrade }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="p-2 rounded-full bg-destructive/20">
        <Lock className="w-5 h-5 text-destructive" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-destructive">Limite de {limitLabel} atingido</p>
        <p className="text-sm text-muted-foreground">
          Faca upgrade do seu plano para continuar cadastrando.
        </p>
      </div>
      <Link to="/Billing">
        <Button size="sm" variant="destructive">
          <TrendingUp className="w-4 h-4 mr-2" />
          Ver Planos
        </Button>
      </Link>
    </div>
  );
}

// Alerta de proximidade do limite
export function LimitWarningAlert({ limitLabel, current, limit, percent }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="p-2 rounded-full bg-warning/20">
        <AlertTriangle className="w-5 h-5 text-warning" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-warning">Proximo do limite de {limitLabel}</p>
          <span className="text-sm text-muted-foreground">
            {current} / {limit}
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>
      <Link to="/Billing">
        <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10">
          Upgrade
        </Button>
      </Link>
    </div>
  );
}

// Card de uso de limite (para pagina de billing)
export function LimitUsageCard({
  label,
  icon: Icon,
  current,
  limit,
  isUnlimited,
  className
}) {
  const percent = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;

  return (
    <div className={cn(
      "p-4 border rounded-lg",
      isAtLimit && "border-destructive/50 bg-destructive/5",
      isNearLimit && !isAtLimit && "border-warning/50 bg-warning/5",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          <span className="font-medium">{label}</span>
        </div>
        <span className={cn(
          "text-sm font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && !isAtLimit && "text-warning"
        )}>
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={percent}
          className={cn(
            "h-2",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && !isAtLimit && "[&>div]:bg-warning"
          )}
        />
      )}
      {isUnlimited && (
        <div className="h-2 bg-muted rounded-full flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Ilimitado</span>
        </div>
      )}
    </div>
  );
}

// Banner de upgrade (para mostrar em paginas)
export function UpgradeBanner({ message, className }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/20">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Desbloqueie mais recursos</p>
          <p className="text-sm text-muted-foreground">
            {message || 'Faca upgrade do seu plano para ter acesso ilimitado.'}
          </p>
        </div>
      </div>
      <Link to="/Billing">
        <Button>
          Ver Planos
        </Button>
      </Link>
    </div>
  );
}

// Componente principal que decide qual alerta mostrar
export default function LimitAlert({
  limitKey,
  label,
  current,
  limit,
  showAlways = false, // Mostra mesmo se nao estiver perto do limite
  variant = 'auto', // 'auto', 'warning', 'error', 'banner'
}) {
  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;

  // Se ilimitado, nao mostra nada
  if (isUnlimited) return null;

  // Determinar variante automaticamente
  let effectiveVariant = variant;
  if (variant === 'auto') {
    if (isAtLimit) effectiveVariant = 'error';
    else if (isNearLimit) effectiveVariant = 'warning';
    else if (showAlways) effectiveVariant = 'banner';
    else return null;
  }

  // Se nao atingiu limite e nao deve mostrar sempre, nao mostra nada
  if (!isAtLimit && !isNearLimit && !showAlways) return null;

  switch (effectiveVariant) {
    case 'error':
      return <LimitReachedAlert limitLabel={label} />;
    case 'warning':
      return <LimitWarningAlert limitLabel={label} current={current} limit={limit} percent={percent} />;
    case 'banner':
      return <UpgradeBanner />;
    default:
      return null;
  }
}
