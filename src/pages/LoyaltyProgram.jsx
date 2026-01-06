import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Award, Users, Gift, Settings, DollarSign } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  DataTable,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

export default function LoyaltyProgram() {
  const [program, setProgram] = useState(null);
  const [customerPoints, setCustomerPoints] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: 'Programa de Fidelidade',
    points_per_real: 1,
    reais_per_point: 0.01,
    min_purchase_for_points: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if entities exist before calling
      const programs = base44.entities.LoyaltyProgram
        ? await base44.entities.LoyaltyProgram.list()
        : [];
      const points = base44.entities.CustomerPoints
        ? await base44.entities.CustomerPoints.list()
        : [];
      const customersData = await base44.entities.Customer.list();

      if (programs.length > 0) {
        setProgram(programs[0]);
        setFormData(programs[0]);
      }

      setCustomerPoints(points);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados do programa de fidelidade');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    try {
      if (program) {
        await base44.entities.LoyaltyProgram.update(program.id, formData);
        toast.success('Programa atualizado!');
      } else {
        const newProgram = await base44.entities.LoyaltyProgram.create(formData);
        setProgram(newProgram);
        toast.success('Programa criado!');
      }
      loadData();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Erro ao salvar programa');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.name || 'Cliente';
  };

  const totalPoints = customerPoints.reduce((sum, cp) => sum + (cp.points_balance || 0), 0);
  const totalCustomersWithPoints = customerPoints.filter(cp => cp.points_balance > 0).length;

  const customerColumns = [
    {
      key: 'customer',
      label: 'Cliente',
      render: (_, cp) => (
        <span className="font-medium">{getCustomerName(cp.customer_id)}</span>
      )
    },
    {
      key: 'points_balance',
      label: 'Pontos',
      className: 'text-center',
      render: (_, cp) => (
        <StatusBadge status="info" label={cp.points_balance || 0} />
      )
    },
    {
      key: 'points_earned',
      label: 'Ganhos',
      className: 'text-center',
      render: (_, cp) => (
        <span className="text-success font-medium">+{cp.points_earned || 0}</span>
      )
    },
    {
      key: 'points_redeemed',
      label: 'Utilizados',
      className: 'text-center',
      render: (_, cp) => (
        <span className="text-muted-foreground">-{cp.points_redeemed || 0}</span>
      )
    },
    {
      key: 'value',
      label: 'Valor Disponivel',
      className: 'text-right',
      render: (_, cp) => (
        <span className="font-bold text-success">
          {formatCurrency((cp.points_balance || 0) * formData.reais_per_point)}
        </span>
      )
    },
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
        title="Programa de Fidelidade"
        subtitle="Configure e gerencie pontos de clientes"
        icon={Award}
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Pontos Ativos"
          value={totalPoints.toFixed(0)}
          icon={Award}
          status="info"
        />
        <MiniMetric
          label="Clientes com Pontos"
          value={totalCustomersWithPoints}
          icon={Users}
          status="success"
        />
        <MiniMetric
          label="Valor em Pontos"
          value={formatCurrency(totalPoints * (formData.reais_per_point || 0))}
          icon={Gift}
        />
      </Grid>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuracao</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <CardSection title="Configuracoes do Programa" icon={Settings}>
            <div className="space-y-4">
              <div>
                <Label>Nome do Programa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pontos por R$ 1,00 Gasto</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.points_per_real}
                    onChange={(e) => setFormData({...formData, points_per_real: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 1 = ganhar 1 ponto a cada R$ 1,00
                  </p>
                </div>

                <div>
                  <Label>Valor de Cada Ponto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.reais_per_point}
                    onChange={(e) => setFormData({...formData, reais_per_point: parseFloat(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 0.01 = cada ponto vale R$ 0,01
                  </p>
                </div>
              </div>

              <div>
                <Label>Valor Minimo para Ganhar Pontos (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_purchase_for_points}
                  onChange={(e) => setFormData({...formData, min_purchase_for_points: parseFloat(e.target.value)})}
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-sm">
                <p className="font-medium mb-2">Exemplo de Funcionamento:</p>
                <p className="text-muted-foreground">
                  Cliente compra R$ 100,00 = ganha <span className="font-bold text-foreground">{(100 * formData.points_per_real).toFixed(0)} pontos</span>
                  <br />
                  {(100 * formData.points_per_real).toFixed(0)} pontos = <span className="font-bold text-success">{formatCurrency(100 * formData.points_per_real * formData.reais_per_point)}</span> de desconto
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProgram}>
                  Salvar Configuracoes
                </Button>
              </div>
            </div>
          </CardSection>
        </TabsContent>

        <TabsContent value="customers">
          <CardSection title="Clientes e Pontos" icon={Users} noPadding>
            <DataTable
              data={customerPoints.filter(cp => cp.points_balance > 0).sort((a, b) => (b.points_balance || 0) - (a.points_balance || 0))}
              columns={customerColumns}
              emptyMessage="Nenhum cliente com pontos"
            />
          </CardSection>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}