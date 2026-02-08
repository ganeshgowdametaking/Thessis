-- Enable RLS Policies for Profiles, Jobs, and Applications

-- Profiles Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view all profiles') THEN
        CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Jobs Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Users can view all jobs') THEN
        CREATE POLICY "Users can view all jobs" ON jobs FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Users can create jobs') THEN
        CREATE POLICY "Users can create jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Users can update own jobs') THEN
        CREATE POLICY "Users can update own jobs" ON jobs FOR UPDATE TO authenticated USING (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Users can delete own jobs') THEN
        CREATE POLICY "Users can delete own jobs" ON jobs FOR DELETE TO authenticated USING (auth.uid() = created_by);
    END IF;
END $$;

-- Applications Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Job creators can view applications for their jobs') THEN
        CREATE POLICY "Job creators can view applications for their jobs" 
        ON applications FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM jobs 
                WHERE jobs.id = applications.job_id 
                AND jobs.created_by = auth.uid()
            )
            OR applications.applicant_id = auth.uid()
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Users can create applications') THEN
        CREATE POLICY "Users can create applications" 
        ON applications FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = applicant_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'Job creators can update applications') THEN
        CREATE POLICY "Job creators can update applications"
        ON applications FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM jobs 
                WHERE jobs.id = applications.job_id 
                AND jobs.created_by = auth.uid()
            )
        );
    END IF;
END $$;
