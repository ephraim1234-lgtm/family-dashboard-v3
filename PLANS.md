# Calendar Integrations Plan

## Objective
- Advance Google Calendar integration from a narrow working slice to a robust, validated import path without expanding into multi-provider or bidirectional sync.

## Current capability
- Google OAuth account linking foundation can start from Admin and complete through the web-shell callback path.
- Admin shows Google OAuth readiness, recommended callback URI, and linked Google accounts.
- Admin can discover accessible Google calendars from linked OAuth accounts.
- Google Calendar iCal feed links and managed OAuth calendar links can be created and removed.
- Manual sync imports one-time plus supported daily/weekly recurring external events into local Scheduling.
- Worker-managed auto sync now processes due linked calendars on a fixed cadence.
- Sync status is visible in Admin.
- Admin shows automatic sync cadence and next due time per linked calendar.
- Unsupported recurrence patterns remain skipped explicitly.
- Imported events are read-only in Scheduling and still appear in schedule/display projections.

## Milestones
- `M1` Hardening existing iCal import slice
  - Status: `done`
  - Scope: fix correctness gaps in parsing, duplicate prevention, failure handling, and slice documentation.
  - Key files touched: `PLANS.md`, `src/backend/HouseholdOps.Infrastructure/Integrations/*`, `src/backend/HouseholdOps.Infrastructure/Scheduling/*`, `src/backend/HouseholdOps.Modules.Scheduling/*`, `tests/HouseholdOps.Modules.Scheduling.Tests/*`, `docs/product/domain-roadmap.md`
  - Validation status: passed
  - Notes: completed `TZID` support, duplicate feed-link prevention, invalid-feed failure handling, and consistent read-only enforcement for imported deletes.
- `M2` Focused validation and local run guidance
  - Status: `done`
  - Scope: strengthen automated tests and improve local verification clarity where environment friction exists.
  - Key files touched: `PLANS.md`, `README.md`
  - Validation status: passed
  - Notes: documented the exact backend build/test commands, frontend dependency prerequisite, and Docker daemon/runtime expectations for port `3001` validation.
- `M3` Worker-managed scheduled sync for linked calendars
  - Status: `done`
  - Scope: add the narrowest useful background sync path for already-linked Google iCal feeds.
  - Key files touched: `PLANS.md`, `src/backend/HouseholdOps.Worker/*`, `src/backend/HouseholdOps.Infrastructure/Integrations/*`, `src/backend/HouseholdOps.Infrastructure/Persistence/*`, `src/backend/HouseholdOps.Modules.Integrations/*`, `src/frontend/web/components/admin-calendar-integrations-panel.tsx`, `tests/HouseholdOps.Modules.Scheduling.Tests/*`, `docs/product/domain-roadmap.md`
  - Validation status: passed
  - Notes: due-link auto sync is fixed-cadence and worker-triggered, with scheduling state stored on the linked calendar record.
- `M4` Recurring external event import
  - Status: `done`
  - Scope: import the narrowest supported subset of recurring Google iCal events into Scheduling without introducing unsupported recurrence abstractions.
  - Key files touched: `PLANS.md`, `src/backend/HouseholdOps.Infrastructure/Integrations/GoogleCalendarIcsParser.cs`, `src/backend/HouseholdOps.Infrastructure/Scheduling/ImportedScheduledEventSyncService.cs`, `src/backend/HouseholdOps.Modules.Scheduling/ImportedScheduledEvent.cs`, `src/frontend/web/components/admin-calendar-integrations-panel.tsx`, `tests/HouseholdOps.Modules.Scheduling.Tests/GoogleCalendarIntegrationServiceTests.cs`, `README.md`, `docs/product/domain-roadmap.md`
  - Validation status: passed
  - Notes: supported only `DAILY` and `WEEKLY` patterns that map directly to the current Scheduling recurrence model.
- `M5` OAuth-based Google account linking
  - Status: `done`
  - Scope: add the narrowest useful Google OAuth account-linking foundation without replacing the existing iCal import path yet.
  - Key files touched: `PLANS.md`, integrations backend/contracts, persistence/migrations, admin UI, frontend proxy routes, env/docs
  - Validation status: passed
  - Notes: implemented OAuth start/callback foundation through the web-shell callback route, persisted linked Google accounts and tokens under Integrations, and kept scheduling/import behavior unchanged.
- `M6` Stronger sync management UX
  - Status: `done`
  - Scope: give owners better control over linked calendar sync behavior and failure recovery without changing the read-only imported-event model.
  - Key files touched: `PLANS.md`, integrations backend/contracts, admin UI, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: added per-link automatic sync enable/disable controls, sync interval updates, and worker behavior to ignore disabled auto-sync links.

