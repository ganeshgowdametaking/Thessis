# 📧 Supabase Email Template Setup

## Step 1: Update the "Confirm signup" Email Template

Go to **Authentication** → **Emails** → **Templates** → **Confirm signup**

### Replace the Subject with:
```
Your TankTide Verification Code
```

### Replace the Message Body with:
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1e293b; font-size: 28px; margin: 0; font-weight: bold;">Welcome to TankTide!</h1>
      <p style="color: #64748b; font-size: 16px; margin: 10px 0 0 0;">Verify your email to get started</p>
    </div>

    <!-- Verification Code -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <p style="color: white; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">Your 6-digit verification code:</p>
      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h1 style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{{ .Token }}</h1>
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

## Step 2: Save and Test

1. Click **Save** in Supabase
2. Wait 2-3 minutes for changes to propagate
3. Test with a new email address

## Step 3: Verify the Flow

✅ User signs up → Gets beautiful email with 6-digit code
✅ User enters code → Account verified
✅ User can now use TankTide!

## 🎨 Template Features

- **Beautiful Design**: Professional gradient background
- **Clear Code Display**: Large, easy-to-read 6-digit code
- **Responsive**: Works on all email clients
- **Branded**: TankTide branding and messaging
- **Security Info**: Clear expiration and security notes

## 🚨 Important Notes

- The `{{ .Token }}` variable is automatically replaced by Supabase
- Template changes may take 2-3 minutes to apply
- Test with a fresh email address after making changes
- For production, consider setting up custom SMTP for better deliverability