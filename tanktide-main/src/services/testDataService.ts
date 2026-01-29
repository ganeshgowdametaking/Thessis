import { supabase } from '../lib/supabase'

export const testDataService = {
  // Create sample jobs for testing
  createSampleJobs: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const sampleJobs = [
      {
        title: 'Senior Software Engineer',
        company: 'Google',
        department: 'Engineering',
        location: 'Mountain View, CA',
        job_type: 'Full-time',
        description: `We are looking for a Senior Software Engineer to join our team and help build the next generation of our products. You will be working on large-scale distributed systems and have the opportunity to impact millions of users worldwide.

Key Responsibilities:
• Design and implement scalable backend systems
• Collaborate with cross-functional teams to deliver high-quality products
• Mentor junior engineers and contribute to technical decisions
• Participate in code reviews and maintain high coding standards

Requirements:
• 5+ years of experience in software development
• Strong proficiency in Java, Python, or Go
• Experience with distributed systems and microservices
• Bachelor's degree in Computer Science or related field

What We Offer:
• Competitive compensation package ($180k - $250k)
• Comprehensive health, dental, and vision insurance
• Flexible work arrangements and unlimited PTO
• Professional development opportunities
• State-of-the-art office facilities and equipment`,
        skills: ['Java', 'Python', 'Distributed Systems', 'Microservices', 'Cloud Computing'],
        benefits: ['Health Insurance', 'Dental Insurance', 'Vision Insurance', 'Unlimited PTO', 'Stock Options'],
        remote_available: false,
        urgent_hiring: false,
        experience_level: 'Senior Level',
        created_by: user.id,
        status: 'active'
      },
      {
        title: 'Product Manager',
        company: 'Microsoft',
        department: 'Product',
        location: 'Seattle, WA',
        job_type: 'Full-time',
        description: `Join our Product Management team and drive the strategy and execution of our flagship products. You'll work closely with engineering, design, and business teams to deliver innovative solutions that delight our customers.

Key Responsibilities:
• Define product strategy and roadmap
• Gather and prioritize product requirements
• Work closely with engineering teams to deliver features
• Analyze market trends and competitive landscape
• Collaborate with stakeholders across the organization

Requirements:
• 3+ years of product management experience
• Strong analytical and problem-solving skills
• Experience with agile development methodologies
• Excellent communication and leadership skills
• MBA or equivalent experience preferred

What We Offer:
• Competitive compensation package ($150k - $200k)
• Comprehensive benefits including health, dental, and vision
• Flexible work arrangements
• Professional development budget ($5k annually)
• Collaborative and inclusive work environment`,
        skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Stakeholder Management', 'Market Research'],
        benefits: ['Health Insurance', 'Dental Insurance', 'Vision Insurance', 'Flexible Hours', 'Professional Development'],
        remote_available: true,
        urgent_hiring: true,
        experience_level: 'Mid Level',
        created_by: user.id,
        status: 'active'
      },
      {
        title: 'UX Designer',
        company: 'Airbnb',
        department: 'Design',
        location: 'San Francisco, CA',
        job_type: 'Full-time',
        description: `We're seeking a talented UX Designer to join our design team and help create exceptional user experiences for our platform. You'll work on projects that impact millions of users worldwide and collaborate with a world-class design team.

Key Responsibilities:
• Design user-centered experiences for web and mobile platforms
• Conduct user research and usability testing
• Create wireframes, prototypes, and high-fidelity designs
• Collaborate with product managers and engineers
• Contribute to our design system and best practices

Requirements:
• 4+ years of UX design experience
• Proficiency in Figma, Sketch, or similar design tools
• Strong portfolio demonstrating design thinking process
• Experience with user research methodologies
• Bachelor's degree in Design, HCI, or related field

What We Offer:
• Competitive compensation package ($130k - $180k)
• Comprehensive health benefits
• Annual travel credit ($2k)
• Professional development opportunities
• Diverse and inclusive work environment`,
        skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing'],
        benefits: ['Health Insurance', 'Travel Credit', 'Stock Options', 'Flexible PTO', 'Learning Budget'],
        remote_available: false,
        urgent_hiring: false,
        experience_level: 'Mid Level',
        created_by: user.id,
        status: 'active'
      },
      {
        title: 'Data Scientist',
        company: 'Netflix',
        department: 'Data Science',
        location: 'Los Gatos, CA',
        job_type: 'Full-time',
        description: `Join our Data Science team and help drive data-driven decision making across the organization. You'll work on challenging problems involving recommendation systems, content optimization, and user behavior analysis.

Key Responsibilities:
• Develop machine learning models for recommendation systems
• Analyze large datasets to extract actionable insights
• Collaborate with product and engineering teams
• Design and run A/B tests to measure impact
• Present findings to stakeholders and leadership

Requirements:
• PhD or Master's in Statistics, Computer Science, or related field
• 3+ years of experience in data science or machine learning
• Proficiency in Python, R, and SQL
• Experience with big data technologies (Spark, Hadoop)
• Strong statistical analysis and modeling skills

What We Offer:
• Competitive compensation and stock options ($160k - $220k)
• Unlimited vacation policy
• Comprehensive health benefits
• Professional development budget
• Access to Netflix content library`,
        skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'A/B Testing'],
        benefits: ['Unlimited PTO', 'Stock Options', 'Health Insurance', 'Netflix Subscription', 'Learning Budget'],
        remote_available: true,
        urgent_hiring: false,
        experience_level: 'Senior Level',
        created_by: user.id,
        status: 'active'
      },
      {
        title: 'DevOps Engineer',
        company: 'Amazon',
        department: 'Infrastructure',
        location: 'Austin, TX',
        job_type: 'Full-time',
        description: `We're looking for a DevOps Engineer to join our infrastructure team and help scale our systems to support millions of customers. You'll work with cutting-edge cloud technologies and automation tools.

Key Responsibilities:
• Design and maintain CI/CD pipelines
• Manage cloud infrastructure on AWS
• Implement monitoring and alerting systems
• Automate deployment and scaling processes
• Collaborate with development teams on infrastructure needs

Requirements:
• 3+ years of DevOps or infrastructure experience
• Strong knowledge of AWS services
• Experience with containerization (Docker, Kubernetes)
• Proficiency in scripting languages (Python, Bash)
• Experience with infrastructure as code (Terraform, CloudFormation)

What We Offer:
• Competitive compensation package ($140k - $190k)
• Comprehensive health benefits
• Career development programs
• Employee discount on Amazon purchases
• Collaborative work environment`,
        skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Python'],
        benefits: ['Health Insurance', 'Stock Units', 'Employee Discount', 'Career Development', 'Flexible Hours'],
        remote_available: false,
        urgent_hiring: false,
        experience_level: 'Mid Level',
        created_by: user.id,
        status: 'active'
      },
      {
        title: 'Frontend Developer',
        company: 'Spotify',
        department: 'Engineering',
        location: 'New York, NY',
        job_type: 'Full-time',
        description: `Join our frontend team and help build the user interfaces that millions of music lovers interact with daily. You'll work on cutting-edge web technologies and create beautiful, performant user experiences.

Key Responsibilities:
• Build responsive web applications using React and TypeScript
• Collaborate with designers to implement pixel-perfect UIs
• Optimize application performance and user experience
• Write clean, maintainable, and testable code
• Participate in code reviews and technical discussions

Requirements:
• 3+ years of frontend development experience
• Strong proficiency in React, TypeScript, and modern JavaScript
• Experience with CSS-in-JS libraries and responsive design
• Knowledge of web performance optimization techniques
• Bachelor's degree in Computer Science or equivalent experience

What We Offer:
• Competitive salary and equity package ($120k - $160k)
• Premium Spotify subscription for you and family
• Flexible work arrangements
• Health, dental, and vision insurance
• Professional development opportunities`,
        skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Web Performance'],
        benefits: ['Health Insurance', 'Spotify Premium', 'Flexible Work', 'Stock Options', 'Learning Budget'],
        remote_available: true,
        urgent_hiring: true,
        experience_level: 'Mid Level',
        created_by: user.id,
        status: 'active'
      }
    ]

    const { data, error } = await supabase
      .from('jobs')
      .insert(sampleJobs)
      .select()

    if (error) throw error
    return data
  },

  // Create sample user profile if it doesn't exist
  createSampleProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return existingProfile
    }

    // Create profile
    const profileData = {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || 'Test User',
      title: 'Software Engineer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      bio: 'Passionate software engineer with experience in building scalable web applications.',
      verified: true
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}