/*
  # Initial Thessis Database Schema

  1. New Tables
    - `profiles` - User profiles with professional information
    - `jobs` - Job postings and referrals
    - `applications` - Job applications
    - `posts` - Social media posts
    - `comments` - Comments on posts
    - `connections` - Professional connections between users
    - `messages` - Direct messages between users
    - `conversations` - Message conversations
    - `notifications` - User notifications

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure data access based on user relationships
*/

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

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- CREATE POLICY "Users can view all profiles"
--   ON profiles FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Users can update own profile"
--   ON profiles FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id);

-- CREATE POLICY "Users can insert own profile"
--   ON profiles FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = id);

-- Jobs policies
-- CREATE POLICY "Users can view all jobs"
--   ON jobs FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Users can create jobs"
--   ON jobs FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = created_by)

-- CREATE POLICY "Users can update own jobs"
--   ON jobs FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = created_by);

-- CREATE POLICY "Users can delete own jobs"
--   ON jobs FOR DELETE
--   TO authenticated
--   USING (auth.uid() = created_by);

-- Applications policies
-- CREATE POLICY "Job creators can view applications for their jobs"
--   ON applications FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM jobs
--       WHERE jobs.id = applications.job_id
--       AND jobs.created_by = auth.uid()
--     )
--     OR applications.applicant_id = auth.uid()
--   )

-- CREATE POLICY "Users can create applications"
--   ON applications FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = applicant_id);

--CREATE POLICY "Job creators can update applications"
--  ON applications FOR UPDATE
--  TO authenticated
--  USING (
--  EXISTS (
--      SELECT 1 FROM jobs 
--      WHERE jobs.id = applications.job_id 
--      AND jobs.created_by = auth.uid()
--    )
--  );

-- Posts policies
-- CREATE POLICY "Users can view all posts"
--   ON posts FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Users can create posts"
--   ON posts FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = author_id);

-- CREATE POLICY "Users can update own posts"
--   ON posts FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = author_id);

-- CREATE POLICY "Users can delete own posts"
--   ON posts FOR DELETE
--   TO authenticated
--   USING (auth.uid() = author_id);

-- Comments policies
-- CREATE POLICY "Users can view all comments"
--   ON comments FOR SELECT
--   TO authenticated
--   USING (true);

-- CREATE POLICY "Users can create comments"
--   ON comments FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = author_id);

-- CREATE POLICY "Users can update own comments"
--   ON comments FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = author_id);

-- CREATE POLICY "Users can delete own comments"
--   ON comments FOR DELETE
--   TO authenticated
--   USING (auth.uid() = author_id);

-- Connections policies
-- CREATE POLICY "Users can view their connections"
--   ON connections FOR SELECT
--   TO authenticated
--   USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- CREATE POLICY "Users can create connection requests"
--   ON connections FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = requester_id);

-- CREATE POLICY "Users can update connection requests"
--   ON connections FOR UPDATE
--   TO authenticated
--   USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Conversations policies
-- CREATE POLICY "Users can view their conversations"
--   ON conversations FOR SELECT
--   TO authenticated
--   USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

--CREATE POLICY "Users can create conversations"
--  ON conversations FOR INSERT
--  TO authenticated
--  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

--CREATE POLICY "Users can delete their own conversations"
--  ON conversations FOR DELETE
--  TO authenticated
--  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Messages policies
--CREATE POLICY "Users can view messages in their conversations"
--  ON messages FOR SELECT
--  TO authenticated
--  USING (
--    EXISTS (
--      SELECT 1 FROM conversations
--      WHERE conversations.id = messages.conversation_id 
--      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
--    )
--  );

--CREATE POLICY "Users can send messages in their conversations"
--  ON messages FOR INSERT
--  TO authenticated
--  WITH CHECK (
--    auth.uid() = sender_id AND
--    EXISTS (
--      SELECT 1 FROM conversations
--      WHERE conversations.id = conversation_id
--      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
--    )
--  );

--CREATE POLICY "Users can update their own messages"
--  ON messages FOR UPDATE
--  TO authenticated
--  USING (sender_id = auth.uid());

-- Notifications policies
--CREATE POLICY "Users can view own notifications"
--  ON notifications FOR SELECT
--  TO authenticated
--  USING (user_id = auth.uid());

--CREATE POLICY "Users can update own notifications"
--  ON notifications FOR UPDATE
--  TO authenticated
--  USING (user_id = auth.uid());

-- Create indexes for better performance
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

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
--CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();