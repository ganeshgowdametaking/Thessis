-- Admin migrations dated January 2025 refer to profiles and this timestamp
-- function. Create those shared prerequisites before the admin migrations so
-- a fresh database can apply every checked-in migration in filename order.
-- The full initial schema migration later in the sequence uses IF NOT EXISTS
-- for profiles and CREATE OR REPLACE for the function.

CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
