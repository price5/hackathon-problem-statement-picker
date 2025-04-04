/*
  # Fix RLS Policies for Admin Access

  1. Changes
    - Drop existing policies
    - Create new admin policy using auth.email()
    - Add policy for authenticated users to read
    - Fix policy syntax and conditions

  2. Security
    - Admin has full access using auth.email() function
    - Regular users can only read
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable admin access" ON participants;
DROP POLICY IF EXISTS "Enable read access" ON participants;
DROP POLICY IF EXISTS "Enable full access for admin" ON participants;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON participants;
DROP POLICY IF EXISTS "Allow admin to manage participants" ON participants;
DROP POLICY IF EXISTS "Allow read access to participants" ON participants;

-- Create new admin policy with proper email check
CREATE POLICY "admin_manage_participants"
  ON participants
  FOR ALL
  TO authenticated
  USING (auth.email() = 'rohitraj16092004@gmail.com')
  WITH CHECK (auth.email() = 'rohitraj16092004@gmail.com');

-- Create read policy for authenticated users
CREATE POLICY "read_participants"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);