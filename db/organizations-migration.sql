-- Migration: Add Organizations Multi-Tenancy System
-- This implements organization-based multi-tenancy with proper data isolation
-- Handles existing users and manuals by creating a default organization

-- ============================================================================
-- 1. CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT, -- For email-based auto-assignment (e.g., "@company.com")
  settings JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by_id INTEGER, -- Will be set up after users migration
  -- Soft delete for organizations
  archived_at TIMESTAMP,
  archived_by_id INTEGER,
  archive_reason TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS organizations_domain_idx ON organizations(domain);
CREATE INDEX IF NOT EXISTS organizations_created_at_idx ON organizations(created_at);

-- ============================================================================
-- 2. CREATE DEFAULT ORGANIZATION FOR EXISTING DATA
-- ============================================================================

-- Insert a default organization for existing users and manuals
INSERT INTO organizations (name, description, settings, created_at, updated_at)
VALUES (
  'Default Organization',
  'Auto-created organization for existing users and manuals',
  '{"allowSelfRegistration": true, "defaultUserRole": "READER", "maxUsers": 1000}',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Get the default organization ID for use in subsequent migrations
-- (We'll use ID 1 assuming this is the first organization created)

-- ============================================================================
-- 3. ADD ORGANIZATION_ID TO USERS TABLE
-- ============================================================================

-- Add the organization_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Update existing users to belong to the default organization
UPDATE users 
SET organization_id = 1 
WHERE organization_id IS NULL;

-- Make organization_id required after data migration
ALTER TABLE users 
ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT users_organization_id_organizations_id_fk 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);

-- ============================================================================
-- 4. ADD ORGANIZATION_ID TO MANUALS TABLE
-- ============================================================================

-- Add the organization_id column to manuals table
ALTER TABLE manuals 
ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Update existing manuals to belong to the default organization
UPDATE manuals 
SET organization_id = 1 
WHERE organization_id IS NULL;

-- Make organization_id required after data migration
ALTER TABLE manuals 
ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE manuals 
ADD CONSTRAINT manuals_organization_id_organizations_id_fk 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS manuals_organization_id_idx ON manuals(organization_id);

-- ============================================================================
-- 5. UPDATE ORGANIZATION FOREIGN KEYS
-- ============================================================================

-- Now that users table has been migrated, we can add the foreign key constraints
-- for the organizations table's created_by_id and archived_by_id fields

ALTER TABLE organizations 
ADD CONSTRAINT organizations_created_by_id_users_id_fk 
FOREIGN KEY (created_by_id) REFERENCES users(id);

ALTER TABLE organizations 
ADD CONSTRAINT organizations_archived_by_id_users_id_fk 
FOREIGN KEY (archived_by_id) REFERENCES users(id);

-- ============================================================================
-- 6. UPDATE DEFAULT ORGANIZATION CREATOR
-- ============================================================================

-- Set the first admin user as the creator of the default organization
UPDATE organizations 
SET created_by_id = (
  SELECT id 
  FROM users 
  WHERE role = 'ADMIN' 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE id = 1 AND created_by_id IS NULL;

-- If no admin exists, use the first user
UPDATE organizations 
SET created_by_id = (
  SELECT id 
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE id = 1 AND created_by_id IS NULL;

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations for multi-tenant system with data isolation';
COMMENT ON COLUMN organizations.domain IS 'Email domain for auto-assignment (e.g., "@company.com")';
COMMENT ON COLUMN organizations.settings IS 'JSON settings: allowSelfRegistration, defaultUserRole, maxUsers, features';

COMMENT ON COLUMN users.organization_id IS 'Organization membership for data isolation';
COMMENT ON COLUMN manuals.organization_id IS 'Organization ownership for access control';

-- ============================================================================
-- 8. VERIFICATION QUERIES (Run these to verify migration success)
-- ============================================================================

-- Verify all users have organizations
-- SELECT COUNT(*) as users_without_org FROM users WHERE organization_id IS NULL;
-- Expected: 0

-- Verify all manuals have organizations  
-- SELECT COUNT(*) as manuals_without_org FROM manuals WHERE organization_id IS NULL;
-- Expected: 0

-- Verify default organization exists
-- SELECT id, name, created_by_id FROM organizations WHERE id = 1;
-- Expected: 1 row with name 'Default Organization'

-- Check organization user counts
-- SELECT o.name, COUNT(u.id) as user_count 
-- FROM organizations o 
-- LEFT JOIN users u ON o.id = u.organization_id 
-- GROUP BY o.id, o.name;

-- Check organization manual counts
-- SELECT o.name, COUNT(m.id) as manual_count 
-- FROM organizations o 
-- LEFT JOIN manuals m ON o.id = m.organization_id 
-- GROUP BY o.id, o.name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- The migration is now complete. All existing users and manuals have been
-- assigned to the default organization, maintaining full backward compatibility
-- while enabling multi-tenant functionality for new organizations.