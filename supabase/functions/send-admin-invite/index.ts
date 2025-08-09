// @ts-expect-error: Deno.env is available in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Deno and remote imports are available in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(length = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle();
    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (userProfile.role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'User is already an admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token and expiration
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store in admin_invites table
    const { error: inviteError } = await supabaseClient
      .from('admin_invites')
      .upsert({
        email,
        token,
        expires_at: expiresAt,
        accepted: false,
        created_at: new Date().toISOString(),
      });
    if (inviteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to store invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Mailgun
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunFromEmail = Deno.env.get('MAILGUN_FROM_EMAIL');
    
    if (!mailgunApiKey || !mailgunDomain) {
      return new Response(
        JSON.stringify({ error: 'Mailgun configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const inviteLink = `${Deno.env.get('FRONTEND_URL') || 'https://tanktide.com'}/accept-admin-invite?token=${token}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <h2 style="color: #2563eb;">TankTide Admin Invitation</h2>
        <p>You have been invited to become an administrator on TankTide.</p>
        <p>Click the button below to accept the invitation and elevate your account:</p>
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Accept Invitation</a>
        <p style="margin-top:20px;color:#64748b;font-size:14px;">This link will expire in 24 hours. If you did not expect this invitation, you can ignore this email.</p>
      </div>
    `;

    // Send via Mailgun (EU region)
    const mailgunRes = await fetch(`https://api.eu.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`api:${mailgunApiKey}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: `TankTide Team <${mailgunFromEmail || 'noreply@tanktide.com'}>`,
        to: email,
        subject: 'You are invited to become a TankTide Administrator',
        html: emailBody,
      }),
    });

    if (!mailgunRes.ok) {
      const errorData = await mailgunRes.text();
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 