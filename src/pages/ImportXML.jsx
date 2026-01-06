import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, FileUp } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
} from '@/components/nexo';

export default function ImportXML() {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    toast.info('Funcionalidade de importacao XML em desenvolvimento');
    setUploading(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Importar XML de Nota Fiscal"
        subtitle="Importe notas fiscais eletronicas (NFe) em formato XML"
        icon={FileUp}
      />

      <div className="max-w-3xl mx-auto">
        <CardSection>
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Arraste o arquivo XML aqui</h3>
            <p className="text-muted-foreground mb-4">ou clique para selecionar</p>
            <input
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
              id="xml-upload"
              disabled={uploading}
            />
            <label htmlFor="xml-upload">
              <Button asChild disabled={uploading}>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo XML
                </span>
              </Button>
            </label>
          </div>
        </CardSection>

        <CardSection className="bg-info/10 border-info/20">
          <h4 className="font-semibold text-info mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            O que sera importado:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-7">
            <li>Dados do fornecedor</li>
            <li>Produtos e quantidades</li>
            <li>Valores e impostos</li>
            <li>Numero da nota fiscal</li>
            <li>Atualizacao automatica do estoque</li>
          </ul>
        </CardSection>
      </div>
    </PageContainer>
  );
}
