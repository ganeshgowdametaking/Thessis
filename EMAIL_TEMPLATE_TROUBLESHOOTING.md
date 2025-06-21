# 🔧 Email Template Troubleshooting Guide

## Current Template Analysis

Your current template is good but has a few potential issues:

### ✅ What's Working:
- Uses `{{ .Token }}` correctly
- Has clear structure
- Professional messaging

### ⚠️ Potential Issues:
1. **Expiration Time Mismatch**: Template says "10 minutes" but Supabase default is 24 hours
2. **Missing Email Client Compatibility**: Some email clients need more robust HTML
3. **Template Type**: Make sure you're editing the RIGHT template

## 🎯 Step-by-Step Fix

### Step 1: Verify Template Location
Make sure you're editing the **"Confirm signup"** template, NOT:
- ❌ Magic Link template
- ❌ Recovery template  
- ❌ Email change template

### Step 2: Updated Template (Copy This Exactly)
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1e293b; font-size: 28px; margin: 0; font-weight: bold;">Welcome to TankTide!</h1>
      <p style="color: #64748b; font-size: 16px; margin: 10px 0 0 0;">Verify your email to get started</p>
    </div>

    <!-- Verification Code Box -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <p style="color: white; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">Your 6-digit verification code:</p>
      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 15px 0;">
        <span style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', Consolas, monospace;">{{ .Token }}</span>
      </div>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; margin: 10px 0 0 0;">This code expires in 24 hours</p>
    </div>

    <!-- Instructions -->
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
        Enter this code in the TankTide app to verify your email address and complete your account setup.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        If you didn't create a TankTide account, please ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
      <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">Welcome to the future of professional networking!</p>
      <p style="color: #64748b; font-size: 14px; margin: 0;">The TankTide Team</p>
    </div>

  </div>
</div>
```

### Step 3: Verify Settings
1. **Subject Line**: `Your TankTide Verification Code`
2. **Template Type**: Confirm signup
3. **Save** and wait 2-3 minutes

### Step 4: Test Process
1. Use a **completely new email** (not one you've tested before)
2. Sign up in the app
3. Check email (including spam folder)
4. Look for the 6-digit code

## 🚨 If Still Getting Magic Links

### Check These Settings:
1. **Authentication → Settings → Email**
   - ✅ "Confirm email" should be ENABLED
   - ✅ "Secure email change" can be enabled/disabled
   
2. **Authentication → Settings → General**
   - ✅ "Allow new users to sign up" should be ENABLED

3. **Clear Browser Cache**
   - Sometimes old templates are cached

### Alternative: Force OTP Mode
If magic links persist, we can force OTP mode in Supabase settings:
1. Go to **Authentication → Settings → Email**
2. Look for **"Email OTP"** settings
3. Make sure OTP is enabled over magic links

## 🎯 Expected Result
After fixing, users should receive a beautiful email with:
- TankTide branding
- Large, clear 6-digit code
- Professional design
- Clear instructions

## 📞 Need More Help?
If you're still getting magic links after these changes:
1. Screenshot your Supabase email template settings
2. Try with a completely fresh email address
3. Check if there are multiple email templates configured