// @ts-expect-error: Deno.env is available in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Deno and remote imports are available in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authorization = req.headers.get('Authorization');
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return jsonResponse({ error: 'Sign in as an administrator to send invitations' }, 401);
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

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: caller, error: callerError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle();
    const isSuperUser = user.email.toLowerCase() === 'ganeshgowdaapplication@gmail.com';
    if (callerError || !caller || caller.email?.toLowerCase() !== user.email.toLowerCase() ||
        (caller.role !== 'admin' && !isSuperUser)) {
      return jsonResponse({ error: 'Administrator access required' }, 403);
    }

    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email) || email.length > 254) {
      return jsonResponse({ error: 'A valid email is required' }, 400);
    }

    // Check if user exists
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .ilike('email', email)
      .maybeSingle();
    if (userError || !userProfile) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    if (userProfile.role === 'admin') {
      return jsonResponse({ error: 'User is already an admin' }, 400);
    }
    const { data: targetAuth, error: targetAuthError } = await supabaseClient.auth.admin.getUserById(userProfile.id);
    if (targetAuthError || !targetAuth?.user?.email_confirmed_at ||
        targetAuth.user.email?.toLowerCase() !== email) {
      return jsonResponse({ error: 'A confirmed user with this email was not found' }, 404);
    }

    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const mailgunFromEmail = Deno.env.get('MAILGUN_FROM_EMAIL');
    if (!mailgunApiKey || !mailgunDomain) {
      return jsonResponse({ error: 'Mailgun configuration missing' }, 500);
    }

    // Generate token and expiration
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Only a hash is stored; the emailed link contains the random token.
    const { error: expireError } = await supabaseClient
      .from('admin_invites')
      .update({ expires_at: new Date().toISOString() })
      .eq('email', email)
      .eq('accepted', false);
    if (expireError) {
      return jsonResponse({ error: 'Failed to prepare invitation' }, 500);
    }
    const { error: inviteError } = await supabaseClient
      .from('admin_invites')
      .insert({
        email,
        token: tokenHash,
        expires_at: expiresAt,
      });
    if (inviteError) {
      return jsonResponse({ error: 'Failed to store invitation' }, 500);
    }

    // Send email via Mailgun
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const frontendUrl = (Deno.env.get('FRONTEND_URL') || 'https://tanktide.com').replace(/\/$/, '');
    const inviteLink = `${frontendUrl}/accept-admin-invite?token=${token}`;
    const emailBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thessis - Admin Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f8fb; font-family: 'Segoe UI', sans-serif; color: #333;">

  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background-color: #003e66; padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Admin Invitation from <span style="color: #00c2ff;">Thessis</span> 🌊</h1>
        <p style="color: #d3eafd; margin-top: 10px;">You've been invited to join our admin team!</p>
      </td>
    </tr>

    <!-- Invitation Section -->
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; margin: 0 0 20px;">You have been invited to become an administrator on Thessis.</p>
        <p style="font-size: 16px; margin: 0 0 30px;">Click the button below to accept the invitation and elevate your account:</p>
        <a href="${inviteLink}" style="display: inline-block; background-color: #00c2ff; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;">Accept Admin Invitation</a>
      </td>
    </tr>

    <!-- Info Section -->
    <tr>
      <td style="padding: 10px 30px 30px 30px; text-align: center;">
        <p style="font-size: 15px; margin: 20px 0;">This invitation link will expire in 24 hours for your security.</p>
        <p style="font-size: 13px; color: #777; margin-bottom: 30px;">Didn't expect this invitation? No problem—you can safely ignore this email.</p>
        <p style="font-size: 15px; color: #555;"><em>— The Thessis Team</em></p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f0f4f8; text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p style="margin: 0;">&copy; 2025 Thessis, Inc. All rights reserved.</p>
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
        subject: 'You are invited to become a Thessis Administrator',
        html: emailBody,
      }),
    });

    if (!mailgunRes.ok) {
      await supabaseClient.from('admin_invites')
        .update({ expires_at: new Date().toISOString() })
        .eq('token', tokenHash);
      return jsonResponse({ error: 'Failed to send invitation email' }, 500);
    }

    return jsonResponse({ success: true, message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Send admin invite error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
