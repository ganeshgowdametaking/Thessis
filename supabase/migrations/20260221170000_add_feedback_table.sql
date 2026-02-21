-- Migration: Create feedback table
-- Date: 2026-02-21

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
DROP POLICY IF EXISTS "Users can submit feedback" ON public.feedback;
CREATE POLICY "Users can submit feedback"
ON public.feedback FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admins to view all feedback (assuming role-based check if needed later)
-- For now, we'll just keep it private to the user if we add SELECT, but we only need INSERT for the user side.
