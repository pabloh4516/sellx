import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Search,
  RefreshCcw,
  Download,
  Building2,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function AdminSubscriptions() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [organizations, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      const { data: plansData } = await supabase.from('plans').select('*');

      setOrganizations(orgsData || []);
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...organizations];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((org) =>
        org.name?.toLowerCase().includes(term)
      );
    }
    setFilteredOrgs(filtered);
  };

  const getPlanInfo = (planSlug) => {
    return plans.find((p) => p.slug === planSlug) || { name: 'Gratuito', price_monthly: 0 };
  };

  const getMRR = () => {
    return organizations.reduce((sum, org) => {
      const plan = getPlanInfo(org.plan);
      return sum + (plan.price_monthly || 0);
    }, 0);
  };

  const getPlanBadge = (plan) => {
    const colors = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-violet-100 text-violet-700',
      enterprise: 'bg-amber-100 text-amber-700',
    };
    const labels = {
      free: 'Gratuito',
      starter: 'Starter',
      professional: 'Profissional',
      enterprise: 'Enterprise',
    };
    return <Badge className={colors[plan] || colors.free}>{labels[plan] || plan}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground">Gerencie assinaturas e planos</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(getMRR())}</p>
                <p className="text-sm text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.filter((o) => o.plan !== 'free').length}
                </p>
                <p className="text-sm text-muted-foreground">Pagantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {organizations.filter((o) => o.plan === 'free').length}
                </p>
                <p className="text-sm text-muted-foreground">Gratuitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(getMRR() * 12)}</p>
                <p className="text-sm text-muted-foreground">ARR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar organizacao..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizacao</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inicio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Carregando...</p>
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => {
                  const planInfo = getPlanInfo(org.plan);
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.email || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(org.plan)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(planInfo.price_monthly)}
                      </TableCell>
                      <TableCell>
                        {org.is_active ? (
                          <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
