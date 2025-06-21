# 🔍 Test Conversation Deletion Function

## Step 1: Get Real Conversation IDs

First, let's get actual conversation IDs from your database. Run this in **Supabase SQL Editor**:

```sql
-- Get real conversation IDs
SELECT 
    id as conversation_id,
    participant_1,
    participant_2,
    created_at,
    last_message_at
FROM conversations 
ORDER BY created_at DESC 
LIMIT 5;
```

## Step 2: Test Permission Check Function

Once you have a real conversation ID, replace `REPLACE_WITH_REAL_ID` with an actual UUID from Step 1:

```sql
-- Test permission check (replace the UUID with a real one from Step 1)
SELECT check_conversation_deletion_permissions('REPLACE_WITH_REAL_ID'::uuid) as permission_test;
```

**Example:** If your conversation ID is `123e4567-e89b-12d3-a456-426614174000`, then run:
```sql
SELECT check_conversation_deletion_permissions('123e4567-e89b-12d3-a456-426614174000'::uuid) as permission_test;
```

## Step 3: Check Function Status

Run this to verify the functions exist:

```sql
-- Check if functions exist
SELECT 
    proname as function_name,
    pronargs as argument_count
FROM pg_proc 
WHERE proname IN ('delete_conversation_with_messages', 'check_conversation_deletion_permissions');
```

## Step 4: Test the App

After confirming the functions work in SQL, test the conversation deletion in your app:

1. **Go to Messages page**
2. **Click the 3-dot menu** on a conversation
3. **Click "Delete Conversation"**
4. **Check browser console** for detailed logs

## Expected Results

### ✅ Permission Check Should Return:
```json
{
  "user_id": null,
  "conversation_exists": true,
  "conversation_id": "your-uuid-here",
  "participant_1": "some-uuid",
  "participant_2": "some-uuid",
  "can_delete": null,
  "messages_count": 1
}
```

**Note:** `user_id` will be `null` when testing in SQL Editor (this is expected). It will have a real UUID when called from the app.

### ✅ Function Existence Check Should Return:
```
delete_conversation_with_messages | 1
check_conversation_deletion_permissions | 1
```

## 🚨 If You Get Errors:

### Error: "function does not exist"
**Solution:** The migration didn't run properly. You'll need to create the functions manually.

### Error: "permission denied"
**Solution:** Run this to grant permissions:
```sql
GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_conversation_deletion_permissions(uuid) TO authenticated;
```

### Error: "conversation exists in database"
This means the function is working but there might be a UI issue. Check the browser console for detailed error logs.

## 📋 What to Report Back

Please share:

1. **The output from Step 1** (real conversation IDs)
2. **The output from Step 2** (permission test with real ID)
3. **The output from Step 3** (function existence check)
4. **Any error messages** you encounter
5. **Browser console logs** when testing in the app

This will help me identify exactly what's happening! 🔍