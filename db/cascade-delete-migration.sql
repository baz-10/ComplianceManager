-- This migration adds CASCADE DELETE to foreign key constraints
-- Run this migration to automatically delete related records when parent records are deleted

-- Drop existing foreign key constraints and recreate with CASCADE DELETE

-- Policies -> Sections
ALTER TABLE policies 
DROP CONSTRAINT IF EXISTS policies_section_id_sections_id_fk;

ALTER TABLE policies 
ADD CONSTRAINT policies_section_id_sections_id_fk 
FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;

-- PolicyVersions -> Policies
ALTER TABLE policy_versions 
DROP CONSTRAINT IF EXISTS policy_versions_policy_id_policies_id_fk;

ALTER TABLE policy_versions 
ADD CONSTRAINT policy_versions_policy_id_policies_id_fk 
FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE;

-- Acknowledgements -> PolicyVersions
ALTER TABLE acknowledgements 
DROP CONSTRAINT IF EXISTS acknowledgements_policy_version_id_policy_versions_id_fk;

ALTER TABLE acknowledgements 
ADD CONSTRAINT acknowledgements_policy_version_id_policy_versions_id_fk 
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id) ON DELETE CASCADE;

-- Annotations -> PolicyVersions
ALTER TABLE annotations 
DROP CONSTRAINT IF EXISTS annotations_policy_version_id_policy_versions_id_fk;

ALTER TABLE annotations 
ADD CONSTRAINT annotations_policy_version_id_policy_versions_id_fk 
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id) ON DELETE CASCADE;

-- ApprovalWorkflows -> PolicyVersions
ALTER TABLE approval_workflows 
DROP CONSTRAINT IF EXISTS approval_workflows_policy_version_id_policy_versions_id_fk;

ALTER TABLE approval_workflows 
ADD CONSTRAINT approval_workflows_policy_version_id_policy_versions_id_fk 
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id) ON DELETE CASCADE;

-- Sections -> Manuals
ALTER TABLE sections 
DROP CONSTRAINT IF EXISTS sections_manual_id_manuals_id_fk;

ALTER TABLE sections 
ADD CONSTRAINT sections_manual_id_manuals_id_fk 
FOREIGN KEY (manual_id) REFERENCES manuals(id) ON DELETE CASCADE;