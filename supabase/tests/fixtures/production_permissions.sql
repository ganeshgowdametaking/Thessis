-- Synthetic fixture with captured production column definitions and policies.
-- No production records, credentials, network calls or mail delivery.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('email',current_setting('request.jwt.claim.email',true)) $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb);
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;
GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated,service_role;
GRANT ALL ON storage.objects TO anon,authenticated,service_role;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
INSERT INTO storage.buckets(id,name,public) VALUES('resumes','resumes',false),('message-attachments','message-attachments',true);
CREATE TABLE public."profiles" ("id" uuid NOT NULL,
"email" text NOT NULL,
"full_name" text NOT NULL,
"title" text,
"company" text,
"location" text,
"bio" text,
"avatar_url" text,
"cover_image_url" text,
"connections_count" integer DEFAULT 0,
"followers_count" integer DEFAULT 0,
"posts_count" integer DEFAULT 0,
"verified" boolean DEFAULT false,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now(),
"achievements" jsonb DEFAULT '[]'::jsonb,
"education" jsonb DEFAULT '[]'::jsonb,
"experiences" jsonb,
"skills" jsonb,
"role" text DEFAULT 'user'::text,
"secondary_email" text,
"secondary_email_verified" boolean DEFAULT false,
"secondary_email_verified_at" timestamp with time zone,
"is_eu_user" boolean DEFAULT false,
"country_code" character varying(3),
"signup_source" text,
"last_seen" timestamp with time zone DEFAULT now(),
"utm_source" text,
"utm_medium" text,
"utm_campaign" text,
"utm_content" text,
"utm_term" text,
"seniority" text,
"display_title" text,
"tide_points_balance" integer DEFAULT 0,
"work_email" text,
"work_email_verified" boolean DEFAULT false,
"account_type" text,
"work_email_verified_at" timestamp with time zone);
CREATE TABLE public."jobs" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"title" text NOT NULL,
"company" text NOT NULL,
"department" text,
"location" text NOT NULL,
"job_type" text DEFAULT 'Full-time'::text NOT NULL,
"description" text NOT NULL,
"skills" text[] DEFAULT '{}'::text[],
"benefits" text[] DEFAULT '{}'::text[],
"remote_available" boolean DEFAULT false,
"urgent_hiring" boolean DEFAULT false,
"experience_level" text DEFAULT 'Mid Level'::text NOT NULL,
"application_deadline" timestamp with time zone,
"contact_email" text,
"created_by" uuid NOT NULL,
"status" text DEFAULT 'active'::text,
"applications_count" integer DEFAULT 0,
"views_count" integer DEFAULT 0,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now(),
"is_claimed_by_company" boolean DEFAULT false NOT NULL);
CREATE TABLE public."applications" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"job_id" uuid NOT NULL,
"applicant_id" uuid NOT NULL,
"status" text DEFAULT 'pending'::text,
"resume_url" text,
"cover_letter" text,
"rating" numeric(2,1),
"shortlisted" boolean DEFAULT false,
"notes" text,
"applied_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now(),
"assigned_referrer_id" uuid,
"assignment_expires_at" timestamp with time zone,
"ai_score" numeric,
"ai_semantic_score" numeric,
"ai_skill_score" numeric,
"ai_rationale" text,
"ai_ranked_at" timestamp with time zone);
CREATE TABLE public."notifications" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"type" text NOT NULL,
"title" text NOT NULL,
"message" text NOT NULL,
"read" boolean DEFAULT false,
"actionable" boolean DEFAULT false,
"priority" text DEFAULT 'medium'::text,
"metadata" jsonb,
"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."conversations" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"participant_1" uuid NOT NULL,
"participant_2" uuid NOT NULL,
"last_message_at" timestamp with time zone DEFAULT now(),
"created_at" timestamp with time zone DEFAULT now(),
"deleted_by_p1" boolean DEFAULT false,
"deleted_by_p2" boolean DEFAULT false,
"deleted_at_p1" timestamp with time zone,
"deleted_at_p2" timestamp with time zone,
"last_message_preview" text,
"last_message_sender_id" uuid,
"unread_count_p1" integer DEFAULT 0,
"unread_count_p2" integer DEFAULT 0);
CREATE TABLE public."messages" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"conversation_id" uuid NOT NULL,
"sender_id" uuid NOT NULL,
"content" text NOT NULL,
"read" boolean DEFAULT false,
"created_at" timestamp with time zone DEFAULT now(),
"attachment_url" text,
"attachment_type" text,
"attachment_name" text);
CREATE TABLE public."connections" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"requester_id" uuid NOT NULL,
"addressee_id" uuid NOT NULL,
"status" text DEFAULT 'pending'::text,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."hire_verifications" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"application_id" uuid NOT NULL,
"applicant_id" uuid NOT NULL,
"referrer_id" uuid NOT NULL,
"applicant_response" text,
"referrer_response" text,
"status" text DEFAULT 'pending'::text,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."job_referrers" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"job_id" uuid NOT NULL,
"employee_id" uuid NOT NULL,
"status" text DEFAULT 'active'::text NOT NULL,
"joined_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public."referral_assignments" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"application_id" uuid NOT NULL,
"job_id" uuid NOT NULL,
"employee_id" uuid NOT NULL,
"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
"expires_at" timestamp with time zone NOT NULL,
"outcome" text DEFAULT 'pending'::text NOT NULL,
"resolved_at" timestamp with time zone);
CREATE TABLE public."verification_codes" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"email" text NOT NULL,
"code" text NOT NULL,
"type" text DEFAULT 'work_email'::text NOT NULL,
"expires_at" timestamp with time zone NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"verified_at" timestamp with time zone);
CREATE TABLE public."email_otps" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"email" text NOT NULL,
"otp" text NOT NULL,
"created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
"expires_at" timestamp with time zone,
"used" boolean DEFAULT false);
CREATE TABLE public."secondary_email_otps" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"email" text NOT NULL,
"otp" text NOT NULL,
"expires_at" timestamp with time zone NOT NULL,
"created_at" timestamp with time zone DEFAULT now(),
"used_at" timestamp with time zone);
CREATE TABLE public."posts" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"author_id" uuid NOT NULL,
"content" text NOT NULL,
"image_url" text,
"likes_count" integer DEFAULT 0,
"comments_count" integer DEFAULT 0,
"shares_count" integer DEFAULT 0,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."comments" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"post_id" uuid NOT NULL,
"author_id" uuid NOT NULL,
"content" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now(),
"updated_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."user_likes" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"post_id" uuid NOT NULL,
"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE public."feedback" ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"user_email" text,
"user_name" text,
"subject" text NOT NULL,
"message" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now());
ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY (id);
ALTER TABLE public."email_otps" ADD CONSTRAINT "email_otps_pkey" PRIMARY KEY (id);
ALTER TABLE public."applications" ADD CONSTRAINT "applications_job_id_applicant_id_key" UNIQUE (job_id, applicant_id);
ALTER TABLE public."applications" ADD CONSTRAINT "applications_pkey" PRIMARY KEY (id);
ALTER TABLE public."posts" ADD CONSTRAINT "posts_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_likes" ADD CONSTRAINT "user_likes_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_likes" ADD CONSTRAINT "user_likes_user_id_post_id_key" UNIQUE (user_id, post_id);
ALTER TABLE public."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY (id);
ALTER TABLE public."connections" ADD CONSTRAINT "connections_pkey" PRIMARY KEY (id);
ALTER TABLE public."connections" ADD CONSTRAINT "connections_requester_id_addressee_id_key" UNIQUE (requester_id, addressee_id);
ALTER TABLE public."job_referrers" ADD CONSTRAINT "job_referrers_job_id_employee_id_key" UNIQUE (job_id, employee_id);
ALTER TABLE public."job_referrers" ADD CONSTRAINT "job_referrers_pkey" PRIMARY KEY (id);
ALTER TABLE public."job_referrers" ADD CONSTRAINT "job_referrers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'opted_out'::text])));
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_applicant_response_check" CHECK ((applicant_response = ANY (ARRAY['yes'::text, 'no'::text, 'snooze'::text])));
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_pkey" PRIMARY KEY (id);
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_referrer_response_check" CHECK ((referrer_response = ANY (ARRAY['yes'::text, 'no'::text, 'idk'::text])));
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'disputed'::text, 'rejected'::text, 'snoozed'::text])));
ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);
ALTER TABLE public."feedback" ADD CONSTRAINT "feedback_pkey" PRIMARY KEY (id);
ALTER TABLE public."secondary_email_otps" ADD CONSTRAINT "secondary_email_otps_pkey" PRIMARY KEY (id);
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_participant_1_participant_2_key" UNIQUE (participant_1, participant_2);
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY (id);
ALTER TABLE public."verification_codes" ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY (id);
ALTER TABLE public."referral_assignments" ADD CONSTRAINT "referral_assignments_outcome_check" CHECK ((outcome = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])));
ALTER TABLE public."referral_assignments" ADD CONSTRAINT "referral_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."applications" ADD CONSTRAINT "applications_applicant_id_fkey" FOREIGN KEY (applicant_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."applications" ADD CONSTRAINT "applications_assigned_referrer_id_fkey" FOREIGN KEY (assigned_referrer_id) REFERENCES profiles(id);
ALTER TABLE public."applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE public."posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."user_likes" ADD CONSTRAINT "user_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public."user_likes" ADD CONSTRAINT "user_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE public."connections" ADD CONSTRAINT "connections_addressee_id_fkey" FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."connections" ADD CONSTRAINT "connections_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."job_referrers" ADD CONSTRAINT "job_referrers_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."job_referrers" ADD CONSTRAINT "job_referrers_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_applicant_id_fkey" FOREIGN KEY (applicant_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE public."hire_verifications" ADD CONSTRAINT "hire_verifications_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE public."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public."secondary_email_otps" ADD CONSTRAINT "secondary_email_otps_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_last_message_sender_id_fkey" FOREIGN KEY (last_message_sender_id) REFERENCES profiles(id);
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_participant_1_fkey" FOREIGN KEY (participant_1) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."conversations" ADD CONSTRAINT "conversations_participant_2_fkey" FOREIGN KEY (participant_2) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."referral_assignments" ADD CONSTRAINT "referral_assignments_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
ALTER TABLE public."referral_assignments" ADD CONSTRAINT "referral_assignments_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."referral_assignments" ADD CONSTRAINT "referral_assignments_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."profiles" TO anon,authenticated,service_role;
ALTER TABLE public."jobs" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."jobs" TO anon,authenticated,service_role;
ALTER TABLE public."applications" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."applications" TO anon,authenticated,service_role;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."notifications" TO anon,authenticated,service_role;
ALTER TABLE public."conversations" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."conversations" TO anon,authenticated,service_role;
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."messages" TO anon,authenticated,service_role;
ALTER TABLE public."connections" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."connections" TO anon,authenticated,service_role;
ALTER TABLE public."hire_verifications" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."hire_verifications" TO anon,authenticated,service_role;
ALTER TABLE public."job_referrers" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."job_referrers" TO anon,authenticated,service_role;
ALTER TABLE public."referral_assignments" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."referral_assignments" TO anon,authenticated,service_role;
GRANT ALL ON public."verification_codes" TO anon,authenticated,service_role;
GRANT ALL ON public."email_otps" TO anon,authenticated,service_role;
ALTER TABLE public."secondary_email_otps" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."secondary_email_otps" TO anon,authenticated,service_role;
ALTER TABLE public."posts" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."posts" TO anon,authenticated,service_role;
ALTER TABLE public."comments" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."comments" TO anon,authenticated,service_role;
ALTER TABLE public."user_likes" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."user_likes" TO anon,authenticated,service_role;
ALTER TABLE public."feedback" ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public."feedback" TO anon,authenticated,service_role;
CREATE POLICY "Users can view all profiles" ON public."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can update own profile" ON public."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = id));
CREATE POLICY "Users can insert own profile" ON public."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = id));
CREATE POLICY "Job creators can view applications for their jobs" ON public."applications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
 FROM jobs
 WHERE ((jobs.id = applications.job_id) AND (jobs.created_by = auth.uid())))) OR (applicant_id = auth.uid())));
