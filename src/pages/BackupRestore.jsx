import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Database, Download, Upload, History, Clock, CheckCircle, AlertCircle,
  RefreshCw, FileJson, Calendar, HardDrive, Trash2, Eye, Shield, Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
} from '@/components/nexo';

// Entidades disponíveis para backup
const BACKUP_ENTITIES = [
  { key: 'Product', name: 'Produtos', icon: '📦' },
  { key: 'Customer', name: 'Clientes', icon: '👥' },
  { key: 'Supplier', name: 'Fornecedores', icon: '🚚' },
  { key: 'Seller', name: 'Vendedores', icon: '👤' },
  { key: 'Sale', name: 'Vendas', icon: '🛒' },
  { key: 'Purchase', name: 'Compras', icon: '📥' },
  { key: 'Receivable', name: 'Contas a Receber', icon: '💰' },
  { key: 'Payable', name: 'Contas a Pagar', icon: '💸' },
  { key: 'Expense', name: 'Despesas', icon: '📊' },
  { key: 'ProductGroup', name: 'Categorias', icon: '🏷️' },
  { key: 'CashRegister', name: 'Caixa', icon: '💵' },
  { key: 'StockMovement', name: 'Movimentacoes', icon: '📈' },
  { key: 'Promotion', name: 'Promocoes', icon: '🎁' },
  { key: 'Company', name: 'Empresa', icon: '🏢' },
  { key: 'User', name: 'Usuarios', icon: '🔐' },
];

