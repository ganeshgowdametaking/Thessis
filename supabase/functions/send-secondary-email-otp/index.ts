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
    
    // Send email using SendGrid
    try {
      const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: secondaryEmail }],
              subject: 'Verify your organization email - TankTide'
            }
          ],
          from: {
            email: 'info@tanktide.com', // Your verified sender email
            name: 'TankTide Verification'
          },
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">TankTide</h1>
                  </div>
                  
                  <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #1e293b; margin-top: 0;">Verify Your Organization Email</h2>
                    <p style="color: #64748b; line-height: 1.6;">Hello,</p>
                    <p style="color: #64748b; line-height: 1.6;">You're verifying your organization email address for your TankTide account. This helps ensure the quality and authenticity of job postings.</p>
                    
                    <div style="background-color: #ffffff; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; border: 2px solid #e2e8f0;">
                      <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                      <h1 style="color: #2563eb; font-size: 36px; margin: 0; letter-spacing: 6px; font-weight: bold;">${otp}</h1>
                    </div>
                    
                    <p style="color: #64748b; line-height: 1.6; font-size: 14px;">This code will expire in 15 minutes.</p>
                    <p style="color: #64748b; line-height: 1.6; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
                  </div>
                  
                  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Best regards,<br>The TankTide Team</p>
                  </div>
                </div>
              `
            }
          ]
        })
      });

      if (!sendGridResponse.ok) {
        const errorData = await sendGridResponse.text();
        console.error('SendGrid error:', errorData);
        throw new Error(`SendGrid API error: ${sendGridResponse.status}`);
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
          debug: `Email sending error: ${emailError}. OTP: ${otp}. Check SendGrid API key and sender verification.`
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