CREATE POLICY "Users can create applications" ON public."applications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = applicant_id));
CREATE POLICY "Job creators can update applications" ON public."applications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
 FROM jobs
 WHERE ((jobs.id = applications.job_id) AND (jobs.created_by = auth.uid())))));
CREATE POLICY "Users can view all posts" ON public."posts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can create posts" ON public."posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "Users can update own posts" ON public."posts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = author_id));
CREATE POLICY "Users can delete own posts" ON public."posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = author_id));
CREATE POLICY "Users can view all comments" ON public."comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can create comments" ON public."comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = author_id));
CREATE POLICY "Users can update own comments" ON public."comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = author_id));
CREATE POLICY "Users can delete own comments" ON public."comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = author_id));
CREATE POLICY "Users can view their conversations" ON public."conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((participant_1 = auth.uid()) OR (participant_2 = auth.uid())));
CREATE POLICY "Users can create conversations" ON public."conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((participant_1 = auth.uid()) OR (participant_2 = auth.uid())));
CREATE POLICY "Users can update own jobs" ON public."jobs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((auth.uid() = created_by));
CREATE POLICY "Users can view messages in their conversations" ON public."messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
 FROM conversations
 WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1 = auth.uid()) OR (conversations.participant_2 = auth.uid()))))));
