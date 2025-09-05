# Collaboration Guide: Frontend Tasks (Claude)

This document outlines concrete frontend work items for the new compliance and policy UX. It specifies file locations, UI behavior, and API contracts so you can implement confidently and in parallel with backend work.

## Objectives
- Add clear, discoverable policy status signals in the section tree:
  - LIVE/DRAFT (already present)
  - Ack Required/Acked (if assignment requires acknowledgement)
  - Read/Unread (per-user, per-current-version)
- Let Admins/Editors manage policies from the section tree:
  - View, Edit, Delete (present)
  - Publish toggle (present for Admin)
  - “Unread only” filter for the current user
- Add the Reader “My Required Policies” view.
- Add an Import Wizard for Admin/Editor to bring in DOCX/PDF documents.

## Files & Components
- Section tree UI: `client/src/components/HierarchicalSectionTree.tsx`
  - Policy row actions live here (View, Edit, Delete, Publish).
  - Add badge chips for Ack/Read below.
  - Add a small “Unread only” toggle in the section header area.
- Editor (preview/copy/clear): `client/src/components/RichTextEditor.tsx` (unchanged for this task).
- Navigation (add link to “My Required Policies”): `client/src/components/Navigation.tsx`.
- New page (Reader): `client/src/pages/MyCompliance.tsx` (list required policies and status).
- Import Wizard (Admin/Editor): `client/src/pages/ImportDocument.tsx` or modal on Manuals page.

## Badges & Behavior
Render badges in this order for each policy row:
1) Status chip: LIVE (green) or DRAFT (amber)
2) If an assignment requires acknowledgement for the current user:
   - If acknowledged: “Acked” (green)
   - Else: “Ack Required” (blue)
   - Note: If ack badges are shown, do not show Read/Unread (ack is stronger)
3) Else show Read/Unread for the current user:
   - Read (green): user has viewed the current policy version
   - Unread (amber/red): user has not viewed the current policy version

Suggested Tailwind classes:
- LIVE: `bg-green-100 text-green-800`
- DRAFT: `bg-yellow-100 text-yellow-800`
- Acked: `bg-green-100 text-green-800`
- Ack Required: `bg-blue-100 text-blue-800`
- Read: `bg-green-100 text-green-800`
- Unread: `bg-amber-100 text-amber-800`

## Triggers for Read
- Post a view event when:
  - The policy “View” dialog opens
  - The inline “Show more” expander is opened the first time
- Endpoint: `POST /api/policies/:policyId/view`
  - Body: `{ dwellMs?: number }` (optional)
  - Purpose: record a view on the current policy version for the current user

## Data Contracts (Backend provides)
1) Section hierarchy: `GET /api/manuals/:manualId/sections/hierarchy`
   - Already filters: Readers see only LIVE; Admin/Editor see all
   - Policies will be enriched per policy with for the current user:
     - `read: boolean` — viewed current version
     - `acked: boolean` — acknowledged current version
     - `required: boolean` — an assignment exists matching user or role
   - Use these to render badges; if a flag is missing (during rollout), default to hiding the badge instead of guessing.

2) View event: `POST /api/policies/:policyId/view`
   - Records a VIEW in the audit log for read/unread badges (no `policy_views` table yet)

3) Reader compliance list: `GET /api/user/compliance`
   - Returns `{ items: Array<{ policyId, title, status: 'DRAFT'|'LIVE', currentVersionId, manual: {id,title}, section: {id,title}, required: true, acked: boolean, read: boolean }>, totals: { required, acked, unread } }`
   - Use to render “My Required Policies” page for Readers/Admins/Editors.

4) Acknowledgement: `POST /api/policies/:policyId/acknowledge` (preferred)
   - Back-compat: `POST /api/versions/:policyVersionId/acknowledge`
   - Writes to `acknowledgements` and audit.

5) Assignments (Admin; phase 2 UI): `POST /api/policies/:policyId/assignments`
   - Body: `{ assignments: [{ targetType:'ALL'|'ROLE'|'USER', role?: 'ADMIN'|'EDITOR'|'READER', userId?: number, requireAcknowledgement?: boolean }] }`
   - Drawer UI can be added later; hierarchy surfaces `required` per user.

