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
- Admin panels now gate owner-only fetches behind the current owner session, avoiding anonymous `401` request noise from the web shell.
- Managed OAuth calendar links now surface provider-specific failure guidance instead of generic feed-only recovery text.
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
- `M15` Owner-session gating for admin fetches
  - Status: `done`
  - Scope: stop anonymous admin loads from eagerly calling owner-only proxy routes while preserving owner-session behavior for integrations, scheduling, and display management.
  - Key files touched: `PLANS.md`, admin UI components, focused Docker validation
  - Validation status: passed
  - Notes: the web shell now waits for the current session before firing owner-only fetches, which removes expected-but-noisy `401` traffic from anonymous `/admin` loads.
- `M16` Managed-link failure guidance refinement
  - Status: `done`
  - Scope: make OAuth-managed access failures and missing linked-account states more explicit than generic feed-oriented guidance, without widening provider scope.
  - Key files touched: `PLANS.md`, integrations service failure classification, admin UI copy, focused tests
  - Validation status: passed
  - Notes: added managed-link-specific sync failure categories for missing linked accounts, OAuth access rejection, token reconnect needs, and missing calendars; also refreshed stale admin copy that still described OAuth setup as callback-blocked.

- `M17` Local OAuth callback validation and hardening
  - Status: `done`
  - Scope: harden the local OAuth callback path to survive multi-cookie responses without breaking session or state cookie delivery.
  - Key files touched: `PLANS.md`, `src/frontend/web/lib/api-proxy.ts`, `src/frontend/web/app/api/integrations/google-oauth/callback/route.ts`
  - Validation status: passed
  - Notes: `PersistedSessionCookieEvents` sets `ShouldRenew = true` on every authenticated request, which causes the callback and start responses to carry two `set-cookie` headers (session renewal + state cookie). Both `proxyApi` and the callback proxy were using `headers.get('set-cookie')`, which joins multiple values with `, ` and breaks cookie parsing. Fixed both to use `headers.getSetCookie()` and append each cookie individually. Existing integration endpoints validated at 200; readiness endpoint correctly reports unconfigured state when OAuth credentials are absent.

- `M18` First real end-to-end OAuth consent run
  - Status: `done`
  - Scope: run the full Google consent/callback flow with real credentials, verify account storage and post-link calendar discovery.
  - Key files touched: none — no code changes needed; validation only
  - Validation status: passed
  - Notes: user completed the interactive Google consent step in a browser. Account `lgbrownfamily@gmail.com` (Ephraim Brown) was linked and stored with `calendar.readonly` scope. Calendar discovery returned 2 calendars (primary + Holidays in United States). A managed link for the primary calendar was created and synced successfully, importing 12 events with 0 skipped. Imported events appeared correctly in `/api/scheduling/events` as `isImported: true, sourceKind: "GoogleCalendarIcs"`. Full end-to-end path confirmed in the real Google OAuth flow.

## Current milestone
- None active. Awaiting confirmation for the next calendar-integrations milestone.

