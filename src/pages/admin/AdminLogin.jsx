import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { USER_ROLES } from '@/config/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

// Email do administrador do SaaS
const ADMIN_EMAIL = 'pabloh4516@icloud.com';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Se ja estiver logado como super_admin, redirecionar
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === USER_ROLES.SUPER_ADMIN) {
        navigate('/');
      }
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Digite sua senha');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });

      if (authError) {
        setError('Senha incorreta');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Verificar se e super_admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== USER_ROLES.SUPER_ADMIN) {
          await supabase.auth.signOut();
          setError('Acesso nao autorizado');
          setLoading(false);
          return;
        }

        toast.success('Bem-vindo!');
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao conectar');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo minimalista */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 mb-4">
            <Lock className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-white/40 text-xs tracking-[0.3em] uppercase">
            Acesso Restrito
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email (somente leitura, exibido de forma discreta) */}
          <div className="text-center">
            <span className="text-white/30 text-sm">{ADMIN_EMAIL}</span>
          </div>

          {/* Campo de senha */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-center pr-12 focus:border-white/30 focus:ring-0"
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-red-400/80 text-sm text-center">{error}</p>
          )}

          {/* Botao */}
          <Button
            type="submit"
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* Footer discreto */}
        <div className="mt-16 text-center">
          <p className="text-white/20 text-xs">
            Area exclusiva do proprietario
          </p>
        </div>
      </div>
    </div>
  );
}
