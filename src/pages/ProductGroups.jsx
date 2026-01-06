import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tag, FolderOpen, Layers } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  MiniMetric,
} from '@/components/nexo';

export default function ProductGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_group_id: '',
    is_active: true
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const data = await base44.entities.ProductGroup.list();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nome do grupo e obrigatorio');
      return;
    }

    try {
      if (editingGroup) {
        await base44.entities.ProductGroup.update(editingGroup.id, formData);
        toast.success('Grupo atualizado');
      } else {
        await base44.entities.ProductGroup.create(formData);
        toast.success('Grupo cadastrado');
      }
      setShowForm(false);
      resetForm();
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Erro ao salvar grupo');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || '',
      parent_group_id: group.parent_group_id || '',
      is_active: group.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (group) => {
    if (!confirm(`Excluir "${group.name}"?`)) return;

    try {
      await base44.entities.ProductGroup.delete(group.id);
      toast.success('Grupo excluido');
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erro ao excluir grupo');
    }
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      parent_group_id: '',
      is_active: true
    });
  };

  const parentGroups = groups.filter(g => !g.parent_group_id);
  const subGroups = groups.filter(g => g.parent_group_id);
  const getParentName = (id) => groups.find(g => g.id === id)?.name || '-';

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
        title="Grupos e Categorias"
        subtitle={`${groups.length} grupos cadastrados`}
        icon={Layers}
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        }
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Total de Grupos"
          value={groups.length}
          icon={Layers}
        />
        <MiniMetric
          label="Grupos Principais"
          value={parentGroups.length}
          icon={FolderOpen}
        />
        <MiniMetric
          label="Subgrupos"
          value={subGroups.length}
          icon={Tag}
        />
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grupos Principais */}
        <CardSection>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Grupos Principais
          </h3>
          <div className="space-y-2">
            {parentGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {groups.filter(g => g.parent_group_id === group.id).length} subgrupos
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(group)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {parentGroups.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum grupo cadastrado</p>
            )}
          </div>
        </CardSection>

        {/* Subgrupos */}
        <CardSection>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-success" />
            Subgrupos
          </h3>
          <div className="space-y-2">
            {subGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-muted-foreground">Grupo: {getParentName(group.parent_group_id)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(group)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {subGroups.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum subgrupo cadastrado</p>
            )}
          </div>
        </CardSection>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do Grupo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Ex: Eletronicos, Roupas, etc."
              />
            </div>

            <div>
              <Label>Grupo Pai (opcional)</Label>
              <Select
                value={formData.parent_group_id}
                onValueChange={(v) => setFormData({...formData, parent_group_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (grupo principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (grupo principal)</SelectItem>
                  {parentGroups.filter(g => g.id !== editingGroup?.id).map(group => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um grupo pai para criar um subgrupo
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingGroup ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
