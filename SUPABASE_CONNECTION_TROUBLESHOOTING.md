# 🔧 Supabase Connection Timeout Troubleshooting

## 🚨 **Current Error:**
```
Error: upstream connect error or disconnect/reset before headers. reset reason: connection timeout
```

## 🎯 **Step-by-Step Solutions:**

### **Solution 1: Check Supabase Project Status**
1. **Go to your Supabase Dashboard**
2. **Check if your project is "Active"** (green status)
3. **If it shows "Paused" or "Inactive":**
   - Click "Resume Project" or "Restore Project"
   - Wait 2-3 minutes for it to fully activate

### **Solution 2: Try a Smaller SQL Query First**
Instead of running the large function, try this simple test:

```sql
-- Simple test query
SELECT 'Connection test successful' as status;
```

If this works, then proceed with the function creation.

### **Solution 3: Break Down the SQL into Smaller Parts**

**Part 1: Create the main function**
```sql
CREATE OR REPLACE FUNCTION delete_conversation_with_messages(conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  conversation_record conversations%ROWTYPE;
  deleted_messages_count integer;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT c.* INTO conversation_record 
  FROM conversations c
  WHERE c.id = delete_conversation_with_messages.conversation_id;
  
  IF conversation_record.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Conversation already deleted');
  END IF;
  
  IF conversation_record.participant_1 != current_user_id AND conversation_record.participant_2 != current_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  DELETE FROM messages m WHERE m.conversation_id = conversation_record.id;
  GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;
  
  DELETE FROM conversations c WHERE c.id = conversation_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conversation deleted successfully',
    'deleted_messages', deleted_messages_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

**Part 2: Grant permissions (run separately)**
```sql
GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;
```

### **Solution 4: Alternative - Use Supabase CLI (if available)**
If the web interface keeps timing out:

1. **Install Supabase CLI** (if not already installed)
2. **Run the migration locally:**
   ```bash
   supabase db push
   ```

### **Solution 5: Check Network/Browser Issues**
1. **Try a different browser** (Chrome, Firefox, Safari)
2. **Disable browser extensions** temporarily
3. **Clear browser cache** for Supabase
4. **Check if you're behind a corporate firewall/VPN**
5. **Try from a different network** (mobile hotspot)

### **Solution 6: Supabase Project Region Issue**
1. **Check your project region** in Supabase Dashboard
2. **If you're far from the region**, this can cause timeouts
3. **Consider creating a new project** in a closer region if needed

## 🎯 **Recommended Approach:**

### **Step 1: Test Connection**
```sql
SELECT now() as current_time;
```

### **Step 2: If connection works, run this minimal version:**
```sql
CREATE OR REPLACE FUNCTION delete_conversation_with_messages(conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM messages WHERE conversation_id = $1;
  DELETE FROM conversations WHERE id = $1;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;
```

### **Step 3: Test the function:**
```sql
SELECT delete_conversation_with_messages('00000000-0000-0000-0000-000000000000'::uuid);
```

## 🚨 **If Nothing Works:**

### **Alternative: Use Direct SQL in Application**
We can modify the application to use direct SQL instead of the function:

1. **Skip the database function entirely**
2. **Use multiple SQL statements in the application**
3. **Handle the deletion logic in TypeScript**

Would you like me to implement this fallback approach?

## 📞 **Next Steps:**
1. Try Solution 1 first (check project status)
2. If that doesn't work, try the smaller SQL queries
3. Let me know which approach works and I'll help you proceed!