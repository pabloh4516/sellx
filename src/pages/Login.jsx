import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Key, User } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('email'); // 'email' ou 'code'
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validacao baseada no modo de login
    if (loginMode === 'email') {
      if (!email || !password) {
        toast.error('Preencha todos os campos');
        return;
      }
    } else {
      if (!employeeCode || !password) {
        toast.error('Preencha o codigo e a senha');
        return;
      }
    }

    setLoading(true);

    try {
      let loginEmail = email;

      // Se for login por codigo, buscar o email interno do funcionario
      if (loginMode === 'code') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('employee_code', employeeCode.toUpperCase())
          .single();

        if (profileError || !profile) {
          toast.error('Codigo de funcionario nao encontrado');
          setLoading(false);
          return;
        }

        loginEmail = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(loginMode === 'code' ? 'Codigo ou senha incorretos' : 'Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Conta nao confirmada. Contate o administrador.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Erro ao fazer login com Google');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
              S
            </div>
            <h1 className="text-3xl font-bold">Bem-vindo de volta</h1>
            <p className="text-muted-foreground mt-2">
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Toggle entre Email e Codigo */}
            <div className="flex rounded-lg border p-1 bg-muted/50">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMode === 'email'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setLoginMode('email')}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMode === 'code'
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setLoginMode('code')}
              >
                <Key className="w-4 h-4" />
                Codigo
              </button>
            </div>

            {/* Campo de Email ou Codigo */}
            {loginMode === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="code">Codigo do Funcionario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="Ex: 001, FUNC01"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    className="pl-10"
                    disabled={loading}
                    autoCapitalize="characters"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {loginMode === 'email' && (
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Seção de login alternativo - apenas para modo email */}
          {loginMode === 'email' && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>

              {/* Social Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleGoogleLogin}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              {/* Register Link */}
              <p className="text-center text-sm text-muted-foreground">
                Nao tem uma conta?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Criar conta gratis
                </Link>
              </p>
            </>
          )}

          {/* Info para login por codigo */}
          {loginMode === 'code' && (
            <p className="text-center text-sm text-muted-foreground">
              Use o codigo fornecido pelo administrador
            </p>
          )}
        </div>
      </div>

      {/* Right Side - Image/Brand */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-lg text-center text-primary-foreground">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 text-4xl font-bold mb-8">
            S
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Sellx
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Sistema de gestao completo para seu negocio
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              'PDV Completo',
              'Controle de Estoque',
              'Financeiro',
              'Relatorios',
              'Multi-usuarios',
              'WhatsApp',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <span className="opacity-90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
