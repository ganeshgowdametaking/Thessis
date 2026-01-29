/*
  # Add user_saves table for persistent post bookmarks

  1. New Tables
    - `user_saves` - Track which users saved which posts
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `post_id` (uuid, references posts)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_saves` table
    - Add policies for users to manage their own saves

  3. Performance
    - Add indexes for better query performance
*/

-- Create user_saves table
CREATE TABLE IF NOT EXISTS user_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE user_saves ENABLE ROW LEVEL SECURITY;

-- Create policies for user_saves
CREATE POLICY "Users can view their own saves"
  ON user_saves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own saves"
  ON user_saves FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own saves"
  ON user_saves FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_saves_user_id ON user_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saves_post_id ON user_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_user_saves_user_post ON user_saves(user_id, post_id);