CREATE POLICY "Users can send messages in their conversations" ON public."messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
 FROM conversations
 WHERE ((conversations.id = messages.conversation_id) AND ((conversations.participant_1 = auth.uid()) OR (conversations.participant_2 = auth.uid())))))));
CREATE POLICY "Users can update their own messages" ON public."messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((sender_id = auth.uid()));
CREATE POLICY "Users can delete own jobs" ON public."jobs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = created_by));
CREATE POLICY "Service role can update profiles" ON public."profiles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "Users can view all jobs" ON public."jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can create jobs" ON public."jobs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "Users can delete their own conversations" ON public."conversations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((participant_1 = auth.uid()) OR (participant_2 = auth.uid())));
CREATE POLICY "Allow recipient to mark as read" ON public."messages" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((( SELECT ((conversations.participant_1 = auth.uid()) OR (conversations.participant_2 = auth.uid()))
 FROM conversations
 WHERE (conversations.id = messages.conversation_id)) AND (sender_id <> auth.uid())));
CREATE POLICY "Allow requester or addressee to delete connection" ON public."connections" AS PERMISSIVE FOR DELETE TO PUBLIC USING (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));
CREATE POLICY "Users can view all likes" ON public."user_likes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can create their own likes" ON public."user_likes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own likes" ON public."user_likes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own secondary email OTPs" ON public."secondary_email_otps" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own secondary email OTPs" ON public."secondary_email_otps" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own secondary email OTPs" ON public."secondary_email_otps" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));
CREATE POLICY "connections_select_policy" ON public."connections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((requester_id = auth.uid()) OR (addressee_id = auth.uid())));
CREATE POLICY "connections_insert_policy" ON public."connections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((requester_id = auth.uid()));
CREATE POLICY "connections_update_policy" ON public."connections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((requester_id = auth.uid()) OR (addressee_id = auth.uid()))) WITH CHECK (((requester_id = auth.uid()) OR (addressee_id = auth.uid())));
CREATE POLICY "connections_delete_policy" ON public."connections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((requester_id = auth.uid()) OR (addressee_id = auth.uid())));
CREATE POLICY "notifications_select_policy" ON public."notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = auth.uid()));
CREATE POLICY "notifications_update_policy" ON public."notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((user_id = auth.uid()));
CREATE POLICY "notifications_delete_policy" ON public."notifications" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((user_id = auth.uid()));
CREATE POLICY "notifications_insert_policy" ON public."notifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Users can view their own verifications" ON public."hire_verifications" AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = applicant_id) OR (auth.uid() = referrer_id)));
CREATE POLICY "Users can update their own verifications" ON public."hire_verifications" AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((auth.uid() = applicant_id) OR (auth.uid() = referrer_id)));
CREATE POLICY "Users can submit feedback" ON public."feedback" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "Anyone can view a job's referrer pool" ON public."job_referrers" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Participants can view their own assignment history" ON public."referral_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.uid() = employee_id) OR (auth.uid() = ( SELECT applications.applicant_id
 FROM applications
 WHERE (applications.id = referral_assignments.application_id)))));
