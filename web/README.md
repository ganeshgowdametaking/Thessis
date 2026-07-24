# Thessis - Professional Networking Platform

A comprehensive professional networking platform built with React, TypeScript, and Supabase that connects talented professionals with opportunities through trusted referrals.

## Overview

Thessis is a modern web application that serves as a professional networking platform. It enables users to create profiles, share job opportunities, connect with other professionals, and manage job applications in a secure and user-friendly environment.

## Core Features

### Authentication and User Management
- User registration and login with email/password
- Google OAuth integration for seamless sign-in
- Professional profile management with comprehensive user information
- Profile verification system for enhanced credibility
- Secondary email verification for organizational accounts

### Job Management System
- Create and manage job referrals and postings
- Advanced job application system with status tracking
- Application management with shortlisting functionality
- Comprehensive job search and filtering capabilities
- Real-time application status updates

### Social Networking Features
- Professional feed with posts and content sharing
- Like and comment system for engagement
- Real-time engagement tracking and analytics
- Content sharing capabilities with rich media support

### Messaging and Communication
- Direct messaging between users with real-time updates
- Conversation management with message history
- Message read status and typing indicators
- File sharing capabilities within conversations

### Notification System
- Connection request notifications
- Job application alerts and updates
- Post engagement notifications
- Priority-based notification management

### Professional Networking
- Send and accept connection requests
- View and manage professional connections
- Suggested connections based on profile data
- Network growth tracking and analytics

### Search and Discovery
- Advanced search functionality across users, companies, and posts
- Filter options with multiple criteria
- Search suggestions with profile images
- Recent search history management

## Technology Stack

### Frontend Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with enhanced IDE support
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Vite**: Fast build tool and development server
- **React Router**: Client-side routing for single-page application

### Backend and Services
- **Supabase**: Backend-as-a-Service with PostgreSQL database
- **Supabase Auth**: Authentication and authorization system
- **Supabase Realtime**: Real-time subscriptions for live updates
- **Supabase Storage**: File storage for resumes and profile images

### UI/UX Libraries
- **Lucide React**: Modern icon library
- **Framer Motion**: Animation library for smooth transitions
- **GSAP**: Advanced animations and effects
- **React Responsive**: Responsive design utilities

### Data Visualization
- **Nivo**: Chart library for analytics and data visualization
- **Recharts**: Additional chart components
- **D3-geo**: Geographic data visualization

### Development Tools
- **ESLint**: Code linting and quality enforcement
- **TypeScript ESLint**: TypeScript-specific linting rules
- **PostCSS**: CSS processing and optimization
- **Autoprefixer**: CSS vendor prefixing

## Project Structure

```
src/
├── components/          # React components organized by feature
│   ├── Header.tsx      # Main navigation header
│   ├── JobsPage.tsx    # Job listing and management
│   ├── ProfilePage.tsx # User profile management
│   ├── MessagesPage.tsx # Messaging interface
│   └── ...             # Other feature components
├── contexts/           # React context providers
│   ├── AuthContext.tsx # Authentication state management
│   └── LoadingContext.tsx # Global loading state
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   └── useEUDetection.ts # GDPR compliance hook
├── services/           # API service layer
│   ├── jobService.ts   # Job-related API calls
│   ├── profileService.ts # Profile management
│   ├── messageService.ts # Messaging functionality
│   └── analyticsService.ts # Analytics and tracking
├── lib/                # Utility libraries
│   ├── supabase.ts     # Supabase client configuration
│   └── database.types.ts # TypeScript database types
└── utils/              # Helper functions and utilities
```

## Installation and Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- Git for version control
- Supabase account for backend services

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd thessis_frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Supabase Project Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to the `.env` file
3. Run the database migrations in the Supabase SQL editor
4. Configure authentication providers (Google OAuth recommended)

### Step 5: Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Configuration Guides

### Google OAuth Setup

#### Google Cloud Console Configuration
1. Create a new project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google+ API in the API Library
3. Create OAuth 2.0 credentials for a web application
4. Configure authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://your-domain.com` (production)
5. Configure authorized redirect URIs:
   - `http://localhost:5173/auth/callback`
   - `https://your-domain.com/auth/callback`
   - `https://your-project-ref.supabase.co/auth/v1/callback`

#### Supabase Authentication Configuration
1. Navigate to Authentication > Providers in your Supabase dashboard
2. Enable the Google provider
3. Add your Google OAuth Client ID and Client Secret
4. Configure redirect URLs in Authentication > URL Configuration

### Email Configuration

The platform uses Supabase's built-in email system with Mailgun SMTP;

1. **Supabase Email Settings**:
   - Go to Authentication > Settings in Supabase dashboard
   - Configure SMTP settings for production emails
   - Set up custom email templates for various notifications

2. **Email Templates**:
   - Customize templates in Authentication > Email Templates
   - Templates include: email confirmation, magic link, password reset
   - Ensure templates match your brand and messaging

### Authentication Configuration

For OTP-based authentication (recommended for better user experience):

1. **Disable Email Confirmation**:
   - Go to Supabase Dashboard > Authentication > Settings
   - Disable "Enable email confirmations"
   - Disable "Enable secure email change"

2. **Authentication Flow**:
   - **Sign Up**: Email + Password → OTP Sent → Enter OTP → Account Created
   - **Sign In**: Email + Password → If Correct: Signed In / If Wrong: OTP Sent

## Development Workflow

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build application for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality checks

