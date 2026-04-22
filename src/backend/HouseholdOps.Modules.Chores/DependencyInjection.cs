using HouseholdOps.Modules.Chores.Contracts;
using HouseholdOps.Modules.Identity;
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
        var ownerGroup = app.MapGroup("/api/chores")
            .RequireAuthorization("ActiveHouseholdOwner");

        ownerGroup.MapGet("", async (
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var response = await choreService.ListChoresAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(response);
        });

        ownerGroup.MapPost("", async (
            CreateChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A chore request is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await choreService.CreateChoreAsync(access.ActiveHouseholdId.Value, request, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Succeeded => Results.Ok(item),
                ChoreMutationStatus.ValidationFailed => Results.BadRequest(result.ErrorMessage),
                _ => Results.BadRequest("Unable to create chore.")
            };
        });

        ownerGroup.MapPut("/{choreId:guid}", async (
            Guid choreId,
            UpdateChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("An update request is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await choreService.UpdateChoreAsync(access.ActiveHouseholdId.Value, choreId, request, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Succeeded => Results.Ok(item),
                ChoreMutationStatus.NotFound => Results.NotFound(),
                ChoreMutationStatus.ValidationFailed => Results.BadRequest(result.ErrorMessage),
                _ => Results.BadRequest("Unable to update chore.")
            };
        });

        ownerGroup.MapDelete("/{choreId:guid}", async (
            Guid choreId,
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var result = await choreService.DeleteChoreAsync(access.ActiveHouseholdId.Value, choreId, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Deleted => Results.NoContent(),
                ChoreMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to delete chore.")
            };
        });

        // Inline reassignment from the home chore row. Owner-only so children
        // can't silently move chores off themselves.
        ownerGroup.MapPatch("/{choreId:guid}/assignee", async (
            Guid choreId,
            ReassignChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("A reassignment request is required.");
            }

            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await choreService.ReassignChoreAsync(
                access.ActiveHouseholdId.Value, choreId, request.AssignedMembershipId, cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Succeeded => Results.Ok(item),
                ChoreMutationStatus.NotFound => Results.NotFound(),
                ChoreMutationStatus.ValidationFailed => Results.BadRequest(result.ErrorMessage),
                _ => Results.BadRequest("Unable to reassign chore.")
            };
        });

        ownerGroup.MapGet("/completions/recent", async (
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue)
            {
                return Results.Forbid();
            }

            var response = await choreService.ListRecentCompletionsAsync(access.ActiveHouseholdId.Value, cancellationToken);
            return Results.Ok(response);
        });

        var memberGroup = app.MapGroup("/api/chores")
            .RequireAuthorization();

        memberGroup.MapGet("/my", async (
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue || !access.UserId.HasValue)
            {
                return Results.Forbid();
            }

            var response = await choreService.ListMyChoresAsync(access.ActiveHouseholdId.Value, access.UserId.Value, cancellationToken);
            return Results.Ok(response);
        });

        memberGroup.MapPost("/{choreId:guid}/complete", async (
            Guid choreId,
            CompleteChoreRequest? request,
            IIdentityAccessService identityAccessService,
            IChoreService choreService,
            CancellationToken cancellationToken) =>
        {
            var access = identityAccessService.GetCurrentAccess();
            if (!access.ActiveHouseholdId.HasValue || !access.UserId.HasValue)
            {
                return Results.Forbid();
            }

            var (result, item) = await choreService.CompleteChoreAsync(
                access.ActiveHouseholdId.Value,
                choreId,
                access.UserId.Value,
                request ?? new CompleteChoreRequest(null),
                cancellationToken);

            return result.Status switch
            {
                ChoreMutationStatus.Completed => Results.Ok(item),
                ChoreMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to complete chore.")
            };
        });

        return app;
    }
}
