// @ts-expect-error: Deno runtime import for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error: Remote import available in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const frontendUrl = (
      Deno.env.get("FRONTEND_URL") ||
      Deno.env.get("SITE_URL") ||
      "https://thessis.com"
    ).replace(/\/+$/, "");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase configuration missing" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return json(401, { error: "Unauthorized" });
    }

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body?.jobId === "string" ? body.jobId : "";
    if (!jobId) {
      return json(400, { error: "jobId is required" });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("id, title, company, created_by")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      return json(404, { error: "Job not found" });
    }

    // Only allow callers who are applicants on this job (prevents arbitrary invocation abuse).
    const { data: callerApplication, error: callerApplicationError } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", user.id)
      .limit(1)
      .maybeSingle();

    if (callerApplicationError || !callerApplication) {
      return json(403, { error: "Forbidden" });
    }

    const { count: applicationsCount, error: countError } = await supabaseAdmin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    if (countError) {
      return json(500, { error: "Failed to count applications", details: countError.message });
    }

    // Threshold-based milestone detection: Find the highest milestone reached that hasn't been sent yet.
    // Order is important: we check 10 first, then 1.
    const possibleMilestones = [10, 1];
    let candidateMilestone: number | null = null;

    // Check existing milestones for this job
    const { data: existingMilestones, error: existingMilestonesError } = await supabaseAdmin
      .from("job_application_email_milestones")
      .select("milestone")
      .eq("job_id", jobId);

    if (existingMilestonesError) {
      return json(500, { error: "Failed to fetch existing milestones", details: existingMilestonesError.message });
    }

    const sentMilestones = new Set((existingMilestones || []).map(m => m.milestone));

    for (const m of possibleMilestones) {
      if (applicationsCount >= m && !sentMilestones.has(m)) {
        candidateMilestone = m;
        break; // Found the highest unsent milestone
      }
    }

    if (!candidateMilestone) {
      return json(200, { success: true, skipped: true, reason: "No new milestone reached", applicationsCount, sentMilestones: Array.from(sentMilestones) });
    }

    const milestone = candidateMilestone;

    // Lock milestone (idempotency). If duplicate exists, we already sent this milestone email.
    const { data: milestoneRow, error: milestoneError } = await supabaseAdmin
      .from("job_application_email_milestones")
      .insert({
        job_id: jobId,
        milestone,
        application_count: applicationsCount,
      })
      .select("id")
      .maybeSingle();

    if (milestoneError) {
      if (milestoneError.code === "23505") {
        return json(200, { success: true, skipped: true, reason: "Milestone already sent", milestone });
      }
      return json(500, { error: "Failed to lock milestone", details: milestoneError.message });
    }

    const { data: creatorProfile, error: creatorError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", job.created_by)
      .maybeSingle();

    if (creatorError || !creatorProfile?.email) {
      if (milestoneRow?.id) {
        await supabaseAdmin.from("job_application_email_milestones").delete().eq("id", milestoneRow.id);
      }
      return json(500, { error: "Job creator email not available" });
    }

    const applicationsPageUrl = `${frontendUrl}/applications/${jobId}`;
    const greetingName = creatorProfile.full_name?.trim() || "there";

    // Premium Email Styles
    const emailStyles = `
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #ffffff;
    `;

    const buttonStyles = `
      display: inline-block;
      padding: 14px 28px;
      background-color: #111827;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin-top: 24px;
      letter-spacing: -0.01em;
    `;

    let subject = "";
    let html = "";

    if (milestone === 1) {
      subject = `Momentum is building: Your first application for ${job.title}`;
      html = `
        <div style="${emailStyles}">
          <h1 style="font-size: 24px; font-weight: 800; tracking: -0.02em; margin-bottom: 24px;">First win for ${job.title}.</h1>
          <p style="margin-bottom: 20px; font-size: 16px; color: #4b5563;">
            Hi ${greetingName}, your referral at <strong>${job.company || 'Thessis'}</strong> just received its first application.
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; color: #4b5563;">
            The right connection can change everything. Log in to review the candidate and see if they're a match for your referral.
          </p>
          <a href="${applicationsPageUrl}" style="${buttonStyles}">
            View Application
          </a>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="font-size: 13px; color: #9ca3af;">Sent with care by the Thessis Team.</p>
          </div>
        </div>
      `;
    } else {
      subject = `Your Top 10 candidates are ready for ${job.title}`;
      html = `
        <div style="${emailStyles}">
          <h1 style="font-size: 24px; font-weight: 800; tracking: -0.02em; margin-bottom: 24px;">Your Top 10 candidates are ready.</h1>
          <p style="margin-bottom: 20px; font-size: 16px; color: #4b5563;">
            Hi ${greetingName}, your referral for <strong>${job.title}</strong> has now surpassed 10 applicants.
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; color: #4b5563;">
            Thessis AI has ranked the <strong>top 10 candidates</strong> that best fit your referral criteria.
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; color: #4b5563; font-style: italic;">
            Click below to log in and review the top candidates on your applications page.
          </p>
          <a href="${applicationsPageUrl}" style="${buttonStyles}">
            View Top Candidates
          </a>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
            <p style="font-size: 13px; color: #9ca3af;">Sent with care by the Thessis Team.</p>
          </div>
        </div>
      `;
    }

    // Delegates to the shared Postgres helper (public.send_transactional_email)
    // so this function doesn't need its own ZeptoMail credentials — the token
    // lives once, in Supabase Vault, and the SQL function reads it there.
    const { error: sendError } = await supabaseAdmin.rpc("send_transactional_email", {
      p_to_email: creatorProfile.email,
      p_to_name: greetingName,
      p_subject: subject,
      p_html_body: html,
    });

    if (sendError) {
      if (milestoneRow?.id) {
        await supabaseAdmin.from("job_application_email_milestones").delete().eq("id", milestoneRow.id);
      }
      return json(500, { error: "Failed to send milestone email via ZeptoMail", provider: "zeptomail", details: sendError.message });
    }

    if (milestoneRow?.id) {
      await supabaseAdmin
        .from("job_application_email_milestones")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", milestoneRow.id);
    }

    return json(200, {
      success: true,
      milestone,
      applicationsCount,
      recipient: creatorProfile.email,
      provider: "zeptomail",
    });
  } catch (error: any) {
    return json(500, { error: "Internal server error", details: error?.message || "Unknown error" });
  }
});
