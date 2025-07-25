# PDF Migration Troubleshooting Guide

## Issues Fixed

### 1. Missing Import Error
**Problem**: The `migration-helper.js` file was missing the `eq` import from drizzle-orm
**Solution**: Added `import { eq } from 'drizzle-orm';` to the imports

### 2. Database Connection Issues
**Common Causes**:
- DATABASE_URL not set in environment
- Database schema not initialized
- Missing SSL mode in connection string

## How to Run Migration

### Step 1: Test Database Connection
```bash
node migration/scripts/test-db-connection.js
```

This will verify:
- Database connection is working
- Tables exist
- You have proper access

### Step 2: Check Environment
Ensure you have a `.env` or `.env.local` file with:
```
DATABASE_URL="postgresql://[username]:[password]@[endpoint]/[database]?sslmode=require"
OPENAI_API_KEY="your-openai-key"
```

### Step 3: Initialize Database Schema
If you haven't already, run:
```bash
npm run db:push
```

### Step 4: Run Migration Script
```bash
node migration/scripts/read-and-migrate-pdfs.js
```

This script will:
- Create an Operational Procedures Manual
- Import structured content for all 6 PDF parts
- Set everything as DRAFT status for review

## Alternative: Direct PDF Reading

If you want Claude to read and extract actual PDF content:

1. Ensure PDFs are in the `docs/` folder
2. Ask Claude: "Please read the PDF files in docs/ and extract their content"
3. Claude can then create more accurate migration scripts

## Scripts Created

1. **test-db-connection.js** - Verifies database connectivity
2. **migrate-pdfs.js** - Basic migration framework  
3. **read-and-migrate-pdfs.js** - Full migration with structured content

## Common Errors

### "Table does not exist"
Run `npm run db:push` to create all required tables

### "Cannot connect to database"
Check DATABASE_URL environment variable

### "Permission denied"
Scripts are now executable. Run directly with `node` command

## Next Steps

After successful migration:
1. Start the app: `npm run dev`
2. Navigate to: `http://localhost:5000/manuals`
3. Review imported content
4. Edit and enhance as needed
5. Change status from DRAFT to LIVE when ready