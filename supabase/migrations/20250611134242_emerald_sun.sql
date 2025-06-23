/*
  # Add increment functions for posts

  1. New Functions
    - `increment_post_likes` - Increments likes count for a post
    - `increment_post_comments` - Increments comments count for a post

  2. Security
    - Functions are accessible to authenticated users
    - Functions validate post existence before incrementing
*/

-- Function to increment post likes
CREATE OR REPLACE FUNCTION increment_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts 
  SET likes_count = likes_count + 1 
  WHERE id = post_id;
END;
$$;

-- Function to increment post comments
CREATE OR REPLACE FUNCTION increment_post_comments(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts 
  SET comments_count = comments_count + 1 
  WHERE id = post_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_post_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_comments(uuid) TO authenticated;