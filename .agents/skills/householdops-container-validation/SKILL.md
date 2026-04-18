---
name: householdops-container-validation
description: Validate HouseholdOps changes with the repo's Docker-first workflow and targeted checks. Use when Codex is asked to test, verify, smoke-check, or review behavior that touches the running API, worker, web shell, auth, display, scheduling, reminders, calendar integrations, or full-stack request/response flows.
---

# HouseholdOps Container Validation

Use the smallest validation loop that still proves the change.

## Validation order

1. Run the narrowest relevant automated check first.
2. Run targeted builds or tests for the touched stack layer.
3. If behavior is runtime-sensitive, validate through Docker Compose.
4. Confirm the user-facing path or API path that changed.
5. Report what was validated and what was not.

## Choose checks by change type

- Backend domain or service logic:
  - Run the most relevant `dotnet test` project first.
  - Add or update tests when touching time, recurrence, reminder, or projection logic.
- Frontend route or shell work:
  - Run `npm run build` in `src/frontend/web` when the change affects App Router structure, route handlers, or client/server boundaries.
- Full-stack flow changes:
  - Start the Compose stack and hit the relevant local endpoints.
- Migration or schema changes:
  - Bring up the API against Postgres and confirm startup/migration succeeds.

## Smoke-check expectations

- API: `/health`
- Web root or shell route affected by the change
- Any changed proxy route under `src/frontend/web/app/api`
- If auth is involved, verify the login/session path before deeper checks

## Review rules

- Do not claim validation you did not run.
- Prefer focused checks over broad expensive suites unless the change is cross-cutting.
- If a host-tool build is flaky or environment-specific, favor the containerized path.

## Do not use this skill when

- The task is docs-only or otherwise has no behavior change.
- The user explicitly wants planning without implementation or validation.

## References

- For a compact validation matrix, read [smoke-checks.md](references/smoke-checks.md).
