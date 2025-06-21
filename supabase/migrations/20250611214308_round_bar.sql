/*
  # Create decrement_post_likes function

  1. New Functions
    - `decrement_post_likes(post_id uuid)` - Safely decrements the likes count for a post
  
  2. Security
    - Grant execute permission to authenticated users
    - Uses SECURITY DEFINER for proper access control
  
  3. Features
    - Prevents likes count from going below 0 using GREATEST function
    - Handles non-existent posts gracefully (no error thrown)
*/

CREATE OR REPLACE FUNCTION decrement_post_likes(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts 
  SET likes_count = GREATEST(likes_count - 1, 0) 
  WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_post_likes(uuid) TO authenticated;