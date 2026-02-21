-- Super User Admin Dashboard RPCs
-- Only ganeshgowdaapplication@gmail.com can call these

CREATE OR REPLACE FUNCTION public.get_all_administrators()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    work_email TEXT,
    work_email_verified BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Strict email check for Super User access
    IF auth.jwt() ->> 'email' IS DISTINCT FROM 'ganeshgowdaapplication@gmail.com' THEN
        RAISE EXCEPTION 'Unauthorized: Super User access required.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        p.role,
        p.created_at,
        p.work_email,
        p.work_email_verified
    FROM public.profiles p
    WHERE p.role = 'admin'
    ORDER BY p.created_at DESC;
END;
$$;

-- Secure Demotion function
CREATE OR REPLACE FUNCTION public.demote_admin(admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email TEXT;
BEGIN
    -- 1. Security Check: Only ganeshgowdaapplication@gmail.com can call this
    IF auth.jwt() ->> 'email' IS DISTINCT FROM 'ganeshgowdaapplication@gmail.com' THEN
        RAISE EXCEPTION 'Unauthorized: Super User access required.';
    END IF;

    -- 2. Get the target admin's email
    SELECT email INTO v_admin_email FROM public.profiles WHERE id = admin_id;

    -- 3. Safety Check: Prevent Super User from self-demoting (locked by email)
    IF v_admin_email = 'ganeshgowdaapplication@gmail.com' THEN
        RAISE EXCEPTION 'Safety Lock: You cannot demote yourself via this interface.';
    END IF;

    -- 4. Demote
    UPDATE public.profiles
    SET role = 'candidate' -- Or whatever your default role is
    WHERE id = admin_id;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_all_administrators() TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_admin(UUID) TO authenticated;
