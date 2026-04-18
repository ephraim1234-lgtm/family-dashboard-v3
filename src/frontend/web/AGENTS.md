# Frontend AGENTS

## Purpose

This file adds frontend-local guidance on top of the repository root `AGENTS.md`.

Use it when the current working directory is inside `src/frontend/web/`.

## Frontend defaults

- Preserve the Next.js App Router structure with separate app, admin, and display shells.
- Keep server/client boundaries intentional. Do not move data-fetching into client components when the existing proxy-route pattern is the better fit.
- Prefer the existing `app/api/**/route.ts` proxy layer for backend communication instead of ad hoc direct backend calls from client code.
- Display routes should consume explicit display projection contracts, not raw operational queries.

## Validation defaults

- Prefer `npm run build` for structural validation.
- When behavior depends on auth, API responses, display projections, or cross-shell flows, validate through Docker with the web on port `3000` and the API on `3001`.
- Time-sensitive display and scheduling UI changes should be checked against the backend contracts they depend on.

## Skill routing

- Use `householdops-nextjs-app-router-shells` for app/admin/display shell work, route handlers, and frontend data-flow changes.
- Use `householdops-container-validation` when UI changes need runtime smoke checks.
- Use `householdops-time-and-recurrence` for scheduling and display behavior that depends on dates, time zones, recurrence, or reminder timing.
