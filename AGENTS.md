# Repository Guidelines

## Project Structure & Module Organization
- Root: work primarily in `ComplianceManager/`.
- Client: `ComplianceManager/client/src` (pages, components, hooks, utils). Example: `components/RichTextEditor.tsx`.
- Server: `ComplianceManager/server` (controllers, middleware, routes, services). Entry: `server/index.ts`.
- Database: `ComplianceManager/db` (Drizzle schema and access). Aliases: `@db/*`, client alias `@/*`.
- Migrations/Tools: `ComplianceManager/migration`.
- Docs/Assets: `ComplianceManager/docs`, `ComplianceManager/attached_assets`.

## Build, Test, and Development Commands
Run commands from `ComplianceManager/`.
- `npm run dev`: Start Express + Vite in development at `http://localhost:5000`.
- `npm run build`: Build client (Vite) to `dist/public` and server (esbuild) to `dist/`.
- `npm start`: Run the production build (`node dist/index.js`).
- `npm run check`: Type-check with TypeScript.
- `npm run db:push`: Apply Drizzle schema to the database (requires updated drizzle-kit).
- `npm run db:migrate:org|sections|cascade`: Run SQL migrations via `psql`.
- `npm run db:migrate:all`: Run all SQL migrations sequentially.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Indent with 2 spaces.
- React components: PascalCase files (e.g., `ManualDetail.tsx`). Hooks start with `use` (e.g., `use-user.ts`).
- Server files: camelCase modules (e.g., `manualController.ts`). Prefer named exports.
- Imports: use aliases `@` (client) and `@db` (server/db) where appropriate.
- Styling: Tailwind CSS. Keep utility classes readable; extract to components when complex.
  - UI: neutral SaaS theme; navigation uses active states + aria-current.
  - RichTextEditor: Preview toggle, Copy HTML, Clear actions.
  - Section tree: accessible (role=tree/treeitem); inline policy View/Edit/Delete; Admin can Publish.

## Testing Guidelines
- No formal test runner is configured yet. Ensure `npm run check` passes and exercise critical flows manually.
- If adding tests, prefer Vitest + React Testing Library for client and Supertest for server. Use `*.test.ts(x)` next to source files.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits where practical (`feat:`, `fix:`, `docs:`, `style:`). Keep subjects imperative and concise. Emojis are acceptable but optional.
- PRs: include a clear summary, linked issues (e.g., `Fixes #123`), screenshots/GIFs for UI changes, test/validation steps, and notes on DB changes (run `npm run db:push`).

## Security & Configuration Tips
- Create `ComplianceManager/.env` with: `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`. Do not commit secrets.
- After schema changes, run `npm run db:push` and verify startup logs.
- Uploaded files are served from `/uploads`; avoid committing local upload artifacts.
