-- Migration: Normalize section parent references
-- Purpose: Ensure top-level sections have NULL parent_section_id (not 0), and
--          clear any orphaned parent references.

-- 1) Convert zero parent references to NULL (legacy/old import behavior)
UPDATE sections
SET parent_section_id = NULL
WHERE parent_section_id = 0;

-- 2) Clear orphaned parent references where the referenced parent does not exist
UPDATE sections s
SET parent_section_id = NULL
WHERE parent_section_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sections p WHERE p.id = s.parent_section_id
  );

