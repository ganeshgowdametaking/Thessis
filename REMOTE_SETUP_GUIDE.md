# Remote Supabase Setup Guide

## Overview
Your application has been configured to use your new remote Supabase project. Follow these steps to complete the setup.

## Step 1: Environment Variables Updated ✅
Your `.env` file has been updated with your new Supabase credentials:
- **Project URL**: `https://fvprdknorvuqggwxfqly.supabase.co`
- **Anon Key**: Your provided anon key

## Step 2: Set Up Database Schema

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/fvprdknorvuqggwxfqly
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `setup_remote_database.sql` file
5. Paste it into the SQL editor
6. Click **Run** to execute the script

### Option B: Using Supabase CLI (Advanced)
If you have Supabase CLI installed:
```bash
# Link your project
supabase link --project-ref fvprdknorvuqggwxfqly

# Run the setup script
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@db.fvprdknorvuqggwxfqly.supabase.co:5432/postgres" -f setup_remote_database.sql
```

## Step 3: Verify Setup
After running the SQL script, you should see:
- ✅ All tables created (profiles, jobs, applications, etc.)
- ✅ Row Level Security enabled
- ✅ Storage buckets configured
- ✅ All policies and functions created

## Step 4: Test the Application
1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Open your application in the browser
3. Try to:
   - Sign up/sign in
   - Create a job posting
   - Apply to a job
   - Upload a resume

## What the Setup Script Creates

### Core Tables
- `profiles` - User profiles
- `jobs` - Job postings
- `applications` - Job applications
- `posts` - Social posts
- `comments` - Post comments
- `connections` - User connections
- `conversations` - Message conversations
- `messages` - Direct messages
- `notifications` - User notifications

### GDPR Compliance
- `gdpr_consents` - User consent tracking
- `data_requests` - GDPR data requests
- `gdpr_audit_logs` - Consent change audit logs

### Storage Buckets
- `avatars` - User profile pictures
- `resumes` - Job application resumes
- `post-images` - Post images
- `cover-images` - Profile cover images

### Security Features
- Row Level Security (RLS) enabled on all tables
- Comprehensive access policies
- Secure file upload policies

## Troubleshooting

### If you get permission errors:
1. Make sure you're using the correct service role key for admin operations
2. Check that your project is properly linked

### If tables don't appear:
1. Refresh the Supabase dashboard
2. Check the SQL editor for any error messages
3. Verify the script ran completely

### If the app still shows connection errors:
1. Check that your `.env` file has the correct credentials
2. Restart your development server
3. Clear browser cache and local storage

## Next Steps
Once the database is set up:
1. Test user registration and authentication
2. Create some sample job postings
3. Test the job application flow
4. Verify file uploads work correctly

## Support
If you encounter any issues:
1. Check the browser console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are correctly set

Your application should now work with the remote Supabase database! 