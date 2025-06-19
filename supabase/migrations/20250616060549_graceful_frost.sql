/*
  # Fix mentor relationship and foreign key constraint

  1. Database Changes
    - Ensure mentor_id column exists with proper type
    - Add foreign key constraint for mentor relationship
    - Create index for better query performance

  2. Security
    - No RLS changes needed as this only fixes the constraint

  3. Notes
    - Uses IF NOT EXISTS to avoid errors if constraint already exists
    - Ensures data integrity for mentor-trainee relationships
*/

-- Ensure mentor_id column exists and has correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'mentor_id'
  ) THEN
    ALTER TABLE members ADD COLUMN mentor_id integer;
  END IF;
END $$;

-- Drop existing constraint if it exists (to recreate it properly)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_mentor_id_fkey' 
    AND table_name = 'members'
  ) THEN
    ALTER TABLE members DROP CONSTRAINT members_mentor_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE members 
ADD CONSTRAINT members_mentor_id_fkey 
FOREIGN KEY (mentor_id) 
REFERENCES members(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_members_mentor_id ON members(mentor_id);

-- Verify the constraint was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_mentor_id_fkey' 
    AND table_name = 'members'
  ) THEN
    RAISE EXCEPTION 'Failed to create mentor foreign key constraint';
  END IF;
END $$;