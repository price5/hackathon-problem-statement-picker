/*
  # Create Initial Schema for Contest Application

  1. New Tables
    - `participants`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `team_name` (text)
      - `applicant_id` (text)
      - `participant_name` (text)
      - `phone` (text)
      - `college` (text)
      - `usn` (text)
      - `created_at` (timestamptz)
    
    - `contest_selections`
      - `id` (uuid, primary key)
      - `email` (text, references participants)
      - `option` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Add special policies for admin access
*/

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  team_name text,
  applicant_id text,
  participant_name text,
  phone text,
  college text,
  usn text,
  created_at timestamptz DEFAULT now()
);

-- Create contest selections table
CREATE TABLE IF NOT EXISTS contest_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text REFERENCES participants(email),
  option text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_selections ENABLE ROW LEVEL SECURITY;

-- Policies for participants table
CREATE POLICY "admin_manage_participants"
  ON participants
  FOR ALL
  TO authenticated
  USING (auth.email() = 'rohitraj16092004@gmail.com')
  WITH CHECK (auth.email() = 'rohitraj16092004@gmail.com');

CREATE POLICY "read_participants"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for contest_selections table
CREATE POLICY "Allow read access to contest_selections"
  ON contest_selections
  FOR SELECT
  TO authenticated
  USING (true);

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