- `M7` Targeted timezone/TZID support expansion
  - Status: `done`
  - Scope: expand narrow timezone compatibility only where real Google/iCal feeds are likely to need it, without broad recurrence or provider abstraction changes.
  - Key files touched: `PLANS.md`, `src/backend/HouseholdOps.Infrastructure/Integrations/*`, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: added calendar-level `X-WR-TIMEZONE` fallback plus normalization for common alias and prefixed `TZID` formats, while explicitly not implementing full `VTIMEZONE` parsing.

- `M8` Narrow recurrence import expansion
  - Status: `done`
  - Scope: evaluate the smallest justified recurrence improvement, likely limited to daily/weekly `COUNT` handling if it maps cleanly into Scheduling semantics.
  - Key files touched: `PLANS.md`, `src/backend/HouseholdOps.Infrastructure/Integrations/*`, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: added `COUNT` support for already-supported `DAILY` and `WEEKLY` imports by deriving `RecursUntilUtc`, including mixed `COUNT` plus `UNTIL` handling via the earlier effective end.

- `M9` Stronger sync failure visibility
  - Status: `done`
  - Scope: improve owner-facing visibility and recovery guidance for failed calendar syncs without changing provider breadth or imported-event ownership.
  - Key files touched: `PLANS.md`, integrations admin UI, explicit contracts if needed, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: added explicit sync failure categories and recovery hints to the link summary contract, then surfaced them in Admin next to retry behavior and next-attempt guidance.

- `M10` OAuth environment preparation
  - Status: `done`
  - Scope: prepare local non-secret config surfaces for future Google OAuth linking without implementing the flow itself until credentials and hosted callback validation are available.
  - Key files touched: `PLANS.md`, env example/docs, possibly admin copy if needed
  - Validation status: passed
  - Notes: added sanitized OAuth placeholders to `.env.example` and README setup guidance, and created a local ignored `.env` template for user-supplied values without wiring the blocked OAuth flow itself.

- `M11` OAuth readiness visibility
  - Status: `done`
  - Scope: expose current Google OAuth config readiness and exact callback guidance in Admin without claiming the OAuth flow itself is implemented.
  - Key files touched: `PLANS.md`, integrations contracts/endpoints, admin UI, local `.env` only, focused validation
  - Validation status: passed
  - Notes: added an owner-visible OAuth readiness endpoint/UI, surfaced the exact local callback pattern, and set the ignored local `.env` redirect URI to `http://localhost:3000/api/integrations/google-oauth/callback`.

- `M12` OAuth-backed calendar selection
  - Status: `done`
  - Scope: use a linked Google account to discover accessible calendars without changing local scheduling ownership or jumping to bidirectional sync.
  - Key files touched: `PLANS.md`, integrations backend/contracts, admin UI, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: linked Google accounts can now list accessible calendars from Google Calendar API, refreshing expired access tokens server-side before discovery when needed.
- `M13` Provider-managed calendar link creation
  - Status: `done`
  - Scope: let owners create a managed Google calendar link from a discovered OAuth calendar, while keeping imports one-way and Scheduling behavior unchanged.
  - Key files touched: `PLANS.md`, integrations persistence/contracts/services, admin UI, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: discovered Google calendars can now be linked directly for import, using OAuth-backed event fetches with the same narrow recurrence limits and read-only imported-event behavior as the existing iCal path.
- `M14` Managed-link sync UX hardening
  - Status: `done`
  - Scope: make managed-link source details and skipped recurring-exception guidance clearer in Admin without broadening recurrence semantics.
  - Key files touched: `PLANS.md`, integrations contracts/services, admin UI, focused tests, docs if behavior changes materially
  - Validation status: passed
  - Notes: sync summaries now distinguish unsupported recurring rules from skipped recurring overrides/exceptions for managed Google links, and the Admin UI shows clearer source details for feed versus OAuth-managed links.

## Current milestone
- None active. Awaiting confirmation for the next calendar-integrations milestone.

## Decisions
- Keep Scheduling as owner of local event behavior; imported events stay read-only.
- Keep Integrations responsible for link records, sync state, and import orchestration.
- Stay Google-only and iCal-only for now.
- Keep recurring external event import deferred until the non-recurring path is more robust.

