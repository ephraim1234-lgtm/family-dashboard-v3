# Migration checklist

## Before generating

- Confirm the owning module
- Confirm the entity and DTO changes match
- Confirm whether new indexes or unique constraints are required

## Review after generating

- New columns and nullability
- Default values
- Foreign keys and delete behavior
- Indexes and filters
- Snapshot coherence

## Runtime validation

```powershell
$env:API_PORT='3001'
docker compose up -d --build postgres api
curl http://localhost:3001/health
```
