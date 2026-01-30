# TankTide Mobile App Setup Guide

This guide will help you set up and run the TankTide mobile application with proper backend integration.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Supabase account and project

## 1. Environment Setup

### Create Environment File
Copy the example environment file and configure it:

```bash
cd tanktide-main/mobile
cp .env.example .env
```

### Configure Environment Variables
Edit the `.env` file with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_APP_NAME=TankTide
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development
```

## 2. Supabase Backend Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### Step 2: Run Database Setup
Execute the database setup script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of setup_remote_database.sql
-- This will create all necessary tables, policies, and functions
```

### Step 3: Configure Authentication
1. Go to Authentication > Settings in Supabase dashboard
2. Disable email confirmations for easier mobile testing:
   - Uncheck "Enable email confirmations"
   - Uncheck "Enable secure email change"

### Step 4: Set up Storage Buckets
The database script automatically creates storage buckets for:
- `avatars` (public)
- `resumes` (private)
- `post-images` (public)
- `cover-images` (public)

## 3. Install Dependencies

```bash
cd tanktide-main/mobile
npm install
```

## 4. Start Development Server

```bash
# Start Expo development server
npm start

# Or start with specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## 5. App Features

### Authentication
- Email/password sign up and sign in
- Demo mode for testing
- Secure session management
- Profile creation and management

### Job Management
- Browse job referrals
- Create new job postings
- Apply to jobs
- Track application status

### Messaging
- Real-time conversations
- Message history
- Unread message indicators

### Notifications
- Job application updates
- Connection requests
- Message notifications
- Priority-based notifications

### Profile Management
- Edit profile information
- View connection statistics
- Manage account settings

## 6. Testing the App

### Demo Mode
The app includes a demo mode that allows you to explore features without authentication:
1. Open the app
2. Tap "Skip & Explore App (Demo)" on the auth screen
3. Browse all features with mock data

### Real Backend Testing
1. Create a Supabase account and project
2. Run the database setup script
3. Configure environment variables
4. Sign up with a real email address
5. Test all features with live data

## 7. Development Tips

### Debugging
- Check the Expo console for detailed logs
- Use React Native Debugger for advanced debugging
- Monitor Supabase logs in the dashboard

### Hot Reloading
- The app supports hot reloading for faster development
- Changes to components will reflect immediately
- Database schema changes require app restart

### Testing on Device
```bash
# Install Expo Go app on your phone
# Scan QR code from terminal to run on device
npm start
```

## 8. Common Issues and Solutions

### Environment Variables Not Loading
- Ensure `.env` file is in the mobile directory
- Restart the Expo development server
- Check that variables start with `EXPO_PUBLIC_`

### Supabase Connection Issues
- Verify URL and anon key are correct
- Check network connectivity
- Ensure RLS policies are properly configured

### Build Issues
```bash
# Clear Expo cache
expo r -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 9. Production Deployment

### Build for Production
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### Environment Configuration
- Create production environment variables
- Update Supabase URLs for production
- Configure proper authentication redirects

## 10. Next Steps

### Additional Features to Implement
- Push notifications
- File upload for resumes and avatars
- Advanced search and filtering
- Social features (posts, comments, likes)
- Analytics and reporting

### Performance Optimization
- Implement proper caching
- Optimize image loading
- Add pagination for large lists
- Implement offline support

## Support

For issues or questions:
1. Check the console logs for error details
2. Verify Supabase configuration
3. Ensure all environment variables are set
4. Test with demo mode first

The app is designed to work seamlessly with the existing web application, sharing the same database and authentication system.