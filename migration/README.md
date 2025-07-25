# PDF Migration Guide

## How to Migrate Your Existing Documentation

### Step 1: Place Your PDFs
1. Create a `docs` folder in your project root
2. Place your PDF files in the `docs` folder
3. Name them descriptively (e.g., `operations-manual.pdf`, `safety-procedures.pdf`)

### Step 2: Let Claude Analyze
- Claude can read each PDF directly using the Read tool
- Claude will analyze structure, headings, and content
- Claude will identify sections and policies within each document

### Step 3: Generate Migration Script
- Claude will create database insertion scripts
- Scripts will populate manuals, sections, and policies tables
- Content will be properly formatted for the rich text editor

### Step 4: Execute Migration
- Run the generated migration scripts
- Verify content in the frontend
- Adjust and refine as needed

## Folder Structure
```
ComplianceManager/
├── docs/                    # Place your PDFs here
│   ├── operations-manual.pdf
│   ├── safety-procedures.pdf
│   └── casa-compliance.pdf
├── migration/
│   ├── scripts/            # Generated migration scripts
│   └── analysis/           # PDF analysis results
```

## Expected Output
- Each PDF becomes a Manual
- PDF sections become Sections in the database
- Subsections/policies become Policies with version 1
- All content formatted for TipTap rich text editor
- Initial status set to DRAFT for review

## Commands to Run After Migration
```bash
# Apply any new schema changes
npm run db:push

# Start development server
npm run dev

# View migrated content at:
# http://localhost:5000/manuals
```