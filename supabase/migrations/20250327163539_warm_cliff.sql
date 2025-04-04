/*
  # Initial Schema Setup for Live Contest

  1. New Tables
    - `participants`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
    - `contest_selections`
      - `id` (uuid, primary key)
      - `email` (text, references participants)
      - `option` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create contest selections table
CREATE TABLE IF NOT EXISTS contest_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text REFERENCES participants(email),
  option text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_selections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to participants"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);

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
      SELECT 1 FROM contest_selections WHERE email = current_setting('request.jwt.claims')::json->>'email'
    )
    AND (
      SELECT COUNT(*) FROM contest_selections WHERE option = option
    ) < 20
  );