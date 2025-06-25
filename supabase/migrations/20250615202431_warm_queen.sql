-- ========================================
-- COMPREHENSIVE DATABASE DIAGNOSTIC SCRIPT
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ========================================

-- Step 1: Basic Connection Test
SELECT 'Database Connection Test' as section, now() as current_time;

-- Step 2: Check if tables exist with proper structure
SELECT 'Table Structure Check' as section;

SELECT 
    'conversations' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;

SELECT 
    'messages' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Step 3: Check RLS Status
SELECT 'RLS Status Check' as section;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages');

-- Step 4: Check DELETE Policies
SELECT 'DELETE Policies Check' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages') 
AND cmd = 'DELETE';

-- Step 5: Check if the deletion function exists
SELECT 'Function Existence Check' as section;

-- Step 6: Check function permissions
SELECT 'Function Permissions Check' as section;

-- Step 7: Check foreign key constraints
SELECT 'Foreign Key Constraints Check' as section;

SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('conversations', 'messages');

-- Step 8: Check current user context (will be null in SQL editor - this is expected)
SELECT 'Authentication Context Check' as section;

SELECT 
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'No auth context (SQL Editor - Expected)'
        ELSE 'Authenticated user found'
    END as auth_status;

-- Step 9: Sample data check
SELECT 'Sample Data Check' as section;

SELECT 'conversations' as table_name, COUNT(*) as record_count FROM conversations
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as record_count FROM messages;

-- Step 10: Test the permission check function (safe - won't delete anything)
SELECT 'Permission Function Test' as section;

-- Test with a fake UUID (this won't delete anything, just tests the function)
-- SELECT check_conversation_deletion_permissions('00000000-0000-0000-0000-000000000000'::uuid) as permission_test_result;

-- Step 11: Check if there are any other deletion-related functions
SELECT 'All Deletion Functions Check' as section;

SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname LIKE '%delete%' 
   OR proname LIKE '%conversation%'
   OR proname LIKE '%message%';

-- Final Summary
SELECT 'Diagnostic Complete' as section, 'Check all results above' as message;