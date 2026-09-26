-- Complete the move from browser-authored notices to event-owned notices.
CREATE OR REPLACE FUNCTION public.notify_post_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid; v_recipient uuid; v_name text; BEGIN
 v_actor:=CASE WHEN TG_TABLE_NAME='comments' THEN (to_jsonb(NEW)->>'author_id')::uuid
  ELSE (to_jsonb(NEW)->>'user_id')::uuid END;
 SELECT author_id INTO v_recipient FROM public.posts WHERE id=NEW.post_id;
 IF v_recipient IS NULL OR v_recipient=v_actor THEN RETURN NEW; END IF;
 SELECT full_name INTO v_name FROM public.profiles WHERE id=v_actor;
 INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
 VALUES(v_recipient,CASE WHEN TG_TABLE_NAME='comments' THEN 'comment' ELSE 'like' END,
  CASE WHEN TG_TABLE_NAME='comments' THEN 'New Comment' ELSE 'New Like' END,
  coalesce(v_name,'Someone')||CASE WHEN TG_TABLE_NAME='comments' THEN ' commented on your post' ELSE ' liked your post' END,
  false,'medium',jsonb_build_object('post_id',NEW.post_id,'actor_id',v_actor));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_post_event() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS notify_post_comment ON public.comments;
CREATE TRIGGER notify_post_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_event();
DROP TRIGGER IF EXISTS notify_post_like ON public.user_likes;
CREATE TRIGGER notify_post_like AFTER INSERT ON public.user_likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_event();

-- Old opportunity notices must not continue exposing a creator before referral.
-- This is a privacy redaction, not removal of notification history.
UPDATE public.notifications SET message='A new referral opportunity is available.',
 metadata=metadata-ARRAY['referrer_id','referrerId','created_by']
WHERE title='New Job Referral Opportunity';

-- Internal trigger notifications derive the referrer from the job, including
-- when a trusted background task changes status without a browser JWT.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.handle_application_status_email()'::regprocedure) INTO definition;
 definition:=replace(definition,'v_referrer_id := auth.uid();',
  'SELECT created_by INTO v_referrer_id FROM public.jobs WHERE id = new.job_id;');
 EXECUTE definition;
END $$;

NOTIFY pgrst,'reload schema';
