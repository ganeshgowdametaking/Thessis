/*
  # Create RPC functions for post likes

  1. New Functions
    - `increment_post_likes` - Safely increments likes count for a post
    - `decrement_post_likes` - Safely decrements likes count for a post

  2. Security
    - Functions are accessible to authenticated users
    - Functions handle non-existent posts gracefully
*/

-- Function to increment post likes (recreate to ensure it exists)
CREATE OR REPLACE FUNCTION increment_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts 
  SET likes_count = likes_count + 1 
  WHERE id = post_id;
  
  -- If no rows were updated, the post doesn't exist, but we don't error
  -- This prevents the "JSON object requested, multiple (or no) rows returned" error
END;
$$;

-- Function to decrement post likes (recreate to ensure it exists)
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts 
  SET likes_count = GREATEST(likes_count - 1, 0) 
  WHERE id = post_id;
  
  -- If no rows were updated, the post doesn't exist, but we don't error
  -- This prevents the "JSON object requested, multiple (or no) rows returned" error
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_post_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_likes(uuid) TO authenticated;