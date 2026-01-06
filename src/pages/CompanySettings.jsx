import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Save, MapPin, Phone, Mail, Globe } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
} from '@/components/nexo';

export default function CompanySettings() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    cnpj: '',
    ie: '',
    im: '',
    logo_url: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: ''
  });

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const companies = await base44.entities.Company.list();
      if (companies.length > 0) {
        const comp = companies[0];
        setCompany(comp);
        setFormData({
          name: comp.name || '',
          trade_name: comp.trade_name || '',
          cnpj: comp.cnpj || '',
          ie: comp.ie || '',
          im: comp.im || '',
          logo_url: comp.logo_url || '',
          address: comp.address || '',
          city: comp.city || '',
          state: comp.state || '',
          zip_code: comp.zip_code || '',
          phone: comp.phone || '',
          email: comp.email || '',
          website: comp.website || ''
        });
      }
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (company) {
        await base44.entities.Company.update(company.id, formData);
        toast.success('Dados da empresa atualizados');
      } else {
        await base44.entities.Company.create(formData);
        toast.success('Empresa cadastrada');
      }
      loadCompany();
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Erro ao salvar dados da empresa');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: result.file_url });
      toast.success('Logotipo enviado');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logotipo');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Dados da Empresa"
        subtitle="Configure as informacoes da sua empresa"
        icon={Building2}
        actions={
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificacao */}
        <CardSection title="Identificacao" icon={Building2}>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center relative overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground">Logotipo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label>Razao Social *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Nome Fantasia</Label>
                <Input
                  value={formData.trade_name}
                  onChange={(e) => setFormData({...formData, trade_name: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <Label>CNPJ</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
              />
            </div>
            <div>
              <Label>Inscricao Estadual</Label>
              <Input
                value={formData.ie}
                onChange={(e) => setFormData({...formData, ie: e.target.value})}
              />
            </div>
            <div>
              <Label>Inscricao Municipal</Label>
              <Input
                value={formData.im}
                onChange={(e) => setFormData({...formData, im: e.target.value})}
              />
            </div>
          </div>
        </CardSection>

        {/* Endereco */}
        <CardSection title="Endereco" icon={MapPin}>
          <div className="space-y-4">
            <div>
              <Label>Endereco</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <Label>UF</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  maxLength={2}
                />
              </div>
            </div>

            <div className="w-1/3">
              <Label>CEP</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
              />
            </div>
          </div>
        </CardSection>

        {/* Contato */}
        <CardSection title="Contato" icon={Phone}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://"
              />
            </div>
          </div>
        </CardSection>
      </form>
    </PageContainer>
  );
}