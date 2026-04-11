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