## Decisions
- Keep Scheduling as owner of local event behavior; imported events stay read-only.
- Keep Integrations responsible for link records, sync state, and import orchestration.
- Stay Google-only and one-way import-only for now.
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
- The admin shell still renders for anonymous users by design, so owner-only actions remain disabled and hidden behind session-gated fetches rather than route-level page blocking.
- Local Google OAuth credentials and the web-shell redirect URI can now be configured successfully, but full end-to-end Google consent/callback validation still depends on a real interactive login run.

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
- 2026-04-12: Initial `M15` host builds hit the same transient .NET build-artifact lock pattern seen in earlier milestones; serial reruns passed without code changes.
- 2026-04-12: `M15` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Docker runtime validation rebuilt `api` and `web` with `$env:API_PORT='3001'; $env:WEB_PORT='3000'; docker compose up -d --build api web`.
- 2026-04-12: `M15` owner-session verification through the web shell returned `200` for `/api/integrations/google-calendar-links`, `/api/integrations/google-oauth/accounts`, `/api/integrations/google-oauth/calendars`, `/api/integrations/google-oauth/readiness`, `/api/scheduling/events/series`, `/api/admin/display/devices`, and `/api/admin/overview` after `POST /api/auth/dev-login`.
- 2026-04-12: Follow-up Docker log verification for `M15` showed a fresh anonymous `/admin` load returning `200` followed by `/api/auth/session` checks without the previous owner-only `401` burst in the recent `web` container log tail, while authenticated owner requests through the web shell still returned `200`.
- 2026-04-12: Initial parallel `M16` validation hit the same transient .NET build-artifact lock pattern seen in earlier milestones; serial reruns passed after fixing a test enum typo, without further production code changes.
- 2026-04-12: `M16` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`50` passed), including managed-link failure classification coverage for missing linked accounts, OAuth access rejection, and reconnect-required token failures.
- 2026-04-12: `M16` API and Worker builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and `dotnet build src\backend\HouseholdOps.Worker\HouseholdOps.Worker.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false`.
- 2026-04-12: Docker runtime validation rebuilt `api` and `web` successfully with `$env:API_PORT='3001'; $env:WEB_PORT='3000'; docker compose up -d --build api web`, and authenticated web-shell requests to `/api/integrations/google-calendar-links`, `/api/integrations/google-oauth/accounts`, `/api/integrations/google-oauth/calendars`, `/api/integrations/google-oauth/readiness`, and `/api/admin/overview` all returned `200` after `POST /api/auth/dev-login`.

- 2026-04-12: `M17` backend builds passed with `dotnet build src\backend\HouseholdOps.Api\HouseholdOps.Api.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` and Worker equivalent.
- 2026-04-12: `M17` focused tests passed with `dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj -p:MSBuildEnableWorkloadResolver=false -p:NuGetAudit=false` (`50` passed, no regressions).
- 2026-04-12: `M17` Docker validation rebuilt `api` and `web` successfully; authenticated web-shell requests to `/api/integrations/google-calendar-links`, `/api/integrations/google-oauth/accounts`, `/api/integrations/google-oauth/calendars`, `/api/integrations/google-oauth/readiness`, and `/api/admin/overview` all returned `200`; readiness correctly reported unconfigured state.

- 2026-04-12: `M18` full end-to-end validation — real Google consent completed by user; account `lgbrownfamily@gmail.com` linked with `calendar.readonly` scope; 2 calendars discovered; managed calendar link created and first sync succeeded importing 12 events; imported events confirmed in `/api/scheduling/events` as `isImported: true, sourceKind: "GoogleCalendarIcs"`.

- 2026-04-12: `M19` first Notifications/Reminders slice implemented — `HouseholdOps.Modules.Notifications` module with `EventReminder` entity (plain Guid cross-module reference to `ScheduledEventId`, denormalized `EventTitle`), `IEventReminderService` interface, and `EventReminderMutationResult`. `EventReminderService` in Infrastructure validates lead time (1–10080 min), rejects all-day/no-start events, computes `DueAtUtc = StartsAtUtc - MinutesBefore`. `EventReminderWorker` background service polls every 60 s. EF migration `202604120004_AddEventReminders` creates `core.event_reminders` table with household FK (cascade) and three indexes. Frontend proxy routes for `GET/POST /api/notifications/reminders` and `DELETE /api/notifications/reminders/{id}`. New test project `HouseholdOps.Modules.Notifications.Tests` with 10 passing in-memory EF tests covering DueAtUtc calculation, all-day/no-start rejection, lead-time boundary validation, cross-household isolation, fire/skip logic, idempotent re-fire guard, and delete.

- 2026-04-12: `M20` reminder management panel added to `admin-scheduling-workspace.tsx` — appears in the Series Editor when editing a non-new event. Fetches all household reminders and filters client-side by `scheduledEventId`. Presets (15 min, 30 min, 1 hr, 1 day) plus a free numeric input. Each reminder row shows minutes-before label, due time, status pill, and Remove button. Separate `useTransition` keeps reminder operations from blocking the main form. CSS for `.reminder-section`, `.reminder-add-row`, `.reminder-minutes-field`, `.reminder-preset-row`, `.reminder-list` added to `globals.css`.

