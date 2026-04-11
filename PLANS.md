# Calendar Integrations Plan

## Objective
- Advance Google Calendar integration from a narrow working slice to a robust, validated import path without expanding into multi-provider or bidirectional sync.

## Current capability
- Google Calendar iCal feed links can be created and removed.
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
  - Status: `blocked`
  - Scope: replace raw iCal feed entry with Google account linking and managed provider credentials.
  - Key files touched: `PLANS.md`, auth/integrations backend, admin UI, env/docs, hosted callback setup
  - Validation status: blocked
  - Notes: blocked in the current environment because `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not present, no callback URL/configuration is wired yet, and hosted callback validation is not available in this session.
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

## Current milestone
- `M10` OAuth environment preparation completed and paused at milestone boundary awaiting confirmation.

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
- OAuth linking is blocked on unavailable `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, missing callback configuration, and unavailable hosted validation capability.
- Local `.env` preparation is now in place, but actual OAuth implementation still requires real credentials plus callback wiring and hosted validation.

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

## Next recommended step
- Fill in the local `.env` placeholders for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`, then we can reassess whether `M5` OAuth-based Google account linking is unblocked enough to begin.
