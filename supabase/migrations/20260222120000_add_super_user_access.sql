-- Super User Admin Dashboard RPC
-- Only ganeshgowdaapplication@gmail.com can call this
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

-- Grant access to authenticated users (internal check handles the email restriction)
GRANT EXECUTE ON FUNCTION public.get_all_administrators() TO authenticated;
