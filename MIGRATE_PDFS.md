# 📄 PDF Migration Workflow

## Quick Start: Migrate Your Existing Documentation

### Step 1: Place Your PDFs
```bash
# Place your PDF files in the docs folder:
ComplianceManager/docs/
├── operations-manual.pdf
├── safety-procedures.pdf
├── casa-compliance.pdf
└── emergency-procedures.pdf
```

### Step 2: Tell Claude to Read and Migrate
Simply say: **"Claude, please read the PDFs in the docs folder and migrate them to the database"**

Claude will:
1. ✅ Read each PDF file directly
2. ✅ Analyze the document structure (sections, headings, content)
3. ✅ Generate database migration scripts
4. ✅ Create manuals, sections, and policies in your database
5. ✅ Format content for the rich text editor

Alternative: In‑App Import (Admin/Editor)
- You can also upload DOCX/PDF via the import endpoint:
  - `POST /api/import` (multipart field `document`, form `dryRun`, `granularity=h2|h3` for DOCX, `manualTitle`)
  - Dry-run returns a preview tree; commit creates a DRAFT manual
  - Requires: `npm install mammoth pdf-parse`

### Step 3: View Results
```bash
npm run dev
# Navigate to http://localhost:5000/manuals
```

## What Happens During Migration

### PDF Analysis
- **Document Structure**: Identifies main sections and subsections
- **Content Extraction**: Extracts text and preserves formatting
- **Hierarchy Detection**: Maps PDF structure to Manual → Section → Policy

### Database Population
- **Manual**: Each PDF becomes a manual
- **Sections**: Major headings become sections  
- **Policies**: Subsections/procedures become policies
- **Versions**: Each policy gets version 1
- **Status**: All items start as DRAFT for review

### Content Formatting
- Text is cleaned and formatted for HTML
- Headings are preserved with proper HTML tags
- Paragraphs are structured correctly
- Lists and formatting are maintained where possible

## Example Migration Result

**Input**: `operations-manual.pdf` with sections:
- Flight Operations
- Maintenance Procedures  
- Safety Protocols

**Output** in Database:
```
Manual: "Operations Manual"
├── Section: "Flight Operations" 
│   ├── Policy: "Pre-flight Procedures"
│   └── Policy: "In-flight Operations"
├── Section: "Maintenance Procedures"
│   ├── Policy: "Daily Inspections"
│   └── Policy: "Scheduled Maintenance"
└── Section: "Safety Protocols"
    ├── Policy: "Emergency Procedures"
    └── Policy: "Risk Assessment"
```

## After Migration

### Review and Refine
1. **Check content**: Navigate to `/manuals` to review migrated content
2. **Edit if needed**: Use the rich text editor to refine formatting
3. **Publish when ready**: Change status from DRAFT to LIVE
4. **User acknowledgments**: Users can then acknowledge policies

### CASA Compliance
- All migrations are logged in the audit trail
- Content changes are tracked with version history
- Digital signatures can be added later
- Compliance tracking is automatic once published

## Support
If migration doesn't work as expected:
1. **Check PDF format**: Ensure PDFs have selectable text (not scanned images)
2. **Review structure**: Complex layouts may need manual adjustment
3. **Ask Claude**: "Can you analyze the structure of [filename].pdf and suggest improvements?"

---

**Ready to migrate?** Just place your PDFs in the `docs/` folder and ask Claude to get started!
