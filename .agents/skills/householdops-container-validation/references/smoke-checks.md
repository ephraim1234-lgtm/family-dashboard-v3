# Validation matrix

## Backend-focused changes

```powershell
dotnet test tests\HouseholdOps.Modules.Scheduling.Tests\HouseholdOps.Modules.Scheduling.Tests.csproj
dotnet test tests\HouseholdOps.Modules.Notifications.Tests\HouseholdOps.Modules.Notifications.Tests.csproj
dotnet test tests\HouseholdOps.Modules.Display.Tests\HouseholdOps.Modules.Display.Tests.csproj
```

Pick the project that matches the touched module first.

## Frontend-focused changes

```powershell
Set-Location src\frontend\web
npm run build
```

## Runtime smoke checks

```powershell
$env:API_PORT='3001'
$env:WEB_PORT='3000'
docker compose up -d --build postgres api web
curl http://localhost:3001/health
curl -I http://localhost:3000/
```

## Integration and worker-sensitive changes

```powershell
$env:API_PORT='3001'
$env:WEB_PORT='3000'
docker compose up -d --build postgres api worker web
docker compose logs worker --tail=120
```
