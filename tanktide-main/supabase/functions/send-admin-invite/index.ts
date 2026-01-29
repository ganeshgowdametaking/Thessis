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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tanktide - Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f8fb; font-family: 'Segoe UI', sans-serif; color: #333;">

  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background-color: #003e66; padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Admin Invitation from <span style="color: #00c2ff;">Tanktide</span> 🌊</h1>
        <p style="color: #d3eafd; margin-top: 10px;">You've been invited to join our admin team!</p>
      </td>
    </tr>

    <!-- Invitation Section -->
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; margin: 0 0 20px;">You have been invited to become an administrator on TankTide.</p>
        <p style="font-size: 16px; margin: 0 0 30px;">Click the button below to accept the invitation and elevate your account:</p>
        <a href="${inviteLink}" style="display: inline-block; background-color: #00c2ff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;">Accept Admin Invitation</a>
      </td>
    </tr>

    <!-- Info Section -->
    <tr>
      <td style="padding: 10px 30px 30px 30px; text-align: center;">
        <p style="font-size: 15px; margin: 20px 0;">This invitation link will expire in 24 hours for your security.</p>
        <p style="font-size: 13px; color: #777; margin-bottom: 30px;">Didn't expect this invitation? No problem—you can safely ignore this email.</p>
        <p style="font-size: 15px; color: #555;"><em>— The Tanktide Team</em></p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f0f4f8; text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p style="margin: 0;">&copy; 2025 Tanktide, Inc. All rights reserved.</p>
      </td>
    </tr>
    
  </table>

</body>
</html>
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