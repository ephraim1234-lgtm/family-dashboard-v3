# ADR 0002: Auth and Display Access Baseline

## Status

Accepted for MVP baseline

## Context

The platform has two fundamentally different access models:

- normal household users in app/admin surfaces
- kiosk-style display devices for ambient shared views

The repo guidance says display access must remain separate from normal full-user auth.

## Options considered

### Option A
Backend-issued cookie sessions for users, plus separate display tokens.

### Option B
Frontend-owned auth with token exchange into the backend.

### Option C
Pure SPA bearer-token auth for all surfaces, including display.

## Decision

Use Option A.

- ASP.NET Core owns normal user authentication and session cookies.
- Next.js treats the backend as the source of truth for auth/session state.
- Normal user cookies identify persisted backend sessions.
- Each persisted session carries one active household context.
- Household roles remain coarse in v1: `Owner` and `Member`.
- Display routes use dedicated scoped display access tokens and consume display projection endpoints.

## Why

- keeps auth coherent across backend and frontend
- avoids duplicating auth logic in Next.js
- allows session revocation and membership-aware validation
- cleanly separates shared-device display access from user sessions
- fits self-hosted, web-only deployment well

## Follow-up review points

- cookie domain and CSRF posture when deployed behind self-hosted reverse proxies
- how display tokens are minted, rotated, revoked, and scoped
- whether Next.js should proxy API requests or call the backend directly in v1
