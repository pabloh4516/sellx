import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Building2, Check, CheckCircle2, Inbox, Phone, CreditCard, Zap, Crown, Rocket } from 'lucide-react';
import { createFullSubscription } from '@/services/asaasSubscription';
import { useSiteSettings } from '@/hooks/useSiteSettings';

// Mask helpers
const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCNPJ = (value) => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const validateCPF = (cpf) => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(numbers[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(numbers[10]);
};

// Planos default (serão sobrescritos pelos valores do banco)
const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 79,
    icon: Zap,
    color: 'blue',
    features: ['1 usuario', '1 PDV', 'Ate 500 produtos'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    icon: Crown,
    color: 'violet',
    popular: true,
    features: ['5 usuarios', '3 PDVs', 'Produtos ilimitados'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    icon: Rocket,
    color: 'amber',
    features: ['Usuarios ilimitados', 'PDVs ilimitados', 'Suporte dedicado'],
  },
];

export default function Register() {
  // Buscar configurações do banco
  const { settings: planSettings } = useSiteSettings('plans');
  const { settings: paymentSettings } = useSiteSettings('payment');

  // Montar planos com valores do banco
  const PLANS = DEFAULT_PLANS.map(plan => ({
    ...plan,
    price: planSettings[`plans_${plan.id}_price`] || plan.price,
    name: planSettings[`plans_${plan.id}_name`] || plan.name,
  }));

  // Dias de trial do banco ou default
  const trialDays = planSettings.plans_trial_days || 7;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plano') || 'professional';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Dados pessoais
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Dados da empresa
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Step 3: Plano
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);

  // Terms
  const [acceptTerms, setAcceptTerms] = useState(false);

  const validateStep1 = () => {
    if (!fullName.trim()) {
      toast.error('Informe seu nome completo');
      return false;
    }
    if (!cpf.trim()) {
      toast.error('Informe seu CPF');
      return false;
    }
    if (!validateCPF(cpf)) {
      toast.error('CPF invalido');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Informe seu telefone');
      return false;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Telefone invalido');
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

  const validateStep2 = () => {
    if (!companyName.trim()) {
      toast.error('Informe o nome da empresa');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

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
            cpf: cpf.replace(/\D/g, ''),
            phone: phone.replace(/\D/g, ''),
            company_name: companyName,
            selected_plan: selectedPlan,
          },
        },
      });

      if (authError) {
        console.error('Auth error completo:', JSON.stringify(authError, null, 2));
        console.error('Status:', authError.status);
        console.error('Message:', authError.message);

        if (authError.message.includes('already registered')) {
          toast.error('Este email ja esta cadastrado');
        } else if (authError.message.includes('Password should be')) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
        } else if (authError.message.includes('Unable to validate')) {
          toast.error('Email invalido. Verifique o formato do email.');
        } else if (authError.message.includes('Signups not allowed')) {
          toast.error('Cadastro de novos usuarios esta desabilitado no servidor');
        } else {
          toast.error(authError.message || 'Erro ao criar conta');
        }
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuario');
        return;
      }

      // Aguardar um momento para garantir que o usuario foi criado
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Criar o profile diretamente (nao depender do trigger)
      // Primeiro tentar buscar se o trigger ja criou
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (existingProfile) {
        // Profile existe, apenas atualizar
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            email: email,
            cpf: cpf.replace(/\D/g, ''),
            phone: phone.replace(/\D/g, ''),
            role: 'owner',
            is_active: true,
          })
          .eq('id', authData.user.id);

        if (updateProfileError) {
          console.error('Error updating profile:', updateProfileError);
        }
      } else {
        // Profile nao existe, criar diretamente
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName,
            email: email,
            cpf: cpf.replace(/\D/g, ''),
            phone: phone.replace(/\D/g, ''),
            role: 'owner',
            is_active: true,
          });

        if (insertProfileError) {
          console.error('Error creating profile:', insertProfileError);
          // Isso é critico - o usuario nao vai conseguir usar o sistema
          toast.error('Erro ao criar perfil. Entre em contato com o suporte.');
          return;
        }
      }

      // 3. Criar organizacao com limites baseados no plano
      const planLimits = {
        starter: { max_users: 1, max_products: 500 },
        professional: { max_users: 5, max_products: -1 },
        enterprise: { max_users: -1, max_products: -1 },
      };

      const limits = planLimits[selectedPlan] || planLimits.starter;

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
          cnpj: companyCnpj ? companyCnpj.replace(/\D/g, '') : null,
          phone: companyPhone ? companyPhone.replace(/\D/g, '') : phone.replace(/\D/g, ''),
          plan: selectedPlan,
          max_users: limits.max_users,
          max_products: limits.max_products,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        // Continuar mesmo com erro - usuario pode configurar depois
      }

      // 4. Se criou organization, atualizar perfil e criar dados iniciais
      if (orgData) {
        // Atualizar perfil com organization_id - CRITICO para isolamento de dados
        const { error: orgIdError } = await supabase
          .from('profiles')
          .update({ organization_id: orgData.id })
          .eq('id', authData.user.id);

        if (orgIdError) {
          console.error('CRITICAL: Error setting organization_id:', orgIdError);
          // Tentar novamente apos pequeno delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const { error: retryError } = await supabase
            .from('profiles')
            .update({ organization_id: orgData.id })
            .eq('id', authData.user.id);

          if (retryError) {
            console.error('CRITICAL: Retry failed:', retryError);
            // Mesmo com erro, continuar para mostrar tela de sucesso
            // O usuario pode precisar contatar suporte
          }
        }

        // 5. Criar assinatura no Asaas (se API key configurada)
        const asaasApiKey = paymentSettings?.payment_asaas_api_key;

        if (asaasApiKey) {
          try {
            const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
            const planPrice = selectedPlanData?.price || 79;

            const subscriptionResult = await createFullSubscription({
              customerName: fullName,
              customerEmail: email,
              customerCpf: cpf,
              customerPhone: phone,
              planName: selectedPlanData?.name || selectedPlan,
              planValue: planPrice,
              trialDays: trialDays,
              organizationId: orgData.id,
              billingType: 'PIX',
              cycle: 'MONTHLY',
            }, asaasApiKey);

            if (subscriptionResult.success) {
              // Atualizar organization com dados do Asaas
              const trialEndsAt = new Date();
              trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

              await supabase
                .from('organizations')
                .update({
                  asaas_customer_id: subscriptionResult.customerId,
                  asaas_subscription_id: subscriptionResult.subscriptionId,
                  subscription_status: 'trial',
                  trial_ends_at: trialEndsAt.toISOString(),
                  billing_email: email,
                })
                .eq('id', orgData.id);

              console.log('Assinatura Asaas criada:', subscriptionResult.subscriptionId);
            } else {
              console.error('Erro ao criar assinatura Asaas:', subscriptionResult.error);
              // Nao falhar o cadastro por isso - usuario pode configurar depois
            }
          } catch (asaasError) {
            console.error('Erro ao integrar com Asaas:', asaasError);
            // Continuar mesmo com erro - cadastro local funciona
          }
        } else {
          // Sem API Key - apenas definir trial local
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

          await supabase
            .from('organizations')
            .update({
              subscription_status: 'trial',
              trial_ends_at: trialEndsAt.toISOString(),
            })
            .eq('id', orgData.id);
        }

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
      setStep(4);

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
          {/* Step 4: Success - Email Confirmation */}
          {step === 4 ? (
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
                  {step === 1 ? 'Seus dados pessoais' : step === 2 ? 'Dados da sua empresa' : 'Escolha seu plano'}
                </p>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </>
          )}

          {/* Step 1: Personal Data */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className="pl-10"
                      maxLength={14}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="pl-10"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar *</Label>
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
                </div>
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
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Forca: {strength.text}</span>
                    {confirmPassword && password !== confirmPassword && (
                      <span className="text-red-500">Senhas nao conferem</span>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={handleNextStep} className="w-full" size="lg">
                Continuar
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Company Data */}
          {step === 2 && (
            <div className="space-y-4">
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyCnpj">CNPJ (opcional)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="companyCnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(formatCNPJ(e.target.value))}
                    className="pl-10"
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Telefone da Empresa (opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="companyPhone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(formatPhone(e.target.value))}
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </Button>
                <Button onClick={handleNextStep} className="flex-1" size="lg">
                  Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid gap-3">
                {PLANS.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                          Popular
                        </span>
                      )}
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          plan.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          plan.color === 'violet' ? 'bg-violet-100 text-violet-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{plan.name}</h3>
                            <div className="text-right">
                              <span className="text-2xl font-bold">R${plan.price}</span>
                              <span className="text-sm text-muted-foreground">/mes</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {plan.features.map((f, i) => (
                              <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Teste gratis por {trialDays} dias. Cancele quando quiser.
              </p>

              <div className="flex items-start space-x-2 pt-2">
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
                  onClick={() => setStep(2)}
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
          {step !== 4 && (
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
