# Runtime commands

## Standard bring-up

```powershell
$env:API_PORT='3001'
$env:WEB_PORT='3000'
docker compose up -d --build postgres api worker web
```

## Backend-only bring-up

```powershell
$env:API_PORT='3001'
docker compose up -d --build postgres api
```

## Common inspection commands

```powershell
docker compose ps
docker compose logs api --tail=120
docker compose logs worker --tail=120
docker compose logs web --tail=120
curl http://localhost:3001/health
curl -I http://localhost:3000/
```

## Common cleanup

```powershell
docker compose down
docker compose down -v
```

Use `-v` only when the task explicitly needs a clean Postgres volume.