export default function BackupRestore() {
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntities, setSelectedEntities] = useState(BACKUP_ENTITIES.map(e => e.key));
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreStats, setRestoreStats] = useState(null);
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    loadBackupHistory();
    loadSettings();
  }, []);

  const loadBackupHistory = async () => {
    try {
      const history = await base44.entities.BackupLog?.list() || [];
      setBackupHistory(history.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading backup history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await base44.entities.SystemSettings?.list() || [];
      const backupSetting = settings.find(s => s.key === 'auto_backup');
      setAutoBackup(backupSetting?.value === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleEntity = (entityKey) => {
    setSelectedEntities(prev =>
      prev.includes(entityKey)
        ? prev.filter(k => k !== entityKey)
        : [...prev, entityKey]
    );
  };

  const selectAllEntities = () => {
    setSelectedEntities(BACKUP_ENTITIES.map(e => e.key));
  };

  const deselectAllEntities = () => {
    setSelectedEntities([]);
  };

  const handleBackup = async () => {
    if (selectedEntities.length === 0) {
      toast.error('Selecione pelo menos uma entidade');
      return;
    }

    setIsBackingUp(true);
    setBackupProgress(0);

    const backupData = {
      version: '1.0',
      created_at: new Date().toISOString(),
      entities: {}
    };

    try {
      for (let i = 0; i < selectedEntities.length; i++) {
        const entityKey = selectedEntities[i];
        try {
          const data = await base44.entities[entityKey]?.list() || [];
          backupData.entities[entityKey] = data;
        } catch (error) {
          console.error(`Error backing up ${entityKey}:`, error);
          backupData.entities[entityKey] = [];
        }
        setBackupProgress(((i + 1) / selectedEntities.length) * 100);
      }

      // Calcular estatisticas
      let totalRecords = 0;
      Object.values(backupData.entities).forEach(data => {
        totalRecords += data.length;
      });

      // Download do arquivo
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Registrar backup no historico
      try {
        await base44.entities.BackupLog?.create({
          type: 'backup',
          entities: selectedEntities,
          records_count: totalRecords,
          file_name: a.download,
          status: 'success'
        });
      } catch (error) {
        console.error('Error logging backup:', error);
      }

      toast.success(`Backup concluido! ${totalRecords} registros exportados.`);
      loadBackupHistory();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Erro ao criar backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.version || !data.entities) {
          toast.error('Arquivo de backup invalido');
          return;
        }

        // Calcular estatisticas
        const stats = {
          version: data.version,
          created_at: data.created_at,
          entities: {}
        };

        Object.entries(data.entities).forEach(([key, records]) => {
          stats.entities[key] = {
            count: records.length,
            name: BACKUP_ENTITIES.find(e => e.key === key)?.name || key
          };
        });

        setRestoreData(data);
        setRestoreStats(stats);
        setShowRestoreDialog(true);
      } catch (error) {
        console.error('Error parsing backup file:', error);
        toast.error('Erro ao ler arquivo de backup');
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreData) return;

    const confirmed = window.confirm(
      'ATENCAO: A restauracao ira substituir todos os dados existentes. Deseja continuar?'
    );

    if (!confirmed) return;

    setIsRestoring(true);
    setRestoreProgress(0);

    const entities = Object.keys(restoreData.entities);
    let totalRestored = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < entities.length; i++) {
        const entityKey = entities[i];
        const records = restoreData.entities[entityKey];

        for (const record of records) {
          try {
            // Remover campos de sistema
            const { id, created_date, updated_date, ...cleanRecord } = record;
            await base44.entities[entityKey]?.create(cleanRecord);
            totalRestored++;
          } catch (error) {
            console.error(`Error restoring ${entityKey} record:`, error);
            totalFailed++;
          }
        }

        setRestoreProgress(((i + 1) / entities.length) * 100);
      }

      // Registrar restauracao
      try {
        await base44.entities.BackupLog?.create({
          type: 'restore',
          entities: entities,
          records_count: totalRestored,
          file_name: restoreFile.name,
          status: totalFailed > 0 ? 'partial' : 'success',
          notes: `${totalRestored} restaurados, ${totalFailed} falharam`
        });
      } catch (error) {
        console.error('Error logging restore:', error);
      }

      toast.success(`Restauracao concluida! ${totalRestored} registros restaurados.`);
      if (totalFailed > 0) {
        toast.warning(`${totalFailed} registros falharam`);
      }

      loadBackupHistory();
      setShowRestoreDialog(false);
      setRestoreData(null);
      setRestoreStats(null);
      setRestoreFile(null);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleToggleAutoBackup = async () => {
    const newValue = !autoBackup;
    setAutoBackup(newValue);

    try {
      // Salvar configuracao
      const settings = await base44.entities.SystemSettings?.list() || [];
      const existing = settings.find(s => s.key === 'auto_backup');

      if (existing) {
        await base44.entities.SystemSettings?.update(existing.id, { value: String(newValue) });
      } else {
        await base44.entities.SystemSettings?.create({
          key: 'auto_backup',
          value: String(newValue)
        });
      }

      toast.success(newValue ? 'Backup automatico ativado' : 'Backup automatico desativado');
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Erro ao salvar configuracao');
    }
  };

  const deleteBackupLog = async (id) => {
    if (!confirm('Remover este registro do historico?')) return;

    try {
      await base44.entities.BackupLog?.delete(id);
      toast.success('Registro removido');
      loadBackupHistory();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Erro ao remover registro');
    }
  };

  const historyColumns = [
    {
      key: 'type',
      label: 'Tipo',
      render: (_, log) => (
        <div className="flex items-center gap-2">
          {log.type === 'backup' ? (
            <Download className="w-4 h-4 text-blue-600" />
          ) : (
            <Upload className="w-4 h-4 text-green-600" />
          )}
          <span className="font-medium capitalize">{log.type}</span>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Data',
      render: (_, log) => (
        <span>{format(new Date(log.created_date), 'dd/MM/yyyy HH:mm')}</span>
      )
    },
    {
      key: 'records',
      label: 'Registros',
      render: (_, log) => (
        <Badge variant="outline">{log.records_count || 0}</Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, log) => (
        <StatusBadge
          status={log.status === 'success' ? 'success' : log.status === 'partial' ? 'warning' : 'error'}
          label={log.status === 'success' ? 'Sucesso' : log.status === 'partial' ? 'Parcial' : 'Erro'}
        />
      )
    },
    {
      key: 'file',
      label: 'Arquivo',
      render: (_, log) => (
        <span className="text-sm text-muted-foreground">{log.file_name}</span>
      )
    },
    {
      key: 'actions',
      label: '',
      className: 'w-12',
      render: (_, log) => (
        <Button variant="ghost" size="icon" onClick={() => deleteBackupLog(log.id)}>
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      )
    }
  ];

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
    <PageContainer>
      <PageHeader
        title="Backup e Restauracao"
        subtitle="Proteja seus dados com backups regulares"
        icon={Database}
      />

      <Grid cols={2}>
        {/* Backup */}
        <CardSection title="Criar Backup" icon={Download}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporte seus dados para um arquivo JSON que pode ser usado para restaurar o sistema.
            </p>

            {/* Selecao de entidades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dados para Exportar</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllEntities}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllEntities}>
                    Nenhum
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {BACKUP_ENTITIES.map(entity => (
                  <div
                    key={entity.key}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                      selectedEntities.includes(entity.key)
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleEntity(entity.key)}
                  >
                    <Checkbox checked={selectedEntities.includes(entity.key)} />
                    <span className="text-lg">{entity.icon}</span>
                    <span className="text-sm">{entity.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEntities.length} de {BACKUP_ENTITIES.length} selecionados
              </p>
            </div>

            {isBackingUp && (
              <div className="space-y-2">
                <Progress value={backupProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  {backupProgress.toFixed(0)}% concluido
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleBackup}
              disabled={isBackingUp || selectedEntities.length === 0}
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Criando Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Criar Backup
                </>
              )}
            </Button>
          </div>
        </CardSection>

        {/* Restauracao */}
        <CardSection title="Restaurar Backup" icon={Upload}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Restaure seus dados a partir de um arquivo de backup JSON.
            </p>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Atencao</p>
                  <p className="text-sm text-amber-700">
                    A restauracao pode duplicar dados existentes. Recomendamos fazer um backup antes de restaurar.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('restore-input').click()}
            >
              <input
                id="restore-input"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Clique para selecionar arquivo de backup</p>
              <p className="text-sm text-muted-foreground">Formato: .json</p>
            </div>
          </div>
        </CardSection>
      </Grid>

      {/* Configuracoes */}
      <CardSection title="Configuracoes" icon={Settings2}>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">Backup Automatico</p>
            <p className="text-sm text-muted-foreground">
              Criar backup automaticamente todos os dias
            </p>
          </div>
          <Switch checked={autoBackup} onCheckedChange={handleToggleAutoBackup} />
        </div>
      </CardSection>

      {/* Historico */}
      <CardSection title="Historico de Backups" icon={History} noPadding>
        <DataTable
          data={backupHistory}
          columns={historyColumns}
          emptyMessage="Nenhum backup registrado"
        />
      </CardSection>

      {/* Dialog de Restauracao */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Restauracao</DialogTitle>
          </DialogHeader>

          {restoreStats && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Versao:</span>
                  <Badge>{restoreStats.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data do Backup:</span>
                  <span className="text-sm">
                    {format(new Date(restoreStats.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Dados a serem restaurados:</Label>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {Object.entries(restoreStats.entities).map(([key, info]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <span className="text-sm">{info.name}</span>
                      <Badge variant="outline">{info.count} registros</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {isRestoring && (
                <div className="space-y-2">
                  <Progress value={restoreProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    {restoreProgress.toFixed(0)}% concluido
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={isRestoring}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
