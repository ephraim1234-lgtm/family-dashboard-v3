FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/backend ./src/backend

RUN dotnet restore ./src/backend/HouseholdOps.Worker/HouseholdOps.Worker.csproj
RUN dotnet publish ./src/backend/HouseholdOps.Worker/HouseholdOps.Worker.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "HouseholdOps.Worker.dll"]
