/*
  # Add description and skills fields to members table

  1. New Columns
    - `description` (text) - member's description/bio
    - `skills` (text array) - array of skills for the member

  2. Security
    - No RLS changes needed as existing policies will cover these fields

  3. Changes
    - Add description column to members table
    - Add skills column to members table
    - Set default values for existing records
*/

-- Add description column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS description text;

-- Add skills column to members table  
ALTER TABLE members ADD COLUMN IF NOT EXISTS skills text[];

-- Set default empty values for existing records
UPDATE members 
SET description = COALESCE(description, ''),
    skills = COALESCE(skills, ARRAY[]::text[])
WHERE description IS NULL OR skills IS NULL;