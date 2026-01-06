import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Phone, User, Clock, History, FileText, Copy,
  ExternalLink, Sparkles, CheckCircle, Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';

// Templates de mensagens pre-definidos
const MESSAGE_TEMPLATES = {
  greeting: {
    name: 'Saudacao',
    icon: '👋',
    message: 'Ola {nome}! Tudo bem? Aqui e a {empresa}. Como posso ajudar voce hoje?'
  },
  sale_complete: {
    name: 'Venda Concluida',
    icon: '✅',
    message: 'Ola {nome}! Sua compra foi concluida com sucesso. Valor: {valor}. Obrigado pela preferencia! {empresa}'
  },
  payment_reminder: {
    name: 'Lembrete de Pagamento',
    icon: '💳',
    message: 'Ola {nome}! Lembramos que voce possui uma conta em aberto no valor de {valor} com vencimento em {vencimento}. Entre em contato conosco para mais informacoes. {empresa}'
  },
  birthday: {
    name: 'Aniversario',
    icon: '🎂',
    message: 'Feliz Aniversario, {nome}! 🎉 A {empresa} deseja a voce um dia repleto de alegrias. Venha comemorar conosco e aproveite um desconto especial!'
  },
  promotion: {
    name: 'Promocao',
    icon: '🏷️',
    message: 'Ola {nome}! A {empresa} preparou uma promocao especial para voce: {descricao}. Venha conferir!'
  },
  quote: {
    name: 'Orcamento',
    icon: '📋',
    message: 'Ola {nome}! Segue o orcamento solicitado no valor de {valor}. Valido ate {validade}. Qualquer duvida estamos a disposicao! {empresa}'
  },
  order_ready: {
    name: 'Pedido Pronto',
    icon: '📦',
    message: 'Ola {nome}! Seu pedido esta pronto para retirada. Aguardamos voce! {empresa}'
  },
  thanks: {
    name: 'Agradecimento',
    icon: '🙏',
    message: 'Ola {nome}! Agradecemos sua visita e compra. Esperamos ve-lo(a) em breve! {empresa}'
  },
  service_reminder: {
    name: 'Lembrete de Servico',
    icon: '🔧',
    message: 'Ola {nome}! Lembramos que sua ordem de servico #{numero} esta pronta para retirada. {empresa}'
  },
  custom: {
    name: 'Personalizada',
    icon: '✏️',
    message: ''
  }
};

