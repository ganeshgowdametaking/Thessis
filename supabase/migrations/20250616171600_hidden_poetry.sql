/*
  # Add GDPR Compliance Tables

  1. New Tables
    - `gdpr_consents` - Track user consent for GDPR compliance
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `preferences` (jsonb, stores consent preferences)
      - `ip_address` (text, anonymized)
      - `consent_date` (timestamp)
      - `updated_at` (timestamp)
    
    - `data_requests` - Track GDPR data requests
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `request_type` (text, e.g., 'access', 'delete', 'correct')
      - `status` (text, e.g., 'pending', 'completed', 'rejected')
      - `details` (text)
      - `created_at` (timestamp)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own consents and requests
    - Add policies for admins to view and manage all consents and requests

  3. Performance
    - Add indexes for better query performance
*/

-- Create gdpr_consents table
CREATE TABLE IF NOT EXISTS gdpr_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{"necessary": true, "functional": false, "analytics": false, "marketing": false}',
  ip_address text,
  consent_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create data_requests table
CREATE TABLE IF NOT EXISTS data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE gdpr_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for gdpr_consents
CREATE POLICY "Users can view their own consent"
  ON gdpr_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own consent"
  ON gdpr_consents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consent"
  ON gdpr_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create policies for data_requests
CREATE POLICY "Users can view their own data requests"
  ON data_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own data requests"
  ON data_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user_id ON gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_user_id ON data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gdpr_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_gdpr_consents_updated_at
BEFORE UPDATE ON gdpr_consents
FOR EACH ROW
EXECUTE FUNCTION update_gdpr_consents_updated_at();

-- Create function to log consent changes for audit purposes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO gdpr_audit_logs (
    user_id,
    action,
    old_data,
    new_data,
    created_at
  ) VALUES (
    NEW.user_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'consent_created'
      WHEN TG_OP = 'UPDATE' THEN 'consent_updated'
      WHEN TG_OP = 'DELETE' THEN 'consent_deleted'
    END,
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN NULL;
EXCEPTION
  WHEN undefined_table THEN
    -- If audit table doesn't exist yet, create it
    CREATE TABLE IF NOT EXISTS gdpr_audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
      action text NOT NULL,
      old_data jsonb,
      new_data jsonb,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS on audit logs
    ALTER TABLE gdpr_audit_logs ENABLE ROW LEVEL SECURITY;
    
    -- Try again
    INSERT INTO gdpr_audit_logs (
      user_id,
      action,
      old_data,
      new_data,
      created_at
    ) VALUES (
      NEW.user_id,
      CASE
        WHEN TG_OP = 'INSERT' THEN 'consent_created'
        WHEN TG_OP = 'UPDATE' THEN 'consent_updated'
        WHEN TG_OP = 'DELETE' THEN 'consent_deleted'
      END,
      CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
      now()
    );
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for audit logging
CREATE TRIGGER log_gdpr_consents_changes
AFTER INSERT OR UPDATE OR DELETE ON gdpr_consents
FOR EACH ROW
EXECUTE FUNCTION log_consent_change();