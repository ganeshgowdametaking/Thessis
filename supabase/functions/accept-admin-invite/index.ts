// @ts-expect-error: Deno.env is available in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error: Deno and remote imports are available in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const accessToken = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return jsonResponse({ error: 'Sign in to accept this invitation' }, 401);
    }

    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration missing' }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !user?.email || !user.email_confirmed_at) {
      return jsonResponse({ error: 'A confirmed sign-in is required' }, 401);
    }

    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return jsonResponse({ error: 'Invalid invitation link' }, 400);
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: accepted, error: acceptError } = await supabaseClient.rpc(
      'accept_admin_invite_secure',
      { p_token_hash: await hashToken(token), p_user_id: user.id },
    );
    if (acceptError) {
      console.error('Accept admin invite RPC error:', acceptError);
      return jsonResponse({ error: 'Failed to accept invitation' }, 500);
    }
    if (!accepted) {
      return jsonResponse({ error: 'Invitation is invalid, expired, already used, or belongs to another account' }, 400);
    }

    return jsonResponse({ success: true, message: 'Administrator access granted' });
  } catch (error) {
    console.error('Accept admin invite error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
