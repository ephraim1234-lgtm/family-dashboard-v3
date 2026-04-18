# Frontend patterns

## Key files

- Root layout: `src/frontend/web/app/layout.tsx`
- Shell pages:
  - `src/frontend/web/app/(app)/app/page.tsx`
  - `src/frontend/web/app/(admin)/admin/page.tsx`
  - `src/frontend/web/app/(display)/display/page.tsx`
- Proxy helper: `src/frontend/web/lib/api-proxy.ts`
- Site config: `src/frontend/web/lib/site-config.ts`

## Existing conventions

- App Router route groups for shell separation
- Route handlers under `app/api/**/route.ts`
- Client-heavy panels for interactive admin workflows
- Local route handlers proxying to the ASP.NET Core API
- `cache: "no-store"` for dynamic backend proxy fetches

## Watch for

- Pulling browser-only APIs into Server Components
- Client components calling the backend service URL directly
- Mixing display token routes with normal cookie-auth flows
