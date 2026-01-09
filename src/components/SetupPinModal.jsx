/**
 * Modal para configurar PIN do operador
 * Exibido quando o usuario entra pela primeira vez e nao tem PIN configurado
 */

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, Shield, Check } from 'lucide-react';

export default function SetupPinModal({ open, onSuccess, userId, userName }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validacoes
    if (!pin || pin.length < 4) {
      toast.error('O PIN deve ter pelo menos 4 digitos');
      return;
    }

    if (pin.length > 6) {
      toast.error('O PIN deve ter no maximo 6 digitos');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      toast.error('O PIN deve conter apenas numeros');
      return;
    }

    if (pin !== confirmPin) {
      toast.error('Os PINs nao conferem');
      return;
    }

    setLoading(true);

    try {
      // Atualizar PIN no perfil
      const { error } = await supabase
        .from('profiles')
        .update({ pin })
        .eq('id', userId);

      if (error) throw error;

      toast.success('PIN configurado com sucesso!');
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao configurar PIN:', error);
      toast.error('Erro ao configurar PIN. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value, setter) => {
    // Apenas numeros, max 6 digitos
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setter(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Configure seu PIN de Acesso
          </DialogTitle>
          <DialogDescription className="text-center">
            {userName ? `Ola, ${userName.split(' ')[0]}! ` : ''}
            Para sua seguranca, configure um PIN de 4-6 digitos que sera usado para entrar no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Novo PIN</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="pin"
                type={showPin ? 'text' : 'password'}
                placeholder="Digite seu PIN (4-6 digitos)"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value, setPin)}
                className="pl-10 pr-10 text-center text-lg tracking-widest"
                autoFocus
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirme o PIN</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPin"
                type={showPin ? 'text' : 'password'}
                placeholder="Confirme seu PIN"
                value={confirmPin}
                onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                className="pl-10 text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            {confirmPin && pin !== confirmPin && (
              <p className="text-xs text-destructive">Os PINs nao conferem</p>
            )}
            {confirmPin && pin === confirmPin && pin.length >= 4 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> PINs conferem
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Dicas de seguranca:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use um PIN que voce consiga lembrar facilmente</li>
              <li>Evite sequencias obvias como 1234 ou 0000</li>
              <li>Nao compartilhe seu PIN com outras pessoas</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || pin.length < 4 || pin !== confirmPin}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Confirmar PIN
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
