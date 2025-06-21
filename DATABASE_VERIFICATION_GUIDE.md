# 🔍 Database Verification Guide for Conversation Deletion

## 🎯 **Step 1: Check Tables and Structure**

### **A. Verify Tables Exist**
Go to **Supabase Dashboard** → **Table Editor** and confirm these tables exist:

1. ✅ **`conversations`** table with columns:
   - `id` (uuid, primary key)
   - `participant_1` (uuid, foreign key to profiles)
   - `participant_2` (uuid, foreign key to profiles)
   - `last_message_at` (timestamptz)
   - `created_at` (timestamptz)

2. ✅ **`messages`** table with columns:
   - `id` (uuid, primary key)
   - `conversation_id` (uuid, foreign key to conversations)
   - `sender_id` (uuid, foreign key to profiles)
   - `content` (text)
   - `read` (boolean)
   - `created_at` (timestamptz)

### **B. Check Foreign Key Constraints**
In **SQL Editor**, run this query:
```sql
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('conversations', 'messages');
```

**Expected Results:**
- `messages.conversation_id` → `conversations.id`
- `messages.sender_id` → `profiles.id`
- `conversations.participant_1` → `profiles.id`
- `conversations.participant_2` → `profiles.id`

---

## 🎯 **Step 2: Check RLS Policies**

### **A. Verify RLS is Enabled**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages');
```

**Expected:** Both tables should show `rowsecurity = true`

### **B. Check DELETE Policies**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages') 
AND cmd = 'DELETE';
```

**Expected Results:**
- DELETE policy for `conversations` allowing participants to delete
- DELETE policy for `messages` allowing conversation participants to delete

---

## 🎯 **Step 3: Check Database Functions**

### **A. Verify Function Exists**
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'delete_conversation_with_messages';
```

**Expected:** Should return the function name and source code

### **B. Test Function Permissions**
```sql
SELECT has_function_privilege('delete_conversation_with_messages(uuid)', 'EXECUTE');
```

**Expected:** Should return `true`

---

## 🎯 **Step 4: Test Database Operations**

### **A. Test Simple Conversation Query**
```sql
SELECT id, participant_1, participant_2, created_at 
FROM conversations 
LIMIT 5;
```

### **B. Test Messages Query**
```sql
SELECT id, conversation_id, sender_id, content, created_at 
FROM messages 
LIMIT 5;
```

### **C. Test Function Call (Safe Test)**
```sql
-- This will test the function without actually deleting anything
SELECT check_conversation_deletion_permissions('00000000-0000-0000-0000-000000000000'::uuid);
```

---

## 🎯 **Step 5: Check Authentication Context**

### **A. Verify Current User**
```sql
SELECT auth.uid() as current_user_id;
```

**Note:** This will return `null` in SQL Editor (expected), but should return a UUID when called from the application.

### **B. Check User Profile Exists**
```sql
SELECT id, full_name, email 
FROM profiles 
WHERE id = auth.uid();
```

---

## 🚨 **Common Issues and Solutions**

### **Issue 1: Tables Don't Exist**
**Solution:** Run the initial migration:
```sql
-- You'll need to run the copper_grove migration
-- Check if it was applied in Dashboard → Database → Migrations
```

### **Issue 2: No DELETE Policies**
**Solution:** Create missing policies:
```sql
-- For conversations
CREATE POLICY "conversations_delete_policy"
  ON conversations FOR DELETE
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- For messages  
CREATE POLICY "messages_delete_policy"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );
```

### **Issue 3: Function Doesn't Exist**
**Solution:** The function should have been created by the recent migration. If it's missing, you can create it manually using the migration file content.

### **Issue 4: Permission Denied**
**Solution:** Grant proper permissions:
```sql
GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;
```

---

## 🎯 **Quick Diagnostic Script**

Run this comprehensive check in **SQL Editor**:

```sql
-- Comprehensive Database Check
SELECT 'Database Diagnostic Results' as section;

-- 1. Check if tables exist
SELECT 'Tables Check' as check_type, 
       COUNT(*) as count,
       string_agg(tablename, ', ') as tables
FROM pg_tables 
WHERE tablename IN ('conversations', messages');

-- 2. Check RLS status
SELECT 'RLS Status' as check_type,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages');

-- 3. Check DELETE policies
SELECT 'DELETE Policies' as check_type,
       COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages') 
AND cmd = 'DELETE';

-- 4. Check function exists
SELECT 'Function Check' as check_type,
       COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'delete_conversation_with_messages';

-- 5. Sample data check
SELECT 'Sample Data' as check_type,
       'conversations' as table_name,
       COUNT(*) as record_count
FROM conversations
UNION ALL
SELECT 'Sample Data' as check_type,
       'messages' as table_name,
       COUNT(*) as record_count
FROM messages;
```

---

## 📋 **What to Report Back**

Please run the diagnostic script above and share:

1. **The complete output** of the diagnostic script
2. **Any error messages** you encounter
3. **Screenshots** of your Table Editor showing the conversations and messages tables
4. **Migration status** from Dashboard → Database → Migrations

This will help me identify exactly what's causing the deletion issue! 🔍