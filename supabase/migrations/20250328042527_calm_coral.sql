/*
  # Fix RLS Policies for Participants Table

  1. Changes
    - Drop existing RLS policies
    - Create new policies that properly handle admin operations
    - Add policy for admin to manage all participants
    - Add policy for regular users to read participants

  2. Security
    - Enable RLS
    - Admin has full access
    - Regular users can only read
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admin to manage participants" ON participants;
DROP POLICY IF EXISTS "Allow read access to participants" ON participants;

-- Create new policies
CREATE POLICY "Enable full access for admin"
  ON participants
  FOR ALL
  TO authenticated
  USING (auth.email() = 'rohitraj16092004@gmail.com')
  WITH CHECK (auth.email() = 'rohitraj16092004@gmail.com');

CREATE POLICY "Enable read access for authenticated users"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);