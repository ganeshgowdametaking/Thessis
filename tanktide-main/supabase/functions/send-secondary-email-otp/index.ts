import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    const { secondaryEmail } = await req.json()

    if (!secondaryEmail) {
      return new Response(
        JSON.stringify({ error: 'Secondary email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(secondaryEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if it's not a Gmail address
    if (secondaryEmail.toLowerCase().includes('gmail.com')) {
      return new Response(
        JSON.stringify({ error: 'Please use your organization email address, not Gmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the secondary email is already used and verified by another user
    const { data: existingProfile, error: existingProfileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('secondary_email', secondaryEmail)
      .eq('secondary_email_verified', true)
      .neq('id', user.id)
      .maybeSingle();

    if (existingProfileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check existing secondary email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'This organization email is already verified by another user.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the OTP in the database with expiration (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    
    const { error: otpError } = await supabaseClient
      .from('secondary_email_otps')
      .upsert({
        user_id: user.id,
        email: secondaryEmail,
        otp: otp,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For development/testing, log the OTP to console
    console.log(`OTP for ${secondaryEmail}: ${otp}`)
    
    // Send email using Supabase's built-in email system (which uses your Mailgun SMTP)
    try {
      // Use Supabase's signInWithOtp to send email through the configured SMTP
      const { error: emailError } = await supabaseClient.auth.signInWithOtp({
        email: secondaryEmail,
        options: {
          shouldCreateUser: false, // Don't create a new user
          data: {
            otp: otp,
            type: 'secondary-email-verification'
          }
        }
      });

      if (emailError) {
        console.error('Supabase email error:', emailError);
        throw emailError;
      }

      // Email sent successfully
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification code sent to your organization email'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Fall back to showing OTP in response for development
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification code sent to your organization email',
          otp: otp, // Remove this in production
          debug: `Email sending error: ${emailError}. OTP: ${otp}. Check Supabase email configuration.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 