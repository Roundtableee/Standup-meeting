/*
  # Add mentor foreign key constraint

  1. Database Changes
    - Add foreign key constraint `members_mentor_id_fkey` to the `members` table
    - This creates a self-referencing relationship where `mentor_id` references `id` in the same table
    - Allows mentors to be assigned to other members (trainees)

  2. Security
    - No RLS changes needed as this only adds a constraint

  3. Notes
    - Uses CASCADE on delete to handle mentor removal gracefully
    - Ensures data integrity for mentor-trainee relationships
*/

-- Add foreign key constraint for mentor relationship
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_mentor_id_fkey' 
    AND table_name = 'members'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE members 
    ADD CONSTRAINT members_mentor_id_fkey 
    FOREIGN KEY (mentor_id) 
    REFERENCES members(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
  END IF;
END $$;