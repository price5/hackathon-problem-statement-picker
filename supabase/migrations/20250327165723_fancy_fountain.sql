/*
  # Add Additional Participant Fields

  1. Changes to Existing Tables
    - `participants` table:
      - Add team_name (text)
      - Add applicant_id (text)
      - Add participant_name (text)
      - Add phone (text)
      - Add college (text)
      - Add usn (text)
*/

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS team_name text,
ADD COLUMN IF NOT EXISTS applicant_id text,
ADD COLUMN IF NOT EXISTS participant_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS usn text;