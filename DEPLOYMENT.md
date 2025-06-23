# TankTide Production Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Environment Setup
```bash
# Create production .env file
VITE_SUPABASE_URL=https://pxhmmibjcesmcbffkzps.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4aG1taWJqY2VzbWNiZmZrenBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDE1MjAsImV4cCI6MjA2NTE3NzUyMH0.7Pwx6kZH0nzK2v__J7I4L7eM2_KO3prTMq3T8ZvYzqw
```

### 2. Build for Production
```bash
npm run build
```

### 3. Deploy Options

#### Option A: Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

#### Option B: Vercel
1. Connect repository to Vercel
2. Framework preset: Vite
3. Add environment variables

### 4. Supabase Configuration

#### Email Settings
1. Go to Supabase Dashboard → Authentication → Settings
2. Configure SMTP settings for production emails
3. Set up custom email templates
4. Configure redirect URLs for your domain

#### Security
1. Add your production domain to allowed origins
2. Update RLS policies if needed
3. Review API keys and permissions

### 5. Domain & SSL
- Configure custom domain
- SSL certificates (automatic with Netlify/Vercel)
- Update Supabase redirect URLs

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Email provider configured
- [ ] Domain and SSL setup
- [ ] Error monitoring (optional)
- [ ] Analytics setup (optional)
- [ ] Performance optimization
- [ ] Security review

## 🔧 Optional Enhancements

### Email Provider Setup
```javascript
// In Supabase Dashboard → Settings → Auth
// Configure custom SMTP:
// - SendGrid
// - Mailgun  
// - AWS SES
// - Resend
```

### Custom Domain
```javascript
// Update Supabase Auth settings:
// Site URL: https://yourdomain.com
// Redirect URLs: https://yourdomain.com/**
```

## 📊 Monitoring & Analytics

### Error Tracking
- Sentry integration
- LogRocket for user sessions
- Supabase built-in logging

### Performance
- Lighthouse scores
- Core Web Vitals
- Database query optimization

## 🚀 Ready to Launch!

Once you complete these steps, your TankTide platform will be fully production-ready for real users!