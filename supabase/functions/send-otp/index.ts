import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
serve(async (req)=>{
  const { email } = await req.json();
  if (!email) return new Response('Missing email', {
    status: 400
  });
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store OTP in DB (expires in 10 min)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from('email_otps').insert([
    {
      email,
      otp,
      expires_at: expiresAt
    }
  ]);
  // Send email via Mailgun
  const mailgunRes = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa('api:' + MAILGUN_API_KEY),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      from: `TankTide <noreply@${MAILGUN_DOMAIN}>`,
      to: email,
      subject: 'Your TankTide Verification Code',
      text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
    })
  });
  if (!mailgunRes.ok) {
    return new Response('Failed to send email', {
      status: 500
    });
  }
  return new Response(JSON.stringify({
    success: true
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
