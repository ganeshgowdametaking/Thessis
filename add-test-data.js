// Simple script to add test data to your Supabase database
// Run this with: node add-test-data.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fvprdknorvuqggwxfqly.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cHJka25vcnZ1cWdnd3hmcWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MTcsImV4cCI6MjA2NjE4MTgxN30.7yujzc8OsaBfwSYKeWqgwYGfZW7VI9Gcxqhs6y16WNY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addTestData() {
  console.log('🚀 Adding test data to database...')
  
  try {
    // 1. Create a test user profile (you'll need to be signed up first)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ Please sign up/login first, then run this script')
      return
    }
    
    console.log('✅ Found user:', user.email)
    
    // 2. Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: 'Alex Sterling',
        title: 'Senior Product Manager',
        company: 'TechFlow',
        location: 'San Francisco, CA',
        bio: 'Passionate about user-centric design and agile methodologies. Proven track record of scaling product teams and driving revenue growth.',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        verified: true
      })
    
    if (profileError) {
      console.error('❌ Profile error:', profileError)
    } else {
      console.log('✅ Profile updated')
    }
    
    // 3. Create a test job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: 'Senior Product Designer',
        company: 'Sage & Stone',
        department: 'Product Design',
        location: 'San Francisco, CA',
        job_type: 'Full-time',
        description: 'We are looking for a Senior Product Designer to join our team and help shape the future of our platform.',
        skills: ['Figma', 'Prototyping', 'User Research', 'Design Systems'],
        experience_level: 'Senior (5+ yrs)',
        remote_available: true,
        urgent_hiring: false,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single()
    
    if (jobError) {
      console.error('❌ Job error:', jobError)
    } else {
      console.log('✅ Job created:', job.title)
      
      // 4. Create test applications for this job
      const applications = [
        {
          job_id: job.id,
          applicant_id: user.id, // Using correct field name
          status: 'pending',
          cover_letter: "I've been following Sage & Stone's work and believe my background aligns perfectly with your design philosophy.",
          resume_url: 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKFNhbXBsZSBSZXN1bWUpCi9Qcm9kdWNlciAoU2FtcGxlIFBERiBHZW5lcmF0b3IpCi9DcmVhdGlvbkRhdGUgKEQ6MjAyNDAxMDEwMDAwMDBaKQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjcyIDcyMCBUZAooU2FtcGxlIFJlc3VtZSBDb250ZW50KSBUagpFVApzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMTc0IDAwMDAwIG4gCjAwMDAwMDAyMjEgMDAwMDAgbiAKMDAwMDAwMDI3OCAwMDAwMCBuIAowMDAwMDAwMzc4IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAyIDAgUgo+PgpzdGFydHhyZWYKNDcyCiUlRU9G', // Sample PDF base64 data
          applied_at: new Date().toISOString()
        }
      ]
      
      const { error: appError } = await supabase
        .from('applications')
        .insert(applications)
      
      if (appError) {
        console.error('❌ Applications error:', appError)
      } else {
        console.log('✅ Test applications created')
      }
    }
    
    console.log('🎉 Test data added successfully!')
    console.log('Now you can visit:')
    console.log(`- Create Referral: http://localhost:5173/create-referral`)
    console.log(`- Applications: http://localhost:5173/applications/${job?.id}`)
    console.log(`- User Profile: http://localhost:5173/user/${user.id}`)
    
  } catch (error) {
    console.error('❌ Error adding test data:', error)
  }
}

addTestData()