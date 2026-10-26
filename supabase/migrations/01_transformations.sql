-- DataReady AI Supabase Migration: 01_transformations
-- Purpose: Support dataset versioning, analysis versioning, and transformation history.

-- 1. DATASETS VERSIONING
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS current_file_path TEXT,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 0;

-- Initialize existing datasets. original_file_path is NOT NULL in the schema.
UPDATE datasets 
SET current_file_path = original_file_path,
    current_version = 0
WHERE current_file_path IS NULL;

-- 2. ANALYSES VERSIONING
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS dataset_version INTEGER DEFAULT 0;

-- 3. DATASET TRANSFORMATIONS VERSION TRACKING
ALTER TABLE dataset_transformations
ADD COLUMN IF NOT EXISTS previous_version INTEGER,
ADD COLUMN IF NOT EXISTS new_version INTEGER,
ADD COLUMN IF NOT EXISTS affected_rows INTEGER,
ADD COLUMN IF NOT EXISTS affected_columns INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Initialize existing transformations to avoid constraint errors
UPDATE dataset_transformations 
SET previous_version = 0, new_version = 1 
WHERE previous_version IS NULL OR new_version IS NULL;

-- Add constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_new_version_greater' 
    AND conrelid = 'dataset_transformations'::regclass
  ) THEN
    ALTER TABLE dataset_transformations
    ADD CONSTRAINT check_new_version_greater CHECK (new_version > previous_version);
  END IF;
END $$;

-- 4. ADD USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset_id ON analyses(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset_id_version ON analyses(dataset_id, dataset_version);
CREATE INDEX IF NOT EXISTS idx_dataset_transformations_dataset_id ON dataset_transformations(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_transformations_dataset_new_version ON dataset_transformations(dataset_id, new_version);