CREATE FUNCTION public.send_transactional_email(text,text,text,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION public.render_email_button(text,text) RETURNS text LANGUAGE sql AS $$ SELECT ''::text $$;
CREATE FUNCTION public.render_email_shell(text,text) RETURNS text LANGUAGE sql AS $$ SELECT ''::text $$;
CREATE FUNCTION public.escape_html(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
CREATE OR REPLACE FUNCTION public.normalize_company_name(p_company text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
 SELECT regexp_replace(
 regexp_replace(
 lower(coalesce(p_company, '')),
 '\y(inc|llc|ltd|corp|corporation|co|gmbh|plc|sa|srl|pvt|pty|limited|company)\y\.?', '', 'gi'
 ),
 '[^a-z0-9]', '', 'g'
 );
$function$
;
CREATE OR REPLACE FUNCTION public.create_notification_safely(notification_type text, notification_title text, notification_message text, target_user_id uuid, notification_actionable boolean DEFAULT false, notification_priority text DEFAULT 'medium'::text, notification_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
 new_notification notifications%ROWTYPE;
BEGIN
 -- Validate that the caller is authenticated
 IF auth.uid() IS NULL THEN
 RAISE EXCEPTION 'Not authenticated';
 END IF;

 -- Validate that target user exists
 IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
 RAISE EXCEPTION 'Target user does not exist';
 END IF;

 -- Insert the notification
 INSERT INTO notifications (
 user_id,
 type,
 title,
 message,
 actionable,
 priority,
 metadata,
 read,
 created_at
 ) VALUES (
 target_user_id,
 notification_type,
 notification_title,
 notification_message,
 notification_actionable,
 notification_priority,
 notification_metadata,
 false,
 now()
 ) RETURNING * INTO new_notification;

 RETURN new_notification;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.assign_next_referrer(p_application_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_job_id uuid;
 v_next_employee_id uuid;
BEGIN
 SELECT job_id INTO v_job_id
 FROM public.applications WHERE id = p_application_id;
 IF v_job_id IS NULL THEN
 RETURN NULL;
 END IF;

 SELECT jr.employee_id INTO v_next_employee_id
 FROM public.job_referrers AS jr
 JOIN public.jobs AS j ON j.id = jr.job_id
 JOIN auth.users AS u ON u.id = jr.employee_id
 WHERE jr.job_id = v_job_id
 AND jr.status = 'active'
 AND j.created_by = jr.employee_id
 AND u.email_confirmed_at IS NOT NULL
 AND NOT EXISTS (
 SELECT 1 FROM public.referral_assignments AS ra
 WHERE ra.application_id = p_application_id
 AND ra.employee_id = jr.employee_id
 )
 AND (
 SELECT count(*) FROM public.referral_assignments AS ra2
 WHERE ra2.employee_id = jr.employee_id AND ra2.outcome = 'pending'
 ) < 5
 ORDER BY
 COALESCE(
 (SELECT count(*) FILTER (WHERE outcome = 'accepted')::float
 / NULLIF(count(*) FILTER (WHERE outcome IN ('accepted', 'rejected', 'expired')), 0)
 FROM public.referral_assignments AS ra3
 WHERE ra3.employee_id = jr.employee_id),
 0.5
 ) DESC,
 (SELECT max(ra4.assigned_at) FROM public.referral_assignments AS ra4
 WHERE ra4.employee_id = jr.employee_id) ASC NULLS FIRST
 LIMIT 1;

 IF v_next_employee_id IS NULL THEN
 RETURN NULL;
 END IF;

 UPDATE public.applications
 SET assigned_referrer_id = v_next_employee_id,
 assignment_expires_at = now() + INTERVAL '48 hours'
 WHERE id = p_application_id;

 INSERT INTO public.referral_assignments
 (application_id, job_id, employee_id, expires_at)
 VALUES
 (p_application_id, v_job_id, v_next_employee_id, now() + INTERVAL '48 hours');

 PERFORM public.send_transactional_email(
 p.email,
 p.full_name,
 'New referral match — respond within 48 hours',
 public.render_email_shell(
 'A candidate has been matched with you',
 format(
 '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been matched with a candidate</h2>' ||
 '<p style="margin:0 0 20px;color:#4B5563;">Respond within 48 hours, or this candidate will automatically move to the next available referrer.</p>' ||
 '%s',
 public.render_email_button('https://thessis.com/applications/' || v_job_id, 'Review Candidate')
 )
 )
 )
 FROM public.profiles AS p WHERE p.id = v_next_employee_id;

 RETURN v_next_employee_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_application_status_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_applicant_email text;
 v_applicant_name text;
 v_job_title text;
 v_job_company text;
 v_subject text;
 v_body text;
 v_referrer_id uuid;
 v_referrer_name text;
 v_messages_url text;
 v_notification_message text;
BEGIN
 IF new.status NOT IN ('shortlisted', 'referred', 'rejected') THEN
 RETURN new;
 END IF;

 SELECT email, full_name INTO v_applicant_email, v_applicant_name
 FROM public.profiles WHERE id = new.applicant_id;

 SELECT title, company INTO v_job_title, v_job_company
 FROM public.jobs WHERE id = new.job_id;

 IF new.status = 'shortlisted' THEN
 v_subject := 'You''ve been shortlisted for ' || coalesce(v_job_title, 'a role on Thessis');
 v_body := format(
 '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been shortlisted</h2>' ||
 '<p style="margin:0 0 12px;color:#4b5563;">Good news — you''ve been shortlisted for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
 '<p style="margin:0;color:#4b5563;">The referrer is reviewing shortlisted candidates now.</p>',
 public.escape_html(coalesce(v_job_title, 'this role')),
 public.escape_html(coalesce(v_job_company, 'the company'))
 );

 ELSIF new.status = 'referred' THEN
 v_referrer_id := auth.uid();
 IF v_referrer_id IS NOT NULL THEN
 SELECT full_name INTO v_referrer_name FROM public.profiles WHERE id = v_referrer_id;
 END IF;

 v_messages_url := 'https://www.thessis.com/messages'
 || CASE WHEN v_referrer_id IS NOT NULL THEN '?userId=' || v_referrer_id ELSE '' END;

 v_subject := 'You''ve been referred for ' || coalesce(v_job_title, 'a role on Thessis');
 v_body := format(
 '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been referred 🎉</h2>' ||
 '<p style="margin:0 0 12px;color:#4b5563;">%s just referred you for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
 '<p style="margin:0 0 20px;color:#4b5563;">You can reach out to them directly for updates.</p>' ||
 '%s',
 public.escape_html(coalesce(v_referrer_name, 'Your referrer')),
 public.escape_html(coalesce(v_job_title, 'this role')),
 public.escape_html(coalesce(v_job_company, 'the company')),
 public.render_email_button(v_messages_url, 'Message ' || coalesce(v_referrer_name, 'your referrer'))
 );

 IF v_referrer_id IS NOT NULL THEN
 v_notification_message := format(
 'You got referred by %s for %s that you applied to. You can now reach out to %s for updates.',
 coalesce(v_referrer_name, 'a referrer'),
 coalesce(v_job_title, 'the role'),
 coalesce(v_referrer_name, 'them')
 );

 PERFORM public.create_notification_safely(
 'referral',
 'You got referred!',
 v_notification_message,
 new.applicant_id,
 true,
 'high',
 jsonb_build_object('referrerId', v_referrer_id, 'applicationId', new.id, 'jobTitle', v_job_title)
 );
 END IF;

 ELSE
 v_subject := 'Update on your application for ' || coalesce(v_job_title, 'a role on Thessis');
 v_body := format(
 '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Application update</h2>' ||
 '<p style="margin:0 0 12px;color:#4b5563;">You weren''t moved forward for <strong>%s</strong> at <strong>%s</strong> this time.</p>' ||
 '<p style="margin:0;color:#4b5563;">Keep browsing — new referrals are posted regularly.</p>',
 public.escape_html(coalesce(v_job_title, 'this role')),
 public.escape_html(coalesce(v_job_company, 'the company'))
 );
 END IF;

 PERFORM public.send_transactional_email(
 v_applicant_email,
 v_applicant_name,
 v_subject,
 public.render_email_shell(public.escape_html(v_subject), v_body)
 );
 RETURN new;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.generate_verification_code(p_user_id uuid, p_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM public.generate_verification_code_internal(p_user_id, p_email);
 RETURN 'sent';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 -- SECURITY DEFINER functions and the service role can maintain these fields.
 -- Direct PostgREST writes run as authenticated (or anon).
 IF current_user NOT IN ('authenticated', 'anon') THEN
 RETURN NEW;
 END IF;

 IF TG_OP = 'INSERT' THEN
 IF auth.uid() IS DISTINCT FROM NEW.id
 OR lower(NEW.email) IS DISTINCT FROM lower(auth.jwt() ->> 'email')
 OR NEW.role IS DISTINCT FROM 'user'
 OR coalesce(NEW.verified, false)
 OR coalesce(NEW.work_email_verified, false)
 OR coalesce(NEW.secondary_email_verified, false)
 OR NEW.work_email_verified_at IS NOT NULL
 OR NEW.secondary_email_verified_at IS NOT NULL
 OR NEW.work_email IS NOT NULL
 OR NEW.account_type IS NOT NULL
 OR coalesce(NEW.tide_points_balance, 0) <> 0
 OR coalesce(NEW.connections_count, 0) <> 0
 OR coalesce(NEW.followers_count, 0) <> 0
 OR coalesce(NEW.posts_count, 0) <> 0
 OR coalesce(to_jsonb(NEW) -> 'response_metric', 'null'::jsonb)
 NOT IN ('null'::jsonb, '0'::jsonb) THEN
 RAISE EXCEPTION 'Profile privilege fields cannot be set by the user'
 USING ERRCODE = '42501';
 END IF;
 NEW.created_at := now();
 ELSIF TG_OP = 'UPDATE' THEN
 IF NEW.id IS DISTINCT FROM OLD.id
 OR NEW.email IS DISTINCT FROM OLD.email
 OR NEW.role IS DISTINCT FROM OLD.role
 OR NEW.verified IS DISTINCT FROM OLD.verified
 OR NEW.work_email IS DISTINCT FROM OLD.work_email
 OR NEW.work_email_verified IS DISTINCT FROM OLD.work_email_verified
 OR NEW.work_email_verified_at IS DISTINCT FROM OLD.work_email_verified_at
 OR NEW.secondary_email IS DISTINCT FROM OLD.secondary_email
 OR NEW.secondary_email_verified IS DISTINCT FROM OLD.secondary_email_verified
 OR NEW.secondary_email_verified_at IS DISTINCT FROM OLD.secondary_email_verified_at
 OR NEW.account_type IS DISTINCT FROM OLD.account_type
 OR NEW.tide_points_balance IS DISTINCT FROM OLD.tide_points_balance
 OR NEW.connections_count IS DISTINCT FROM OLD.connections_count
 OR NEW.followers_count IS DISTINCT FROM OLD.followers_count
 OR NEW.posts_count IS DISTINCT FROM OLD.posts_count
 OR NEW.created_at IS DISTINCT FROM OLD.created_at
 OR to_jsonb(NEW) -> 'response_metric' IS DISTINCT FROM to_jsonb(OLD) -> 'response_metric' THEN
 RAISE EXCEPTION 'Profile privilege fields cannot be changed by the user'
 USING ERRCODE = '42501';
 END IF;
 END IF;

 RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.accept_referral_assignment(p_application_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_employee_id uuid;
BEGIN
 SELECT a.assigned_referrer_id INTO v_employee_id
 FROM public.applications AS a
 JOIN public.jobs AS j ON j.id = a.job_id
 WHERE a.id = p_application_id
 AND j.created_by = auth.uid()
 AND a.status IS DISTINCT FROM 'referred'
 AND a.assignment_expires_at > now()
 FOR UPDATE OF a;

 IF v_employee_id IS DISTINCT FROM auth.uid() THEN
 RAISE EXCEPTION 'This candidate is not currently assigned to you'
 USING ERRCODE = '42501';
 END IF;

 UPDATE public.applications
 SET status = 'referred', assignment_expires_at = NULL
 WHERE id = p_application_id;

 UPDATE public.referral_assignments
 SET outcome = 'accepted', resolved_at = now()
 WHERE application_id = p_application_id
 AND employee_id = auth.uid()
 AND outcome = 'pending';
END;
$function$
;
CREATE TRIGGER protect_profile_privileges BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();
CREATE TRIGGER on_application_status_changed_send_email AFTER UPDATE ON public.applications FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.handle_application_status_email();
