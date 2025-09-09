# Post-Restart Checklist

Follow these steps after restarting or pulling new changes.

1) Install Dependencies
- From `ComplianceManager/` run:
```
npm install
```
- New parsers: `mammoth` (DOCX) and `pdf-parse` (PDF) are required for import.

2) Database Schema
- Apply latest schema:
```
npm run db:push
```
- If upgrading from older versions, apply cascade rules once:
```
npm run db:migrate:cascade
```

3) Environment Variables
- Ensure `.env` contains:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `OPENAI_API_KEY` (optional, for AI drafting)
  - `IMPORT_MAX_DOCX_MB` (optional, default 20)
  - `IMPORT_MAX_PDF_MB` (optional, default 50)

4) Start the App
```
npm run dev
```

5) Quick Verification
- Auth check: `GET /api/user` returns current user (after login)
- Hierarchy flags: open a manual and confirm READ/ACK/REQUIRED badges render
- Compliance list: `GET /api/user/compliance` returns UNREAD/READ/ACKED items
- Import: `POST /api/import` (Admin/Editor) accepts DOCX/PDF; try a dry-run preview

6) Replit Notes
- Use the Shell to run `npm install` and `npm run db:push`
- Large imports should use CLI scripts in `migration/scripts/` if HTTP timeouts occur

