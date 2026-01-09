// Supabase Edge Function - Asaas Webhook
// Recebe notificacoes de pagamento e assinatura do Asaas
// IMPORTANTE: Esta funcao NAO requer autenticacao JWT (webhook externo)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apenas POST permitido
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Metodo nao permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Criar cliente Supabase com service role (acesso total)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar token de autenticacao do webhook (opcional mas recomendado)
    const webhookToken = req.headers.get('asaas-access-token')

    // Buscar token configurado no banco
    const { data: tokenConfig } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_asaas_webhook_token')
      .single()

    const expectedToken = tokenConfig?.value?.replace(/"/g, '')

    // Se tem token configurado, validar
    if (expectedToken && expectedToken.length > 0) {
      if (webhookToken !== expectedToken) {
        console.log('Token de webhook invalido. Esperado:', expectedToken, 'Recebido:', webhookToken)
        return new Response(
          JSON.stringify({ error: 'Token invalido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parsear body
    const body = await req.json()

    console.log('Asaas Webhook recebido:', JSON.stringify(body, null, 2))

    const { event } = body

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Evento nao informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // EVENTOS DE ASSINATURA
    // ============================================
    if (event.startsWith('SUBSCRIPTION_')) {
      const subscription = body.subscription

      if (!subscription) {
        return new Response(
          JSON.stringify({ error: 'Dados de assinatura invalidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Buscar organizacao pela assinatura
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('asaas_subscription_id', subscription.id)
        .single()

      if (orgError && orgError.code !== 'PGRST116') {
        console.error('Erro ao buscar organizacao:', orgError)
      }

      // SUBSCRIPTION_DELETED - Assinatura cancelada
      if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_INACTIVATED') {
        if (org) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'cancelled',
              subscription_ends_at: new Date().toISOString(),
            })
            .eq('id', org.id)

          console.log('Assinatura cancelada:', org.id)
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Assinatura cancelada' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // SUBSCRIPTION_UPDATED - Assinatura atualizada
      if (event === 'SUBSCRIPTION_UPDATED') {
        // Pode ser upgrade/downgrade de plano
        console.log('Assinatura atualizada:', subscription.id)
        return new Response(
          JSON.stringify({ success: true, message: 'Assinatura atualizada' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: `Evento ${event} recebido` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // EVENTOS DE PAGAMENTO
    // ============================================
    if (event.startsWith('PAYMENT_')) {
      const payment = body.payment

      if (!payment) {
        return new Response(
          JSON.stringify({ error: 'Dados de pagamento invalidos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const externalRef = payment.externalReference
      const subscriptionId = payment.subscription

      // ========== PAGAMENTO DE ASSINATURA ==========
      if (subscriptionId) {
        // Buscar organizacao pela assinatura
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('asaas_subscription_id', subscriptionId)
          .single()

        // Pagamento confirmado
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          // Registrar pagamento
          await supabase
            .from('subscription_payments')
            .upsert({
              asaas_payment_id: payment.id,
              organization_id: org?.id,
              asaas_subscription_id: subscriptionId,
              amount: payment.value,
              status: 'paid',
              billing_type: payment.billingType,
              due_date: payment.dueDate,
              payment_date: payment.paymentDate || payment.confirmedDate || new Date().toISOString(),
              invoice_url: payment.invoiceUrl,
            }, {
              onConflict: 'asaas_payment_id'
            })

          // Atualizar status da organizacao
          if (org) {
            await supabase
              .from('organizations')
              .update({
                subscription_status: 'active',
                last_payment_at: new Date().toISOString(),
              })
              .eq('id', org.id)

            console.log('Pagamento de assinatura confirmado:', org.id)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Pagamento de assinatura confirmado' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Pagamento vencido
        if (event === 'PAYMENT_OVERDUE') {
          if (org) {
            await supabase
              .from('organizations')
              .update({ subscription_status: 'overdue' })
              .eq('id', org.id)

            // Registrar pagamento vencido
            await supabase
              .from('subscription_payments')
              .upsert({
                asaas_payment_id: payment.id,
                organization_id: org.id,
                asaas_subscription_id: subscriptionId,
                amount: payment.value,
                status: 'overdue',
                billing_type: payment.billingType,
                due_date: payment.dueDate,
              }, {
                onConflict: 'asaas_payment_id'
              })

            console.log('Pagamento de assinatura vencido:', org.id)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Pagamento vencido registrado' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Pagamento estornado
        if (event === 'PAYMENT_REFUNDED') {
          if (org) {
            await supabase
              .from('subscription_payments')
              .update({ status: 'refunded' })
              .eq('asaas_payment_id', payment.id)

            console.log('Pagamento estornado:', payment.id)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Estorno registrado' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // ========== PAGAMENTO AVULSO (Sistema Offline) ==========
      if (externalRef && externalRef.startsWith('OFFLINE-')) {
        // Buscar pedido existente
        const { data: existingOrder } = await supabase
          .from('offline_orders')
          .select('*')
          .eq('order_nsu', externalRef)
          .single()

        // Pagamento confirmado
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          const updateData = {
            status: 'paid',
            payment_method: payment.billingType?.toLowerCase() || 'pix',
            payment_id: payment.id,
            paid_at: payment.paymentDate || payment.confirmedDate || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          if (existingOrder) {
            await supabase
              .from('offline_orders')
              .update(updateData)
              .eq('order_nsu', externalRef)

            console.log('Pedido offline pago:', externalRef)

            // TODO: Enviar email com link de download
          } else {
            // Criar pedido (nao deveria acontecer)
            await supabase
              .from('offline_orders')
              .insert({
                order_nsu: externalRef,
                customer_name: 'Cliente Asaas',
                customer_email: '',
                amount: payment.value,
                ...updateData,
                download_token: crypto.randomUUID(),
              })

            console.log('Pedido offline criado via webhook:', externalRef)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Pagamento offline confirmado' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Pagamento estornado
        if (event === 'PAYMENT_REFUNDED') {
          if (existingOrder) {
            await supabase
              .from('offline_orders')
              .update({
                status: 'refunded',
                updated_at: new Date().toISOString(),
              })
              .eq('order_nsu', externalRef)

            console.log('Pedido offline estornado:', externalRef)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Estorno processado' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Pagamento vencido
        if (event === 'PAYMENT_OVERDUE') {
          if (existingOrder) {
            await supabase
              .from('offline_orders')
              .update({
                status: 'cancelled',
                notes: 'Pagamento vencido',
                updated_at: new Date().toISOString(),
              })
              .eq('order_nsu', externalRef)

            console.log('Pedido offline vencido:', externalRef)
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Pedido vencido' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Pagamento sem referencia conhecida
      console.log(`Evento ${event} recebido para pagamento:`, payment.id)
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Evento desconhecido
    console.log('Evento desconhecido:', event)
    return new Response(
      JSON.stringify({ success: true, message: `Evento ${event} ignorado` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
