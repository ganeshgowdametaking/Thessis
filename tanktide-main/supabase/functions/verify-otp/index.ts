import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
serve(async (req)=>{
  const { email, otp } = await req.json();
  if (!email || !otp) return new Response('Missing email or otp', {
    status: 400
  });
  // Find the latest unused, unexpired OTP for this email
  const { data, error } = await supabase.from('email_otps').select('*').eq('email', email).eq('otp', otp).eq('used', false).order('created_at', {
    ascending: false
  }).limit(1).single();
  if (error || !data) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid or expired code.'
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Code expired.'
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
  // Mark OTP as used
  await supabase.from('email_otps').update({
    used: true
  }).eq('id', data.id);
  return new Response(JSON.stringify({
    success: true
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});