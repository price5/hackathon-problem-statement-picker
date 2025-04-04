/*
  # Fix RLS Policies and Constraints

  1. Changes
    - Add insert policy for participants table
    - Fix contest selections policy
    - Add admin role check for participants management
*/

-- Add policy for admin to manage participants
CREATE POLICY "Allow admin to manage participants"
  ON participants
  FOR ALL
  TO authenticated
  USING (auth.email() = 'rohitraj16092004@gmail.com')
  WITH CHECK (auth.email() = 'rohitraj16092004@gmail.com');

-- Fix contest selections policy
DROP POLICY IF EXISTS "Allow insert to contest_selections" ON contest_selections;

CREATE POLICY "Allow insert to contest_selections"
  ON contest_selections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    email IN (SELECT email FROM participants)
    AND NOT EXISTS (
      SELECT 1 FROM contest_selections WHERE email = auth.email()
    )
    AND (
      SELECT COUNT(*) FROM contest_selections c WHERE c.option = contest_selections.option
    ) < 20
  );