// Hook para usar WhatsApp
export const useWhatsApp = () => {
  const [companyName, setCompanyName] = useState('Sua Empresa');

  useEffect(() => {
    // Carregar nome da empresa
    const loadCompany = async () => {
      try {
        const companies = await base44.entities.Company.list();
        if (companies.length > 0) {
          setCompanyName(companies[0].name || 'Sua Empresa');
        }
      } catch (error) {
        console.error('Error loading company:', error);
      }
    };
    loadCompany();
  }, []);

  const formatPhone = (phone) => {
    if (!phone) return '';
    // Remove tudo que nao e numero
    let cleaned = phone.replace(/\D/g, '');
    // Adiciona 55 se nao tiver codigo do pais
    if (cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  };

  const replaceVariables = (message, variables) => {
    let result = message;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
    });
    return result;
  };

  const openWhatsApp = (phone, message) => {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) {
      toast.error('Numero de telefone invalido');
      return false;
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
    return true;
  };

  const sendMessage = async (customer, templateKey, customVariables = {}) => {
    const phone = customer.mobile || customer.phone;
    if (!phone) {
      toast.error('Cliente sem numero de telefone');
      return false;
    }

    const template = MESSAGE_TEMPLATES[templateKey];
    if (!template) {
      toast.error('Template nao encontrado');
      return false;
    }

    const variables = {
      nome: customer.name?.split(' ')[0] || 'Cliente',
      empresa: companyName,
      ...customVariables
    };

    const message = replaceVariables(template.message, variables);
    const success = openWhatsApp(phone, message);

    if (success) {
      // Registrar envio no historico
      try {
        await base44.entities.WhatsAppMessage?.create({
          customer_id: customer.id,
          customer_name: customer.name,
          phone: phone,
          template: templateKey,
          message: message,
          sent_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error logging message:', error);
      }
    }

    return success;
  };

  return {
    openWhatsApp,
    sendMessage,
    formatPhone,
    replaceVariables,
    companyName,
    templates: MESSAGE_TEMPLATES
  };
};

// Componente de botao simples para WhatsApp
export function WhatsAppButton({ phone, message, size = 'default', variant = 'outline', className }) {
  const { openWhatsApp } = useWhatsApp();

  const handleClick = () => {
    openWhatsApp(phone, message || 'Ola!');
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={!phone}
    >
      <MessageCircle className="w-4 h-4" />
      WhatsApp
    </Button>
  );
}

// Componente de Dialog para envio de mensagem
export function WhatsAppDialog({ open, onOpenChange, customer, sale, receivable }) {
  const { sendMessage, replaceVariables, companyName, templates } = useWhatsApp();
  const [selectedTemplate, setSelectedTemplate] = useState('greeting');
  const [customMessage, setCustomMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open && customer?.id) {
      loadHistory();
    }
  }, [open, customer?.id]);

  useEffect(() => {
    if (selectedTemplate === 'custom') {
      setCustomMessage(customMessage || '');
    } else {
      const template = templates[selectedTemplate];
      const variables = getVariables();
      setCustomMessage(replaceVariables(template.message, variables));
    }
  }, [selectedTemplate]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const messages = await base44.entities.WhatsAppMessage?.filter({
        customer_id: customer.id
      }) || [];
      setHistory(messages.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at)));
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getVariables = () => {
    const vars = {
      nome: customer?.name?.split(' ')[0] || 'Cliente',
      empresa: companyName
    };

    if (sale) {
      vars.valor = formatCurrency(sale.total);
    }

    if (receivable) {
      vars.valor = formatCurrency(receivable.amount);
      vars.vencimento = format(new Date(receivable.due_date), 'dd/MM/yyyy');
    }

    return vars;
  };

  const handleSend = () => {
    const phone = customer?.mobile || customer?.phone;
    if (!phone) {
      toast.error('Cliente sem numero de telefone');
      return;
    }

    const { openWhatsApp, formatPhone } = useWhatsApp();
    const formattedPhone = formatPhone(phone);
    const encodedMessage = encodeURIComponent(customMessage);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');

    // Registrar
    try {
      base44.entities.WhatsAppMessage?.create({
        customer_id: customer.id,
        customer_name: customer.name,
        phone: phone,
        template: selectedTemplate,
        message: customMessage,
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging message:', error);
    }

    toast.success('WhatsApp aberto!');
    loadHistory();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    toast.success('Mensagem copiada!');
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        {/* Info do Cliente */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {customer.mobile || customer.phone || 'Sem telefone'}
            </p>
          </div>
          {(customer.mobile || customer.phone) && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700">
              <Phone className="w-3 h-3 mr-1" />
              Disponivel
            </Badge>
          )}
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Enviar Mensagem</TabsTrigger>
            <TabsTrigger value="history">Historico</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4 mt-4">
            {/* Selecao de Template */}
            <div>
              <Label>Modelo de Mensagem</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(templates).map(([key, template]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={cn(
                      "p-2 border rounded-lg cursor-pointer text-center transition-all",
                      selectedTemplate === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-xl">{template.icon}</span>
                    <p className="text-xs font-medium mt-1">{template.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Editor de Mensagem */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Mensagem</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={5}
                placeholder="Digite sua mensagem..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                {customMessage.length} caracteres
              </p>
            </div>

            {/* Variaveis disponiveis */}
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Variaveis Disponiveis</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {['{nome}', '{empresa}', '{valor}', '{vencimento}', '{validade}', '{numero}', '{descricao}'].map(v => (
                  <Badge key={v} variant="secondary" className="text-xs cursor-pointer" onClick={() => {
                    setCustomMessage(prev => prev + ' ' + v);
                  }}>
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Botao de Envio */}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleSend}
              disabled={!customMessage || !(customer.mobile || customer.phone)}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar via WhatsApp
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma mensagem enviada</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {history.map((msg, idx) => (
                  <div key={msg.id || idx} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {templates[msg.template]?.icon} {templates[msg.template]?.name || msg.template}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.sent_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Componente de envio em massa
export function WhatsAppBulkSender({ customers, template, customVariables = {} }) {
  const { sendMessage, templates } = useWhatsApp();
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ sent: 0, failed: 0 });

  const handleBulkSend = async () => {
    setSending(true);
    setProgress(0);
    setResults({ sent: 0, failed: 0 });

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const success = await sendMessage(customer, template, customVariables);

      setResults(prev => ({
        sent: success ? prev.sent + 1 : prev.sent,
        failed: success ? prev.failed : prev.failed + 1
      }));
      setProgress(((i + 1) / customers.length) * 100);

      // Delay entre mensagens para evitar bloqueio
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setSending(false);
    toast.success(`Envio concluido: ${results.sent} enviados, ${results.failed} falharam`);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Atencao:</strong> O envio abrira o WhatsApp Web para cada contato.
          Certifique-se de estar logado no WhatsApp Web.
        </p>
      </div>

      <Button
        onClick={handleBulkSend}
        disabled={sending || customers.length === 0}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {sending ? (
          <>Enviando... {progress.toFixed(0)}%</>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Enviar para {customers.length} cliente(s)
          </>
        )}
      </Button>

      {sending && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {(results.sent > 0 || results.failed > 0) && (
        <div className="flex gap-4 justify-center">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {results.sent} enviados
          </div>
          {results.failed > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <X className="w-4 h-4" />
              {results.failed} falharam
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WhatsAppDialog;
