\set ON_ERROR_STOP on
CREATE FUNCTION public.assert_ok(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; RAISE NOTICE 'PASS: %',label; END $$;
CREATE FUNCTION public.assert_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: %',label; RETURN; END;
 RAISE EXCEPTION 'FAIL (not denied): %',label;
END $$;
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111','applicant@example.invalid',now()),
 ('22222222-2222-4222-8222-222222222222','referrer@example.invalid',now()),
 ('33333333-3333-4333-8333-333333333333','other@example.invalid',now()),
 ('44444444-4444-4444-8444-444444444444','admin@example.invalid',now());
INSERT INTO profiles(id,email,full_name,role,work_email,work_email_verified,company,experiences) VALUES
 ('11111111-1111-4111-8111-111111111111','applicant@example.invalid','Applicant','user',null,false,'Google','[{"company":"Google","current":true}]'),
 ('22222222-2222-4222-8222-222222222222','referrer@example.invalid','Referrer','user','referrer@google.com',true,'Google','[{"company":"Google","current":true}]'),
 ('33333333-3333-4333-8333-333333333333','other@example.invalid','Other','user',null,false,'Google','[{"company":"Google","current":true}]'),
 ('44444444-4444-4444-8444-444444444444','admin@example.invalid','Admin','admin',null,false,'Example','[]');
INSERT INTO jobs(id,title,company,location,description,created_by,status) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Synthetic Engineer','Google','Remote','Synthetic role','22222222-2222-4222-8222-222222222222','active');
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('resumes',
 '11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf','{"mimetype":"application/pdf","size":1000}');

SET ROLE anon;
SELECT assert_denied('SELECT * FROM email_otps','anonymous legacy OTP denied');
SELECT assert_denied('SELECT * FROM verification_codes','anonymous current OTP denied');
SELECT assert_denied($q$SELECT send_transactional_email('nobody@example.invalid','Test','Test','Test')$q$,'anonymous arbitrary email denied');
SELECT assert_denied('SELECT * FROM referral_listings','guest listing access denied');
RESET ROLE;
SELECT assert_ok((SELECT NOT public FROM storage.buckets WHERE id='message-attachments'),'chat bucket private');
SELECT assert_ok(NOT employer_email_matches('Google','x@google.attacker.example'),'lookalike employer domain rejected');
SELECT assert_ok(employer_email_matches('Google','x@google.com'),'exact employer domain accepted');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT assert_denied($q$INSERT INTO jobs(title,company,location,description,created_by,status) VALUES('Fake','Google','Remote','Test','33333333-3333-4333-8333-333333333333','active')$q$,'unverified posting denied');
SELECT assert_denied($q$SELECT join_job_as_referrer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'unrelated pool membership denied');
SELECT assert_ok((SELECT count(*)=0 FROM jobs),'base jobs conceal creator');
SELECT assert_ok((SELECT count(*)=0 FROM profiles WHERE id='22222222-2222-4222-8222-222222222222'),'private employee profile denied');
SELECT assert_ok((SELECT count(*)=4 FROM public_profiles),'public professional profiles readable');
SELECT assert_ok((SELECT NOT(to_jsonb(r)?'created_by') AND NOT(to_jsonb(r)?'contact_email') FROM referral_listings r LIMIT 1),'listing has no identity fields');
SELECT assert_ok((SELECT count(*)=0 FROM job_referrers),'pool hides employee');
SELECT assert_denied($q$SELECT * FROM get_job_applications('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'unrelated reviewer denied');
SELECT assert_denied($q$INSERT INTO notifications(user_id,type,title,message) VALUES('11111111-1111-4111-8111-111111111111','referral','Forged','Forged')$q$,'fake notification insert denied');
SELECT assert_denied($q$SELECT create_notification_safely('referral','Forged','Forged','11111111-1111-4111-8111-111111111111',true,'high','{}')$q$,'generic notification RPC denied');
SELECT assert_denied($q$SELECT send_transactional_email('nobody@example.invalid','Test','Test','Test')$q$,'ordinary-user arbitrary email denied');
SELECT assert_ok(NOT is_site_administrator(),'ordinary account has no admin read rights');
SELECT assert_denied('UPDATE profiles SET role=''admin'' WHERE id=auth.uid()','self-promotion denied');
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
SELECT assert_ok((SELECT count(*)=4 FROM profiles),'administrator profile analytics preserved');
SELECT assert_ok((SELECT count(*)=1 FROM jobs),'administrator job analytics preserved');

SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT join_job_as_referrer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT assert_denied($q$INSERT INTO applications(job_id,applicant_id,status,ai_score) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','referred',100)$q$,'direct self-referral insert denied');
SELECT submit_application('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf') AS application_id \gset
SELECT assert_ok((SELECT count(*)=1 FROM applicant_applications),'applicant sees safe application');
SELECT assert_ok((SELECT count(*)=0 FROM applications),'applicant cannot read reviewer notes or assignment IDs');
SELECT assert_ok((SELECT count(*)=0 FROM referral_assignments),'assignment history concealed');
SELECT assert_ok((SELECT status='pending' FROM applicant_applications LIMIT 1),'initial state server controlled');
SELECT assert_ok(get_referred_employee(:'application_id') IS NULL,'employee lookup concealed before referral');
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT assert_ok((SELECT count(*)=1 FROM get_job_applications('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),'job owner can review');
SELECT accept_referral_assignment(:'application_id');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT assert_ok((SELECT count(*)=1 FROM notifications WHERE metadata->>'referrerId'='22222222-2222-4222-8222-222222222222'),'one named referrer notification after acceptance');
SELECT assert_ok(get_referred_employee(:'application_id')='22222222-2222-4222-8222-222222222222','employee lookup released to referred applicant');
SELECT assert_denied($q$UPDATE notifications SET metadata='{"referrerId":"33333333-3333-4333-8333-333333333333"}'$q$,'notification metadata tampering denied');
UPDATE notifications SET read=true;

INSERT INTO connections(requester_id,addressee_id,status) VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','pending');
UPDATE connections SET status='accepted';
SELECT assert_ok((SELECT status='pending' FROM connections LIMIT 1),'requester cannot self-accept');
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT assert_ok((SELECT count(*)=1 FROM notifications WHERE title='New Connection Request'),'connection notification committed atomically');
UPDATE connections SET status='accepted';
SELECT assert_ok((SELECT status='accepted' FROM connections LIMIT 1),'recipient can accept');
SELECT assert_denied($q$UPDATE connections SET requester_id='33333333-3333-4333-8333-333333333333'$q$,'connection identities immutable');

INSERT INTO conversations(id,participant_1,participant_2) VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('message-attachments','11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc/file.pdf','{}');
INSERT INTO messages(conversation_id,sender_id,content,attachment_url) VALUES('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','Synthetic message','11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc/file.pdf');
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT assert_ok((SELECT count(*)=1 FROM storage.objects WHERE bucket_id='message-attachments'),'recipient can read attachment');
UPDATE messages SET read=true;
SELECT assert_ok((SELECT bool_and(read) FROM messages),'recipient marks read');
SELECT assert_denied($q$UPDATE messages SET content='Altered'$q$,'recipient cannot rewrite message');
SELECT assert_denied($q$UPDATE messages SET attachment_url='elsewhere'$q$,'recipient cannot alter attachment');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT assert_ok((SELECT count(*)=0 FROM storage.objects WHERE bucket_id='message-attachments'),'unrelated attachment denied');
SELECT assert_ok((SELECT count(*)=0 FROM messages),'unrelated messages denied');

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT submit_data_request('access','Synthetic export request') AS request_id \gset
SELECT assert_ok((SELECT count(*)=1 FROM data_requests WHERE id=:'request_id'),'data request persisted with reference');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SELECT assert_ok((SELECT count(*)=0 FROM data_requests),'other users cannot read data request');
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT assert_ok(remove_job_application(:'application_id'),'authorized removal succeeds');
SELECT assert_ok((SELECT count(*)=0 FROM applications WHERE id=:'application_id'),'removed applicant stays deleted');
RESET ROLE;

-- Twenty-five distinct applicants exercise the page boundary without mail.
INSERT INTO auth.users(id,email,email_confirmed_at) SELECT ('50000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'test'||i||'@example.invalid',now() FROM generate_series(1,25)i;
INSERT INTO profiles(id,email,full_name) SELECT id,email,'Fixture '||email FROM auth.users WHERE email LIKE 'test%@example.invalid';
INSERT INTO applications(job_id,applicant_id,status) SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id,'pending' FROM auth.users WHERE email LIKE 'test%@example.invalid';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
SELECT assert_ok((SELECT count(*)=20 FROM get_job_applications('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,20)),'first 20 applicants accessible');
SELECT assert_ok((SELECT count(*)=5 FROM get_job_applications('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',20,20)),'applicants beyond 20 accessible');
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
SELECT assert_ok((SELECT count(*)=25 FROM applications),'administrator application analytics preserved');
RESET ROLE;
-- Failed work-email attempts persist and lock the code; a new valid code is single-use.
INSERT INTO verification_codes(user_id,email,code,type,expires_at) VALUES
 ('11111111-1111-4111-8111-111111111111','applicant@google.com','123456','work_email',now()+interval '10 minutes');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT assert_denied('UPDATE profiles SET work_email_verified=true WHERE id=auth.uid()','self-verification denied');
SELECT assert_ok(NOT verify_work_email(auth.uid(),'applicant@google.com','000000'),'wrong OTP rejected') FROM generate_series(1,5);
SELECT assert_ok(NOT verify_work_email(auth.uid(),'applicant@google.com','123456'),'OTP locked after five wrong attempts');
RESET ROLE;
INSERT INTO verification_codes(user_id,email,code,type,expires_at) VALUES
 ('11111111-1111-4111-8111-111111111111','applicant@google.com','654321','work_email',now()+interval '10 minutes');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SELECT assert_ok(verify_work_email(auth.uid(),'applicant@google.com','654321'),'new valid work OTP accepted');
SELECT assert_ok(NOT verify_work_email(auth.uid(),'applicant@google.com','654321'),'work OTP cannot be reused');
RESET ROLE;
SELECT 'All security regression checks passed' AS result;
