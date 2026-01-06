import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Cake, Phone, Mail, User, PartyPopper, Users } from 'lucide-react';
import { safeFormatDate } from '@/lib/utils';
import {
  PageContainer,
  PageHeader,
  CardSection,
  Grid,
  StatusBadge,
  MiniMetric,
} from '@/components/nexo';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Birthdays() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await base44.entities.Customer.list();
      setCustomers(data.filter(c => c.birth_date));
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const birthdaysByMonth = customers.filter(customer => {
    if (!customer.birth_date) return false;
    const birthMonth = new Date(customer.birth_date).getMonth() + 1;
    return birthMonth === parseInt(selectedMonth);
  }).sort((a, b) => {
    const dayA = new Date(a.birth_date).getDate();
    const dayB = new Date(b.birth_date).getDate();
    return dayA - dayB;
  });

  const todayBirthdays = customers.filter(customer => {
    if (!customer.birth_date) return false;
    const today = new Date();
    const birthDate = new Date(customer.birth_date);
    return birthDate.getDate() === today.getDate() && 
           birthDate.getMonth() === today.getMonth();
  });

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
        title="Aniversariantes"
        subtitle={`${customers.length} clientes com data de nascimento`}
        icon={Cake}
      />

      {/* Metricas */}
      <Grid cols={3}>
        <MiniMetric
          label="Aniversariantes Hoje"
          value={todayBirthdays.length}
          icon={PartyPopper}
          status={todayBirthdays.length > 0 ? 'success' : 'default'}
        />
        <MiniMetric
          label={`Aniversariantes em ${MONTHS[parseInt(selectedMonth) - 1]}`}
          value={birthdaysByMonth.length}
          icon={Cake}
        />
        <MiniMetric
          label="Total Cadastrados"
          value={customers.length}
          icon={Users}
        />
      </Grid>

      {/* Aniversariantes de Hoje */}
      {todayBirthdays.length > 0 && (
        <CardSection
          title="Aniversariantes de Hoje"
          icon={PartyPopper}
          className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200 dark:border-pink-800"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayBirthdays.map(customer => (
              <div key={customer.id} className="bg-background p-4 rounded-lg border border-pink-200 dark:border-pink-800">
                <div className="flex items-center gap-3">
                  {customer.photo_url ? (
                    <img src={customer.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{customer.name}</p>
                    <div className="text-sm text-muted-foreground">
                      {customer.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {/* Filtro de Mes */}
      <CardSection>
        <div className="flex items-center gap-4">
          <span className="font-medium">Mes:</span>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <StatusBadge status="info" label={`${birthdaysByMonth.length} aniversariantes`} />
        </div>
      </CardSection>

      {/* Grid de Aniversariantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {birthdaysByMonth.map(customer => (
          <CardSection key={customer.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              {customer.photo_url ? (
                <img src={customer.photo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{customer.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {safeFormatDate(customer.birth_date)}
                </p>
                <div className="text-sm space-y-1">
                  {customer.phone && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </p>
                  )}
                  {customer.email && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardSection>
        ))}
      </div>

      {birthdaysByMonth.length === 0 && (
        <CardSection>
          <div className="text-center py-12">
            <Cake className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum aniversariante em {MONTHS[parseInt(selectedMonth) - 1]}</p>
          </div>
        </CardSection>
      )}
    </PageContainer>
  );
}