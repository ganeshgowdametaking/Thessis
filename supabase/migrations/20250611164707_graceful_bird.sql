/*
  # Create user_likes table for persistent like tracking

  1. New Tables
    - `user_likes` - Track which users liked which posts
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `post_id` (uuid, references posts)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_likes` table
    - Add policies for users to manage their own likes

  3. Performance
    - Add indexes for better query performance
*/

-- Create user_likes table
CREATE TABLE IF NOT EXISTS user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for user_likes
CREATE POLICY "Users can view all likes"
  ON user_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON user_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON user_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_post_id ON user_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_post ON user_likes(user_id, post_id);