import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Calendar, Mail, Download, FileText } from 'lucide-react';

export default function ReportScheduler({ reportType, reportData, onClose }) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [format, setFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSendEmail = async () => {
    if (!email) {
      toast.error('Informe o e-mail de destino');
      return;
    }

    setSending(true);
    try {
      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Relatório enviado por e-mail com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erro ao enviar relatório');
    } finally {
      setSending(false);
    }
  };

  const handleExportPDF = async () => {
    setSending(true);
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Relatório exportado com sucesso!');
      
      // Trigger download (simulation)
      const link = document.createElement('a');
      link.href = '#';
      link.download = `relatorio-${reportType}-${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!email) {
      toast.error('Informe o e-mail de destino');
      return;
    }

    if (frequency === 'once') {
      await handleSendEmail();
      return;
    }

    setSending(true);
    try {
      // Simulate scheduling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Relatório agendado para envio ${frequency === 'daily' ? 'diário' : frequency === 'weekly' ? 'semanal' : 'mensal'}!`);
      onClose();
    } catch (error) {
      console.error('Error scheduling report:', error);
      toast.error('Erro ao agendar relatório');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Exportar e Agendar Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <Label>E-mail de Destino</Label>
            <Input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Frequency */}
          <div>
            <Label>Frequência de Envio</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Enviar Agora
                  </div>
                </SelectItem>
                <SelectItem value="daily">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Diário
                  </div>
                </SelectItem>
                <SelectItem value="weekly">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Semanal
                  </div>
                </SelectItem>
                <SelectItem value="monthly">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Mensal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Format */}
          <div>
            <Label>Formato de Exportação</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Charts */}
          <div className="flex items-center justify-between">
            <Label>Incluir Gráficos</Label>
            <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">💡 Dica</p>
            <p>Os relatórios agendados serão enviados automaticamente no horário configurado (08:00).</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPDF} 
            disabled={sending}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar {format.toUpperCase()}
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={sending}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {frequency === 'once' ? 'Enviar' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}