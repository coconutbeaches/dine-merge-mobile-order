# Repository Guidelines

## Project Structure & Module Organization
The codebase is a Next.js 15 App Router project; preserve the established layout when adding features.
- `app/` hosts route segments for admin, menu, checkout, auth, and shared providers.
- `src/` contains shared logic (`components`, `context`, `hooks`, `services`, `lib`, `types`, `utils`) and is exposed via the `@/` alias.
- `components/` houses shadcn UI primitives, while `public/`, `supabase/`, `scripts/`, `tests/`, and `cypress/` cover assets, data workflows, automation, and browser suites.

## Build, Test, and Development Commands
- `npm run dev` launches the Next.js dev server (defaults to 3000; add `-- --port 8080` before `npm run test:workflow`).
- `npm run build` compiles production assets; `npm run start` verifies them locally.
- `npm run lint` applies the shared TypeScript/React ESLint rules.
- `npm run test`, `npm run test:watch`, and `npm run test:coverage` run the Vitest suites configured in `src/test-setup.ts`.
- `npm run playwright:test` executes Playwright specs in `tests/` and `npm run test:workflow` chains Lighthouse, Playwright, and Puppeteer outputs into `test-results/`.

## Coding Style & Naming Conventions
Use TypeScript with functional React components, 2-space indentation, trailing commas, and the shared ESLint config. Components belong in PascalCase files, hooks in camelCase prefixed with `use`, utilities in kebab-case, and shared imports should rely on the `@/` alias. Keep Tailwind utility blocks tidy, run your editor formatter plus `npm run lint`, and reuse primitives from `components/` and providers in `src/` before introducing new patterns.

## Testing Guidelines
Co-locate Vitest specs beside source files as `*.spec.ts(x)` so the default include pattern finds them. Browser flows live in `tests/` (Playwright) and `cypress/` when scripted regressions are needed. Run `npm run test:coverage` and the appropriate E2E command before opening a PR; the `test:workflow` script expects the app at `http://localhost:8080` and aborts if it cannot reach it.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style used in history (`feat:`, `fix:`, `chore:`) so changelog tooling stays reliable. Keep commits focused and bundle Supabase schema updates with the features that need them. PRs should summarise the user impact, list verification commands, link issues, attach visuals for UI changes, and note Supabase migration IDs so reviewers can sync.

## Supabase & Configuration Tips
Store Supabase credentials in `.env.local`. Place SQL migrations under `supabase/migrations/`, keep `supabase/functions/` aligned with the CLI, and use `npm run debug:supabase` when diagnosing connectivity. Document storage or policy changes in the PR so environments stay in sync.
