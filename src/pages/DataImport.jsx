import React, { useState, useCallback } from 'react';
import { base44, isUsingSupabase } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, XCircle,
  FileText, Users, Package, Truck, UserCircle, ArrowRight, RefreshCw,
  Eye, Trash2, HelpCircle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
} from '@/components/nexo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Configuracao das entidades para importacao
const IMPORT_ENTITIES = {
  products: {
    name: 'Produtos',
    icon: Package,
    entity: 'Product',
    fields: [
      { key: 'name', label: 'Nome/Descricao', required: true, aliases: ['descricao', 'produto', 'nome_produto', 'description'] },
      { key: 'code', label: 'Codigo/SKU', aliases: ['sku', 'codigo', 'cod', 'codigo_interno'] },
      { key: 'barcode', label: 'Codigo de Barras', aliases: ['codigo_barras', 'ean', 'gtin', 'cod_barras'] },
      { key: 'description', label: 'Descricao Detalhada', aliases: ['observacoes', 'obs', 'detalhes'] },
      { key: 'cost_price', label: 'Preco de Custo', type: 'number', aliases: ['preco_compra', 'custo', 'valor_compra', 'preco_custo'] },
      { key: 'sale_price', label: 'Preco de Venda', type: 'number', required: true, aliases: ['preco_venda', 'preco', 'valor_venda', 'valor'] },
      { key: 'wholesale_price', label: 'Preco Atacado', type: 'number', aliases: ['preco_venda_2', 'preco_atacado', 'atacado'] },
      { key: 'stock_quantity', label: 'Quantidade em Estoque', type: 'number', aliases: ['estoque', 'qtd_estoque', 'quantidade', 'qtd'] },
      { key: 'min_stock', label: 'Estoque Minimo', type: 'number', aliases: ['estoque_minimo', 'est_minimo', 'minimo'] },
      { key: 'unit', label: 'Unidade', aliases: ['unid', 'un', 'unidade_medida'] },
      { key: 'commission_percent', label: 'Comissao (%)', type: 'number', aliases: ['comissao', 'comissao_percent', 'perc_comissao'] },
      { key: 'location', label: 'Localizacao', aliases: ['localizacao', 'local', 'prateleira'] },
      { key: 'ncm', label: 'NCM', aliases: ['ncm', 'cod_ncm'] },
      { key: 'is_active', label: 'Ativo', type: 'boolean', aliases: ['ativo', 'status', 'controle_estoque'] },
    ],
    requiredFields: ['name', 'sale_price'],
    sampleData: [
      { name: 'Produto Exemplo', code: 'PROD001', barcode: '7891234567890', sale_price: 99.90, cost_price: 50.00, stock_quantity: 100, unit: 'UN' }
    ],
    // Campos ignorados na importacao (nao existem no schema do banco ou nao devem ser importados)
    ignoredCsvFields: ['id', 'grupo', 'categoria', 'marca', 'fornecedor', 'fabricante', 'margem_lucro', 'data_validade', 'grade_pai']
  },
  customers: {
    name: 'Clientes',
    icon: Users,
    entity: 'Customer',
    fields: [
      { key: 'name', label: 'Nome', required: true, aliases: ['nome', 'razao_social', 'cliente'] },
      { key: 'email', label: 'Email', aliases: ['email', 'e_mail', 'e-mail'] },
      { key: 'phone', label: 'Telefone', aliases: ['telefone', 'tel', 'fone', 'celular'] },
      { key: 'phone2', label: 'Telefone 2', aliases: ['telefone2', 'tel2', 'celular2'] },
      { key: 'cpf', label: 'CPF', aliases: ['cpf', 'cpf_cliente'] },
      { key: 'cnpj', label: 'CNPJ', aliases: ['cnpj', 'cnpj_cliente'] },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ', aliases: ['cpf_cnpj', 'documento'] },
      { key: 'rg', label: 'RG', aliases: ['rg', 'identidade'] },
      { key: 'ie', label: 'Inscricao Estadual', aliases: ['inscricao_estadual', 'ie', 'insc_estadual'] },
      { key: 'person_type', label: 'Tipo Pessoa', aliases: ['pessoa', 'tipo_pessoa', 'tipo'] },
      { key: 'address', label: 'Endereco', aliases: ['endereco', 'logradouro', 'rua'] },
      { key: 'number', label: 'Numero', aliases: ['numero', 'num', 'nro'] },
      { key: 'complement', label: 'Complemento', aliases: ['complemento', 'compl'] },
      { key: 'neighborhood', label: 'Bairro', aliases: ['bairro'] },
      { key: 'city', label: 'Cidade', aliases: ['cidade', 'municipio'] },
      { key: 'state', label: 'Estado/UF', aliases: ['uf', 'estado'] },
      { key: 'zip_code', label: 'CEP', aliases: ['cep', 'codigo_postal'] },
      { key: 'birth_date', label: 'Data de Nascimento', type: 'date', aliases: ['data_nascimento', 'nascimento', 'dt_nascimento'] },
      { key: 'credit_limit', label: 'Limite de Credito', type: 'number', aliases: ['limite_credito', 'limite_credito_venda_aprazo', 'limite'] },
      { key: 'notes', label: 'Observacoes', aliases: ['observacoes', 'obs', 'anotacoes'] },
      { key: 'is_vip', label: 'VIP', type: 'boolean', aliases: ['vip', 'cliente_vip'] },
    ],
    requiredFields: ['name'],
    sampleData: [
      { name: 'Cliente Exemplo', email: 'cliente@email.com', phone: '(11) 1234-5678', cpf: '123.456.789-00', city: 'Sao Paulo', state: 'SP' }
    ],
    // Campos ignorados na importacao (nao existem no schema do banco)
    ignoredCsvFields: ['id', 'data_emissao', 'emissor', 'estado_civil', 'naturalidade', 'nome_pai', 'nome_mae']
  },
  suppliers: {
    name: 'Fornecedores',
    icon: Truck,
    entity: 'Supplier',
    fields: [
      { key: 'name', label: 'Nome/Razao Social', required: true },
      { key: 'trade_name', label: 'Nome Fantasia' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefone' },
      { key: 'contact_name', label: 'Contato' },
      { key: 'address', label: 'Endereco' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'Estado' },
      { key: 'zip_code', label: 'CEP' },
      { key: 'payment_terms', label: 'Condicoes de Pagamento' },
      { key: 'notes', label: 'Observacoes' },
    ],
    requiredFields: ['name'],
    sampleData: [
      { name: 'Fornecedor LTDA', trade_name: 'Fornecedor', cnpj: '12.345.678/0001-90', email: 'fornecedor@email.com', city: 'Sao Paulo', state: 'SP' }
    ]
  },
  sellers: {
    name: 'Vendedores',
    icon: UserCircle,
    entity: 'Seller',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefone' },
      { key: 'cpf', label: 'CPF' },
      { key: 'commission_percent', label: 'Comissao (%)', type: 'number' },
      { key: 'monthly_goal', label: 'Meta Mensal', type: 'number' },
      { key: 'hire_date', label: 'Data de Admissao', type: 'date' },
      { key: 'is_active', label: 'Ativo', type: 'boolean' },
    ],
    requiredFields: ['name'],
    sampleData: [
      { name: 'Vendedor Exemplo', email: 'vendedor@email.com', phone: '(11) 98765-4321', commission_percent: 5, is_active: true }
    ]
  },
};

