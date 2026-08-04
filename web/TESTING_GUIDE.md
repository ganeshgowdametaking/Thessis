# 🧪 Thessis Mobile App Testing Guide

## Quick Start Testing

### 1. **Demo Mode Testing (Easiest)**
The app includes a built-in demo mode that works without any backend setup:

```bash
# Navigate to mobile directory
cd thessis-main/mobile

# Start the development server
npx expo start --web
```

Then open your browser to `http://localhost:8081` and:
1. **Skip Authentication**: Tap "Skip & Explore App (Demo)"
2. **Explore Features**: Browse all screens with mock data
3. **Test Navigation**: Use bottom tabs to switch between screens

### 2. **iOS Simulator Testing**
If you have Xcode installed:

```bash
# Start Expo development server
npx expo start

# In the terminal, press 'i' to open iOS simulator
# Or scan QR code with Expo Go app
```

### 3. **Android Testing**
If you have Android Studio:

```bash
# Start Expo development server
npx expo start

# In the terminal, press 'a' to open Android emulator
# Or scan QR code with Expo Go app
```

### 4. **Physical Device Testing**
1. Install **Expo Go** app from App Store/Play Store
2. Run `npx expo start` in terminal
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)

## 📱 Testing Features

### **Authentication Flow**
1. **Hero Screen**: Beautiful onboarding with features showcase
2. **Demo Mode**: Skip authentication to explore immediately
3. **Sign Up**: Create new account with email/password
4. **Sign In**: Login with existing credentials
5. **Form Validation**: Test with invalid inputs

### **Jobs Screen**
- ✅ **Browse Jobs**: View job listings with details
- ✅ **Job Cards**: Company, location, skills, urgency indicators
- ✅ **Pull to Refresh**: Refresh job listings
- ✅ **Create Referral**: Add new job postings (+ button)
- ✅ **Empty State**: Shows when no jobs available
- ✅ **Connection Status**: Shows backend connection status

### **Messages Screen**
- ✅ **Conversation List**: View all conversations
- ✅ **Unread Indicators**: Badge for unread messages
- ✅ **User Avatars**: Profile pictures and names
- ✅ **Time Stamps**: Relative time display (2m ago, 1h ago)
- ✅ **Pull to Refresh**: Refresh conversations
- ✅ **Empty State**: Shows when no messages

### **Notifications Screen**
- ✅ **Notification Types**: Job, message, connection notifications
- ✅ **Priority Levels**: High, medium, low priority indicators
- ✅ **Mark as Read**: Individual and bulk read actions
- ✅ **Unread Count**: Shows unread notification count
- ✅ **Time Stamps**: Relative time display
- ✅ **Action Menu**: More options for each notification

### **Profile Screen**
- ✅ **Profile Display**: Name, title, company, location
- ✅ **Edit Mode**: Toggle between view and edit modes
- ✅ **Statistics**: Connections, posts, followers count
- ✅ **Profile Details**: Bio, contact information
- ✅ **Settings Menu**: Account settings and sign out
- ✅ **Form Validation**: Required field validation

## 🎯 Testing Scenarios

### **Demo Mode Testing**
```
1. Open app → Tap "Skip & Explore App (Demo)"
2. Browse Jobs → See sample job listings
3. Tap Messages → View mock conversations
4. Check Notifications → See sample notifications
5. View Profile → See demo user profile
6. Test Navigation → Switch between all tabs
```

### **Authentication Testing**
```
1. Open app → Tap "Get Started"
2. Try Sign Up → Enter name, email, password
3. Test Validation → Try invalid email/short password
4. Try Sign In → Use existing credentials
5. Test Demo → Use "Skip & Explore" option
```

### **Real Backend Testing** (If Supabase is configured)
```
1. Set up Supabase project
2. Run database setup script
3. Update .env with real credentials
4. Test real sign up/sign in
5. Create actual job postings
6. Send real messages
7. Receive real notifications
```

## 🔧 Troubleshooting

### **App Won't Start**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

### **Web Version Issues**
```bash
# Install web dependencies
npx expo install react-native-web @expo/webpack-config
npm install --legacy-peer-deps
npx expo start --web
```

### **Simulator Issues**
```bash
# Reset iOS Simulator
xcrun simctl erase all

# Reset Android Emulator
# Use Android Studio → AVD Manager → Wipe Data
```

### **Environment Issues**
```bash
# Check environment variables
cat .env

# Verify Expo configuration
npx expo config
```

## 📊 Testing Checklist

### **UI/UX Testing**
- [ ] All screens load properly
- [ ] Navigation works smoothly
- [ ] Buttons and inputs are responsive
- [ ] Loading states display correctly
- [ ] Error states show appropriate messages
- [ ] Empty states are informative
- [ ] Design is consistent across screens

### **Functionality Testing**
- [ ] Authentication flow works
- [ ] Job browsing and creation
- [ ] Message viewing and sending
- [ ] Notification management
- [ ] Profile editing and viewing
- [ ] Pull-to-refresh functionality
- [ ] Form validation

### **Performance Testing**
- [ ] App starts quickly
- [ ] Smooth scrolling in lists
- [ ] Fast navigation between screens
- [ ] Responsive touch interactions
- [ ] Efficient memory usage

### **Cross-Platform Testing**
- [ ] Works on iOS simulator
- [ ] Works on Android emulator
- [ ] Works in web browser
- [ ] Works on physical devices
- [ ] Consistent behavior across platforms

## 🚀 Advanced Testing

### **Real-time Features** (With Backend)
- [ ] Messages appear instantly
- [ ] Notifications arrive in real-time
- [ ] Job updates sync across devices
- [ ] Connection status updates

### **Offline Testing**
- [ ] App works without internet
- [ ] Cached data displays properly
- [ ] Actions queue when offline
- [ ] Sync works when reconnected

### **Edge Cases**
- [ ] Very long job descriptions
- [ ] Special characters in names
- [ ] Large numbers of notifications
- [ ] Network interruptions
- [ ] Low memory conditions

## 📱 Testing Commands

```bash
# Start development server
npx expo start

# Start with web support
npx expo start --web

# Start with specific platform
npx expo start --ios
npx expo start --android

# Clear cache and restart
npx expo start --clear

# Run in production mode
npx expo start --no-dev --minify

# Check app configuration
npx expo config

# Check dependencies
npx expo doctor
```

## 🎉 Success Criteria

Your app is working correctly if:
- ✅ All screens load without errors
- ✅ Navigation between tabs works smoothly
- ✅ Demo mode shows sample data
- ✅ Forms validate input properly
- ✅ Loading states appear during operations
- ✅ Empty states show helpful messages
- ✅ Design looks professional and consistent

## 📞 Getting Help

If you encounter issues:
1. Check the console logs for errors
2. Verify environment configuration
3. Try demo mode first
4. Clear cache and restart
5. Check network connectivity
6. Review the setup guide

The app is designed to work seamlessly in demo mode, so you can explore all features immediately without any backend setup!