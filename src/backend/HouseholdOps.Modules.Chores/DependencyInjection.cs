using HouseholdOps.Modules.Chores.Contracts;
using HouseholdOps.Modules.Identity;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Chores;

public static class DependencyInjection
{
    public static IServiceCollection AddChoresModule(
        this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapChoresModule(
        this IEndpointRouteBuilder app)
    {
        // --- Owner-only: chore CRUD + instance generation ---
        var ownerGroup = app.MapGroup("/api/chores")
            .RequireAuthorization("ActiveHouseholdOwner");

        ownerGroup.MapGet("/", async (
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var response = await choreService.ListChoresAsync(householdId, cancellationToken);
            return Results.Ok(response);
        });

        ownerGroup.MapPost("/", async (
            CreateChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
                return Results.BadRequest("A chore request is required.");

            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var result = await choreService.CreateChoreAsync(
                householdId, request, clock.UtcNow, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Succeeded => Results.Ok(result.Chore),
                ChoreMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to create chore.")
            };
        });

        ownerGroup.MapPut("/{choreId:guid}", async (
            Guid choreId,
            UpdateChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
                return Results.BadRequest("An update request is required.");

            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var result = await choreService.UpdateChoreAsync(
                householdId, choreId, request, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Succeeded => Results.Ok(result.Chore),
                ChoreMutationStatus.NotFound => Results.NotFound(),
                ChoreMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                _ => Results.BadRequest("Unable to update chore.")
            };
        });

        ownerGroup.MapDelete("/{choreId:guid}", async (
            Guid choreId,
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var deleted = await choreService.DeleteChoreAsync(
                householdId, choreId, cancellationToken);

            return deleted ? Results.NoContent() : Results.NotFound();
        });

        ownerGroup.MapPost("/instances/generate", async (
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var count = await choreService.GenerateDueInstancesAsync(
                today, 14, householdId, cancellationToken);

            return Results.Ok(new { generated = count });
        });

        // --- Member-accessible: view instances + mark complete ---
        var memberGroup = app.MapGroup("/api/chores")
            .RequireAuthorization();

        memberGroup.MapGet("/instances", async (
            HttpRequest httpRequest,
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var windowDays = httpRequest.Query.TryGetValue("windowDays", out var wd)
                && int.TryParse(wd, out var d) ? d : 14;
            windowDays = Math.Clamp(windowDays, 1, 90);

            var response = await choreService.ListInstancesAsync(
                householdId,
                today,
                today.AddDays(windowDays - 1),
                cancellationToken);

            return Results.Ok(response);
        });

        memberGroup.MapPost("/instances/{instanceId:guid}/complete", async (
            Guid instanceId,
            IIdentityAccessService identityAccessService,
            IChoreManagementService choreService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();
            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
                return Results.Unauthorized();

            Guid? memberId = Guid.TryParse(session.UserId, out var uid) ? uid : null;

            var completed = await choreService.CompleteInstanceAsync(
                householdId,
                instanceId,
                clock.UtcNow,
                memberId,
                session.DisplayName,
                cancellationToken);

            return completed ? Results.NoContent() : Results.NotFound();
        });

        return app;
    }
}
