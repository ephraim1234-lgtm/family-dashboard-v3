# HouseholdOps

Greenfield foundation for a self-hosted household operations platform.

Current implementation focus:

- household membership and context
- scheduling and recurrence foundations
- display device access and display projections
- administration/configuration
- one background worker

## Monorepo layout

- `src/backend` ASP.NET Core modular monolith and worker
- `src/frontend/web` Next.js web surface with separate app/admin/display shells
- `ops/docker` container definitions
- `docs` product and architecture guidance

## Current baseline

- persisted backend-owned cookie sessions for normal web users
- separate app, admin, and display web shells
- owner-gated admin overview and display management
- persisted display devices and hashed display access tokens
- explicit display projection endpoints separate from normal user auth

## Docker-first local runtime

1. Copy `.env.example` to `.env`.
2. Start the stack with Docker Compose.
3. Prefer validating the running system through Docker instead of relying only on host SDK/tooling setup.

Example:

```powershell
$env:API_PORT='3001'
$env:WEB_PORT='3002'
docker compose up -d --build postgres api web
```

Default validation ports used in this repo:

- API: `http://localhost:3001`
- Web: `http://localhost:3002`

## Google OAuth prep

Google OAuth account linking, calendar discovery, and managed Google calendar link creation are implemented for local validation. The original iCal path still remains available, and both import paths stay one-way into local Scheduling.

1. Copy `.env.example` to `.env` if you have not already.
2. Fill in these placeholders in your local `.env` only:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`
3. Do not commit `.env`; it is intentionally ignored.
4. Treat the redirect URI as environment-specific. Local Docker validation may cover basic config shape, but real callback validation will still need a hosted environment.

## Calendar integration validation

Use this sequence when validating the current Google Calendar integration slice:

1. Backend build:
   `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`
2. Focused scheduling/integration tests:
   `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`
3. Frontend build:
   run `npm install` in `src/frontend/web` first if local dependencies are not present, then run `npm run build`
4. Docker runtime validation:
   ensure the local Docker daemon is running before using the `docker compose` flow below

Recommended runtime validation loop for integration changes:

```powershell
$env:API_PORT='3001'
docker compose up -d --build postgres api
```

If you also need the admin UI:

```powershell
$env:API_PORT='3001'
$env:WEB_PORT='3002'
docker compose up -d --build postgres api web
```

Current Google Calendar integration scope in validation:

- Google OAuth account linking, readiness visibility, calendar discovery, and managed calendar-link creation
- Google Calendar iCal feed links and managed OAuth calendar links
- manual sync from Admin
- worker-managed automatic sync for linked calendars
- one-time plus supported daily/weekly external event import into Scheduling
- unsupported recurrence patterns remain skipped
- imported events remain read-only in Scheduling

## Display baseline

- Display devices are provisioned from the owner-only admin surface.
- Each provisioned device receives a display access token.
- Display token access remains separate from normal app/admin cookie sessions.
- Display routes consume explicit Display-owned projection contracts.

## Secrets and environment handling

- Do not commit real secrets, local `.env` files, OAuth client secrets, or live display tokens.
- Keep checked-in examples sanitized and use `.env.example` for placeholder configuration.
- Treat any access token returned from a local admin provisioning flow as runtime-only data, not documentation or committed fixture data.

## Current review gates

Before deep implementation, review:

- auth/session architecture
- recurrence storage and query model
- display token/access model
- worker job mechanism and idempotency approach
- migration workflow
