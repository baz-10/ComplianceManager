# Section Deletion Fix

## Problem
Section deletion was failing with the error "delete failed, 'error' failed to delete section" due to:

1. **Foreign Key Constraints**: The `policies` table has a foreign key constraint on `section_id` that references `sections.id`. When trying to delete a section that has policies, PostgreSQL prevents the deletion due to referential integrity.

2. **Client-Server Error Format Mismatch**: The client was expecting plain text error responses but the server was returning JSON, causing the error message to display incorrectly.

## Solution Implemented

### 1. Server-Side Cascading Deletion
Updated `server/controllers/sectionController.ts` to properly handle cascading deletions:

- Added transaction-based deletion that removes all related records before deleting the section
- Deletes in the correct order:
  1. Acknowledgements (for all policy versions in the section)
  2. Annotations (for all policy versions in the section)
  3. Approval workflows (for all policy versions in the section)
  4. Document signatures (for all policy versions in the section)
  5. Policy versions
  6. Policies
  7. Finally, the section itself
- Added proper error logging
- Added audit trail logging for compliance

### 2. Client-Side Error Handling
Updated `client/src/pages/ManualDetail.tsx` to properly parse JSON error responses:

- Handles both simple `{ error: string }` and nested error formats
- Falls back to text parsing if JSON parsing fails
- Provides clear error messages to users

### 3. Database Migration (Optional)
Created `db/cascade-delete-migration.sql` to add CASCADE DELETE constraints:

- This migration updates foreign key constraints to automatically cascade deletions
- Once applied, the database will automatically handle related record deletions
- This is optional but recommended for production environments

## How to Apply the Fix

### Immediate Fix (Already Applied)
The code changes are already in place. Section deletion should now work properly without any additional steps.

### Optional Database Migration
To apply cascade delete constraints at the database level:

```bash
# Connect to your database and run the migration
psql $DATABASE_URL < db/cascade-delete-migration.sql
```

This will:
- Add CASCADE DELETE to all relevant foreign key constraints
- Make future deletions automatic at the database level
- Improve performance by letting PostgreSQL handle the cascading

## Testing the Fix

1. Create a test section with policies
2. Try to delete the section
3. Verify that:
   - The section and all its policies are deleted
   - No error messages appear
   - The UI updates correctly

## Benefits

1. **Data Integrity**: Ensures all related records are properly cleaned up
2. **User Experience**: Clear error messages and successful deletions
3. **Compliance**: Audit trail logs all deletion operations
4. **Performance**: Transaction-based deletion ensures atomicity
5. **Future-Proof**: Optional cascade constraints prevent future issues