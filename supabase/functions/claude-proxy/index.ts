import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FEATURE_KEYS: Record<string, string> = {
  astrology: 'ANTHROPIC_KEY_ASTROLOGY',
  daily:     'ANTHROPIC_KEY_DAILY',
  ikigai:    'ANTHROPIC_KEY_IKIGAI',
  analysis:  'ANTHROPIC_KEY_ANALYSIS',
  calling:   'ANTHROPIC_KEY_CALLING',
  goals:     'ANTHROPIC_KEY_GOALS',
  atlas:     'ANTHROPIC_KEY_ATLAS',
  clarity:   'ANTHROPIC_KEY_CLARITY',
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const bodyText = await req.text()
  let feature = 'calling'
  try {
    const parsed = JSON.parse(bodyText)
    if (parsed.feature && FEATURE_KEYS[parsed.feature]) {
      feature = parsed.feature
      delete parsed.feature
    }
    var finalBody = JSON.stringify(parsed)
  } catch {
    var finalBody = bodyText
  }

  const secretName = FEATURE_KEYS[feature] || 'ANTHROPIC_KEY_CALLING'
  const apiKey = Deno.env.get(secretName) || Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: finalBody,
  })

  const data = await response.text()
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
})