### Code Organization
- **Components**: Organized by feature in the `src/components/` directory
- **Services**: API calls and external service integrations in `src/services/`
- **Hooks**: Custom React hooks for reusable logic in `src/hooks/`
- **Contexts**: Global state management in `src/contexts/`
- **Types**: TypeScript type definitions in `src/lib/`

### Loading System
The application includes a comprehensive loading system for better user experience:

- **LoadingSpinner Component**: Reusable loading UI with customizable text and size options
- **LoadingContext**: Global loading state management for application-wide loading states
- **CSS Animations**: Custom loading animations for visual feedback
- **Responsive Design**: Mobile-optimized loading states

Usage Examples:
```tsx
// Component-level loading
<LoadingSpinner text="Loading data..." size="medium" />

// Global loading state
const { showLoading, hideLoading } = useLoading();
showLoading('Submitting form...');
// ... perform operation
hideLoading();
```

## Testing and Quality Assurance

### Analytics and Tracking
The platform includes comprehensive analytics with GDPR compliance:

1. **Non-EU Users**: Full session tracking and detailed analytics
2. **EU Users**: Aggregate visitor counts only (GDPR-compliant)
3. **Consent Management**: Respects user privacy preferences and consent

### Testing Methods
- **Analytics Dashboard**: Available at `/analytics` (admin access only)
- **Browser Console Utilities**: Testing tools for development
- **Manual Testing Scenarios**: Different user types and edge cases

### Code Quality
- **ESLint**: Enforces code style and catches potential issues
- **TypeScript**: Provides type safety and better IDE support
- **Prettier**: Ensures consistent code formatting

## Deployment

### Production Environment Setup
```bash
# Environment variables for production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### Build Process
```bash
npm run build
```

### Deployment Options

#### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Configure custom domain and SSL certificates

#### Vercel
1. Connect repository to Vercel
2. Framework preset: Vite
3. Add environment variables
4. Configure custom domain settings

### Production Checklist
- [ ] Environment variables configured correctly
- [ ] Database migrations applied to production
- [ ] Email provider configured and tested
- [ ] Domain and SSL certificates set up
- [ ] Supabase redirect URLs updated for production
- [ ] Google OAuth redirect URIs updated for production
- [ ] Security review completed
- [ ] Performance optimization implemented
- [ ] Error monitoring configured

## Admin System

### Admin Invitation and Promotion System
The platform includes a comprehensive admin system for managing administrator access:

#### Features
- **Admin Invitations**: Send email invitations to promote existing users to admin status
- **Mailgun Integration**: Email delivery via Mailgun (EU region supported)
- **Token-based Security**: Secure invitation tokens with 24-hour expiration
- **Analytics Access**: Admin users can access the analytics dashboard at `/analytics`

#### Setup Requirements

1. **Mailgun Configuration** (Supabase Edge Functions Environment Variables):
   ```bash
   MAILGUN_API_KEY=key-your-private-api-key
   MAILGUN_DOMAIN=thessis.com
   MAILGUN_FROM_EMAIL=no-reply@tanktide.com
   FRONTEND_URL=https://tanktide.com
   ```

2. **Database Tables**:
   - `admin_invites`: Stores invitation tokens and metadata
   - `profiles.role`: User role column ('user' or 'admin')

3. **RLS Policies**:
   ```sql
   -- Enable RLS and create service role policies
   ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "admin_invites_service_role_access" 
   ON admin_invites FOR ALL TO service_role USING (true) WITH CHECK (true);
   
   CREATE POLICY "Service role can update profiles" 
   ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
   ```

#### Usage
1. **Send Invitation**: Admin users can invite others via Settings page
2. **Email Delivery**: Automatic email with secure invitation link
3. **Accept Invitation**: Users click link to be promoted to admin
4. **Analytics Access**: New admins can access analytics dashboard

#### Edge Functions
- `send-admin-invite`: Creates invitation and sends email via Mailgun
- `accept-admin-invite`: Validates token and promotes user to admin

## Database Schema

The application uses the following main database tables:

- **profiles**: User profile information and preferences (includes `role` for admin system)
- **jobs**: Job postings and referral opportunities
- **applications**: Job applications with status tracking
- **posts**: Social media feed posts and content
- **comments**: Post comments and interactions
- **connections**: Professional networking connections
- **messages**: Direct messaging system
- **conversations**: Message conversation management
- **notifications**: User notification system
- **admin_invites**: Admin invitation tokens and metadata

## Security Features

- **Row Level Security (RLS)**: Enabled on all database tables
- **Authentication-based Access Control**: Secure API endpoints with proper authorization
- **User-based Data Isolation**: Data access restricted to authorized users
- **HTTPS Enforcement**: Secure connections in production
- **OAuth Security**: Best practices for third-party authentication
- **GDPR Compliance**: Privacy-focused data handling

## Contributing

### Development Guidelines
1. Fork the repository and create a feature branch
2. Follow the existing code style and patterns
3. Add appropriate tests for new features
4. Ensure all linting checks pass
5. Submit a pull request with detailed description

### Code Standards
- Use TypeScript for all new code
- Follow React best practices and hooks
- Maintain consistent naming conventions
- Add proper error handling
- Include appropriate loading states

## Support and Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Community
- For technical support: support@tanktide.com
- For feature requests: Create an issue in the repository
- For bug reports: Include detailed steps to reproduce

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Thessis** - Where professional opportunities flow through trusted connections.
