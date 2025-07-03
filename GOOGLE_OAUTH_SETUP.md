# Google OAuth Setup Guide for TankTide

This guide will help you set up Google OAuth authentication for your TankTide platform using Supabase.

## Prerequisites

- A Supabase project
- A Google Cloud Console account
- Access to your domain (for redirect URLs)

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

### 1.2 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Fill in the following details:
   - **Name**: `TankTide Web App`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     http://localhost:5174
     http://localhost:5175
     http://localhost:5176
     http://localhost:5177
     https://your-domain.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:5173/auth/callback
     http://localhost:5174/auth/callback
     http://localhost:5175/auth/callback
     http://localhost:5176/auth/callback
     http://localhost:5177/auth/callback
     https://your-domain.com/auth/callback
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

5. Click "Create"
6. **Save the Client ID and Client Secret** - you'll need these for Supabase

### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - **App name**: `TankTide`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `email`
   - `profile`
   - `openid`
5. Add test users if needed
6. Save and continue

## Step 2: Supabase Configuration

### 2.1 Enable Google Provider

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" and click "Enable"
4. Enter your Google OAuth credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
5. Save the configuration

### 2.2 Configure Redirect URLs

1. In Supabase, go to "Authentication" > "URL Configuration"
2. Set the following URLs:
   - **Site URL**: `https://your-domain.com` (or `http://localhost:5173` for development)
   - **Redirect URLs**: 
     ```
     https://your-domain.com/auth/callback
     http://localhost:5173/auth/callback
     http://localhost:5174/auth/callback
     http://localhost:5175/auth/callback
     http://localhost:5176/auth/callback
     http://localhost:5177/auth/callback
     ```

### 2.3 Configure Email Templates (Optional)

1. Go to "Authentication" > "Email Templates"
2. Customize the email templates for:
   - Email confirmation
   - Magic link
   - Password reset

## Step 3: Environment Variables

Add the following environment variables to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Testing the Setup

### 4.1 Local Development Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your hero page
3. Click the "Get Started with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be redirected back to `/auth/callback`
6. The callback should redirect you to `/jobs` if successful

### 4.2 Production Testing

1. Deploy your application
2. Update the Google OAuth redirect URIs to include your production domain
3. Test the Google sign-in flow in production

## Step 5: Troubleshooting

### Common Issues

#### 1. "Invalid redirect_uri" Error
- **Cause**: The redirect URI in Google Cloud Console doesn't match the one in Supabase
- **Solution**: Ensure all redirect URIs are properly configured in both Google Cloud Console and Supabase

#### 2. "OAuth consent screen not configured" Error
- **Cause**: The OAuth consent screen is not properly configured
- **Solution**: Complete the OAuth consent screen setup in Google Cloud Console

#### 3. "Client ID not found" Error
- **Cause**: Incorrect Client ID in Supabase configuration
- **Solution**: Double-check the Client ID and Client Secret in Supabase

#### 4. Redirect Loop
- **Cause**: Incorrect redirect URL configuration
- **Solution**: Ensure the redirect URLs match exactly between Google Cloud Console and Supabase

### Debug Steps

1. **Check Browser Console**: Look for any JavaScript errors
2. **Check Network Tab**: Monitor the OAuth redirect flow
3. **Check Supabase Logs**: Go to "Logs" in Supabase dashboard
4. **Check Google Cloud Console**: Monitor OAuth consent screen and credentials

## Step 6: Security Considerations

### 1. HTTPS in Production
- Always use HTTPS in production
- Update redirect URIs to use HTTPS only

### 2. Domain Verification
- Verify your domain in Google Cloud Console for production
- Add your domain to authorized domains

### 3. API Restrictions
- Restrict your OAuth credentials to specific domains
- Use API restrictions to limit access

### 4. Regular Review
- Regularly review OAuth consent screen
- Monitor for suspicious activity

## Step 7: Additional Configuration

### 7.1 Custom User Metadata

You can customize what user data is collected from Google by modifying the OAuth scopes and handling the user data in your application.

### 7.2 Branding

Customize the OAuth consent screen with your app's branding:
- App logo
- App name
- Privacy policy URL
- Terms of service URL

### 7.3 Multiple Environments

For different environments (dev, staging, prod), create separate OAuth credentials or use environment-specific redirect URIs.

## Support

If you encounter issues:

1. Check the [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
2. Check the [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
3. Review the troubleshooting section above
4. Check Supabase and Google Cloud Console logs

## Next Steps

After setting up Google OAuth:

1. Test the authentication flow thoroughly
2. Implement user profile creation/update logic
3. Add additional OAuth providers if needed (GitHub, LinkedIn, etc.)
4. Implement proper error handling and user feedback
5. Add analytics to track authentication success rates 