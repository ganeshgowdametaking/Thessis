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

        // Get the auth user from the header
        const authHeader = req.headers.get('Authorization')!;
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { subject, message, userEmail, userName } = await req.json();

        if (!subject || !message) {
            return new Response(
                JSON.stringify({ error: 'Subject and message are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 1. Store feedback in database
        const { error: dbError } = await supabaseClient
            .from('feedback')
            .insert({
                user_id: user.id,
                user_email: userEmail || user.email,
                user_name: userName || user.user_metadata?.full_name,
                subject,
                message,
                created_at: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Database Error:', dbError);
            // We continue to send email even if DB insert fails (optional preference)
        }

        // 2. Send notification via Slack Webhook
        // @ts-expect-error: Deno.env is available in Supabase Edge Functions
        const slackWebhookUrl = Deno.env.get('SLACK_FEEDBACK_WEBHOOK_URL');

        if (slackWebhookUrl) {
            const slackRes = await fetch(slackWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: `🌊 *New Feedback Received*`,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Subject:* ${subject}\n*From:* ${userName || 'Unknown'} (${userEmail || user.email})`
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Message:*\n${message}`
                            }
                        },
                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: `Submitted at: ${new Date().toLocaleString()}`
                                }
                            ]
                        }
                    ]
                }),
            });

            if (!slackRes.ok) {
                console.error('Slack Error:', await slackRes.text());
            }
        } else {
            console.warn('SLACK_FEEDBACK_WEBHOOK_URL not configured, notification not sent');
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Feedback sent successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Function Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
