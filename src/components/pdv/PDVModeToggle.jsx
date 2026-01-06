import React from 'react';
import { Zap, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PDVModeToggle({ mode, onModeChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('quick')}
        className={cn(
          "gap-2 h-8 px-3 transition-all",
          mode === 'quick'
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            : "hover:bg-muted-foreground/10"
        )}
      >
        <Zap className="w-4 h-4" />
        <span className="hidden sm:inline">Rapido</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onModeChange('detailed')}
        className={cn(
          "gap-2 h-8 px-3 transition-all",
          mode === 'detailed'
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
            : "hover:bg-muted-foreground/10"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Detalhado</span>
      </Button>
    </div>
  );
}
