# 📧 Secondary Email Verification Template

## For Supabase Email Templates

Go to **Supabase Dashboard** → **Authentication** → **Emails** → **Templates** → **Magic Link**

### Subject Line:
```
Verify your organization email - TankTide
```

### Message Body (Copy Everything Below):
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1e293b; font-size: 28px; margin: 0; font-weight: bold;">TankTide</h1>
      <p style="color: #64748b; font-size: 16px; margin: 10px 0 0 0;">Organization Email Verification</p>
    </div>

    <!-- Verification Code Box -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <p style="color: white; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">Your 6-digit verification code:</p>
      <div style="background-color: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 15px 0;">
        <span style="color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', Consolas, monospace;">{{ .Token }}</span>
      </div>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; margin: 10px 0 0 0;">This code expires in 15 minutes</p>
    </div>

    <!-- Instructions -->
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
        You're verifying your organization email address for your TankTide account. This helps ensure the quality and authenticity of job postings.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        If you didn't request this verification, please ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
      <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">Best regards,</p>
      <p style="color: #64748b; font-size: 14px; margin: 0;">The TankTide Team</p>
    </div>

  </div>
</div>
```

## 🎯 Key Features

✨ **Professional Design**: Clean, modern layout with TankTide branding
📱 **Mobile Responsive**: Works perfectly on all devices and email clients
🔢 **Clear Code Display**: Large, easy-to-read 6-digit code with proper spacing
⏰ **Security Info**: Clear expiration time (15 minutes)
🎨 **Brand Colors**: Uses TankTide's blue gradient theme
📧 **Organization Focus**: Specifically mentions organization email verification

## 📍 Important Notes

1. **Template Location**: Use the **"Magic Link"** template since we're using `signInWithOtp`
2. **Variable**: The `{{ .Token }}` is automatically replaced by Supabase with the OTP
3. **Save & Wait**: After saving, wait 2-3 minutes for changes to apply
4. **Test**: Use a fresh email address to test the new template

## 🚀 Expected Result

Users will receive a professional email with:
- TankTide branding
- Large, clear 6-digit verification code
- Beautiful gradient design
- Clear instructions about organization email verification
- 15-minute expiration notice

This template will work perfectly with your Mailgun SMTP configuration! 🎯 