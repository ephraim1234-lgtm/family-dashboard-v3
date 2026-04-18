---
name: householdops-docker-runtime
description: Start, stop, rebuild, inspect, and debug the HouseholdOps stack through Docker Compose. Use when Codex needs to run the local application, reproduce a runtime issue, inspect container logs, verify API or web behavior in containers, or work through the standard Docker-first workflow for postgres, api, worker, and web.
---

# HouseholdOps Docker Runtime

Use the Compose stack from the repository root.

## Follow this workflow

1. Prefer the standard validation ports unless the user asks otherwise:
   - `API_PORT=3001`
   - `WEB_PORT=3000`
2. Start only the services needed for the task:
   - `postgres api` for backend-only runtime checks
   - `postgres api worker` for reminders or sync behavior
   - `postgres api web` for full web validation
   - `postgres api worker web` for end-to-end checks
3. Use `docker compose up -d --build ...` for fresh runtime validation.
4. Inspect state with `docker compose ps` before assuming startup succeeded.
5. Read service logs with `docker compose logs <service> --tail=<n>` when behavior is unclear.
6. Stop with `docker compose down` only when cleanup matters; otherwise leave the stack running if the user is likely to keep iterating.

## Prefer these checks

- API readiness: `curl http://localhost:3001/health`
- Web shell reachability: `curl -I http://localhost:3000/`
- Running services: `docker compose ps`
- Logs: `docker compose logs api --tail=120`, `docker compose logs web --tail=120`, `docker compose logs worker --tail=120`

## Debugging rules

- Treat container logs as the first stop for runtime failures.
- Confirm the failing service's dependencies are healthy before changing code.
- Use `docker compose exec` for targeted inspection inside running containers when logs are not enough.
- Keep secrets in `.env` only. Do not echo or commit real OAuth secrets or display tokens.

## Do not use this skill when

- The task is pure code reading or design discussion with no need to run services.
- A focused unit test is enough and no runtime behavior needs confirmation.

## References

- For the standard command set and port conventions, read [commands.md](references/commands.md).
