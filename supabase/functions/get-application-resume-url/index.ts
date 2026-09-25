import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function objectPath(resumeReference: string, projectUrl: string): string | null {
  if (!resumeReference || resumeReference.startsWith('data:')) return null;

  let path = resumeReference.replace(/^resumes\//, '');
  if (/^https?:\/\//i.test(resumeReference)) {
    try {
      const source = new URL(resumeReference);
      if (source.origin !== new URL(projectUrl).origin) return null;
      const prefix = '/storage/v1/object/public/resumes/';
      if (!source.pathname.startsWith(prefix)) return null;
      path = decodeURIComponent(source.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }

  if (!path || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
    return null;
  }
  return path;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const accessToken = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return json(401, { error: 'Sign in to view this resume' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: 'Resume service is not configured' });
  }

  const callerClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await callerClient.auth.getUser(accessToken);
  if (authError || !user) return json(401, { error: 'Sign in to view this resume' });

  let applicationId: unknown;
  try {
    ({ applicationId } = await req.json());
  } catch {
    return json(400, { error: 'Invalid request body' });
  }
  if (typeof applicationId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
    return json(400, { error: 'Invalid application ID' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: application, error: applicationError } = await admin
    .from('applications')
    .select('applicant_id, job_id, resume_url')
    .eq('id', applicationId)
    .maybeSingle();
  if (applicationError) return json(500, { error: 'Could not load application' });
  if (!application) return json(404, { error: 'Application not found' });

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('created_by')
    .eq('id', application.job_id)
    .maybeSingle();
  if (jobError || !job) return json(500, { error: 'Could not load job' });

  const allowed = user.id === application.applicant_id || user.id === job.created_by;
  if (!allowed) return json(403, { error: 'You cannot view this resume' });

  const path = objectPath(application.resume_url || '', supabaseUrl);
  if (!path || path.split('/')[0] !== application.applicant_id) {
    return json(422, { error: 'Resume file is unavailable' });
  }

  const { data, error } = await admin.storage.from('resumes').createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return json(404, { error: 'Resume file is unavailable' });
  const extension = path.match(/\.(pdf|doc|docx)$/i)?.[1]?.toLowerCase() || 'pdf';
  return json(200, { signedUrl: data.signedUrl, extension });
});