- 2026-04-12: `M21` upcoming reminders strip on the Display/kiosk view — `DisplayReminderItem` DTO added to Display module Contracts. `DisplayProjectionResponse` gains `UpcomingReminders` property. `DisplayProjectionService` queries `EventReminders` (cross-module by plain DbSet, no FK) for pending reminders with `DueAtUtc <= now + 30 min`, ordered by due time. Frontend `DisplaySnapshot` type extended with `upcomingReminders`. Reminders strip renders above the loading/error blocks whenever reminders exist: warm amber chip per reminder showing event title, lead-time label, and due time. Display auto-refreshes every 60 s via `setInterval` (previously loaded once on mount). All 60 tests still pass.

- 2026-04-12: `M22` Display/kiosk hardening — (a) `lastRefreshedAt` state shows "Refreshed HH:MM:SS" in the display footer, stamped on every successful projection fetch, so owners can confirm the kiosk is live. (b) `consecutiveFailuresRef` tracks back-to-back fetch errors; after 3 failures `window.location.reload()` is called to recover from stale service-worker or token issues; intermediate failures show a retry count message. `.display-footer-refresh` CSS added.

- 2026-04-12: `M23` Display CSS polish for large-screen readability — `.display-page` class replaces `.page` on the display route (max-width 1440px, wider padding). `.display-shell` base font bumped to 1.08rem. `.display-next-time` clamp increased from `clamp(2rem,5vw,4.25rem)` to `clamp(3.5rem,7vw,6.5rem)` for legibility at 2+ metres. Panel h3 sizes up from 1.45rem → 1.75rem. Chip font and agenda-time bumped. Summary grid columns widened to `minmax(380px,1.4fr) repeat(2,minmax(260px,1fr))`. `@keyframes display-reminder-pulse` added — gentle amber border/glow fade at 3 s period applied to `.display-reminders-strip`.

- 2026-04-12: `M24` — admin display device link persistence. Device provisioning saves `displayPath` to `localStorage` (key `householdops:display-paths`, keyed by `deviceId`). The "Provisioned devices" list now shows an "Open Display ↗" pill-link for any device with a saved URL, and "URL not saved" for legacy devices provisioned before this change. No backend migration required; `.pill-link` CSS added.

- 2026-04-12: `M25` — live clock in display hero card. Static h2/lede replaced with `.display-clock` showing large time (`clamp(3rem,8vw,7rem)`) and full weekday+date below it. `now` state initialized to `new Date()` and ticked via a `setTimeout` aligned to the next whole minute then a `setInterval` every 60 s. `.display-clock`, `.display-clock-time`, `.display-clock-date` CSS added.

- 2026-04-12: `M26` — countdown to next event in display hero. `formatCountdown(startsAtUtc, now)` computes "in X min" / "in X hr Y min" / "Now" from the live `now` clock. Rendered as `.display-countdown` (amber, `clamp(1.1rem,2.2vw,1.6rem)`) between the event title and description. Updates every minute automatically via the existing clock tick.

- 2026-04-12: `M27` — Admin Reminders Overview panel (`admin-reminders-panel.tsx`). Fetches all household reminders from `GET /api/notifications/reminders`, splits into Pending (sorted by dueAtUtc asc) and Fired (sorted by firedAtUtc desc, capped at 20). Pending reminders have a Delete button. Renders as two side-by-side panels, added to admin page between Scheduling and Display Management.

- 2026-04-12: `M28` — today's event count in display hero kicker. `todayEventCount` computed from `snapshot.agendaSection.items` filtered to today's UTC date. Hero card shows a second `.display-kicker` row with "X events today" (or "Clear day") and an all-day count pill when applicable. Updates with the 60 s refresh cycle.

## Next recommended step
- `M26`–`M28` done. Display is now clock + countdown + today summary; admin has a full reminders overview.
- Next concrete code milestone: `M29` — household member management in the admin panel. Currently the admin panel has "Members" as a placeholder pill. Add a panel that lists household members (name, role, joined date) and lets the owner invite/remove members. Requires backend: list members endpoint, invite endpoint, remove endpoint.
