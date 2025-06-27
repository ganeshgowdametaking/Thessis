-- TankTide Database Setup for Remote Supabase Project
-- This script sets up all necessary tables, policies, and functions

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  title text,
  company text,
  location text,
  bio text,
  avatar_url text,
  cover_image_url text,
  connections_count integer DEFAULT 0,
  followers_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  department text,
  location text NOT NULL,
  job_type text NOT NULL DEFAULT 'Full-time',
  description text NOT NULL,
  skills text[] DEFAULT '{}',
  benefits text[] DEFAULT '{}',
  remote_available boolean DEFAULT false,
  urgent_hiring boolean DEFAULT false,
  experience_level text NOT NULL DEFAULT 'Mid Level',
  application_deadline timestamptz,
  contact_email text,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active',
  applications_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending',
  resume_url text,
  cover_letter text,
  rating decimal(2,1),
  shortlisted boolean DEFAULT false,
  notes text,
  applied_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  participant_2 uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  actionable boolean DEFAULT false,
  priority text DEFAULT 'medium',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. GDPR COMPLIANCE TABLES
-- =====================================================

-- Create gdpr_consents table
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{"necessary": true, "functional": false, "analytics": false, "marketing": false}',
  ip_address text,
  consent_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create data_requests table
CREATE TABLE IF NOT EXISTS data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create gdpr_audit_logs table
CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. SECURITY POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Jobs policies
CREATE POLICY "Users can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Applications policies
CREATE POLICY "Job creators can view applications for their jobs"
  ON applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.created_by = auth.uid()
    )
    OR applications.applicant_id = auth.uid()
  );

CREATE POLICY "Users can create applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Job creators can update applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = applications.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Posts policies
CREATE POLICY "Users can view all posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Comments policies
CREATE POLICY "Users can view all comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Connections policies
CREATE POLICY "Users can view their connections"
  ON connections FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create connection requests"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connection requests"
  ON connections FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_id 
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- GDPR policies
CREATE POLICY "Users can view their own consent"
  ON gdpr_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own consent"
  ON gdpr_consents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consent"
  ON gdpr_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own data requests"
  ON data_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own data requests"
  ON data_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_connections_requester_id ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee_id ON connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id ON gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_user_id ON data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status);

-- =====================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update GDPR consents updated_at timestamp
CREATE OR REPLACE FUNCTION update_gdpr_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log consent changes for audit purposes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gdpr_audit_logs (
    user_id,
    action,
    old_data,
    new_data,
    created_at
  ) VALUES (
    NEW.user_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'consent_created'
      WHEN TG_OP = 'UPDATE' THEN 'consent_updated'
      WHEN TG_OP = 'DELETE' THEN 'consent_deleted'
    END,
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gdpr_consents_updated_at BEFORE UPDATE ON gdpr_consents FOR EACH ROW EXECUTE FUNCTION update_gdpr_consents_updated_at();

-- Create triggers for audit logging
CREATE TRIGGER log_gdpr_consents_changes AFTER INSERT OR UPDATE OR DELETE ON gdpr_consents FOR EACH ROW EXECUTE FUNCTION log_consent_change();

-- =====================================================
-- 7. STORAGE BUCKETS (for file uploads)
-- =====================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('resumes', 'resumes', false),
  ('post-images', 'post-images', true),
  ('cover-images', 'cover-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for resumes
CREATE POLICY "Users can view their own resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own resumes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for post images
CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for cover images
CREATE POLICY "Cover images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cover-images');

CREATE POLICY "Users can upload cover images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cover-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own cover images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cover-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cover images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cover-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Display setup completion message
DO $$
BEGIN
  RAISE NOTICE 'TankTide database setup completed successfully!';
  RAISE NOTICE 'All tables, policies, and functions have been created.';
  RAISE NOTICE 'You can now use the application with your remote Supabase project.';
END $$; 