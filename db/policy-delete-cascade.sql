-- Ensure policy deletions cascade to related records
-- Run after deploying updated schema to align database constraints

-- PolicyVersions -> Policies
ALTER TABLE policy_versions
DROP CONSTRAINT IF EXISTS policy_versions_policy_id_policies_id_fk;

ALTER TABLE policy_versions
ADD CONSTRAINT policy_versions_policy_id_policies_id_fk
FOREIGN KEY (policy_id) REFERENCES policies(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- PolicyAssignments -> Policies
ALTER TABLE policy_assignments
DROP CONSTRAINT IF EXISTS policy_assignments_policy_id_policies_id_fk;

ALTER TABLE policy_assignments
ADD CONSTRAINT policy_assignments_policy_id_policies_id_fk
FOREIGN KEY (policy_id) REFERENCES policies(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Acknowledgements -> PolicyVersions
ALTER TABLE acknowledgements
DROP CONSTRAINT IF EXISTS acknowledgements_policy_version_id_policy_versions_id_fk;

ALTER TABLE acknowledgements
ADD CONSTRAINT acknowledgements_policy_version_id_policy_versions_id_fk
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Annotations -> PolicyVersions
ALTER TABLE annotations
DROP CONSTRAINT IF EXISTS annotations_policy_version_id_policy_versions_id_fk;

ALTER TABLE annotations
ADD CONSTRAINT annotations_policy_version_id_policy_versions_id_fk
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ApprovalWorkflows -> PolicyVersions
ALTER TABLE approval_workflows
DROP CONSTRAINT IF EXISTS approval_workflows_policy_version_id_policy_versions_id_fk;

ALTER TABLE approval_workflows
ADD CONSTRAINT approval_workflows_policy_version_id_policy_versions_id_fk
FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
