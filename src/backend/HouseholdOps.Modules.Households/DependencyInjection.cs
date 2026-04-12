using HouseholdOps.Modules.Households.Contracts;
using HouseholdOps.Modules.Identity;
using HouseholdOps.SharedKernel.Time;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace HouseholdOps.Modules.Households;

public static class DependencyInjection
{
    public static IServiceCollection AddHouseholdsModule(this IServiceCollection services) => services;

    public static IEndpointRouteBuilder MapHouseholdsModule(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/households");

        group.MapGet("/current", async (
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            var householdContext = await service.GetCurrentAsync(cancellationToken);

            if (householdContext is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(householdContext);
        }).RequireAuthorization();

        group.MapPatch("/current/name", async (
            RenameHouseholdRequest? request,
            IHouseholdContextService service,
            CancellationToken cancellationToken) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest("Name is required.");
            }

            var result = await service.RenameAsync(request.Name, cancellationToken);

            if (result is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(result);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapGet("/members", async (
            IIdentityAccessService identityAccessService,
            IHouseholdMemberService memberService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await memberService.ListMembersAsync(householdId, cancellationToken);

            return Results.Ok(result);
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapPost("/members", async (
            AddHouseholdMemberRequest? request,
            IIdentityAccessService identityAccessService,
            IHouseholdMemberService memberService,
            IClock clock,
            CancellationToken cancellationToken) =>
        {
            if (request is null)
            {
                return Results.BadRequest("Request body is required.");
            }

            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await memberService.AddMemberAsync(
                householdId,
                request,
                clock.UtcNow,
                cancellationToken);

            return result.Status switch
            {
                HouseholdMemberMutationStatus.Succeeded => Results.Ok(result.Member),
                HouseholdMemberMutationStatus.ValidationFailed => Results.BadRequest(result.Error),
                HouseholdMemberMutationStatus.Conflict => Results.Conflict(result.Error),
                _ => Results.BadRequest("Unable to add member.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        group.MapDelete("/members/{membershipId:guid}", async (
            Guid membershipId,
            IIdentityAccessService identityAccessService,
            IHouseholdMemberService memberService,
            CancellationToken cancellationToken) =>
        {
            var session = identityAccessService.GetCurrentSession();

            if (!Guid.TryParse(session.ActiveHouseholdId, out var householdId))
            {
                return Results.Unauthorized();
            }

            var result = await memberService.RemoveMemberAsync(
                householdId,
                membershipId,
                cancellationToken);

            return result.Status switch
            {
                HouseholdMemberMutationStatus.Deleted => Results.NoContent(),
                HouseholdMemberMutationStatus.Conflict => Results.Conflict(result.Error),
                HouseholdMemberMutationStatus.NotFound => Results.NotFound(),
                _ => Results.BadRequest("Unable to remove member.")
            };
        }).RequireAuthorization("ActiveHouseholdOwner");

        return app;
    }
}
