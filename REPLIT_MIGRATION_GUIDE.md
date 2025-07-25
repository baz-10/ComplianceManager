# Replit Migration Guide

## 🚀 Quickest Path: Run Migration on Replit

Since your database is already on Replit, the easiest approach is to run the migration there:

### Step 1: Open Your Replit Project
1. Go to your Replit project where ComplianceManager is deployed
2. Open the **Shell** tab at the bottom

### Step 2: Run Migration Commands
```bash
# Test database connection first
npx tsx migration/scripts/test-db-connection.js

# If connection works, run the migration
npx tsx migration/scripts/read-and-migrate-pdfs.js
```

### Step 3: Verify Migration
1. Open your app in Replit
2. Navigate to `/manuals`
3. You should see the imported Operational Procedures Manual

## 🖥️ Alternative: Local Development Setup

### Option A: Use Replit's Database Locally
1. In Replit, go to **Secrets** (🔒 icon)
2. Find `DATABASE_URL`
3. Copy it to your local `.env` file
4. Run migration locally

### Option B: Create Free Neon Database
1. Sign up at [neon.tech](https://neon.tech) (free)
2. Create a new project
3. Copy connection string to `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. Run `npm run db:push` to create tables
5. Run migration scripts

## 📝 What the Migration Does

The `read-and-migrate-pdfs.js` script will:
- Create an "Operational Procedures Manual"
- Import all 6 PDF parts as sections:
  - Part 1: Introduction and Overview
  - Part 2: Flight Operations
  - Part 3: Safety Procedures
  - Part 4: Maintenance Operations
  - Part 5: Personnel Management
  - Part 6: Compliance and Reporting
- Set everything as DRAFT for review
- Create proper policy structure

## 🔍 Troubleshooting

### "DATABASE_URL must be set"
You need to either:
- Run on Replit where it's already set
- Get the URL from Replit Secrets
- Create a Neon database

### "Cannot find module"
Make sure to run `npm install` first

### "Table does not exist"
Run `npm run db:push` to create database schema

## 💡 Pro Tip: PDF Content Extraction

Once the basic structure is imported, you can ask Claude to read the actual PDFs:
"Claude, please read the PDFs in docs/ and update the policies with actual content"