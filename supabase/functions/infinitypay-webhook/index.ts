// Supabase Edge Function - InfinityPay Webhook
// Recebe notificacoes de pagamento da InfinityPay

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InfinityPayWebhook {
  order_nsu: string
  transaction_nsu: string
  slug: string
  status: 'approved' | 'pending' | 'rejected' | 'refunded'
  amount: number
  payment_method: string
  paid_at?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
    document?: string
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role (acesso total)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parsear body
    const body: InfinityPayWebhook = await req.json()

    console.log('InfinityPay Webhook recebido:', JSON.stringify(body, null, 2))

    // Validar dados obrigatorios
    if (!body.order_nsu) {
      return new Response(
        JSON.stringify({ error: 'order_nsu obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar pedido existente
    const { data: existingOrder, error: fetchError } = await supabase
      .from('offline_orders')
      .select('*')
      .eq('order_nsu', body.order_nsu)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar pedido:', fetchError)
    }

    // Se pagamento aprovado
    if (body.status === 'approved') {
      const updateData = {
        status: 'paid',
        payment_method: body.payment_method || 'unknown',
        payment_id: body.transaction_nsu,
        paid_at: body.paid_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (existingOrder) {
        // Atualizar pedido existente
        const { error: updateError } = await supabase
          .from('offline_orders')
          .update(updateData)
          .eq('order_nsu', body.order_nsu)

        if (updateError) {
          console.error('Erro ao atualizar pedido:', updateError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar pedido' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Pedido atualizado com sucesso:', body.order_nsu)

        // TODO: Enviar email com link de download
        // await sendDownloadEmail(existingOrder.customer_email, existingOrder.download_token)

      } else {
        // Criar novo pedido (caso nao exista)
        const newOrder = {
          order_nsu: body.order_nsu,
          customer_name: body.customer?.name || 'Cliente',
          customer_email: body.customer?.email || '',
          customer_phone: body.customer?.phone || '',
          customer_cpf: body.customer?.document || '',
          amount: (body.amount || 0) / 100, // Converter de centavos
          status: 'paid',
          payment_method: body.payment_method,
          payment_id: body.transaction_nsu,
          paid_at: body.paid_at || new Date().toISOString(),
          download_token: crypto.randomUUID(),
        }

        const { error: insertError } = await supabase
          .from('offline_orders')
          .insert(newOrder)

        if (insertError) {
          console.error('Erro ao criar pedido:', insertError)
          return new Response(
            JSON.stringify({ error: 'Erro ao criar pedido' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Novo pedido criado:', body.order_nsu)
      }

      // Resposta de sucesso
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pagamento processado',
          order_nsu: body.order_nsu
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se pagamento cancelado/rejeitado
    if (body.status === 'rejected' || body.status === 'refunded') {
      if (existingOrder) {
        const { error: updateError } = await supabase
          .from('offline_orders')
          .update({
            status: body.status === 'refunded' ? 'refunded' : 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('order_nsu', body.order_nsu)

        if (updateError) {
          console.error('Erro ao atualizar pedido:', updateError)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Status atualizado para ${body.status}`,
          order_nsu: body.order_nsu
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Status pendente - apenas log
    console.log('Pagamento pendente:', body.order_nsu)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook recebido',
        order_nsu: body.order_nsu
      }),
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
