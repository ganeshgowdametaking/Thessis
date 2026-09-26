-- Apply with the matching web release. Elevated helpers are server-only;
-- notifications are produced from committed domain events, never client text.
DO $$ DECLARE f record; t text; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND p.proname IN ('send_transactional_email','create_notification_safely',
      'handle_unrouted_application','sweep_expired_assignments','route_new_application',
      'delete_conversation_with_messages','check_conversation_deletion_permissions',
      'generate_verification_code_internal')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
  FOR t IN SELECT unnest(ARRAY['email_otps','secondary_email_otps','verification_codes','candidate_embeddings']) LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
    END IF;
  END LOOP;
END $$;

-- Table grants, rather than an UPDATE row policy, define mutable columns.
REVOKE INSERT, UPDATE ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT UPDATE (read, actionable) ON public.notifications TO authenticated;
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;

REVOKE UPDATE, DELETE ON public.messages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (read) ON public.messages TO authenticated;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow recipient to mark as read" ON public.messages;
CREATE POLICY message_recipient_read ON public.messages FOR UPDATE TO authenticated
USING (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c
 WHERE c.id=conversation_id AND auth.uid() IN (c.participant_1,c.participant_2)))
WITH CHECK (read = true);

REVOKE UPDATE ON public.connections FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON public.connections TO authenticated;
DROP POLICY IF EXISTS connections_update_policy ON public.connections;
CREATE POLICY connection_recipient_accept ON public.connections FOR UPDATE TO authenticated
USING (addressee_id=auth.uid() AND status='pending')
WITH CHECK (addressee_id=auth.uid() AND status='accepted');

CREATE OR REPLACE FUNCTION public.guard_connection_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user IN ('anon','authenticated') AND
  (NEW.requester_id IS DISTINCT FROM auth.uid() OR NEW.status IS DISTINCT FROM 'pending'
   OR NEW.requester_id=NEW.addressee_id) THEN
   RAISE EXCEPTION 'Only a pending request from your account is allowed' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_connection_insert ON public.connections;
CREATE TRIGGER guard_connection_insert BEFORE INSERT ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.guard_connection_insert();

CREATE OR REPLACE FUNCTION public.notify_connection_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
  VALUES(NEW.addressee_id,'connection','New Connection Request','',true,'high',
    jsonb_build_object('connection_id',NEW.id,'requester_id',NEW.requester_id));
 ELSIF OLD.status='pending' AND NEW.status='accepted' THEN
  INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
  SELECT NEW.requester_id,'connection','Connection Accepted',
   coalesce(p.full_name,'Someone')||' accepted your connection request',false,'medium',
   jsonb_build_object('connection_id',NEW.id,'accepter_id',NEW.addressee_id)
  FROM public.profiles p WHERE p.id=NEW.addressee_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_connection_event() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS notify_connection_event ON public.connections;
CREATE TRIGGER notify_connection_event AFTER INSERT OR UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.notify_connection_event();

-- Replace all old policies for this bucket, including its public read rule.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%message-attachments%' LOOP
  EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
 END LOOP;
END $$;
UPDATE storage.buckets SET public=false,file_size_limit=5242880,
 allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id='message-attachments';
UPDATE storage.buckets SET public=false,file_size_limit=5242880,
 allowed_mime_types=ARRAY['application/pdf'] WHERE id='resumes';

CREATE POLICY chat_file_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='message-attachments' AND split_part(name,'/',1)=auth.uid()::text
 AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=split_part(name,'/',2)
  AND auth.uid() IN (c.participant_1,c.participant_2)));
CREATE POLICY chat_file_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='message-attachments' AND (
 split_part(name,'/',1)=auth.uid()::text OR EXISTS (
  SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id
  WHERE (m.attachment_url=name OR m.attachment_url=
    'https://fvprdknorvuqggwxfqly.supabase.co/storage/v1/object/public/message-attachments/'||name)
  AND auth.uid() IN (c.participant_1,c.participant_2))));

CREATE OR REPLACE FUNCTION public.guard_message_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user IN ('anon','authenticated') THEN
  IF NEW.sender_id IS DISTINCT FROM auth.uid() OR coalesce(NEW.read,false) THEN
   RAISE EXCEPTION 'Invalid message sender or read state' USING ERRCODE='42501';
  END IF;
  IF NEW.attachment_url IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM storage.objects o WHERE o.bucket_id='message-attachments'
    AND o.name=NEW.attachment_url AND split_part(o.name,'/',1)=auth.uid()::text
    AND split_part(o.name,'/',2)=NEW.conversation_id::text
  ) THEN RAISE EXCEPTION 'Upload the attachment to this conversation first' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_message_insert ON public.messages;
CREATE TRIGGER guard_message_insert BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_insert();

-- Prevent an application owner from approving both sides of a hire claim.
CREATE OR REPLACE FUNCTION public.guard_hire_response() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user IN ('anon','authenticated') AND (
  (to_jsonb(NEW)-ARRAY['applicant_response','referrer_response','updated_at']) IS DISTINCT FROM
  (to_jsonb(OLD)-ARRAY['applicant_response','referrer_response','updated_at']) OR
  (NEW.applicant_response IS DISTINCT FROM OLD.applicant_response AND auth.uid() IS DISTINCT FROM OLD.applicant_id) OR
  (NEW.referrer_response IS DISTINCT FROM OLD.referrer_response AND auth.uid() IS DISTINCT FROM OLD.referrer_id)
 ) THEN RAISE EXCEPTION 'You may only provide your own response' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_hire_response ON public.hire_verifications;
CREATE TRIGGER guard_hire_response BEFORE UPDATE ON public.hire_verifications
FOR EACH ROW EXECUTE FUNCTION public.guard_hire_response();

NOTIFY pgrst,'reload schema';
