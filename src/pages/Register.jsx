import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Building2, Check, CheckCircle2, Inbox } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Dados pessoais
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Dados da empresa
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Terms
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      toast.error('Informe seu nome completo');
      return false;
    }
    if (!email.trim()) {
      toast.error('Informe seu email');
      return false;
    }
    if (!password) {
      toast.error('Informe uma senha');
      return false;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas nao conferem');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast.error('Informe o nome da empresa');
      return;
    }

    if (!acceptTerms) {
      toast.error('Voce precisa aceitar os termos de uso');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuario no Supabase Auth
      // O trigger 'handle_new_user' cria o profile automaticamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email ja esta cadastrado');
        } else {
          console.error('Auth error:', authError);
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuario');
        return;
      }

      // Aguardar um momento para o trigger criar o profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Atualizar o profile com dados completos (trigger ja criou o basico)
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          role: 'owner',
        })
        .eq('id', authData.user.id);

      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
        // Nao falhar aqui, o trigger ja criou o basico
      }

      // 3. Criar organizacao
      const slug = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          slug,
          cnpj: companyCnpj || null,
          phone: companyPhone || null,
          plan: 'free',
          max_users: 1,
          max_products: 50,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        // Continuar mesmo com erro - usuario pode configurar depois
      }

      // 4. Se criou organization, atualizar perfil e criar dados iniciais
      if (orgData) {
        // Atualizar perfil com organization_id
        await supabase
          .from('profiles')
          .update({ organization_id: orgData.id })
          .eq('id', authData.user.id);

        // Criar configuracoes iniciais (ignorar erros)
        await supabase.from('theme_settings').insert({
          organization_id: orgData.id,
        }).then(() => {}).catch(() => {});

        await supabase.from('loyalty_programs').insert({
          organization_id: orgData.id,
          name: 'Programa Fidelidade',
        }).then(() => {}).catch(() => {});

        // Criar formas de pagamento padrao
        const defaultPaymentMethods = [
          { name: 'Dinheiro', type: 'cash', is_active: true },
          { name: 'Cartao de Credito', type: 'credit_card', is_active: true, accepts_installments: true, max_installments: 12 },
          { name: 'Cartao de Debito', type: 'debit_card', is_active: true },
          { name: 'PIX', type: 'pix', is_active: true },
          { name: 'Crediario', type: 'store_credit', is_active: true, accepts_installments: true, max_installments: 6 },
        ];

        await supabase.from('payment_methods').insert(
          defaultPaymentMethods.map(pm => ({ ...pm, organization_id: orgData.id }))
        ).then(() => {}).catch(() => {});
      }

      // Mostrar tela de sucesso
      setStep(3);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: strength, text: 'Fraca', color: 'bg-red-500' };
    if (strength <= 3) return { level: strength, text: 'Media', color: 'bg-yellow-500' };
    return { level: strength, text: 'Forte', color: 'bg-green-500' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Brand */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-8">
        <div className="max-w-lg text-center text-primary-foreground">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 text-4xl font-bold mb-8">
            S
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Comece Gratis
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Crie sua conta e comece a usar o Sellx hoje mesmo
          </p>

          <div className="space-y-4 text-left">
            {[
              { title: 'Sem cartao de credito', desc: 'Comece gratis, sem compromisso' },
              { title: 'Setup em 2 minutos', desc: 'Configuracao rapida e facil' },
              { title: 'Suporte incluido', desc: 'Ajuda quando voce precisar' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm opacity-75">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Step 3: Success - Email Confirmation */}
          {step === 3 ? (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="text-3xl font-bold text-green-600">Conta Criada!</h1>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
                <div className="flex justify-center">
                  <Inbox className="w-12 h-12 text-blue-500" />
                </div>
                <h2 className="text-xl font-semibold text-blue-800">Verifique seu Email</h2>
                <p className="text-blue-700">
                  Enviamos um link de confirmacao para:
                </p>
                <p className="font-semibold text-blue-900 bg-blue-100 py-2 px-4 rounded-lg">
                  {email}
                </p>
                <p className="text-sm text-blue-600">
                  Clique no link do email para ativar sua conta e comecar a usar o Sellx.
                </p>
              </div>
              <div className="space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link to="/login">
                    Ir para Login
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Nao recebeu o email?{' '}
                  <button
                    onClick={() => toast.info('Verifique sua caixa de spam ou aguarde alguns minutos.')}
                    className="text-primary hover:underline font-medium"
                  >
                    Reenviar
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Logo */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
                  S
                </div>
                <h1 className="text-3xl font-bold">Criar Conta</h1>
                <p className="text-muted-foreground mt-2">
                  {step === 1 ? 'Seus dados pessoais' : 'Dados da sua empresa'}
                </p>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </>
          )}

          {/* Step 1: Personal Data */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i <= strength.level ? strength.color : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Forca da senha: {strength.text}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">As senhas nao conferem</p>
                )}
              </div>

              <Button onClick={handleNextStep} className="w-full" size="lg">
                Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Company Data */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Nome fantasia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyCnpj">CNPJ (opcional)</Label>
                <Input
                  id="companyCnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={companyCnpj}
                  onChange={(e) => setCompanyCnpj(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefone (opcional)</Label>
                <Input
                  id="companyPhone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={setAcceptTerms}
                  disabled={loading}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                  Li e aceito os{' '}
                  <Link to="/terms" className="text-primary hover:underline">
                    Termos de Uso
                  </Link>{' '}
                  e{' '}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Politica de Privacidade
                  </Link>
                </label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      Criar Conta
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Login Link */}
          {step !== 3 && (
            <p className="text-center text-sm text-muted-foreground">
              Ja tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
