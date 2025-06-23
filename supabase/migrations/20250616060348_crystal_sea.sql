/*
  # Fix mentor foreign key constraint

  1. Database Changes
    - Drop existing constraint if it exists (to handle any partial creation issues)
    - Add proper foreign key constraint for mentor relationship
    - Ensure the constraint is named correctly for Supabase queries

  2. Security
    - No RLS changes needed as this only fixes the constraint

  3. Notes
    - Uses IF EXISTS/IF NOT EXISTS to handle existing constraints safely
    - Ensures the constraint name matches what the application expects
*/

-- First, drop the constraint if it exists (in case there were issues with previous creation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_mentor_id_fkey' 
    AND table_name = 'members'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE members DROP CONSTRAINT members_mentor_id_fkey;
  END IF;
END $$;

-- Now create the constraint with the exact name expected by the application
ALTER TABLE members 
ADD CONSTRAINT members_mentor_id_fkey 
FOREIGN KEY (mentor_id) 
REFERENCES members(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verify the constraint was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_mentor_id_fkey' 
    AND table_name = 'members'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Failed to create members_mentor_id_fkey constraint';
  END IF;
END $$;