=======
# TankTide - Professional Networking Platform

A comprehensive professional networking platform built with React, TypeScript, and Supabase.

## 🚀 Features

### 🔐 Authentication & Profiles
- User registration and login
- Professional profile management
- Profile verification system
- Comprehensive user profiles with experience, education, and skills

### 💼 Job Management
- Create and manage job referrals
- Job application system
- Application tracking and management
- Shortlisting functionality
- Job search and filtering

### 📱 Social Features
- Professional feed with posts
- Like and comment system
- Real-time engagement tracking
- Content sharing capabilities

### 💬 Messaging System
- Direct messaging between users
- Conversation management
- Message read status
- Real-time updates

### 🔔 Notification System
- Connection requests
- Job application alerts
- Post engagement notifications
- Priority-based notifications

### 🤝 Professional Networking
- Send/accept connection requests
- View professional connections
- Suggested connections
- Network growth tracking

### 🔍 Search & Discovery
- Advanced search functionality
- Filter by users, companies, posts
- Search suggestions with images
- Recent search history

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Netlify (Frontend)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tanktide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Run the SQL migration in the Supabase SQL editor (see `supabase/migrations/`)

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗄 Database Schema

The application uses the following main tables:

- **profiles** - User profile information
- **jobs** - Job postings and referrals
- **applications** - Job applications with status tracking
- **posts** - Social media feed posts
- **comments** - Post comments
- **connections** - Professional networking connections
- **messages** - Direct messaging system
- **conversations** - Message conversations
- **notifications** - User notifications

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Authentication-based access control
- Secure API endpoints with proper authorization
- User-based data isolation

## 🚀 Deployment

### Frontend (Netlify)
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Backend (Supabase)
1. Database is automatically managed by Supabase
2. Edge functions are deployed automatically
3. Real-time subscriptions work out of the box

## 📱 Features Overview

### Landing Page
- Hero section with platform overview
- Service highlights
- About section with company values
- Statistics and testimonials
- Contact form

### Professional Dashboard
- Personalized feed with industry insights
- Job recommendations
- Network activity
- Analytics and metrics

### Job Portal
- Browse referral opportunities
- Advanced filtering options
- Application management
- Referral creation tools

### Messaging
- Real-time conversations
- Professional context indicators
- File sharing capabilities
- Message status tracking

### Profile Management
- Comprehensive profile builder
- Skills and experience showcase
- Professional achievements
- Privacy controls

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # React components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── lib/                # Utility libraries
├── services/           # API services
└── types/              # TypeScript types

supabase/
├── functions/          # Edge functions
└── migrations/         # Database migrations
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@tanktide.com or join our community Discord.

---

**TankTide** - Where professional opportunities flow through trusted connections.
>>>>>>> a8cf141 (first commit)
