---
name: householdops-nextjs-app-router-shells
description: Work within the HouseholdOps Next.js App Router frontend, including the app, admin, and display shells plus the proxy route layer under app/api. Use when Codex needs to add or change pages, layouts, route handlers, shell-specific UI, server/client component boundaries, or frontend request flows that proxy to the backend API.
---

# HouseholdOps Next.js App Router Shells

Preserve the repo's separation between shells and keep the proxy layer intentional.

## Core rules

1. Default to Server Components for pages and layouts.
2. Use Client Components only for state, effects, event handlers, or browser APIs.
3. Keep backend access behind the local route-handler layer under `src/frontend/web/app/api` unless there is a strong reason not to.
4. Reuse `src/frontend/web/lib/api-proxy.ts` for backend proxying.
5. Keep the three shells distinct:
   - `(app)` for member-facing flows
   - `(admin)` for owner/admin flows
   - `(display)` for kiosk/tokenized display flows

## Data-flow rules

- If a client component needs data from the backend, prefer adding or extending a local route handler and fetch that same-origin endpoint.
- Keep secrets and internal service URLs on the server side only.
- Respect the display boundary: display routes should consume display-safe projection endpoints, not ad hoc operational queries.

## Change patterns

- New backend-backed frontend action:
  - Add or extend the backend endpoint.
  - Add or extend the matching route handler under `app/api`.
  - Update the shell component to call the local route.
- New page or shell surface:
  - Place it under the correct route group and layout.
  - Keep server/client boundaries narrow.

## Do not use this skill when

- The task is backend-only.
- The task is pure styling with no shell, routing, or data-flow effect.

## References

- For the repo's frontend file map and boundary rules, read [frontend-patterns.md](references/frontend-patterns.md).
