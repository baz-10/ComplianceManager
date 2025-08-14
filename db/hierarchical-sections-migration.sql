-- Migration: Add hierarchical section support with automatic numbering
-- This adds the ability to create subsections with parent-child relationships
-- and automatic section numbering (1.0, 1.1, 1.3.1, etc.)

-- Add new columns to sections table for hierarchical structure
ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS parent_section_id INTEGER;

ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS section_number TEXT;

ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN DEFAULT false;

-- Add self-referencing foreign key constraint for parent-child relationships
ALTER TABLE sections 
ADD CONSTRAINT sections_parent_section_id_sections_id_fk 
FOREIGN KEY (parent_section_id) REFERENCES sections(id) ON DELETE CASCADE;

-- Add index for better performance on hierarchical queries
CREATE INDEX IF NOT EXISTS sections_parent_section_id_idx ON sections(parent_section_id);
CREATE INDEX IF NOT EXISTS sections_manual_level_idx ON sections(manual_id, level);
CREATE INDEX IF NOT EXISTS sections_order_idx ON sections(manual_id, parent_section_id, order_index);

-- Update existing sections to have proper numbering
-- This sets all existing sections as top-level (level 0) with sequential numbering
UPDATE sections 
SET level = 0, 
    section_number = CAST(order_index AS TEXT) || '.0'
WHERE level IS NULL OR section_number IS NULL;

-- Comments for future reference
COMMENT ON COLUMN sections.parent_section_id IS 'Self-referencing foreign key for hierarchical structure';
COMMENT ON COLUMN sections.level IS '0 = top level, 1 = subsection, 2 = sub-subsection, etc.';
COMMENT ON COLUMN sections.section_number IS 'Auto-generated section number like 1.0, 1.3.1, 2.4.2';
COMMENT ON COLUMN sections.is_collapsed IS 'UI state for collapsible sections in the frontend';