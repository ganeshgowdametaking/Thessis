# Tracking Features Testing Guide

## Overview
This guide shows you how to test the analytics and tracking features implemented in the application.

## Prerequisites
- Make sure the application is running (`npm run dev`)
- Have browser developer tools open
- Clear browser data if needed for fresh testing

## Testing Scenarios

### 1. Testing Non-EU User Tracking (Full Analytics)

#### Setup:
1. Clear browser data (localStorage, cookies)
2. Use a VPN or location that's not in the EU
3. Open browser developer tools → Console tab

#### Test Steps:
```javascript
// Check if tracking is initialized
console.log('Analytics initialized:', window._analyticsInitialized);

// Check session data
console.log('Session ID:', window._sessionId);
console.log('Is first visit:', window._firstVisit);

// Check localStorage for tracking data
console.log('Session data:', localStorage.getItem('current_session'));
console.log('All sessions:', localStorage.getItem('all_sessions'));
```

#### What to Verify:
- ✅ Session tracking is active
- ✅ Page views are being tracked
- ✅ User interactions are logged
- ✅ First-time visitor detection works

### 2. Testing EU User Tracking (GDPR-Compliant)

#### Setup:
1. Clear browser data
2. Set EU user flag: `localStorage.setItem('is_eu_user', 'true')`
3. Give consent: `localStorage.setItem('gdpr_consent', 'true')`

#### Test Steps:
```javascript
// Check EU visitor tracking
console.log('Total visitors:', localStorage.getItem('total_visitors'));
console.log('First-time visitors:', localStorage.getItem('first_time_visitors'));
console.log('Total signups:', localStorage.getItem('total_signups'));

// Test EU visitor tracking
analyticsService.trackEUVisitor();

// Check stats
console.log('EU Stats:', analyticsService.getEUVisitorStats());
```

#### What to Verify:
- ✅ Only aggregate data is stored
- ✅ No individual user tracking
- ✅ Consent is respected
- ✅ Visitor counts increment properly

### 3. Testing EU User Signup Tracking

#### Setup:
1. Set up as EU user (see above)
2. Navigate to signup/registration

#### Test Steps:
```javascript
// Simulate EU user signup
analyticsService.trackEUSignup();

// Check updated stats
console.log('Updated EU Stats:', analyticsService.getEUVisitorStats());
```

#### What to Verify:
- ✅ Signup count increases
- ✅ Last signup date is recorded
- ✅ Signup rate calculation works

### 4. Testing Consent Management

#### Test Scenarios:
```javascript
// Test without consent
localStorage.setItem('is_eu_user', 'true');
localStorage.removeItem('gdpr_consent');
// Navigate around - should not track

// Test with consent
localStorage.setItem('gdpr_consent', 'true');
// Navigate around - should track aggregate data only
```

### 5. Testing the Dashboards

#### For Non-EU Users:
1. Navigate to `/analytics` (admin only)
2. Check the comprehensive analytics dashboard
3. Verify session data, user interactions, etc.

#### For EU Users:
1. Navigate to `/eu-visitor-dashboard` (if implemented)
2. Check the GDPR-compliant visitor statistics
3. Verify aggregate data only

## Manual Testing Steps

### Step 1: Test Non-EU Tracking
1. Clear browser data
2. Open developer tools → Console
3. Navigate to the homepage
4. Check console for tracking logs
5. Navigate to different pages
6. Interact with elements (click, scroll, etc.)
7. Check localStorage for session data

### Step 2: Test EU Tracking
1. Clear browser data
2. Set EU user: `localStorage.setItem('is_eu_user', 'true')`
3. Give consent: `localStorage.setItem('gdpr_consent', 'true')`
4. Navigate around the site
5. Check localStorage for aggregate data
6. Verify no individual tracking

### Step 3: Test Consent Management
1. Set EU user without consent
2. Navigate around - should see no tracking
3. Give consent
4. Navigate around - should see aggregate tracking only

### Step 4: Test Signup Tracking
1. Set up as EU user with consent
2. Go through signup process
3. Check if signup is tracked in aggregate stats

## Console Commands for Testing

```javascript
// Check current tracking status
console.log('Is EU User:', localStorage.getItem('is_eu_user'));
console.log('GDPR Consent:', localStorage.getItem('gdpr_consent'));
console.log('Analytics Initialized:', window._analyticsInitialized);

// Check session data
console.log('Session:', JSON.parse(localStorage.getItem('current_session') || '{}'));

// Check EU visitor stats
console.log('EU Stats:', analyticsService.getEUVisitorStats());

// Manually trigger tracking
analyticsService.trackPageView('/test-page');
analyticsService.trackEUVisitor();
analyticsService.trackEUSignup();

// Check all stored data
console.log('All localStorage keys:', Object.keys(localStorage));
```

## Expected Results

### Non-EU Users:
- Full session tracking
- Detailed interaction logs
- Comprehensive analytics data
- First-time visitor detection

### EU Users with Consent:
- Aggregate visitor counts only
- No individual user data
- Signup conversion tracking
- GDPR-compliant storage

### EU Users without Consent:
- No tracking at all
- Clean localStorage
- Respect for privacy

## Troubleshooting

### Common Issues:
1. **Tracking not working**: Check if analytics is initialized
2. **EU detection not working**: Verify localStorage flags
3. **Consent not respected**: Check GDPR consent value
4. **Data not persisting**: Check localStorage permissions

### Debug Commands:
```javascript
// Reset all tracking data
localStorage.clear();

// Force analytics initialization
analyticsService.init();

// Check tracking provider status
console.log('Tracking enabled:', !loading && (!isEUUser || localStorage.getItem('gdpr_consent') === 'true'));
```

## Testing Checklist

- [ ] Non-EU user full tracking works
- [ ] EU user aggregate tracking works
- [ ] Consent management works
- [ ] Signup tracking works
- [ ] First-time visitor detection works
- [ ] Session data persists
- [ ] No individual data for EU users
- [ ] Dashboards display correct data
- [ ] GDPR compliance maintained 