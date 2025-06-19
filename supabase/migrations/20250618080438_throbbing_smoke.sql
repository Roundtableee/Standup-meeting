/*
  # Add content_stat column to standups table

  1. New Columns
    - `content_stat` (boolean array) - tracks completion status for each task in content array
    - Should match the length of the content array
    - Defaults to empty array for new records

  2. Security
    - No RLS changes needed as this only adds a column

  3. Changes
    - Add content_stat column to standups table
    - Update existing records to have matching array lengths
*/

-- Add content_stat column to standups table
ALTER TABLE standups ADD COLUMN IF NOT EXISTS content_stat boolean[];

-- Update existing records to initialize content_stat arrays
UPDATE standups 
SET content_stat = (
  SELECT array_agg(false) 
  FROM generate_series(1, array_length(content, 1))
)
WHERE content_stat IS NULL AND content IS NOT NULL;

-- Set empty array for records with no content
UPDATE standups 
SET content_stat = ARRAY[]::boolean[]
WHERE content_stat IS NULL AND (content IS NULL OR array_length(content, 1) IS NULL);