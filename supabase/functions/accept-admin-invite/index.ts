// @ts-expect-error: Deno.env is available in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Deno and remote imports are available in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { token } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('admin_invites')
      .select('*')
      .eq('token', token)
      .eq('accepted', false)
      .maybeSingle();

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: 'Failed to validate invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used invitation token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the user profile
    const { data: userProfile, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', invitation.email)
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

    // Promote user to admin
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userProfile.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to promote user to admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabaseClient
      .from('admin_invites')
      .update({ 
        accepted: true, 
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('Failed to mark invitation as accepted:', acceptError);
      // Don't fail the request since user is already promoted
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully promoted to admin',
        userId: userProfile.id,
        email: userProfile.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Accept admin invite error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