export default function DataImport() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [importProgress, setImportProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState([]);
  const [step, setStep] = useState(1); // 1: selecao, 2: mapeamento, 3: preview, 4: resultado
  const [updateDuplicates, setUpdateDuplicates] = useState(false); // Atualizar registros duplicados

  // Funcao para parsear CSV
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    // Detectar separador
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const headers = firstLine.split(separator).map(h => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.replace(/"/g, '').trim());
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return { headers, data };
  };

  // Handler do arquivo
  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const { headers, data } = parseCSV(text);

        if (data.length === 0) {
          toast.error('Arquivo vazio ou formato invalido');
          return;
        }

        setHeaders(headers);
        setParsedData(data);

        // Auto-mapear campos com nomes similares usando aliases
        const entityConfig = IMPORT_ENTITIES[selectedEntity];
        if (entityConfig) {
          const autoMapping = {};
          const ignoredFields = [];

          headers.forEach(header => {
            const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '');

            // Verificar se o campo deve ser ignorado (nao existe no schema)
            if (entityConfig.ignoredCsvFields) {
              const isIgnored = entityConfig.ignoredCsvFields.some(ignored => {
                const normalizedIgnored = ignored.toLowerCase().replace(/[^a-z0-9_]/g, '');
                return normalizedIgnored === normalizedHeader;
              });
              if (isIgnored) {
                ignoredFields.push(header);
                return; // Pular este campo
              }
            }

            const matchedField = entityConfig.fields.find(field => {
              const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9_]/g, '');
              const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9_]/g, '');

              // Verificar match direto com key ou label
              if (normalizedKey === normalizedHeader || normalizedLabel === normalizedHeader) {
                return true;
              }

              // Verificar match com aliases
              if (field.aliases) {
                return field.aliases.some(alias => {
                  const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  return normalizedAlias === normalizedHeader;
                });
              }

              return false;
            });
            if (matchedField) {
              autoMapping[header] = matchedField.key;
            }
          });
          setFieldMapping(autoMapping);

          // Contar quantos campos foram mapeados automaticamente
          const mappedCount = Object.keys(autoMapping).length;
          if (mappedCount > 0) {
            toast.info(`${mappedCount} campos mapeados automaticamente`);
          }

          // Avisar sobre campos ignorados
          if (ignoredFields.length > 0) {
            toast.warning(`${ignoredFields.length} campos serao ignorados: ${ignoredFields.join(', ')}`);
          }
        }

        setStep(2);
        toast.success(`${data.length} registros encontrados`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Erro ao processar arquivo');
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  }, [selectedEntity]);

  // Funcao para validar dados
  const validateData = () => {
    const entityConfig = IMPORT_ENTITIES[selectedEntity];
    const validationErrors = [];
    const validData = [];

    parsedData.forEach((row, index) => {
      const mappedRow = {};
      let rowErrors = [];

      // Mapear campos
      Object.entries(fieldMapping).forEach(([csvHeader, entityField]) => {
        if (entityField && row[csvHeader] !== undefined) {
          const fieldConfig = entityConfig.fields.find(f => f.key === entityField);
          let value = row[csvHeader];

          // Conversao de tipo
          if (fieldConfig?.type === 'number') {
            // Tratar valores vazios como 0 para numeros
            if (value === '' || value === null || value === undefined) {
              value = 0;
            } else {
              value = parseFloat(String(value).replace(',', '.')) || 0;
            }
          } else if (fieldConfig?.type === 'boolean') {
            value = ['true', 'sim', 'yes', '1', 's'].includes(String(value).toLowerCase());
          } else if (fieldConfig?.type === 'date') {
            // Tentar converter data no formato DD/MM/YYYY ou YYYY-MM-DD
            if (value && value.includes('/')) {
              const [day, month, year] = value.split('/');
              value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          mappedRow[entityField] = value;
        }
      });

      // Tratamentos especiais por entidade
      if (selectedEntity === 'products') {
        // Se nao tem code mas tem barcode, usar barcode como code
        if (!mappedRow.code && mappedRow.barcode) {
          mappedRow.code = mappedRow.barcode;
        }
        // Se nao tem code nem barcode, gerar um codigo automatico
        if (!mappedRow.code) {
          mappedRow.code = `PROD${String(index + 1).padStart(5, '0')}`;
        }
        // Garantir que is_active seja true por padrao
        if (mappedRow.is_active === undefined) {
          mappedRow.is_active = true;
        }
      }

      if (selectedEntity === 'customers') {
        // Se tem cpf mas nao tem cpf_cnpj, usar cpf
        if (!mappedRow.cpf_cnpj && mappedRow.cpf) {
          mappedRow.cpf_cnpj = mappedRow.cpf;
        }
        // Se tem cnpj mas nao tem cpf_cnpj, usar cnpj
        if (!mappedRow.cpf_cnpj && mappedRow.cnpj) {
          mappedRow.cpf_cnpj = mappedRow.cnpj;
        }
        // Tratar tipo de pessoa
        if (mappedRow.person_type) {
          const pt = String(mappedRow.person_type).toLowerCase();
          if (pt === 'f' || pt === 'fisica' || pt === 'pf' || pt === 'pessoa fisica') {
            mappedRow.person_type = 'PF';
          } else if (pt === 'j' || pt === 'juridica' || pt === 'pj' || pt === 'pessoa juridica') {
            mappedRow.person_type = 'PJ';
          }
        }
      }

      // Verificar campos obrigatorios
      entityConfig.requiredFields.forEach(field => {
        if (!mappedRow[field] || mappedRow[field] === '') {
          rowErrors.push(`Campo obrigatorio "${entityConfig.fields.find(f => f.key === field)?.label}" vazio`);
        }
      });

      if (rowErrors.length > 0) {
        validationErrors.push({ row: index + 2, errors: rowErrors, data: row });
      } else {
        validData.push(mappedRow);
      }
    });

    return { validData, validationErrors };
  };

  // Handler de mapeamento
  const handleMappingChange = (csvHeader, entityField) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvHeader]: entityField === '_ignore' ? null : entityField
    }));
  };

  // Avancar para preview
  const handleGoToPreview = () => {
    const { validData, validationErrors } = validateData();
    setErrors(validationErrors);

    if (validData.length === 0) {
      toast.error('Nenhum registro valido para importar');
      return;
    }

    setStep(3);
  };

  // Executar importacao
  const handleImport = async () => {
    const { validData, validationErrors } = validateData();

    if (validData.length === 0) {
      toast.error('Nenhum registro valido para importar');
      return;
    }

    // Verificar se organization_id esta disponivel (importante para Supabase)
    if (isUsingSupabase && base44.getOrganizationId) {
      const orgId = await base44.getOrganizationId();
      if (!orgId) {
        toast.error('Erro: Nao foi possivel identificar a organizacao. Faca logout e login novamente.');
        return;
      }
    }

    setImporting(true);
    setImportProgress(0);
    setErrors(validationErrors);

    const entityConfig = IMPORT_ENTITIES[selectedEntity];
    const results = { success: 0, failed: 0, skipped: 0, updated: 0, errors: [] };

    // Carregar registros existentes para verificar duplicados
    let existingRecords = [];
    try {
      existingRecords = await base44.entities[entityConfig.entity].list();
    } catch (e) {
      console.warn('Nao foi possivel carregar registros existentes:', e);
    }

    // Criar mapa de registros existentes por codigo/nome
    const existingMap = new Map();
    existingRecords.forEach(record => {
      if (record.code) existingMap.set(`code:${record.code}`, record);
      if (record.barcode) existingMap.set(`barcode:${record.barcode}`, record);
      if (record.cpf_cnpj) existingMap.set(`cpf_cnpj:${record.cpf_cnpj}`, record);
      if (record.name) existingMap.set(`name:${record.name.toLowerCase()}`, record);
    });

    try {
      for (let i = 0; i < validData.length; i++) {
        const data = validData[i];

        // Verificar se ja existe
        let existingRecord = null;
        if (data.code) existingRecord = existingMap.get(`code:${data.code}`);
        if (!existingRecord && data.barcode) existingRecord = existingMap.get(`barcode:${data.barcode}`);
        if (!existingRecord && data.cpf_cnpj) existingRecord = existingMap.get(`cpf_cnpj:${data.cpf_cnpj}`);

        try {
          if (existingRecord) {
            if (updateDuplicates) {
              // Atualizar registro existente
              await base44.entities[entityConfig.entity].update(existingRecord.id, data);
              results.updated++;
            } else {
              // Pular duplicado
              results.skipped++;
            }
          } else {
            // Criar novo registro
            await base44.entities[entityConfig.entity].create(data);
            results.success++;
          }
        } catch (error) {
          // Se o erro for de duplicidade e estamos atualizando, tentar update
          if (error.message?.includes('duplicate') && updateDuplicates) {
            try {
              // Tentar encontrar pelo codigo e atualizar
              const existing = existingRecords.find(r => r.code === data.code || r.barcode === data.barcode);
              if (existing) {
                await base44.entities[entityConfig.entity].update(existing.id, data);
                results.updated++;
              } else {
                throw error;
              }
            } catch (updateError) {
              results.failed++;
              results.errors.push({
                row: i + 1,
                error: updateError.message || 'Erro ao atualizar',
                data
              });
            }
          } else {
            results.failed++;
            results.errors.push({
              row: i + 1,
              error: error.message || 'Erro desconhecido',
              data
            });
          }
        }

        setImportProgress(((i + 1) / validData.length) * 100);
      }

      setImportResults(results);
      setStep(4);

      // Limpar cache apos importacao para garantir que dados aparecam nas outras paginas
      if (base44.clearCache) {
        base44.clearCache();
      }

      if (results.success > 0) {
        toast.success(`${results.success} registros criados!`);
      }
      if (results.updated > 0) {
        toast.success(`${results.updated} registros atualizados!`);
      }
      if (results.skipped > 0) {
        toast.info(`${results.skipped} registros ignorados (ja existem)`);
      }
      if (results.failed > 0) {
        toast.error(`${results.failed} registros falharam`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro durante a importacao');
    } finally {
      setImporting(false);
    }
  };

  // Gerar arquivo de modelo
  const downloadTemplate = () => {
    const entityConfig = IMPORT_ENTITIES[selectedEntity];
    if (!entityConfig) return;

    const headers = entityConfig.fields.map(f => f.label);
    const sampleRow = entityConfig.fields.map(f => {
      const sample = entityConfig.sampleData[0];
      return sample[f.key] || '';
    });

    const csv = [headers.join(';'), sampleRow.join(';')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_${selectedEntity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setFieldMapping({});
    setImportProgress(0);
    setImportResults(null);
    setErrors([]);
    setUpdateDuplicates(false);
    setStep(1);
  };

  const entityConfig = IMPORT_ENTITIES[selectedEntity];

  return (
    <PageContainer>
      <PageHeader
        title="Importacao de Dados"
        subtitle="Importe produtos, clientes, fornecedores e vendedores via CSV"
        icon={Upload}
      />

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[
          { num: 1, label: 'Selecao' },
          { num: 2, label: 'Mapeamento' },
          { num: 3, label: 'Preview' },
          { num: 4, label: 'Resultado' }
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold">
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : s.num}
              </span>
              <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            </div>
            {idx < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Selecao de entidade e arquivo */}
      {step === 1 && (
        <div className="space-y-6">
          <CardSection title="Selecione o tipo de dados" icon={FileText}>
            <Grid cols={4}>
              {Object.entries(IMPORT_ENTITIES).map(([key, config]) => (
                <div
                  key={key}
                  onClick={() => setSelectedEntity(key)}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all",
                    selectedEntity === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      selectedEntity === key ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{config.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.fields.length} campos disponiveis
                  </p>
                </div>
              ))}
            </Grid>
          </CardSection>

          {selectedEntity && (
            <CardSection title="Upload do Arquivo" icon={Upload}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo CSV
                  </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Baixe o modelo e preencha com seus dados</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    "hover:border-primary/50 cursor-pointer"
                  )}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">
                    Clique para selecionar um arquivo CSV
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: .csv, .txt (separado por virgula ou ponto-e-virgula)
                  </p>
                </div>

                {/* Campos obrigatorios */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Campos Obrigatorios</p>
                      <p className="text-sm text-amber-700">
                        {entityConfig?.requiredFields.map(f =>
                          entityConfig.fields.find(field => field.key === f)?.label
                        ).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardSection>
          )}
        </div>
      )}

      {/* Step 2: Mapeamento de campos */}
      {step === 2 && (
        <div className="space-y-6">
          <CardSection title="Mapeamento de Campos" icon={ArrowRight}>
            <p className="text-sm text-muted-foreground mb-4">
              Associe as colunas do seu arquivo aos campos do sistema. Os campos obrigatorios estao marcados com *.
            </p>

            <div className="space-y-3">
              {headers.map(header => (
                <div key={header} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{header}</p>
                    <p className="text-xs text-muted-foreground">
                      Exemplo: {parsedData[0]?.[header] || '-'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="w-64">
                    <Select
                      value={fieldMapping[header] || '_ignore'}
                      onValueChange={(v) => handleMappingChange(header, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_ignore">Ignorar</SelectItem>
                        {entityConfig?.fields.map(field => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label} {field.required && '*'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleReset}>
                Voltar
              </Button>
              <Button onClick={handleGoToPreview}>
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardSection>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Resumo */}
          <Grid cols={3}>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{parsedData.length}</p>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">{parsedData.length - errors.length}</p>
              <p className="text-sm text-muted-foreground">Validos para Importar</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">{errors.length}</p>
              <p className="text-sm text-muted-foreground">Com Erros</p>
            </div>
          </Grid>

          {/* Erros */}
          {errors.length > 0 && (
            <CardSection title="Registros com Erros" icon={AlertCircle}>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {errors.slice(0, 20).map((error, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-800">Linha {error.row}</span>
                    </div>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {error.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                ))}
                {errors.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center">
                    E mais {errors.length - 20} erros...
                  </p>
                )}
              </div>
            </CardSection>
          )}

          {/* Preview dos dados */}
          <CardSection title="Preview dos Dados" icon={Eye}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {Object.entries(fieldMapping)
                      .filter(([_, v]) => v)
                      .map(([header, field]) => (
                        <th key={header} className="px-4 py-2 text-left font-medium">
                          {entityConfig?.fields.find(f => f.key === field)?.label || field}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {Object.entries(fieldMapping)
                        .filter(([_, v]) => v)
                        .map(([header]) => (
                          <td key={header} className="px-4 py-2">
                            {row[header] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Mostrando 10 de {parsedData.length} registros
                </p>
              )}
            </div>
          </CardSection>

          {/* Opcao de duplicados */}
          <CardSection title="Opcoes de Importacao" icon={Info}>
            <div className="flex items-center gap-3">
              <Checkbox
                id="updateDuplicates"
                checked={updateDuplicates}
                onCheckedChange={setUpdateDuplicates}
              />
              <label htmlFor="updateDuplicates" className="text-sm cursor-pointer">
                <span className="font-medium">Atualizar registros duplicados</span>
                <p className="text-muted-foreground text-xs">
                  Se marcado, registros com mesmo codigo/codigo de barras serao atualizados.
                  Caso contrario, serao ignorados.
                </p>
              </label>
            </div>
          </CardSection>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || parsedData.length - errors.length === 0}
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {parsedData.length - errors.length} Registros
                </>
              )}
            </Button>
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={importProgress} />
              <p className="text-sm text-center text-muted-foreground">
                {importProgress.toFixed(0)}% concluido
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && importResults && (
        <div className="space-y-6">
          <CardSection>
            <div className="text-center py-8">
              {(importResults.success > 0 || importResults.updated > 0) ? (
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
              )}
              <h2 className="text-2xl font-bold mb-2">
                Importacao Concluida
              </h2>
              <p className="text-muted-foreground">
                Veja o resumo abaixo
              </p>
            </div>

            <Grid cols={4}>
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                <RefreshCw className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-600">{importResults.updated || 0}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-amber-600">{importResults.skipped || 0}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg text-center">
                <XCircle className="w-6 h-6 mx-auto text-red-600 mb-2" />
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
            </Grid>

            {importResults.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Erros na Importacao:</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {importResults.errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="p-2 bg-red-500/10 rounded text-sm">
                      <span className="font-medium">Registro {error.row}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4 mt-8">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Nova Importacao
              </Button>
            </div>
          </CardSection>
        </div>
      )}
    </PageContainer>
  );
}
