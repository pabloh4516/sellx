// Supabase Edge Function - Asaas API Proxy
// Faz proxy das chamadas para API do Asaas para evitar CORS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase para buscar config
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar API key do Asaas no banco
    const { data: apiKeyConfig } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_asaas_api_key')
      .single()

    const { data: envConfig } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_asaas_environment')
      .single()

    const apiKey = apiKeyConfig?.value?.replace(/"/g, '')
    const environment = envConfig?.value?.replace(/"/g, '') || 'sandbox'

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key do Asaas nao configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Base URL do Asaas
    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3'

    // Parsear body da requisicao
    const body = await req.json()
    const { endpoint, method = 'GET', data } = body

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint nao informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fazer chamada para API do Asaas
    const asaasUrl = `${baseUrl}${endpoint}`

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(data)
    }

    console.log(`[Asaas Proxy] ${method} ${asaasUrl}`)

    const response = await fetch(asaasUrl, fetchOptions)
    const responseData = await response.json()

    if (!response.ok) {
      console.error('[Asaas Proxy] Error:', responseData)
      return new Response(
        JSON.stringify({ error: responseData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Asaas Proxy] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
