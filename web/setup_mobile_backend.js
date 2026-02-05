#!/usr/bin/env node

/**
 * TankTide Mobile Backend Setup Script
 * 
 * This script helps set up the backend infrastructure for the TankTide mobile app.
 * It creates sample data, configures Supabase, and validates the setup.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  SAMPLE_DATA_COUNT: {
    profiles: 10,
    jobs: 20,
    posts: 15,
    notifications: 25
  }
};

// Initialize Supabase client
let supabase;

function initializeSupabase() {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase configuration!');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    console.error('Or create a .env file in the project root with these values');
    process.exit(1);
  }

  supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
}

// Sample data generators
const sampleData = {
  profiles: [
    {
      full_name: 'John Smith',
      title: 'Senior Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      bio: 'Passionate full-stack developer with 8+ years of experience in React, Node.js, and cloud technologies.',
      verified: true
    },
    {
      full_name: 'Sarah Johnson',
      title: 'Product Manager',
      company: 'InnovateLabs',
      location: 'New York, NY',
      bio: 'Product leader focused on building user-centric solutions. Experience in fintech and healthcare.',
      verified: true
    },
    {
      full_name: 'Mike Chen',
      title: 'UX Designer',
      company: 'DesignStudio',
      location: 'Seattle, WA',
      bio: 'Creative designer with expertise in mobile and web interfaces. Advocate for accessible design.',
      verified: false
    },
    {
      full_name: 'Emily Rodriguez',
      title: 'Data Scientist',
      company: 'DataFlow Analytics',
      location: 'Austin, TX',
      bio: 'ML engineer specializing in recommendation systems and predictive analytics.',
      verified: true
    },
    {
      full_name: 'David Kim',
      title: 'DevOps Engineer',
      company: 'CloudScale Solutions',
      location: 'Remote',
      bio: 'Infrastructure specialist with expertise in Kubernetes, AWS, and CI/CD pipelines.',
      verified: false
    }
  ],

  jobs: [
    {
      title: 'Senior React Developer',
      company: 'TechStartup Inc.',
      location: 'San Francisco, CA',
      job_type: 'Full-time',
      description: 'We are looking for a senior React developer to join our growing team. You will be responsible for building scalable web applications using modern React patterns and best practices.',
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
      benefits: ['Health Insurance', 'Stock Options', 'Remote Work', 'Learning Budget'],
      remote_available: true,
      urgent_hiring: false,
      experience_level: 'Senior Level'
    },
    {
      title: 'Product Manager - Mobile',
      company: 'MobileFirst Corp',
      location: 'New York, NY',
      job_type: 'Full-time',
      description: 'Join our product team to drive the strategy and execution of our mobile applications. Work closely with engineering, design, and business teams.',
      skills: ['Product Strategy', 'Mobile Apps', 'Analytics', 'User Research', 'Agile'],
      benefits: ['Competitive Salary', 'Health Benefits', 'Flexible Hours', 'Career Growth'],
      remote_available: false,
      urgent_hiring: true,
      experience_level: 'Mid Level'
    },
    {
      title: 'UX/UI Designer',
      company: 'Creative Agency',
      location: 'Los Angeles, CA',
      job_type: 'Contract',
      description: 'We need a talented UX/UI designer to help us create beautiful and intuitive user experiences for our client projects.',
      skills: ['Figma', 'Sketch', 'Prototyping', 'User Research', 'Design Systems'],
      benefits: ['Flexible Schedule', 'Creative Freedom', 'Portfolio Building'],
      remote_available: true,
      urgent_hiring: false,
      experience_level: 'Mid Level'
    },
    {
      title: 'Full Stack Engineer',
      company: 'GrowthTech',
      location: 'Austin, TX',
      job_type: 'Full-time',
      description: 'Looking for a versatile full-stack engineer to work on our SaaS platform. You will work across the entire stack from database to frontend.',
      skills: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker'],
      benefits: ['Equity', 'Health Insurance', 'Unlimited PTO', 'Learning Stipend'],
      remote_available: true,
      urgent_hiring: true,
      experience_level: 'Mid Level'
    },
    {
      title: 'Data Engineer',
      company: 'BigData Solutions',
      location: 'Chicago, IL',
      job_type: 'Full-time',
      description: 'Join our data team to build and maintain large-scale data pipelines and analytics infrastructure.',
      skills: ['Python', 'Apache Spark', 'Kafka', 'AWS', 'SQL'],
      benefits: ['High Salary', 'Stock Options', 'Remote Work', 'Conference Budget'],
      remote_available: true,
      urgent_hiring: false,
      experience_level: 'Senior Level'
    }
  ],

  posts: [
    {
      content: 'Just landed my dream job as a Senior React Developer! Thanks to everyone who helped with referrals and interview prep. The TankTide community is amazing! 🚀',
      likes_count: 24,
      comments_count: 8
    },
    {
      content: 'Pro tip for job seekers: Always customize your resume for each application. It makes a huge difference in getting past ATS systems. What other tips do you have?',
      likes_count: 15,
      comments_count: 12
    },
    {
      content: 'Excited to announce that our team is hiring! We have openings for Frontend, Backend, and DevOps engineers. DM me if you are interested! #hiring #jobs',
      likes_count: 31,
      comments_count: 6
    },
    {
      content: 'Networking event was incredible today! Met so many talented professionals. Remember, your next opportunity might come from a casual conversation ☕',
      likes_count: 18,
      comments_count: 4
    },
    {
      content: 'Quick reminder: Update your LinkedIn profile regularly. Recruiters are always looking for fresh profiles. What sections do you think are most important?',
      likes_count: 22,
      comments_count: 9
    }
  ]
};

// Setup functions
async function validateDatabaseConnection() {
  console.log('🔍 Validating database connection...');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Make sure you have run the database setup script in Supabase SQL editor');
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database validation error:', error.message);
    return false;
  }
}

async function createSampleProfiles() {
  console.log('👥 Creating sample profiles...');
  
  try {
    // Create sample users (this would normally be done through auth)
    const profiles = sampleData.profiles.map(profile => ({
      id: `sample-${Math.random().toString(36).substr(2, 9)}`,
      email: `${profile.full_name.toLowerCase().replace(' ', '.')}@example.com`,
      ...profile,
      connections_count: Math.floor(Math.random() * 100),
      followers_count: Math.floor(Math.random() * 200),
      posts_count: Math.floor(Math.random() * 20),
      role: 'user'
    }));

    const { data, error } = await supabase
      .from('profiles')
      .insert(profiles)
      .select();

    if (error) {
      console.error('❌ Error creating sample profiles:', error.message);
      return [];
    }

    console.log(`✅ Created ${data.length} sample profiles`);
    return data;
  } catch (error) {
    console.error('❌ Error in createSampleProfiles:', error.message);
    return [];
  }
}

async function createSampleJobs(profiles) {
  console.log('💼 Creating sample jobs...');
  
  if (profiles.length === 0) {
    console.log('⚠️ No profiles available, skipping job creation');
    return [];
  }

  try {
    const jobs = sampleData.jobs.map(job => ({
      ...job,
      created_by: profiles[Math.floor(Math.random() * profiles.length)].id,
      status: 'active',
      applications_count: Math.floor(Math.random() * 15),
      views_count: Math.floor(Math.random() * 100)
    }));

    const { data, error } = await supabase
      .from('jobs')
      .insert(jobs)
      .select();

    if (error) {
      console.error('❌ Error creating sample jobs:', error.message);
      return [];
    }

    console.log(`✅ Created ${data.length} sample jobs`);
    return data;
  } catch (error) {
    console.error('❌ Error in createSampleJobs:', error.message);
    return [];
  }
}

async function createSamplePosts(profiles) {
  console.log('📝 Creating sample posts...');
  
  if (profiles.length === 0) {
    console.log('⚠️ No profiles available, skipping post creation');
    return [];
  }

  try {
    const posts = sampleData.posts.map(post => ({
      ...post,
      author_id: profiles[Math.floor(Math.random() * profiles.length)].id,
      shares_count: Math.floor(Math.random() * 10)
    }));

    const { data, error } = await supabase
      .from('posts')
      .insert(posts)
      .select();

    if (error) {
      console.error('❌ Error creating sample posts:', error.message);
      return [];
    }

    console.log(`✅ Created ${data.length} sample posts`);
    return data;
  } catch (error) {
    console.error('❌ Error in createSamplePosts:', error.message);
    return [];
  }
}

async function createSampleNotifications(profiles) {
  console.log('🔔 Creating sample notifications...');
  
  if (profiles.length === 0) {
    console.log('⚠️ No profiles available, skipping notification creation');
    return [];
  }

  try {
    const notificationTypes = [
      {
        type: 'job_referral',
        title: 'New Job Referral',
        message: 'You have been referred for a new position',
        priority: 'high'
      },
      {
        type: 'connection_request',
        title: 'Connection Request',
        message: 'Someone wants to connect with you',
        priority: 'medium'
      },
      {
        type: 'job_application',
        title: 'Application Update',
        message: 'Your job application status has been updated',
        priority: 'medium'
      },
      {
        type: 'message',
        title: 'New Message',
        message: 'You have received a new message',
        priority: 'low'
      }
    ];

    const notifications = [];
    for (let i = 0; i < 20; i++) {
      const notifType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const profile = profiles[Math.floor(Math.random() * profiles.length)];
      
      notifications.push({
        user_id: profile.id,
        type: notifType.type,
        title: notifType.title,
        message: `${notifType.message} from ${profiles[Math.floor(Math.random() * profiles.length)].full_name}`,
        read: Math.random() > 0.6, // 40% unread
        actionable: Math.random() > 0.7, // 30% actionable
        priority: notifType.priority,
        metadata: { sample: true }
      });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('❌ Error creating sample notifications:', error.message);
      return [];
    }

    console.log(`✅ Created ${data.length} sample notifications`);
    return data;
  } catch (error) {
    console.error('❌ Error in createSampleNotifications:', error.message);
    return [];
  }
}

async function validateSetup() {
  console.log('🔍 Validating setup...');
  
  try {
    const tables = ['profiles', 'jobs', 'posts', 'notifications'];
    const results = {};
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(5);
      
      if (error) {
        console.error(`❌ Error validating ${table}:`, error.message);
        results[table] = 0;
      } else {
        results[table] = data.length;
      }
    }
    
    console.log('📊 Setup validation results:');
    Object.entries(results).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
    
    return Object.values(results).every(count => count > 0);
  } catch (error) {
    console.error('❌ Error in validateSetup:', error.message);
    return false;
  }
}

async function generateMobileEnvFile() {
  console.log('📱 Generating mobile environment file...');
  
  const envContent = `# TankTide Mobile App Environment Configuration
# Generated by setup script

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=${CONFIG.SUPABASE_URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${CONFIG.SUPABASE_ANON_KEY}

# App Configuration
EXPO_PUBLIC_APP_NAME=TankTide
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development

# Features
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=false

# Generated on: ${new Date().toISOString()}
`;

  const mobileEnvPath = path.join(__dirname, 'mobile', '.env');
  
  try {
    fs.writeFileSync(mobileEnvPath, envContent);
    console.log(`✅ Mobile environment file created at: ${mobileEnvPath}`);
  } catch (error) {
    console.error('❌ Error creating mobile environment file:', error.message);
  }
}

// Main setup function
async function main() {
  console.log('🚀 Starting TankTide Mobile Backend Setup...\n');
  
  // Initialize
  initializeSupabase();
  
  // Validate database connection
  const isConnected = await validateDatabaseConnection();
  if (!isConnected) {
    console.error('\n❌ Setup failed: Database connection issues');
    console.error('Please ensure you have:');
    console.error('1. Created a Supabase project');
    console.error('2. Run the setup_remote_database.sql script');
    console.error('3. Set correct environment variables');
    process.exit(1);
  }
  
  // Create sample data
  console.log('\n📦 Creating sample data...');
  const profiles = await createSampleProfiles();
  const jobs = await createSampleJobs(profiles);
  const posts = await createSamplePosts(profiles);
  const notifications = await createSampleNotifications(profiles);
  
  // Generate mobile environment file
  await generateMobileEnvFile();
  
  // Validate setup
  console.log('\n🔍 Final validation...');
  const isValid = await validateSetup();
  
  if (isValid) {
    console.log('\n🎉 Setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. cd tanktide-main/mobile');
    console.log('2. npm install');
    console.log('3. npm start');
    console.log('\nYour TankTide mobile app is ready to use! 📱');
  } else {
    console.log('\n⚠️ Setup completed with warnings');
    console.log('Some sample data may not have been created properly');
    console.log('The app should still work, but you may see empty states');
  }
}

// Run setup
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Setup failed with error:', error.message);
    process.exit(1);
  });
}

module.exports = { main };