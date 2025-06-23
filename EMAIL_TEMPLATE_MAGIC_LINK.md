# 🎯 SOLUTION: Update the Magic Link Template

## The Issue
You're editing the wrong template! Since we're using `signInWithOtp` in our authentication flow, Supabase sends emails using the **"Magic Link"** template, not the "Confirm signup" template.

## ✅ Correct Steps

### 1. Go to the RIGHT Template
Navigate to: **Authentication** → **Emails** → **Templates** → **Magic Link** (NOT "Confirm signup")

### 2. Update Subject Line
```
Your TankTide Verification Code
```

### 3. Replace Message Body with This Exact Code
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
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; margin: 10px 0 0 0;">This code expires in 1 hour</p>
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

### 4. Save and Test
1. Click **Save**
2. Wait 2-3 minutes for changes to apply
3. Test with a completely new email address

## 🎯 Why This Works

- Our auth flow uses `signInWithOtp()` which triggers the **Magic Link** template
- The `{{ .Token }}` variable will be replaced with the 6-digit code
- Your current settings are perfect, just wrong template location!

## 📧 Expected Result

Users will now receive a beautiful email with:
✅ TankTide branding  
✅ Large, clear 6-digit code  
✅ Professional design  
✅ No more magic links!  

This should fix the issue completely! 🚀