6) Import (Admin/Editor): `POST /api/import` (multipart)
   - Field: `document` (DOCX or PDF)
   - Body (form fields):
     - `dryRun`: `true|false` (default true in UI for preview)
     - `granularity`: `h2|h3` (for DOCX; default h2)
     - `manualTitle`: optional override for manual title
   - Dry-run response: `{ preview: { manualTitle, sections: [{ title, policies: [{ title, contentHtml }] }] }, message }`
   - Commit response: `{ message, manualId }`
   - Size limits (defaults; env overrides): DOCX ≤ 20 MB, PDF ≤ 50 MB
   - Errors:
     - 400 unsupported type or missing file
     - 413 payload too large
     - 500 parse failures; module missing (in dev) guidance to `npm install mammoth pdf-parse`

## UI Tasks (Step-by-step)
1) Add badges in `HierarchicalSectionTree.tsx`
   - Use the provided `read`, `acked`, and `required` flags when present.
   - Badge rules:
     - If `required===true`:
       - If `acked===true`: render “Acked”
       - Else: render “Ack Required”
     - Else:
       - If `read===true`: render “Read”
       - Else: render “Unread”
2) Fire POST /view on:
   - View dialog open
   - First time Show more is toggled on a policy row
   - Debounce/guard to avoid double posts
3) Add an “Unread only” toggle for the current user in the section header strip
   - Client-only filter: hides read=true policies in the rendered list
   - This is a local toggle (no server roundtrip required for v1)
4) Add “My Required Policies” page
   - New file: `client/src/pages/MyCompliance.tsx`
   - Fetch `GET /api/user/compliance`
   - Render list grouped by due date (optional), with status chips and links to view
  - Add to nav for Readers/Admins/Editors
5) Add Import Wizard (Admin/Editor)
   - Entry: button on Manuals page header ("Import Document")
   - Step 1: Upload file (DOCX/PDF), options: granularity (h2/h3, DOCX only); checkbox "Preview (dry run)"
   - Step 2: Show server preview tree (Manual → Sections → Policies) with counts
     - Allow changing granularity and re-running preview (no re-upload needed if same file held in memory isn’t feasible; re-upload accepted)
   - Step 3: Commit import (POST without dryRun); on success, navigate to the created manual detail
   - Error handling: surface 413/400/500 with friendly messages

## Acceptance Criteria
- Reader
  - Only sees LIVE policies in the section tree
  - Read/Unread badge shows correctly per policy version
  - “My Required Policies” lists required items with status (Unread/Read/Acked)
  - Acknowledge flow works as before
- Admin/Editor
  - Sees LIVE and DRAFT
  - Sees Published switch, Delete, Edit, View, and badges
  - “Unread only” toggle filters policies for the current user
  - Can import DOCX/PDF, preview structure, and commit to create DRAFT manual

## Notes & Edge Cases
- Version-awareness: Read/Unread is scoped to current policy version; a new published version resets Read to Unread
- If backend flags are missing temporarily, hide badges rather than guessing from client data
- Keep actions keyboard-accessible; current tree already has ARIA roles
- Import: scanned PDFs produce low-fidelity text; UI should warn when preview is very sparse and suggest CLI migration or OCR

## Out of Scope (for now)
- Admin assignment drawer UI (create/edit assignments and reminders)
- Reminder emails and compliance CSV exports

## Test Plan (Manual)
- As Admin
  - Toggle Published; delete a policy; edit content; verify badges update
  - Expand “Show more” or open View to record view; refresh and confirm Read badge
- As Reader
  - Confirm only LIVE policies visible; Read badge shows; Acknowledge available when required
- “My Required Policies”
  - Shows required list; statuses match expectations; links open policies

---
If any backend flag is not yet provided, render the rest of the UI and conditionally hide that chip (no crash). Ping to expose any missing fields you need in the hierarchy payload.
