/*
  # Add profile picture and description fields to members table

  1. Database Changes
    - Add `profile_picture` column to store uploaded image URL/path
    - Add `description` column for user bio/description
    - Both fields are optional (nullable)

  2. Security
    - No RLS changes needed as these are just additional columns
    - Profile pictures will be stored as URLs or file paths

  3. Notes
    - profile_picture will store the URL or path to the uploaded image
    - description allows users to add a personal bio or description
*/

-- Add profile picture and description columns to members table
DO $$
BEGIN
  -- Add profile_picture column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE members ADD COLUMN profile_picture text;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'description'
  ) THEN
    ALTER TABLE members ADD COLUMN description text;
  END IF;
END $$;