## Risks / blockers
- Docker runtime validation depends on a running local Docker daemon.
- Frontend build validation depends on local Node/Next dependencies being installed.
- `TZID` handling currently has a lightweight IANA-to-Windows fallback map, so additional timezone coverage may need expansion if future feeds use less common zones.
- Recurring import must stay inside Scheduling's existing recurrence model to avoid inventing unsupported exception or conflict behavior.
- Recurring import now supports narrow `COUNT` handling only for the already-supported `DAILY` and `WEEKLY` shapes; broader RRULE features remain intentionally unsupported.
- OAuth foundation is now implemented locally, but hosted callback validation is still a later real-world checkpoint before claiming production readiness.
- Linked Google account tokens are now stored in the integrations persistence model; stronger secret-management/encryption can be a later hardening step.
- OAuth-managed calendar imports currently skip recurring exceptions/overrides and still only support the existing narrow daily/weekly recurrence subset.
- The new recurring override/exception guidance is conditionally visible only when a managed link actually skips overrides, so Docker UI validation for that exact state still depends on seeded runtime data.

## Validation log
- 2026-04-11: Prior slice built successfully with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: Prior slice tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M1` hardening build passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M1` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`28` passed).
- 2026-04-11: `M2` README guidance updated with the exact backend build/test commands, frontend dependency prerequisite, and Docker runtime expectations for validation.
- 2026-04-11: `M3` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`29` passed).
- 2026-04-11: `M3` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M4` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`32` passed).
- 2026-04-11: `M4` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `npm run build` in `src/frontend/web` failed because `next` was not installed in the local environment.
- 2026-04-11: Docker runtime validation failed because the Docker daemon was not running.
- 2026-04-11: `M6` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`35` passed).
- 2026-04-11: `M6` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M7` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`38` passed).
- 2026-04-11: `M7` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M8` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`41` passed).
- 2026-04-11: `M8` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: Initial parallel `M9` validation hit a transient .NET build artifact lock in `HouseholdOps.SharedKernel\obj\Debug\net9.0\HouseholdOps.SharedKernel.dll`; rerunning serially resolved it without code changes.
- 2026-04-11: `M9` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`42` passed).
- 2026-04-11: `M9` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-11: `M10` config validation confirmed `.env.example`, README, and `PLANS.md` include OAuth placeholders/guidance, and `git status --short --ignored` confirmed local `.env` remains ignored and untracked.
- 2026-04-11: Initial parallel `M11` validation hit the same transient .NET build artifact lock pattern seen earlier; serial reruns passed without code changes.
- 2026-04-11: `M11` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`43` passed).
- 2026-04-11: `M11` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Initial parallel `M5` validation hit the same transient .NET build artifact lock pattern seen in earlier milestones; serial reruns passed without code changes.
- 2026-04-12: `M5` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`44` passed).
- 2026-04-12: `M5` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: `npm run build` in `src/frontend/web` still failed because `next` is not installed in the local environment.
- 2026-04-12: `M12` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`45` passed).
- 2026-04-12: `M12` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Docker runtime validation passed with `$env:API_PORT='3001'; $env:WEB_PORT='3000'; docker compose up -d --build postgres api web`, followed by web-shell requests to `/api/auth/dev-login`, `/api/integrations/google-oauth/readiness`, `/api/integrations/google-oauth/accounts`, and `/api/integrations/google-oauth/calendars`, all returning `200`.
- 2026-04-12: Initial parallel `M13` validation hit the same transient .NET build artifact lock pattern seen in earlier milestones; serial reruns passed without code changes.
- 2026-04-12: `M13` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`47` passed).
- 2026-04-12: `M13` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Docker runtime validation passed with `$env:API_PORT='3001'; $env:WEB_PORT='3000'; docker compose up -d --build postgres api web`, then an authenticated POST to `/api/integrations/google-oauth/calendars/link` returned the expected `400` validation error for a nonexistent account link, confirming the new web-shell endpoint wiring.
- 2026-04-12: Initial parallel `M14` validation hit the same transient .NET build artifact lock pattern seen in earlier milestones; serial reruns passed without code changes.
- 2026-04-12: `M14` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`47` passed), including managed-link assertions for skipped recurring overrides/exceptions.
- 2026-04-12: `M14` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Docker runtime validation rebuilt `api` and `web` successfully with `$env:API_PORT='3001'; $env:WEB_PORT='3000'; docker compose up -d --build api web`, and the authenticated `/admin` shell returned `200`. The new override-specific UI copy is conditional on runtime data, so that exact branch remains unit-test-backed rather than fully demonstrated in the seeded Docker state.

## Next recommended step
- Start `M15` managed-link failure guidance refinement: make OAuth-managed access failures and missing linked-account states more explicit than generic feed-oriented guidance, without widening provider scope.
