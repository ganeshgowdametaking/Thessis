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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    // @ts-expect-error: Deno.env is available in Supabase Edge Functions
    const frontendUrl = (Deno.env.get("FRONTEND_URL") || "https://tanktide.com").replace(/\/+$/, "");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase configuration missing" });
    }

    if (!resendApiKey) {
      return json(500, { error: "RESEND_API_KEY is missing in Supabase function secrets" });
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

    const milestone = applicationsCount === 1 ? 1 : applicationsCount === 5 ? 5 : null;
    if (!milestone) {
      return json(200, { success: true, skipped: true, reason: "No milestone reached", applicationsCount });
    }

    // Lock milestone (idempotency). If duplicate exists, we already sent this milestone email.
    const { data: milestoneRow, error: milestoneError } = await supabaseAdmin
      .from("job_application_email_milestones")
      .insert({
        job_id: jobId,
        milestone,
        application_count: applicationsCount ?? milestone,
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

    let subject = "";
    let html = "";

    if (milestone === 1) {
      subject = `You got a new application for ${job.title}`;
      html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">Hi ${greetingName},</h2>
          <p style="margin: 0 0 12px;">
            Your referral <strong>${job.title}</strong>${job.company ? ` at <strong>${job.company}</strong>` : ""} just received its first application.
          </p>
          <p style="margin: 0 0 20px;">Open your Applications page to review the candidate.</p>
          <a href="${applicationsPageUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">
            View Applications
          </a>
        </div>
      `;
    } else {
      const { data: topCandidates } = await supabaseAdmin
        .from("applications")
        .select(`
          id,
          rating,
          shortlisted,
          applied_at,
          applicant:profiles!applications_applicant_id_fkey(full_name, title, company)
        `)
        .eq("job_id", jobId)
        .order("shortlisted", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("applied_at", { ascending: true })
        .limit(5);

      const candidateItems = (topCandidates || [])
        .map((candidate: any, index: number) => {
          const applicant = candidate?.applicant || {};
          const name = applicant?.full_name || "Candidate";
          const headlineParts = [applicant?.title, applicant?.company].filter(Boolean);
          const headline = headlineParts.length > 0 ? ` — ${headlineParts.join(" at ")}` : "";
          const mlScore =
            candidate?.rating !== null && candidate?.rating !== undefined
              ? `${candidate.rating}/5`
              : "Pending ML score";

          return `<li style="margin: 0 0 8px;"><strong>${index + 1}. ${name}</strong>${headline} <span style="color:#4b5563;">(${mlScore})</span></li>`;
        })
        .join("");

      subject = `${job.title} now has 5+ applications`;
      html = `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">Hi ${greetingName},</h2>
          <p style="margin: 0 0 12px;">
            Your referral <strong>${job.title}</strong>${job.company ? ` at <strong>${job.company}</strong>` : ""} now has <strong>5 or more applicants</strong>.
          </p>
          <p style="margin: 0 0 8px;">Top 5 candidates recommended by your ranking setup:</p>
          <ol style="padding-left: 18px; margin: 0 0 20px;">
            ${candidateItems || "<li>No ranked candidates available yet.</li>"}
          </ol>
          <a href="${applicationsPageUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">
            Review Applications
          </a>
        </div>
      `;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `TankTide Team <${resendFromEmail}>`,
        to: [creatorProfile.email],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const sendErrorDetails = await resendRes.text();
      if (milestoneRow?.id) {
        await supabaseAdmin.from("job_application_email_milestones").delete().eq("id", milestoneRow.id);
      }
      return json(500, { error: "Failed to send milestone email via Resend", provider: "resend", details: sendErrorDetails });
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
      provider: "resend",
    });
  } catch (error: any) {
    return json(500, { error: "Internal server error", details: error?.message || "Unknown error" });
  }
});
